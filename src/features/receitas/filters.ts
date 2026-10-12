import { searchKey } from "../../lib/display";
import type { RevenueEntry } from "./schema";

export interface RevenueFilters {
  year: string;
  unit: string;
  kind: string;
  category: string;
  q: string;
  month: string;
  sort: string;
}
export const revenueDefaults = (year: number): RevenueFilters => ({
  year: String(year),
  unit: "",
  kind: "budget",
  category: "",
  q: "",
  month: "",
  sort: "realized",
});
export function readRevenueFilters(
  query: string,
  year: number,
): RevenueFilters {
  const p = new URLSearchParams(query);
  const defaults = revenueDefaults(year);
  return {
    year: /^20\d{2}$/.test(p.get("ano") ?? "") ? p.get("ano")! : defaults.year,
    unit: p.get("unidade") ?? "",
    kind: ["budget", "extra", "unknown"].includes(p.get("tipo") ?? "")
      ? p.get("tipo")!
      : "budget",
    category: p.get("categoria") ?? "",
    q: (p.get("q") ?? "").slice(0, 200),
    month: /^(?:[1-9]|1[0-2])$/.test(p.get("mes") ?? "") ? p.get("mes")! : "",
    sort: ["planned", "account"].includes(p.get("ordem") ?? "")
      ? p.get("ordem")!
      : "realized",
  };
}
export function revenueFilterQuery(f: RevenueFilters, year: number) {
  const p = new URLSearchParams();
  for (const [key, value, normal] of [
    ["ano", f.year, String(year)],
    ["unidade", f.unit, ""],
    ["tipo", f.kind, "budget"],
    ["categoria", f.category, ""],
    ["q", f.q, ""],
    ["mes", f.month, ""],
    ["ordem", f.sort, "realized"],
  ])
    if (value !== normal) p.set(key, value);
  return p.toString();
}
export function filterRevenueEntries(
  entries: RevenueEntry[],
  f: RevenueFilters,
) {
  const q = searchKey(f.q.trim());
  return entries.filter(
    (e) =>
      e.inLatestSnapshot &&
      String(e.year) === f.year &&
      e.kind === f.kind &&
      (!f.unit || e.unitId === f.unit) &&
      (!f.category || e.category === f.category) &&
      (!q ||
        searchKey(
          [e.account, e.unitName, e.category, e.origin, e.fundingSource].join(
            " ",
          ),
        ).includes(q)),
  );
}
export function periodValue(entry: RevenueEntry, month = "") {
  const records = entry.months.filter(
    (m) => !month || String(m.month) === month,
  );
  const known = records.filter((m) => m.cents !== null);
  return {
    cents: known.length ? known.reduce((n, m) => n + m.cents!, 0) : null,
    documents: records.reduce((n, m) => n + m.documents, 0),
    missing: records.reduce((n, m) => n + m.missingValues, 0),
  };
}
export function revenueTotals(entries: RevenueEntry[], month = "") {
  const planned = entries.filter((e) => e.plannedCents !== null);
  const received = entries.map((e) => periodValue(e, month));
  const known = received.filter((e) => e.cents !== null);
  const plannedCents = planned.length
    ? planned.reduce((n, e) => n + e.plannedCents!, 0)
    : null;
  const realizedCents = known.length
    ? known.reduce((n, e) => n + e.cents!, 0)
    : null;
  const missing = received.reduce((n, e) => n + e.missing, 0);
  const missingPlanned = entries.reduce(
    (n, e) => n + e.missingPlannedValues,
    0,
  );
  return {
    plannedCents,
    realizedCents,
    missing,
    missingPlanned,
    documents: received.reduce((n, e) => n + e.documents, 0),
    percent:
      plannedCents !== null &&
      plannedCents > 0 &&
      realizedCents !== null &&
      !missing &&
      !missingPlanned &&
      entries.every((e) => e.kind === "budget")
        ? (realizedCents / plannedCents) * 100
        : null,
  };
}
export const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
export const shortLabel = (value: string) => value.replace(/^\d+\s*-\s*/, "");
