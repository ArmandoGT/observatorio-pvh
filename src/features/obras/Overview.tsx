import Link from "next/link";
import { worksModule } from "@/lib/observatory";
import { snapshot, latestWorks } from "@/lib/data";
import { currency, dateLabel, sumKnown } from "@/lib/display";
import { WorkList } from "@/components/WorkList";
import { FigmaAsset } from "@/components/FigmaAsset";

export function ObrasOverview() {
  const contracted = sumKnown(latestWorks, "contractedCents"),
    paid = sumKnown(latestWorks, "paidCents");
  const statusCounts = [...new Set(latestWorks.map((w) => w.status))].map(
    (status) => ({
      status,
      count: latestWorks.filter((w) => w.status === status).length,
    }),
  );
  const organizations = [
    ...new Set(
      latestWorks.map((w) => w.organization).filter((s): s is string => !!s),
    ),
  ]
    .map((name) => ({
      name,
      count: latestWorks.filter((w) => w.organization === name).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
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
        <details className="analytics">
          <summary>
            <span className="analytics-heading">
              <span className="icon-box">
                <FigmaAsset file="2d89f.svg" />
              </span>
              <span>
                <strong>Indicadores de obras</strong>
                <small>
                  Distribuição de registros por situação e órgãos responsáveis
                  na base consultada
                </small>
              </span>
            </span>
            <span className="disclosure-action">
              VER INDICADORES <FigmaAsset file="a2a26.svg" />
            </span>
          </summary>
          <div className="analytics-grid">
            <section>
              <h2>Obras por situação</h2>
              {statusCounts.map(({ status, count }) => (
                <div className="chart-row" key={status}>
                  <div>
                    <span>{status}</span>
                    <strong>{count}</strong>
                  </div>
                  <div className="chart-track">
                    <span
                      style={{
                        width: `${latestWorks.length ? (count / latestWorks.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </section>
            <section>
              <h2>Órgãos com mais registros</h2>
              {organizations.map(({ name, count }) => (
                <div className="chart-row" key={name}>
                  <div>
                    <span>{name}</span>
                    <strong>{count}</strong>
                  </div>
                  <div className="chart-track">
                    <span
                      style={{
                        width: `${latestWorks.length ? (count / latestWorks.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </section>
            <p className="overview-note">
              Contagens de registros publicados, sem classificação de
              irregularidade ou inferência de execução física.
            </p>
          </div>
        </details>
        <section className="explore-section">
          <div className="section-heading">
            <div>
              <h2>Obras recentes na base consultada</h2>
              <p>
                Consulte os registros por atualização da fonte, com acesso aos
                documentos oficiais.
              </p>
            </div>
            <Link href="/obras/" className="text-link">
              Ver todas as {latestWorks.length} obras{" "}
              <FigmaAsset file="6a0f6.svg" />
            </Link>
          </div>
          <WorkList works={latestWorks} home />
        </section>
      </div>
    </div>
  );
}
