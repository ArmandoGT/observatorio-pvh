import type { Metadata } from "next";
import { latestWorks, snapshot } from "@/lib/data";
import { WorkList } from "@/components/WorkList";
import { FigmaAsset } from "@/components/FigmaAsset";
import { currency, dateLabel, sumKnown } from "@/lib/display";
export const metadata: Metadata = { title: "Explorar obras" };
export default function Works() {
  return (
    <main id="conteudo" className="container page-main catalog-page">
      <div className="catalog-heading">
        <div>
          <div className="page-kicker">
            <span>BASE ABERTA · PORTO VELHO/RO</span>
            <small>Coleta em {dateLabel(snapshot.generatedAt)}</small>
          </div>
          <h1 className="page-title">Explore as obras da cidade</h1>
          <p className="page-intro">
            Pesquise, filtre e acompanhe informações sobre obras municipais com
            base nos registros públicos da API de Porto Velho.
          </p>
        </div>
        <a
          className="total-summary"
          href="/dados/obras.json"
          download
          aria-label="Baixar a base de obras em JSON"
        >
          <span>
            <small>TOTAL CONTRATADO</small>
            <strong>
              {currency(sumKnown(latestWorks, "contractedCents").cents, true)}
            </strong>
          </span>
          <span className="download-icon">
            <FigmaAsset file="841dc.svg" />
          </span>
        </a>
      </div>
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
      <WorkList works={latestWorks} />
      <p className="overview-note">
        Execução é o percentual publicado pela fonte, sem definição confirmada
        de avanço físico ou financeiro. Bairro padronizado não está disponível;
        use a busca por localização.
      </p>
    </main>
  );
}
