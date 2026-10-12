import "server-only";
import { cache } from "react";
import { getDatabaseSnapshot } from "../../lib/database";
import type { Contract, ContractSummary } from "./schema";

export const getContractsData = cache(async () => {
  const contractSnapshot = await getDatabaseSnapshot("contratos-pvh");
  const latestContracts = contractSnapshot.contracts.filter(
    (contract) => contract.inLatestSnapshot,
  );
  return {
    contractSnapshot,
    latestContracts,
    contractsById: new Map(
      contractSnapshot.contracts.map((contract) => [contract.id, contract]),
    ),
    contractsBySourceId: new Map(
      contractSnapshot.contracts.map((contract) => [
        contract.sourceId,
        contract,
      ]),
    ),
  };
});

export function contractSummaries(
  latestContracts: Contract[],
): ContractSummary[] {
  return latestContracts.map(
    ({
      id,
      sourceId,
      number,
      year,
      object,
      organization,
      organizationName,
      status,
      category,
      valueCents,
      signedAt,
      startsAt,
      endsAt,
      suppliers,
      sourceUpdatedAt,
      process,
    }) => ({
      id,
      sourceId,
      number,
      year,
      object,
      organization,
      organizationName,
      status,
      category,
      valueCents,
      signedAt,
      startsAt,
      endsAt,
      suppliers,
      sourceUpdatedAt,
      process,
    }),
  );
}
export function contractTotal(latestContracts: Contract[]) {
  const known = latestContracts.filter(
    (contract) => contract.valueCents !== null,
  );
  return {
    count: known.length,
  };
}
