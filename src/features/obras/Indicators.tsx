import Link from "next/link";
import { latestWorks } from "@/lib/data";
import { FigmaAsset } from "@/components/FigmaAsset";

export function ObrasIndicators() {
  const statusCounts = [...new Set(latestWorks.map((work) => work.status))].map(
    (status) => ({
      status,
      count: latestWorks.filter((work) => work.status === status).length,
    }),
  );
  const organizations = [
    ...new Set(
      latestWorks
        .map((work) => work.organization)
        .filter((name): name is string => !!name),
    ),
  ]
    .map((name) => ({
      name,
      count: latestWorks.filter((work) => work.organization === name).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <section className="analytics" aria-labelledby="obras-indicators-heading">
      <div className="analytics-header">
        <div className="analytics-heading">
          <span className="icon-box" aria-hidden="true">
            <FigmaAsset file="2d89f.svg" />
          </span>
          <div>
            <h2 id="obras-indicators-heading">Obras públicas</h2>
            <p>{latestWorks.length} registros na base municipal consultada</p>
          </div>
        </div>
        <Link href="/obras/" className="button button-secondary">
          Explorar obras <FigmaAsset file="6a0f6.svg" />
        </Link>
      </div>
      <div className="analytics-grid">
        <section aria-labelledby="status-chart-heading">
          <h3 id="status-chart-heading">Obras por situação</h3>
          {statusCounts.length === 0 && (
            <p className="overview-note">Sem registros disponíveis na base.</p>
          )}
          {statusCounts.map(({ status, count }) => (
            <div className="chart-row" key={status}>
              <div>
                <span>{status}</span>
                <strong>{count}</strong>
              </div>
              <div className="chart-track" aria-hidden="true">
                <span
                  style={{ width: `${(count / latestWorks.length) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </section>
        <section aria-labelledby="organization-chart-heading">
          <h3 id="organization-chart-heading">Órgãos com mais registros</h3>
          <p className="chart-description">
            Os cinco órgãos com mais registros. As barras mostram a proporção
            sobre o total da base.
          </p>
          {organizations.length === 0 && (
            <p className="overview-note">Órgãos responsáveis indisponíveis.</p>
          )}
          {organizations.map(({ name, count }) => (
            <div className="chart-row" key={name}>
              <div>
                <span>{name}</span>
                <strong>{count}</strong>
              </div>
              <div className="chart-track" aria-hidden="true">
                <span
                  style={{ width: `${(count / latestWorks.length) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </section>
        <p className="overview-note">
          Contagens de registros publicados, sem classificação de irregularidade
          ou inferência de execução física. A base não cobre necessariamente
          todas as obras da cidade.{" "}
          <Link href="/metodologia/">Fontes e limites</Link>.
        </p>
      </div>
    </section>
  );
}
