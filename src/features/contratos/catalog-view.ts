import type { Contract } from "./schema";
import {
  filterContracts,
  readContractFilters,
  contractFilterQuery,
} from "./filters";
import { catalogPage, catalogQuery } from "../../lib/catalog-query";

export function contractCatalogView(contracts: Contract[], query: string) {
  const filters = readContractFilters(query);
  const filtered = filterContracts(contracts, filters);
  const { page, pages, start, end } = catalogPage(query, filtered.length);
  return {
    filters,
    query: catalogQuery(contractFilterQuery(filters), page),
    page,
    pages,
    count: filtered.length,
    rows: filtered.slice(start, end).map((contract) => ({
      id: contract.id,
      number: contract.number,
      object: contract.object,
      organization: contract.organization,
      organizationName: contract.organizationName,
      process: contract.process,
      suppliers: contract.suppliers.map((supplier) => ({
        name: supplier.name,
      })),
      valueCents: contract.valueCents,
      startsAt: contract.startsAt,
      endsAt: contract.endsAt,
      status: contract.status,
    })),
    options: {
      years: [
        ...new Set(
          contracts.flatMap((c) => (c.year === null ? [] : [String(c.year)])),
        ),
      ].sort((a, b) => Number(b) - Number(a)),
      orgs: [
        ...new Set(
          contracts.flatMap((c) => (c.organization ? [c.organization] : [])),
        ),
      ].sort(),
      statuses: [...new Set(contracts.map((c) => c.status))].sort(),
    },
  };
}

export type ContractCatalogView = ReturnType<typeof contractCatalogView>;
