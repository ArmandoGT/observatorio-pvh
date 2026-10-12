import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { catalogPage, searchParamsQuery } from "../src/lib/catalog-query";
import { contractSnapshotSchema } from "../src/features/contratos/schema";
import { contractCatalogView } from "../src/features/contratos/catalog-view";
import { filterContracts } from "../src/features/contratos/filters";
import { revenueSnapshotSchema } from "../src/features/receitas/schema";
import { revenueDashboardView } from "../src/features/receitas/dashboard-view";
import {
  filterRevenueEntries,
  monthlyRevenueTotals,
  periodValue,
  revenueTotals,
} from "../src/features/receitas/filters";

test("paginacao limita paginas invalidas e query preserva acentos sem executar URLs", () => {
  for (const page of [
    "-1",
    "0",
    "Infinity",
    "1.5",
    "NaN",
    "99999999999999999999",
  ])
    assert.equal(catalogPage(`page=${page}`, 30).page, 1);
  assert.equal(catalogPage("page=99", 30).page, 3);
  assert.equal(catalogPage("page=2", 0).page, 1);
  assert.equal(
    new URLSearchParams(
      searchParamsQuery({
        q: ["educacao & saude", "ignorado"],
        page: "2",
        empty: undefined,
      }),
    ).get("q"),
    "educacao & saude",
  );
});

test("contratos envia apenas a pagina visivel e preserva filtros, ordem e opcoes", async () => {
  const snapshot = contractSnapshotSchema.parse(
    JSON.parse(await readFile("data/contracts-snapshot.json", "utf8")),
  );
  const contracts = snapshot.contracts.filter((c) => c.inLatestSnapshot);
  for (const query of [
    "",
    "page=2",
    "ordem=value",
    "ordem=signed&page=2",
    "q=educacao",
    "q=naoexiste12345&page=99",
    `ano=${contracts[0].year}&ordem=value`,
  ]) {
    const view = contractCatalogView(contracts, query);
    const expected = filterContracts(contracts, view.filters);
    assert.equal(view.count, expected.length);
    assert.deepEqual(
      view.rows.map((c) => c.id),
      expected.slice((view.page - 1) * 12, view.page * 12).map((c) => c.id),
    );
    assert.ok(view.rows.length <= 12);
    assert.deepEqual(
      view.options.statuses,
      [...new Set(contracts.map((c) => c.status))].sort(),
    );
    assert.equal(contractCatalogView(contracts, view.query).page, view.page);
  }
  const bytes = Buffer.byteLength(
    JSON.stringify(contractCatalogView(contracts, "")),
  );
  assert.ok(bytes < Buffer.byteLength(JSON.stringify(contracts)) * 0.05);
});

test("receitas envia linhas e agregados sem mudar totais mensais, cobertura ou ordenacao", async () => {
  const snapshot = revenueSnapshotSchema.parse(
    JSON.parse(await readFile("data/revenues-snapshot.json", "utf8")),
  );
  for (const query of [
    "",
    "page=2",
    "mes=1",
    "mes=12&ordem=planned",
    "ordem=account",
    "tipo=extra",
    "tipo=unknown",
    "ano=2025",
    "q=educacao",
    "q=naoexiste12345&page=99",
    `unidade=${encodeURIComponent(snapshot.entries[0].unitId)}`,
  ]) {
    const view = revenueDashboardView(snapshot, query);
    const entries = filterRevenueEntries(snapshot.entries, view.filters);
    assert.equal(view.count, entries.length);
    assert.deepEqual(view.totals, revenueTotals(entries, view.filters.month));
    assert.deepEqual(
      view.monthly.map(({ name, month, ...totals }) => totals),
      Array.from({ length: 12 }, (_, i) =>
        revenueTotals(entries, String(i + 1)),
      ),
    );
    const sorted = [...entries].sort((a, b) => {
      if (view.filters.sort === "account")
        return a.account.localeCompare(b.account);
      const av =
        view.filters.sort === "planned"
          ? a.plannedCents
          : periodValue(a, view.filters.month).cents;
      const bv =
        view.filters.sort === "planned"
          ? b.plannedCents
          : periodValue(b, view.filters.month).cents;
      return av === null
        ? bv === null
          ? a.id.localeCompare(b.id)
          : 1
        : bv === null
          ? -1
          : bv - av || a.id.localeCompare(b.id);
    });
    assert.deepEqual(
      view.rows.map((e) => e.id),
      sorted.slice((view.page - 1) * 12, view.page * 12).map((e) => e.id),
    );
    for (const row of view.rows)
      assert.deepEqual(
        row.received,
        periodValue(
          entries.find((e) => e.id === row.id)!,
          view.filters.month,
        ),
      );
    assert.ok(view.rows.length <= 12);
    assert.equal(revenueDashboardView(snapshot, view.query).page, view.page);
  }
  const bytes = Buffer.byteLength(
    JSON.stringify(revenueDashboardView(snapshot, "")),
  );
  assert.ok(bytes < Buffer.byteLength(JSON.stringify(snapshot)) * 0.05);
  const entries = structuredClone(snapshot.entries.slice(0, 2));
  entries[0].months = [
    { month: 1, cents: -100, documents: 1, missingValues: 0 },
  ];
  entries[1].months = [
    { month: 1, cents: null, documents: 2, missingValues: 2 },
    { month: 2, cents: 0, documents: 1, missingValues: 0 },
  ];
  entries[1].plannedCents = null;
  entries[1].missingPlannedValues = 1;
  assert.deepEqual(
    monthlyRevenueTotals(entries),
    Array.from({ length: 12 }, (_, i) => revenueTotals(entries, String(i + 1))),
  );
  assert.equal(monthlyRevenueTotals(entries)[2].realizedCents, null);
});
