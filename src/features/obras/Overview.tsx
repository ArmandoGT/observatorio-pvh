import Link from "next/link";
import { worksModule } from "@/lib/observatory";
import { snapshot, latestWorks } from "@/lib/data";
import { currency, dateLabel, sumKnown } from "@/lib/display";
import { FigmaAsset } from "@/components/FigmaAsset";

export function ObrasOverview() {
  const contracted = sumKnown(latestWorks, "contractedCents"),
    paid = sumKnown(latestWorks, "paidCents");
  return (
    <div className="works-overview">
      <section
        className="module-intro container"
        aria-labelledby="obras-heading"
      >
        <div className="module-heading">
          <div>
            <span className="eyebrow gold-text">MÓDULO DISPONÍVEL</span>
            <h2 id="obras-heading">{worksModule.title}</h2>
            <p>{worksModule.description}</p>
          </div>
          <Link href={worksModule.href} className="button button-secondary">
            Explorar obras <FigmaAsset file="6a0f6.svg" />
          </Link>
        </div>
      </section>
      <div className="container">
        <section
          className="overview"
          aria-label="Indicadores da base de obras municipais"
        >
          {snapshot.syncStatus === "error" && (
            <div className="notice error" role="alert">
              A última sincronização falhou. A base da última coleta válida foi
              preservada. Consulte Fontes e método.
            </div>
          )}
          {snapshot.syncStatus === "partial" && (
            <div className="notice" role="status">
              Coleta parcial de contratos. Alguns campos usam a última consulta
              válida ou estão indisponíveis.
            </div>
          )}
          <div className="stats">
            <article className="stat">
              <div className="metric-label">
                <span>OBRAS MAPEADAS</span>
                <FigmaAsset file="3273e.svg" />
              </div>
              <strong>{latestWorks.length || "—"}</strong>
              <p>registros presentes na base municipal consultada</p>
            </article>
            <article className="stat">
              <div className="metric-label">
                <span>TOTAL CONTRATADO</span>
                <FigmaAsset file="193fe.svg" />
              </div>
              <strong>{currency(contracted.cents, true)}</strong>
              <p>
                {contracted.count} de {latestWorks.length} registros com valor
                publicado
              </p>
            </article>
            <article className="stat">
              <div className="metric-label">
                <span>TOTAL PAGO</span>
                <FigmaAsset file="58f7b.svg" />
              </div>
              <strong>{currency(paid.cents, true)}</strong>
              <p>
                {paid.count} de {latestWorks.length} registros com valor
                publicado
              </p>
            </article>
          </div>
          <div className="collection-row">
            <span>
              <FigmaAsset file="26cbb.svg" />
              Última coleta: <strong>
                {dateLabel(snapshot.generatedAt)}
              </strong>{" "}
              · API municipal
            </span>
            <Link href="/metodologia/">COBERTURA E LIMITAÇÕES</Link>
          </div>
          <p className="overview-note">
            As somas incluem contratos de diferentes anos. Não representam o
            orçamento atual nem todas as obras da cidade.
          </p>
        </section>
      </div>
    </div>
  );
}
