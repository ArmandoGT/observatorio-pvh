import type { Contract, ContractSnapshot } from "./schema";
export const contractListUrl =
  "https://api.portovelho.ro.gov.br/api/v1/contratos?modelo=Contratos&por-pagina=100";
export function safeContractPageUrl(value: string) {
  const url = new URL(value);
  if (
    url.hostname !== "api.portovelho.ro.gov.br" ||
    url.pathname !== "/api/v1/contratos" ||
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error("Link de paginação de contratos fora da origem permitida.");
  url.protocol = "https:";
  url.searchParams.set("por-pagina", "100");
  url.searchParams.set("modelo", "Contratos");
  return url.href;
}
export function mergeContracts(previous: Contract[], current: Contract[]) {
  const ids = new Set(current.map((item) => item.id));
  if (ids.size !== current.length)
    throw new Error(
      "IDs de contratos duplicados na origem; base anterior preservada.",
    );
  const before = new Map(previous.map((item) => [item.id, item]));
  const added = current.filter((item) => !before.has(item.id)).length;
  const updated = current.filter(
    (item) =>
      before.has(item.id) &&
      before.get(item.id)!.contentHash !== item.contentHash,
  ).length;
  const absent = previous
    .filter((item) => !ids.has(item.id))
    .map((item) => ({ ...item, inLatestSnapshot: false }));
  return {
    contracts: [...current, ...absent],
    changeSummary: {
      added,
      updated,
      unchanged: current.length - added - updated,
      notSeen: absent.length,
    },
  };
}
export function failedContractSnapshot(
  previous: ContractSnapshot,
  error: string,
  at: string,
): ContractSnapshot {
  return {
    ...previous,
    lastAttemptAt: at,
    syncStatus: "error",
    syncError: error,
    sources: previous.sources.map((source) => ({
      ...source,
      status: "unavailable",
      httpStatus: null,
      checkedAt: at,
      note: `Última tentativa falhou: ${error}`,
    })),
  };
}
