import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { normalizeWork } from "../src/lib/normalize";
import { failureSnapshot } from "../src/lib/sync-core";
import type { Snapshot } from "../src/lib/schema";
import { supabaseConfig } from "../scripts/lib/supabase-store";

const at = "2026-10-11T10:00:00Z";
const work = normalizeWork(
  { id: 1, nome: "Obra de teste", valor_contratado: "100,00" },
  null,
  at,
);
function snapshot(): Snapshot {
  return {
    schemaVersion: 1,
    generatedAt: at,
    lastAttemptAt: at,
    syncStatus: "ok",
    syncError: null,
    sourceTotal: 1,
    works: [structuredClone(work)],
    sources: [],
    changeSummary: { added: 1, updated: 0, unchanged: 0, notSeen: 0 },
  };
}

test("Supabase é opcional localmente, obrigatório no workflow e rejeita chave pública", () => {
  assert.equal(supabaseConfig({}), null);
  assert.throws(
    () => supabaseConfig({ SUPABASE_REQUIRED: "true" }),
    /Configure/,
  );
  assert.throws(
    () => supabaseConfig({ SUPABASE_URL: "https://test.supabase.co" }),
    /Configure/,
  );
  assert.throws(
    () =>
      supabaseConfig({
        SUPABASE_URL: "https://test.supabase.co",
        SUPABASE_SECRET_KEY: "sb_publishable_test",
      }),
    /secreta/,
  );
  assert.throws(
    () =>
      supabaseConfig({
        SUPABASE_URL: "http://test.supabase.co",
        SUPABASE_SECRET_KEY: "sb_secret_test",
      }),
    /HTTPS/,
  );
  const anon =
    "eyJtest." +
    Buffer.from(JSON.stringify({ role: "anon" })).toString("base64url") +
    ".signature";
  assert.throws(
    () =>
      supabaseConfig({
        SUPABASE_URL: "https://test.supabase.co",
        SUPABASE_SECRET_KEY: anon,
      }),
    /service_role/,
  );
});

test("migração: transações, histórico, concorrência e permissões reais de Postgres", async (t) => {
  const db = await PGlite.create();
  try {
    await db.exec(
      "create role anon; create role authenticated; create role service_role bypassrls;",
    );
    for (const file of (await readdir("supabase/migrations"))
      .filter((name) => name.endsWith(".sql"))
      .sort())
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    const save = async (
      data: Snapshot,
      revision: number,
      id = randomUUID(),
      kind = "sync",
      contracts: Record<string, unknown> = {},
    ) => {
      const result = await db.query<{ revision: number }>(
        "select public.observatory_save_snapshot($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,null) as revision",
        [
          "obras-pvh",
          revision,
          id,
          kind,
          at,
          JSON.stringify(data),
          JSON.stringify(contracts),
        ],
      );
      return Number(result.rows[0].revision);
    };
    const count = async (table: string) =>
      Number(
        (
          await db.query<{ count: number }>(
            `select count(*) from observatory.${table}`,
          )
        ).rows[0].count,
      );
    const load = async () =>
      (
        await db.query<{ state: { revision: number; snapshot: Snapshot } }>(
          "select public.observatory_load_state('obras-pvh') as state",
        )
      ).rows[0].state;
    const initial = snapshot();
    const seedId = randomUUID();

    await t.test(
      "bootstrap e repetição do mesmo run são idempotentes",
      async () => {
        assert.equal(await save(initial, 0, seedId, "seed"), 1);
        assert.equal(await save(initial, 0, seedId, "seed"), 1);
        assert.equal(await count("ingestion_runs"), 1);
        assert.equal(await count("work_versions"), 1);
        assert.deepEqual((await load()).snapshot, initial);
      },
    );
    await t.test(
      "coleta sem alteração não cria versão; alteração e retorno criam histórico",
      async () => {
        assert.equal(await save(initial, 1), 2);
        assert.equal(await count("work_versions"), 1);
        const changed = snapshot();
        changed.works[0] = normalizeWork(
          { id: 1, nome: "Obra alterada", valor_contratado: "120,00" },
          null,
          at,
          work,
        );
        assert.equal(await save(changed, 2), 3);
        assert.equal(await count("work_versions"), 2);
        assert.equal(await save(initial, 3), 4);
        assert.equal(await count("work_versions"), 3);
      },
    );
    await t.test("uma revisão antiga não sobrescreve dados novos", async () => {
      await assert.rejects(save(initial, 2), /revision conflict/);
      assert.equal((await load()).revision, 4);
      assert.equal(await count("ingestion_runs"), 4);
    });
    await t.test(
      "falha de coleta fica registrada sem mudar obras ou a última execução válida",
      async () => {
        const failed = failureSnapshot(
          initial,
          "API indisponível",
          "2026-10-12T10:00:00Z",
        );
        assert.equal(await save(failed, 4), 5);
        assert.deepEqual((await load()).snapshot.works, initial.works);
        assert.equal(await count("work_versions"), 3);
        const state = (
          await db.query<{ last: string; latest: string }>(
            "select last_successful_run_id as last, latest_run_id as latest from observatory.module_state",
          )
        ).rows[0];
        assert.notEqual(state.last, state.latest);
        const alteredFailure = structuredClone(failed);
        alteredFailure.works = [];
        await assert.rejects(save(alteredFailure, 5), /preserve/);
        assert.equal((await load()).revision, 5);
      },
    );
    await t.test(
      "IDs duplicados, paginação incompleta e exclusões acidentais são rejeitados",
      async () => {
        const duplicated = snapshot();
        duplicated.works.push(structuredClone(work));
        duplicated.sourceTotal = 2;
        await assert.rejects(save(duplicated, 5), /Duplicate/);
        const incomplete = snapshot();
        incomplete.sourceTotal = 2;
        await assert.rejects(save(incomplete, 5), /Incomplete/);
        const deleted = snapshot();
        deleted.works = [];
        deleted.sourceTotal = 0;
        await assert.rejects(save(deleted, 5), /retained/);
        assert.equal((await load()).revision, 5);
      },
    );
    await t.test(
      "um erro durante a escrita reverte run, versões e estado",
      async () => {
        await assert.rejects(
          save(initial, 5, randomUUID(), "sync", { invalid: {} }),
        );
        assert.equal((await load()).revision, 5);
        assert.equal(await count("ingestion_runs"), 5);
        assert.equal(await count("work_versions"), 3);
      },
    );
    await t.test(
      "ausência na fonte é versionada; valores null e zero permanecem distintos",
      async () => {
        const absent = snapshot();
        absent.works[0].inLatestSnapshot = false;
        absent.sourceTotal = 0;
        assert.equal(await save(absent, 5), 6);
        assert.equal(await count("work_versions"), 4);
        const amounts = (
          await db.query<{ contracted_cents: number; paid_cents: null }>(
            "select contracted_cents,paid_cents from observatory.works",
          )
        ).rows[0];
        assert.equal(Number(amounts.contracted_cents), 10000);
        assert.equal(amounts.paid_cents, null);
      },
    );
    await t.test(
      "anon e authenticated não podem ler dados nem chamar as RPCs de ingestão",
      async () => {
        for (const role of ["anon", "authenticated"]) {
          await db.exec(`set role ${role}`);
          await assert.rejects(
            db.query("select public.observatory_load_state('obras-pvh')"),
            /permission denied/,
          );
          await assert.rejects(
            db.query("select * from observatory.works"),
            /permission denied/,
          );
          await db.exec("reset role");
        }
        await db.exec("set role service_role");
        assert.equal((await load()).revision, 6);
        await db.exec("reset role");
        const unprotected = (
          await db.query<{ count: number }>(
            "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='observatory' and c.relkind='r' and not c.relrowsecurity",
          )
        ).rows[0];
        assert.equal(Number(unprotected.count), 0);
      },
    );
  } finally {
    await db.close();
  }
});
