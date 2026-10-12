import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, mkdir, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { createRevenueStore } from "../scripts/lib/revenue-store";

test("receitas: coletor real, RPC transacional, repetição, falha parcial, concorrência e acesso privado", async () => {
  const root = process.cwd();
  const folder = await mkdtemp(join(tmpdir(), "pvh-revenues-"));
  const db = await PGlite.create();
  const originalFetch = globalThis.fetch;
  const originalExit = process.exitCode;
  const env = Object.fromEntries(
    [
      "SUPABASE_URL",
      "SUPABASE_SECRET_KEY",
      "SUPABASE_REQUIRED",
      "PMPV_API_TOKEN",
    ].map((k) => [k, process.env[k]]),
  );
  let incomplete = false;
  const load = async () =>
    (
      await db.query<{ state: any }>(
        "select public.observatory_load_state('receitas-pvh') as state",
      )
    ).rows[0].state;
  const save = async (args: Record<string, unknown>) =>
    Number(
      (
        await db.query<{ revision: number }>(
          "select public.observatory_save_revenue_snapshot($1,$2,$3,$4,$5::jsonb) as revision",
          [
            args.p_module,
            args.p_expected_revision,
            args.p_run_id,
            args.p_started_at,
            JSON.stringify(args.p_snapshot),
          ],
        )
      ).rows[0].revision,
    );
  const run = async () => {
    const url = pathToFileURL(join(root, "scripts/sync-revenues.ts"));
    url.searchParams.set("run", randomUUID());
    await import(url.href);
  };
  try {
    await db.exec(
      "create role anon; create role authenticated; create role service_role bypassrls;",
    );
    for (const file of (await readdir(join(root, "supabase/migrations")))
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await db.exec(
        await readFile(join(root, "supabase/migrations", file), "utf8"),
      );
    await db.exec("set role service_role");
    await mkdir(join(folder, "data"));
    process.env.SUPABASE_URL = "https://revenue-test.supabase.co";
    process.env.SUPABASE_SECRET_KEY = "sb_secret_test_only";
    process.env.SUPABASE_REQUIRED = "true";
    delete process.env.PMPV_API_TOKEN;
    globalThis.fetch = async (input, init) => {
      const url = new URL(
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url,
      );
      if (url.hostname === "revenue-test.supabase.co") {
        const args = JSON.parse(String(init?.body));
        assert.equal(args.p_module, "receitas-pvh");
        if (url.pathname.endsWith("observatory_load_state"))
          return Response.json(await load());
        if (url.pathname.endsWith("observatory_save_revenue_snapshot"))
          return Response.json(await save(args));
        throw new Error("RPC inesperada");
      }
      assert.equal(url.hostname, "api.portovelho.ro.gov.br");
      assert.equal(url.searchParams.get("portal_id"), "12535");
      assert.equal(url.searchParams.get("por-pagina"), "1000");
      const year = Number(url.searchParams.get("ano"));
      const planned = url.pathname.endsWith("previstas");
      const second = url.searchParams.get("page") === "2";
      const raw = {
        id: planned ? 0 : `${year}-${second ? 2 : 1}`,
        portal_id: 12535,
        ano: year,
        unidade_gestora_id: "u1",
        unidade_gestora: { nome: "Prefeitura" },
        receita_sigla: "O",
        mes: "01 - Janeiro",
        data_documento: `${year}-01-10`,
        valor_orcamento: "1000,00",
        valor_documento: second ? "-50,00" : "300,00",
        natureza_orcamentaria: {
          plano_conta: "111 - Impostos",
          fonte_recurso: "1500 - Recursos livres",
        },
      };
      return Response.json({
        data: [raw],
        meta: { total: planned ? 1 : 2, current_page: second ? 2 : 1 },
        links: {
          next:
            planned || second || incomplete
              ? null
              : "http://api.portovelho.ro.gov.br/api/v1/receitas?page=2",
        },
      });
    };
    process.chdir(folder);
    process.env.SUPABASE_SECRET_KEY = "";
    await assert.rejects(run(), /SUPABASE/);
    await assert.rejects(readFile(join(folder, "data/revenues-sync.lock")), {
      code: "ENOENT",
    });
    process.env.SUPABASE_SECRET_KEY = "sb_secret_test_only";
    const store = createRevenueStore()!;
    await run();
    const first = (await store.load()).snapshot!;
    assert.equal(first.syncStatus, "ok");
    assert.equal(first.entries.length, 2);
    assert.equal(first.entries[0].months[0].cents, 25000);
    assert.equal(first.entries[0].plannedCents, 100000);
    assert.deepEqual(
      JSON.parse(
        await readFile(join(folder, "public/dados/receitas.json"), "utf8"),
      ),
      first,
    );
    await run();
    assert.equal(
      Number(
        (
          await db.query<{ n: number }>(
            "select count(*) as n from observatory.revenue_versions",
          )
        ).rows[0].n,
      ),
      2,
    );
    const good = (await store.load()).snapshot!;
    incomplete = true;
    await run();
    assert.equal(process.exitCode, 1);
    process.exitCode = originalExit;
    const failed = (await store.load()).snapshot!;
    assert.equal(failed.syncStatus, "error");
    assert.deepEqual(failed.entries, good.entries);
    assert.deepEqual(failed.years, good.years);
    assert.equal(failed.generatedAt, good.generatedAt);
    await assert.rejects(readFile(join(folder, "data/revenues-sync.lock")), {
      code: "ENOENT",
    });
    const args = {
      p_module: "receitas-pvh",
      p_expected_revision: 3,
      p_run_id: randomUUID(),
      p_started_at: failed.lastAttemptAt,
      p_snapshot: failed,
    };
    assert.equal(await save(args), 4);
    assert.equal(await save(args), 4);
    await assert.rejects(
      save({ ...args, p_run_id: randomUUID() }),
      /revision conflict/,
    );
    await assert.rejects(
      save({
        ...args,
        p_expected_revision: 4,
        p_run_id: randomUUID(),
        p_snapshot: { ...failed, entries: [] },
      }),
      /preserve previous/,
    );
    await assert.rejects(
      save({
        ...args,
        p_expected_revision: 4,
        p_run_id: randomUUID(),
        p_snapshot: {
          ...good,
          years: good.years.map((y) => ({ ...y, receipts: 100 })),
        },
      }),
      /Incomplete/,
    );
    assert.equal(
      (
        await db.query<{ full: boolean }>(
          "select snapshot ? 'entries' as full from observatory.ingestion_runs where module='receitas-pvh' limit 1",
        )
      ).rows[0].full,
      false,
    );
    assert.equal(
      Number(
        (
          await db.query<{ n: number }>(
            "select count(*) as n from observatory.module_state where module <> 'receitas-pvh'",
          )
        ).rows[0].n,
      ),
      0,
    );
    await db.exec("reset role; set role anon");
    await assert.rejects(
      db.query("select * from observatory.revenue_entries"),
      /permission denied/,
    );
    await assert.rejects(
      db.query(
        "select public.observatory_save_revenue_snapshot('receitas-pvh',0,$1,now(),'{}'::jsonb)",
        [randomUUID()],
      ),
      /permission denied/,
    );
  } finally {
    process.chdir(root);
    globalThis.fetch = originalFetch;
    process.exitCode = originalExit;
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await db.close();
    await rm(folder, { recursive: true, force: true });
  }
});
