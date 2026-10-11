import type { Metadata } from "next";
import { snapshot } from "@/lib/data";
import { dateLabel } from "@/lib/display";
import { ObrasIndicators } from "@/features/obras/Indicators";

export const metadata: Metadata = {
  title: "Indicadores",
  description:
    "Indicadores dos dados públicos de Porto Velho. Consulte a distribuição das obras municipais por situação e órgão responsável.",
};

export default function Indicators() {
  return (
    <main id="conteudo" className="container page-main indicators-page">
      <div className="page-kicker">
        <span>PORTO VELHO/RO · DADOS PÚBLICOS</span>
        <small>Coleta em {dateLabel(snapshot.generatedAt)}</small>
      </div>
      <h1 className="page-title">Indicadores</h1>
      <p className="page-intro">
        Conheça a distribuição dos registros publicados pela cidade. Comece
        pelas obras municipais e consulte as fontes e os limites de cada
        indicador.
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
    </main>
  );
}
