import type { Metadata } from "next";
import { Download } from "lucide-react";
import { dateLabel } from "@/lib/display";
import { getContractsData, contractTotal } from "@/features/contratos/data";
import { ContractCatalog } from "@/features/contratos/Catalog";
import { contractCatalogView } from "@/features/contratos/catalog-view";
import { searchParamsQuery, type PageSearchParams } from "@/lib/catalog-query";
export const metadata: Metadata = {
  title: "Contratos municipais",
  description:
    "Consulte contratos municipais de Porto Velho, empresas, valores, vigência, documentos e obras vinculadas.",
};
export default async function Contracts({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  const { contractSnapshot, latestContracts } = await getContractsData();
  const total = contractTotal(latestContracts);
  const view = contractCatalogView(
    latestContracts,
    searchParamsQuery(await searchParams),
  );
  return (
    <main id="conteudo" className="container page-main catalog-page">
      <div className="catalog-heading">
        <div>
          <div className="page-kicker">
            <span>CONTRATOS MUNICIPAIS · PORTO VELHO/RO</span>
            <small>Coleta em {dateLabel(contractSnapshot.generatedAt)}</small>
          </div>
          <h1 className="page-title">Explore os contratos da cidade</h1>
          <p className="page-intro">
            Consulte empresas, objetos, valores e documentos dos contratos
            publicados pela Prefeitura de Porto Velho.
          </p>
        </div>
        <a
          className="total-summary"
          href="/dados/contratos.json"
          download
          aria-label="Baixar a base de contratos em JSON"
        >
          <span>
            <small>CONTRATOS NA BASE</small>
            <strong>{latestContracts.length.toLocaleString("pt-BR")}</strong>
          </span>
          <Download size={18} aria-hidden="true" />
        </a>
      </div>
      {contractSnapshot.syncStatus === "error" && (
        <div className="notice error" role="alert">
          A última coleta de contratos falhou. Exibimos a última base válida.
        </div>
      )}
      <ContractCatalog view={view} />
      <p className="overview-note">
        Incluímos o modelo “Contratos” da API, de todos os anos disponíveis. A
        base tem {total.count.toLocaleString("pt-BR")} contratos com valor
        informado. Há valores excepcionalmente elevados na origem; confira os
        documentos antes de comparar valores. Não apresentamos soma global.
        Situação e vigência são reproduzidas da fonte.
      </p>
    </main>
  );
}
