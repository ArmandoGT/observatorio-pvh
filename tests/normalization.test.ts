import { test } from "node:test";
import assert from "node:assert/strict";
import {
  moneyToCents,
  parseDate,
  parsePercent,
  normalizeWork,
  officialUrl,
  stableHash,
} from "../src/lib/normalize";
import { failureSnapshot, mergeWorks, safePageUrl } from "../src/lib/sync-core";
import { sumKnown } from "../src/lib/display";
import { snapshotSchema } from "../src/lib/schema";
const collected = "2026-10-11T12:00:00Z";
// Synthetic records exist only in tests. The published dataset contains official records.
const fixture = {
  id: 1,
  nome: "EXEMPLO SINTÉTICO DE TESTE",
  situacao: "Em Andamento",
  valor_contratado: { value: 1234.56 },
  valor_pago: { value: 0 },
  porcentagem_executado: null,
  localizacoes: [],
  updated_at: "2026-10-01T00:00:00Z",
};
const work = () => normalizeWork(fixture, null, collected);
test("monetary formats preserve cents and distinguish null from published zero", () => {
  assert.equal(moneyToCents({ value: 7198737.06 }), 719873706);
  assert.equal(moneyToCents("R$ 1.234,56"), 123456);
  assert.equal(moneyToCents("0.00"), 0);
  assert.equal(moneyToCents(null), null);
  assert.equal(moneyToCents(""), null);
  assert.equal(moneyToCents("unknown"), null);
  assert.equal(moneyToCents("-1"), null);
  assert.equal(moneyToCents("9".repeat(30)), null);
});
test("unknown execution remains absent and is never inferred from payments", () => {
  const w = work();
  assert.equal(w.paidCents, 0);
  assert.equal(w.reportedExecutionPercent, null);
  assert.equal(w.contractedCents, 123456);
  assert.equal(parsePercent("101"), null);
  assert.equal(parsePercent("26,92%"), 26.92);
});
test("calendar validation rejects impossible dates", () => {
  assert.equal(parseDate("31/02/2026"), null);
  assert.equal(parseDate("29/02/2024"), "2024-02-29");
  assert.equal(parseDate("2025-02-29"), null);
  assert.equal(parseDate("23/07/2026"), "2026-07-23");
});
test("future dates are preserved with an explicit quality issue", () => {
  const w = normalizeWork(
    { ...fixture, data_contrato: "2026-12-15", data_inicio: "2025-04-25" },
    null,
    collected,
  );
  assert.equal(w.contractDateFromWork, "2026-12-15");
  assert.ok(w.issues.some((i) => i.includes("futuro")));
  assert.ok(w.issues.some((i) => i.includes("antecede")));
});
test("unsafe links never become published document links", () => {
  assert.equal(officialUrl("javascript:alert(1)"), null);
  assert.equal(officialUrl("https://portovelho.ro.gov.br.evil.test/x"), null);
  assert.equal(
    officialUrl("http://api.portovelho.ro.gov.br/api/v1/obras/1"),
    "https://api.portovelho.ro.gov.br/api/v1/obras/1",
  );
});
test("HTML observations become plain text and untrusted documents are dropped", () => {
  const w = normalizeWork(
    {
      ...fixture,
      observacao: "<p>Texto <b>oficial</b> &amp; contexto</p>",
      anexos: [{ name: "teste", original_url: "javascript:alert(1)" }],
    },
    null,
    collected,
  );
  assert.equal(w.observation, "Texto oficial & contexto");
  assert.deepEqual(w.documents, []);
});
test("stable content hash ignores object key order", () => {
  assert.equal(stableHash({ b: 2, a: 1 }), stableHash({ a: 1, b: 2 }));
});
test("incremental repeat updates collection without changing first seen or content change time", () => {
  const initial = work(),
    repeat = normalizeWork(fixture, null, "2026-10-12T12:00:00Z", initial);
  assert.equal(initial.contentHash, repeat.contentHash);
  assert.equal(initial.firstSeenAt, repeat.firstSeenAt);
  assert.equal(initial.lastChangedAt, repeat.lastChangedAt);
  assert.notEqual(initial.collectedAt, repeat.collectedAt);
  assert.deepEqual(mergeWorks([initial], [repeat]).changeSummary, {
    added: 0,
    updated: 0,
    unchanged: 1,
    notSeen: 0,
  });
});
test("missing records remain historical and duplicates are rejected", () => {
  const result = mergeWorks([work()], []);
  assert.equal(result.works[0].inLatestSnapshot, false);
  assert.equal(result.changeSummary.notSeen, 1);
  assert.throws(() => mergeWorks([], [work(), work()]), /duplicados/);
});
test("failed synchronization preserves the last valid dataset and generation date", () => {
  const prior = snapshotSchema.parse({
    schemaVersion: 1,
    generatedAt: collected,
    lastAttemptAt: collected,
    syncStatus: "ok",
    syncError: null,
    sourceTotal: 1,
    works: [work()],
    sources: [],
    changeSummary: { added: 1, updated: 0, unchanged: 0, notSeen: 0 },
  });
  const failed = failureSnapshot(prior, "HTTP 502", "2026-10-12T12:00:00Z");
  assert.deepEqual(failed.works, prior.works);
  assert.equal(failed.generatedAt, prior.generatedAt);
  assert.equal(failed.syncStatus, "error");
});
test("all missing values produce an unavailable total, never a misleading zero", () => {
  const w = work();
  w.contractedCents = null;
  assert.deepEqual(sumKnown([w], "contractedCents"), { cents: null, count: 0 });
  assert.deepEqual(sumKnown([work()], "paidCents"), { cents: 0, count: 1 });
});
test("pagination upgrades municipal HTTP links and rejects a different endpoint or host", () => {
  assert.equal(
    safePageUrl("http://api.portovelho.ro.gov.br/api/v1/obras?page=2"),
    "https://api.portovelho.ro.gov.br/api/v1/obras?page=2&por-pagina=100",
  );
  assert.throws(() => safePageUrl("https://evil.test/api/v1/obras"));
  assert.throws(() =>
    safePageUrl("https://api.portovelho.ro.gov.br/api/v1/contratos"),
  );
});
