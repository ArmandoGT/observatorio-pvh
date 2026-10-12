import type { RevenueSnapshot } from "../src/features/receitas/schema";
export function emptyRevenueSnapshot(at: string): RevenueSnapshot {
  return {
    schemaVersion: 1,
    portalId: 12535,
    generatedAt: at,
    lastAttemptAt: at,
    syncStatus: "ok",
    syncError: null,
    years: [],
    entries: [],
    sources: [],
  };
}
