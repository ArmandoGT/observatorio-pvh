import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeWork } from "../src/lib/normalize";
import { normalizeContract } from "../src/features/contratos/normalize";
import { emptyRevenueSnapshot } from "./fixtures-revenues";
import { readDatabaseSnapshot } from "../src/lib/database-reader";
import type { Snapshot } from "../src/lib/schema";

const env = {
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_SECRET_KEY: "sb_secret_test",
};
const at = "2026-10-12T10:00:00Z";
const snapshot: Snapshot = {
  schemaVersion: 1,
  generatedAt: at,
  lastAttemptAt: at,
  syncStatus: "ok",
  syncError: null,
  sourceTotal: 1,
  works: [
    normalizeWork({ id: 1, nome: "Obra nova", valor_pago: "0,00" }, null, at),
  ],
  sources: [],
  changeSummary: { added: 1, updated: 0, unchanged: 0, notSeen: 0 },
};

test("leitura consulta somente a RPC de estado e recebe alteracoes sem cache antigo", async () => {
  let revision = 1;
  const fetcher: typeof fetch = async (input, init) => {
    assert.equal(
      String(input),
      `${env.SUPABASE_URL}/rest/v1/rpc/observatory_load_state`,
    );
    assert.equal(init?.method, "POST");
    assert.deepEqual(JSON.parse(String(init?.body)), { p_module: "obras-pvh" });
    assert.equal(init?.cache, "no-store");
    assert.ok(init?.signal);
    assert.equal(
      new Headers(init?.headers).get("apikey"),
      env.SUPABASE_SECRET_KEY,
    );
    return Response.json({
      revision,
      snapshot: {
        ...snapshot,
        generatedAt: revision === 1 ? at : "2026-10-13T10:00:00Z",
      },
      contracts: { privateCache: true },
    });
  };
  const first = await readDatabaseSnapshot("obras-pvh", env, fetcher);
  assert.equal(first.works[0].paidCents, 0);
  assert.equal(first.works[0].contractedCents, null);
  assert.equal("contracts" in first, false);
  revision++;
  const second = await readDatabaseSnapshot("obras-pvh", env, fetcher);
  assert.notEqual(first.generatedAt, second.generatedAt);
});

test("catalogo preserva historicos e receitas preservam valores negativos", async () => {
  const contract = normalizeContract(
    { id: 1, numero: "1/2026", modelo: "Contratos" },
    at,
  );
  contract.inLatestSnapshot = false;
  const contracts = { ...snapshot, contracts: [contract] };
  const revenues = emptyRevenueSnapshot(at);
  revenues.entries.push({
    id: "revenue-1",
    year: 2026,
    unitId: "1",
    unitName: "Prefeitura",
    account: "1",
    category: "Tributaria",
    origin: "Impostos",
    fundingSource: "1",
    kind: "budget",
    plannedCents: null,
    plannedLines: 0,
    missingPlannedValues: 0,
    months: [{ month: 1, cents: -100, documents: 1, missingValues: 0 }],
    contentHash: "a".repeat(64),
    inLatestSnapshot: true,
    firstSeenAt: at,
    lastSeenAt: at,
    lastChangedAt: at,
  });
  const fetcher: typeof fetch = async (_input, init) =>
    Response.json({
      snapshot:
        JSON.parse(String(init?.body)).p_module === "contratos-pvh"
          ? contracts
          : revenues,
    });
  const catalog = await readDatabaseSnapshot("contratos-pvh", env, fetcher);
  assert.equal(catalog.contracts[0].inLatestSnapshot, false);
  const revenue = await readDatabaseSnapshot("receitas-pvh", env, fetcher);
  assert.equal(revenue.entries[0].months[0].cents, -100);
  assert.equal(revenue.entries[0].plannedCents, null);
});

test("configuracao, banco indisponivel e estado invalido falham sem usar JSON local", async () => {
  await assert.rejects(readDatabaseSnapshot("obras-pvh", {}), /Configure/);
  await assert.rejects(
    readDatabaseSnapshot("obras-pvh", {
      ...env,
      SUPABASE_SECRET_KEY: "sb_publishable_test",
    }),
    /secreta/,
  );
  for (const snapshot of [null, {}, { works: [] }]) {
    await assert.rejects(
      readDatabaseSnapshot("obras-pvh", env, async () =>
        Response.json({ snapshot }),
      ),
      /ausente ou invalida/,
    );
  }
  await assert.rejects(
    readDatabaseSnapshot("obras-pvh", env, async () => {
      throw new Error("Network failed: sb_secret_test");
    }),
    (error: Error) => error.message === "Base de obras-pvh indisponivel.",
  );
  await assert.rejects(
    readDatabaseSnapshot("obras-pvh", env, async () =>
      Response.json(
        {
          code: "42501",
          message: "private server details",
        },
        { status: 403 },
      ),
    ),
    (error: Error) => error.message === "Base de obras-pvh indisponivel.",
  );
});
