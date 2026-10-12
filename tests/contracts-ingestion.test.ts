import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { contractSnapshotSchema } from "../src/features/contratos/schema";
import { createContractStore } from "../scripts/lib/contract-store";
import { normalizeWork } from "../src/lib/normalize";
import { emptyRevenueSnapshot } from "./fixtures-revenues";

test("contratos: coleta paginada, limite HTTP 429, persistência, falha parcial, histórico e permissões", async () => {
  const root = process.cwd();
  const folder = await mkdtemp(join(tmpdir(), "pvh-contracts-"));
  const db = await PGlite.create();
  const originalFetch = globalThis.fetch;
  const originalExitCode = process.exitCode;
  const env = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    SUPABASE_REQUIRED: process.env.SUPABASE_REQUIRED,
  };
  let incomplete = false;
  let changed = false;
  let rateLimitedCalls = 3;
  const save = async (args: Record<string, unknown>) =>
    Number(
      (
        await db.query<{ revision: number }>(
          "select public.observatory_save_contract_snapshot($1,$2,$3,$4,$5,$6::jsonb) as revision",
          [
            args.p_module,
            args.p_expected_revision,
            args.p_run_id,
            args.p_kind,
            args.p_started_at,
            JSON.stringify(args.p_snapshot),
          ],
        )
      ).rows[0].revision,
    );
  const load = async () =>
    (
      await db.query<{ state: unknown }>(
        "select public.observatory_load_state('contratos-pvh') as state",
      )
    ).rows[0].state;
  const run = async (script = "sync-contracts.ts") => {
    const url = pathToFileURL(join(root, "scripts", script));
    url.searchParams.set("run", randomUUID());
    await import(url.href);
  };
  try {
    await db.exec(
      "create role anon; create role authenticated; create role service_role bypassrls;",
    );
    for (const file of (await readdir(join(root, "supabase/migrations")))
      .filter((file) => file.endsWith(".sql"))
      .sort())
      await db.exec(
        await readFile(join(root, "supabase/migrations", file), "utf8"),
      );
    await db.exec("set role service_role");
    await mkdir(join(folder, "data"));
    process.env.SUPABASE_URL = "https://contracts-test.supabase.co";
    process.env.SUPABASE_SECRET_KEY = "sb_secret_test_only";
    process.env.SUPABASE_REQUIRED = "true";
    const store = createContractStore()!;
    globalThis.fetch = async (input, init) => {
      const url = new URL(
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url,
      );
      if (url.hostname === "contracts-test.supabase.co") {
        const args = JSON.parse(String(init?.body));
        if (
          url.pathname.endsWith("observatory_load_state") &&
          args.p_module === "receitas-pvh"
        )
          return Response.json({
            revision: 1,
            snapshot: emptyRevenueSnapshot("2026-10-11T10:00:00Z"),
          });
        if (url.pathname.endsWith("observatory_load_state"))
          return Response.json(
            args.p_module === "contratos-pvh"
              ? await load()
              : {
                  revision: 1,
                  snapshot: {
                    schemaVersion: 1,
                    generatedAt: "2026-10-11T10:00:00Z",
                    lastAttemptAt: "2026-10-11T10:00:00Z",
                    syncStatus: "ok",
                    syncError: null,
                    sourceTotal: 1,
                    works: [
                      normalizeWork(
                        { id: 1, nome: "Obra de teste" },
                        null,
                        "2026-10-11T10:00:00Z",
                      ),
                    ],
                    sources: [],
                    changeSummary: {
                      added: 1,
                      updated: 0,
                      unchanged: 0,
                      notSeen: 0,
                    },
                  },
                  contracts: {},
                },
          );
        if (url.pathname.endsWith("observatory_save_contract_snapshot"))
          return Response.json(await save(args));
      }
      assert.equal(url.hostname, "api.portovelho.ro.gov.br");
      assert.equal(url.pathname, "/api/v1/contratos");
      assert.equal(url.searchParams.get("modelo"), "Contratos");
      if (rateLimitedCalls-- > 0)
        return new Response(null, {
          status: 429,
          headers: { "Retry-After": "0" },
        });
      const second = url.searchParams.get("page") === "2";
      const id = second ? 2 : 1;
      return Response.json({
        data: [
          {
            id,
            numero: `${id}/2026`,
            modelo: "Contratos",
            valor: changed ? "20,00" : "10,00",
          },
        ],
        meta: { total: 2 },
        links: {
          next:
            second || incomplete
              ? null
              : "http://api.portovelho.ro.gov.br/api/v1/contratos?page=2",
        },
      });
    };
    process.chdir(folder);
    await run();
    const first = contractSnapshotSchema.parse(
      JSON.parse(
        await readFile(join(folder, "data/contracts-snapshot.json"), "utf8"),
      ),
    );
    assert.equal(first.contracts.length, 2);
    assert.equal((await store.load()).revision, 1);
    await run("export-supabase.ts");
    assert.deepEqual(
      JSON.parse(
        await readFile(join(folder, "data/exports/contratos.json"), "utf8"),
      ),
      first,
    );
    await run(); // unchanged content creates no extra versions
    assert.equal(
      Number(
        (
          await db.query<{ n: number }>(
            "select count(*) as n from observatory.contract_versions",
          )
        ).rows[0].n,
      ),
      2,
    );
    changed = true;
    await run();
    const state = await store.load();
    assert.equal(state.snapshot!.contracts[0].valueCents, 2000);
    assert.equal(
      Number(
        (
          await db.query<{ n: number }>(
            "select count(*) as n from observatory.contract_versions",
          )
        ).rows[0].n,
      ),
      4,
    );
    rateLimitedCalls = 4;
    await run();
    assert.equal(process.exitCode, 1);
    process.exitCode = originalExitCode;
    const limited = (await store.load()).snapshot!;
    assert.equal(limited.syncStatus, "error");
    assert.match(limited.syncError!, /HTTP 429/);
    assert.deepEqual(limited.contracts, state.snapshot!.contracts);
    assert.equal(limited.generatedAt, state.snapshot!.generatedAt);
    rateLimitedCalls = 0;
    incomplete = true;
    await run();
    assert.equal(process.exitCode, 1);
    process.exitCode = originalExitCode;
    const failed = (await store.load()).snapshot!;
    assert.equal(failed.syncStatus, "error");
    await assert.rejects(
      run("export-supabase.ts"),
      /coleta válida de contratos/,
    );
    assert.deepEqual(failed.contracts, state.snapshot!.contracts);
    assert.equal(failed.generatedAt, state.snapshot!.generatedAt);
    assert.deepEqual(
      JSON.parse(
        await readFile(join(folder, "data/exports/contratos.json"), "utf8"),
      ),
      failed,
    );
    await assert.rejects(readFile(join(folder, "data/contracts-sync.lock")), {
      code: "ENOENT",
    });
    const args = {
      p_module: "contratos-pvh",
      p_expected_revision: 5,
      p_run_id: randomUUID(),
      p_kind: "sync",
      p_started_at: failed.lastAttemptAt,
      p_snapshot: failed,
    };
    assert.equal(await save(args), 6);
    assert.equal(await save(args), 6); // same run is idempotent
    assert.equal(
      (
        await db.query<{ full: boolean }>(
          "select snapshot ? 'contracts' as full from observatory.ingestion_runs where module='contratos-pvh' order by revision desc limit 1",
        )
      ).rows[0].full,
      false,
    );
    await assert.rejects(
      save({ ...args, p_run_id: randomUUID(), p_expected_revision: 5 }),
      /revision conflict/,
    );
    await assert.rejects(
      save({
        ...args,
        p_run_id: randomUUID(),
        p_expected_revision: 6,
        p_snapshot: { ...failed, contracts: [] },
      }),
      /preserve previous/,
    );
    assert.equal(
      (
        await db.query<{ n: number }>(
          "select count(*) as n from observatory.module_state where module='obras-pvh'",
        )
      ).rows[0].n,
      0,
    );
    await db.exec("reset role; set role anon");
    await assert.rejects(
      db.query(
        "select public.observatory_save_contract_snapshot('contratos-pvh',0,$1,'sync',now(),'{}'::jsonb)",
        [randomUUID()],
      ),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select * from observatory.contract_catalog"),
      /permission denied/,
    );
  } finally {
    process.chdir(root);
    globalThis.fetch = originalFetch;
    process.exitCode = originalExitCode;
    for (const [name, value] of Object.entries(env)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    await db.close();
    await rm(folder, { recursive: true, force: true });
  }
});
