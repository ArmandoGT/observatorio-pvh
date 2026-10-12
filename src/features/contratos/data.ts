import data from "../../../data/contracts-snapshot.json";
import { contractSnapshotSchema, type ContractSummary } from "./schema";
export const contractSnapshot = contractSnapshotSchema.parse(data);
export const latestContracts = contractSnapshot.contracts.filter(
  (contract) => contract.inLatestSnapshot,
);
export const contractsById = new Map(
  contractSnapshot.contracts.map((contract) => [contract.id, contract]),
);
export const contractsBySourceId = new Map(
  contractSnapshot.contracts.map((contract) => [contract.sourceId, contract]),
);
export function contractSummaries(): ContractSummary[] {
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
export function contractTotal() {
  const known = latestContracts.filter(
    (contract) => contract.valueCents !== null,
  );
  return {
    count: known.length,
  };
}
