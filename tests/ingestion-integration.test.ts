import { test } from "node:test";
import assert from "node:assert/strict";
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
import { normalizeWork } from "../src/lib/normalize";
import type { Snapshot } from "../src/lib/schema";
import { emptyRevenueSnapshot } from "./fixtures-revenues";

test("coletor e exportação usam o estado persistido e bloqueiam publicação após falha", async () => {
  const root = process.cwd();
  const folder = await mkdtemp(join(tmpdir(), "observatorio-ingestion-"));
  const originalFetch = globalThis.fetch;
  const originalEnv = {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SECRET_KEY,
    required: process.env.SUPABASE_REQUIRED,
  };
  const originalExitCode = process.exitCode;
  const db = await PGlite.create();
  let apiFailed = false;
  let databaseFailed = false;
  let amount = "150,00";
  const baselineAt = "2026-10-10T10:00:00Z";
  const raw = () => ({
    id: 1,
    nome: "Obra de integração",
    valor_contratado: amount,
    contrato: { id: 2, numero: "002/2026" },
  });
  const baselineWork = normalizeWork(
    { ...raw(), valor_contratado: "100,00" },
    null,
    baselineAt,
  );
  const baseline: Snapshot = {
    schemaVersion: 1,
    generatedAt: baselineAt,
    lastAttemptAt: baselineAt,
    syncStatus: "ok",
    syncError: null,
    sourceTotal: 1,
    works: [baselineWork],
    sources: [],
    changeSummary: { added: 1, updated: 0, unchanged: 0, notSeen: 0 },
  };
  const readSnapshot = async () =>
    JSON.parse(
      await readFile(join(folder, "data/snapshot.json"), "utf8"),
    ) as Snapshot;
  const load = async () =>
    (
      await db.query<{
        state: {
          revision: number;
          snapshot: Snapshot;
          contracts: Record<string, unknown>;
        };
      }>("select public.observatory_load_state('obras-pvh') as state")
    ).rows[0].state;
  const run = async (script: string) => {
    const url = pathToFileURL(join(root, "scripts", script));
    url.searchParams.set("test", `${Date.now()}-${Math.random()}`);
    await import(url.href);
  };
  try {
    await db.exec(
      "create role anon; create role authenticated; create role service_role bypassrls;",
    );
    for (const file of (await readdir(join(root, "supabase/migrations")))
      .filter((name) => name.endsWith(".sql"))
      .sort())
      await db.exec(
        await readFile(join(root, "supabase/migrations", file), "utf8"),
      );
    await db.exec("set role service_role");
    await mkdir(join(folder, "data"));
    await mkdir(join(folder, "public/dados"), { recursive: true });
    await writeFile(
      join(folder, "data/snapshot.json"),
      JSON.stringify(baseline),
    );
    await writeFile(join(folder, "data/contracts.json"), "{}");
    process.env.SUPABASE_URL = "https://integration.supabase.co";
    process.env.SUPABASE_SECRET_KEY = "sb_secret_test_only";
    process.env.SUPABASE_REQUIRED = "true";
    globalThis.fetch = async (input, init) => {
      const url = new URL(
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url,
      );
      if (url.hostname === "integration.supabase.co") {
        if (databaseFailed)
          return Response.json(
            { code: "40001", message: "Snapshot revision conflict" },
            { status: 409 },
          );
        const args = JSON.parse(String(init?.body));
        if (
          url.pathname.endsWith("observatory_load_state") &&
          args.p_module === "receitas-pvh"
        )
          return Response.json({
            revision: 1,
            snapshot: emptyRevenueSnapshot(baselineAt),
          });
        if (url.pathname.endsWith("observatory_load_state"))
          return Response.json(
            args.p_module === "contratos-pvh"
              ? {
                  revision: 1,
                  snapshot: {
                    schemaVersion: 1,
                    generatedAt: baselineAt,
                    lastAttemptAt: baselineAt,
                    syncStatus: "ok",
                    syncError: null,
                    sourceTotal: 0,
                    contracts: [],
                    sources: [],
                    changeSummary: {
                      added: 0,
                      updated: 0,
                      unchanged: 0,
                      notSeen: 0,
                    },
                  },
                  contracts: {},
                }
              : await load(),
          );
        if (url.pathname.endsWith("observatory_save_snapshot")) {
          const result = await db.query<{ revision: number }>(
            "select public.observatory_save_snapshot($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb) as revision",
            [
              args.p_module,
              args.p_expected_revision,
              args.p_run_id,
              args.p_kind,
              args.p_started_at,
              JSON.stringify(args.p_snapshot),
              JSON.stringify(args.p_contracts),
              JSON.stringify(args.p_raw_works),
            ],
          );
          return Response.json(Number(result.rows[0].revision));
        }
      }
      if (
        url.hostname === "api.portovelho.ro.gov.br" &&
        url.pathname === "/api/v1/obras"
      )
        return apiFailed
          ? Response.json({}, { status: 500 })
          : Response.json({
              data: [raw()],
              meta: { total: 1 },
              links: { next: null },
            });
      if (
        url.hostname === "api.portovelho.ro.gov.br" &&
        url.pathname === "/api/v1/contratos/2"
      )
        return Response.json({
          data: {
            id: 2,
            numero: "002/2026",
            valor: "150,00",
            contratante: { sigla: "TEST", nome: "Órgão de teste" },
          },
        });
      if (url.hostname.endsWith(".portovelho.ro.gov.br"))
        return new Response(
          "<html>Última atualização: 11/10/2026 10:00</html>",
          { headers: { "content-type": "text/html" } },
        );
      throw new Error("Requisição não prevista no teste.");
    };
    process.chdir(folder);
    await run("sync.ts");
    const saved = await readSnapshot();
    assert.equal(saved.works[0].contractedCents, 15000);
    assert.equal(saved.works[0].firstSeenAt, baselineAt);
    assert.equal((await load()).revision, 2); // seed + coleta
    assert.deepEqual((await load()).snapshot, saved);
    assert.deepEqual(
      JSON.parse(
        await readFile(join(folder, "public/dados/obras.json"), "utf8"),
      ),
      saved,
    );

    // Um checkout novo não pode reintroduzir a base antiga do Git.
    await writeFile(
      join(folder, "data/snapshot.json"),
      JSON.stringify(baseline),
    );
    await writeFile(join(folder, "data/contracts.json"), "{}");
    amount = "200,00";
    await run("sync.ts");
    const updated = await readSnapshot();
    assert.equal(updated.works[0].contractedCents, 20000);
    assert.equal(updated.works[0].firstSeenAt, baselineAt);
    await run("export-supabase.ts");
    assert.deepEqual(await readSnapshot(), (await load()).snapshot);

    apiFailed = true;
    await run("sync.ts");
    assert.equal(process.exitCode, 1);
    process.exitCode = originalExitCode;
    const failed = await readSnapshot();
    assert.equal(failed.syncStatus, "error");
    assert.equal(failed.generatedAt, updated.generatedAt);
    assert.deepEqual(failed.works, updated.works);
    assert.deepEqual((await load()).snapshot, failed);
    await assert.rejects(run("export-supabase.ts"), /coleta válida/);

    // Uma falha de persistência não altera o JSON nem fica marcada como falha da prefeitura.
    databaseFailed = true;
    await assert.rejects(run("sync.ts"), /persistência Supabase/);
    assert.deepEqual(await readSnapshot(), failed);
    await assert.rejects(readFile(join(folder, "data/sync.lock")), {
      code: "ENOENT",
    });
  } finally {
    process.chdir(root);
    globalThis.fetch = originalFetch;
    for (const [name, value] of Object.entries({
      SUPABASE_URL: originalEnv.url,
      SUPABASE_SECRET_KEY: originalEnv.key,
      SUPABASE_REQUIRED: originalEnv.required,
    })) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    process.exitCode = originalExitCode;
    await db.close();
    await rm(folder, { recursive: true, force: true });
  }
});
