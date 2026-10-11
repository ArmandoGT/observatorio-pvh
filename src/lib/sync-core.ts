import type { Snapshot, Work } from "./schema";
export function mergeWorks(previous: Work[], current: Work[]) {
  const ids = new Set(current.map((w) => w.id));
  if (ids.size !== current.length)
    throw new Error("IDs duplicados na origem; snapshot anterior preservado.");
  const before = new Map(previous.map((w) => [w.id, w]));
  const added = current.filter((w) => !before.has(w.id)).length;
  const updated = current.filter(
    (w) => before.has(w.id) && before.get(w.id)!.contentHash !== w.contentHash,
  ).length;
  const absent = previous
    .filter((w) => !ids.has(w.id))
    .map((w) => ({ ...w, inLatestSnapshot: false }));
  return {
    works: [...current, ...absent],
    changeSummary: {
      added,
      updated,
      unchanged: current.length - added - updated,
      notSeen: absent.length,
    },
  };
}
export function failureSnapshot(
  previous: Snapshot,
  error: string,
  attemptedAt: string,
): Snapshot {
  return {
    ...previous,
    lastAttemptAt: attemptedAt,
    syncStatus: "error",
    syncError: error,
  };
}
export function safePageUrl(value: string): string {
  const u = new URL(value);
  if (
    u.hostname !== "api.portovelho.ro.gov.br" ||
    u.pathname !== "/api/v1/obras" ||
    !["https:", "http:"].includes(u.protocol)
  )
    throw new Error("Link de paginação fora da origem permitida.");
  u.protocol = "https:";
  u.searchParams.set("por-pagina", "100");
  return u.href;
}
