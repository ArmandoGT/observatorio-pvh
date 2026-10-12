import type { Metadata } from "next";
import { getWorksData } from "@/lib/data";
import { ObrasIndicators } from "@/features/obras/Indicators";
import { ContractsIndicators } from "@/features/contratos/Indicators";
import { RevenueIndicators } from "@/features/receitas/Indicators";

export const metadata: Metadata = {
  title: "Indicadores",
  description:
    "Indicadores dos dados públicos de Porto Velho. Consulte obras, contratos e receitas municipais, com fontes e cobertura.",
};

export default async function Indicators() {
  const { snapshot } = await getWorksData();
  return (
    <main id="conteudo" className="container page-main indicators-page">
      <div className="page-kicker">
        <span>PORTO VELHO/RO · DADOS PÚBLICOS</span>
        <small>Datas de consulta indicadas por módulo</small>
      </div>
      <h1 className="page-title">Indicadores</h1>
      <p className="page-intro">
        Conheça a distribuição dos registros publicados pela cidade. Comece
        pelas obras, contratos e receitas municipais e consulte as fontes e os
        limites de cada indicador.
      </p>
      {snapshot.syncStatus === "error" && (
        <div className="notice error" role="alert">
          A última sincronização falhou. Exibimos a última base válida.
        </div>
      )}
      {snapshot.syncStatus === "partial" && (
        <div className="notice" role="status">
          A última consulta de contratos foi parcial.
        </div>
      )}
      <ObrasIndicators />
      <ContractsIndicators />
      <RevenueIndicators />
    </main>
  );
}
