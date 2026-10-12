import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  signedCents,
  RevenueAccumulator,
} from "../src/features/receitas/normalize";
import { revenuePageUrl } from "../src/features/receitas/sync-core";
import {
  filterRevenueEntries,
  periodValue,
  revenueDefaults,
  revenueTotals,
  revenueFilterQuery,
  readRevenueFilters,
} from "../src/features/receitas/filters";
import { revenueSnapshotSchema } from "../src/features/receitas/schema";

const at = "2026-10-12T12:00:00Z";
export const revenueRaw = (
  id: string | number,
  amount: unknown,
  extras: Record<string, unknown> = {},
) => ({
  id,
  ano: 2026,
  portal_id: 12535,
  unidade_gestora_id: "u1",
  unidadeGestora: { nome: "Educação" },
  unidade_gestora: { nome: "Educação" },
  receita_sigla: "O",
  mes: "01 - Janeiro",
  data_documento: "2026-01-10",
  natureza_orcamentaria: {
    plano_conta: "111 - Impostos",
    fonte_recurso: "1500 - Recursos livres",
    plano_conta_categoria: "100 - Correntes",
    plano_conta_origem: "110 - Impostos",
  },
  valor_orcamento: amount,
  valor_documento: amount,
  ...extras,
});
test("receitas: centavos preservam negativos, zero, ausentes e precisão", () => {
  assert.equal(
    signedCents({ formatted: "-1.978,39", value: -1978.39 }),
    -197839,
  );
  assert.equal(signedCents("0"), 0);
  assert.equal(signedCents(null), null);
  assert.equal(signedCents("inválido"), null);
  assert.equal(signedCents("99999999999999999999"), null);
});
test("receitas: previsão separada não se multiplica pelos documentos; anulações e extra são separadas", () => {
  const a = new RevenueAccumulator(2026, at);
  a.add(revenueRaw(0, "1000,00"), true);
  a.add(revenueRaw(0, "0"), true); // ID zero e mesma chave são linhas publicadas distintas
  a.add(revenueRaw("r1", "300,00"), false);
  a.add(revenueRaw("r2", "-50,00"), false);
  a.add(revenueRaw("r3", "900,00", { receita_sigla: "EX" }), false);
  const entries = a.finish();
  const budget = filterRevenueEntries(entries, revenueDefaults(2026));
  assert.equal(budget.length, 1);
  assert.equal(budget[0].plannedLines, 2);
  assert.deepEqual(periodValue(budget[0]), {
    cents: 25000,
    documents: 2,
    missing: 0,
  });
  assert.equal(revenueTotals(budget).plannedCents, 100000);
  assert.equal(revenueTotals(budget).percent, 25);
  assert.equal(revenueTotals(entries).percent, null);
  assert.equal(periodValue(budget[0], "2").cents, null);
});
test("receitas: valores ausentes não se tornam zero, somas parciais não produzem percentuais", () => {
  const a = new RevenueAccumulator(2026, at);
  a.add(revenueRaw(0, "100,00"), true);
  a.add(revenueRaw("r1", "0"), false);
  a.add(revenueRaw("r2", null), false);
  const totals = revenueTotals(a.finish());
  assert.equal(totals.realizedCents, 0);
  assert.equal(totals.missing, 1);
  assert.equal(totals.percent, null);
});
test("receitas: IDs repetidos, escopo misturado e datas divergentes rejeitam a coleta", () => {
  const a = new RevenueAccumulator(2026, at);
  a.add(revenueRaw("r1", 10), false);
  assert.throws(() => a.add(revenueRaw("r1", 10), false), /duplicados/);
  assert.throws(
    () => a.add(revenueRaw("r2", 10, { ano: 2025 }), false),
    /exercício/,
  );
  assert.throws(
    () => a.add(revenueRaw("r3", 10, { portal_id: 12537 }), false),
    /portal/,
  );
  assert.throws(
    () => a.add(revenueRaw("r4", 10, { data_documento: "2026-02-01" }), false),
    /divergentes/,
  );
  assert.throws(
    () => a.add(revenueRaw("r5", 10, { mes: "13 - Inválido" }), false),
    /Mês/,
  );
});
test("receitas: paginação restaura portal, exercício e tamanho; rejeita links externos e saltos inválidos", () => {
  const url = new URL(
    revenuePageUrl(
      "/receitas",
      2026,
      "http://api.portovelho.ro.gov.br/api/v1/receitas?page=2&ano=2024&portal_id=12537",
    ),
  );
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("ano"), "2026");
  assert.equal(url.searchParams.get("portal_id"), "12535");
  assert.equal(url.searchParams.get("por-pagina"), "1000");
  for (const link of [
    "https://example.org/api/v1/receitas?page=2",
    "https://api.portovelho.ro.gov.br/api/v1/contratos?page=2",
    "https://api.portovelho.ro.gov.br/api/v1/receitas?page=-1",
  ])
    assert.throws(() => revenuePageUrl("/receitas", 2026, link));
});
test("receitas: filtros com acentos sobrevivem à URL e hashes não mudam por data de coleta", () => {
  const a = new RevenueAccumulator(2026, at);
  a.add(revenueRaw("r1", 10), false);
  const first = a.finish();
  const b = new RevenueAccumulator(2026, "2026-10-13T12:00:00Z");
  b.add(revenueRaw("r1", 10), false);
  const second = b.finish(first);
  assert.equal(first[0].contentHash, second[0].contentHash);
  assert.equal(first[0].lastChangedAt, second[0].lastChangedAt);
  const f = { ...revenueDefaults(2026), q: "educacao", month: "1" };
  assert.deepEqual(readRevenueFilters(revenueFilterQuery(f, 2026), 2026), f);
  assert.equal(filterRevenueEntries(second, f).length, 1);
});
test("receitas: download coincide com o snapshot e a contagem de documentos e previsões fecha por ano", async () => {
  const snapshot = revenueSnapshotSchema.parse(
    JSON.parse(await readFile("data/revenues-snapshot.json", "utf8")),
  );
  assert.deepEqual(
    JSON.parse(await readFile("data/exports/receitas.json", "utf8")),
    snapshot,
  );
  assert.equal(
    new Set(snapshot.entries.map((e) => e.id)).size,
    snapshot.entries.length,
  );
  for (const y of snapshot.years) {
    const current = snapshot.entries.filter(
      (e) => e.year === y.year && e.inLatestSnapshot,
    );
    assert.equal(
      current.reduce((n, e) => n + e.plannedLines, 0),
      y.planned,
    );
    assert.equal(
      current.reduce((n, e) => n + periodValue(e).documents, 0),
      y.receipts,
    );
  }
});
