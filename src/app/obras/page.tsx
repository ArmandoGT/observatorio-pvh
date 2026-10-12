import type { Metadata } from "next";
import { getWorksData } from "@/lib/data";
import { WorkList } from "@/components/WorkList";
import { currency, dateLabel, sumKnown } from "@/lib/display";
import { oldWorkCount } from "@/lib/work-presentation";
export const metadata: Metadata = { title: "Explorar obras" };
export default async function Works() {
  const { latestWorks, snapshot } = await getWorksData();
  return (
    <main id="conteudo" className="container page-main catalog-page">
      <div className="catalog-heading">
        <div>
          <h1 className="page-title">Explore as obras da cidade</h1>
          <p className="page-intro">
            Encontre uma obra e confira valores, situação e documentos
            publicados pela Prefeitura.
          </p>
        </div>
        <a
          className="button button-secondary"
          href="/dados/obras.json"
          download
          aria-label="Baixar a base de obras em JSON"
        >
          Baixar dados — JSON
        </a>
      </div>
      <details className="catalog-provenance">
        <summary>
          Fonte e atualização · consulta em {dateLabel(snapshot.generatedAt)}
        </summary>
        <p>
          Consultado pelo Observatório em{" "}
          <strong>{dateLabel(snapshot.generatedAt)}</strong> ·{" "}
          {latestWorks.length} registros · Total contratado:{" "}
          {currency(sumKnown(latestWorks, "contractedCents").cents, true)}
        </p>
        <p>
          As somas abrangem diferentes anos e não representam todas as obras da
          cidade.
          {oldWorkCount(latestWorks, snapshot.generatedAt) > 0 && (
            <>
              {" "}
              {oldWorkCount(latestWorks, snapshot.generatedAt)} registros tinham
              atualização da Prefeitura há mais de 180 dias na data da coleta.
            </>
          )}{" "}
          <a href="/metodologia/#limites">Entenda a cobertura</a>.
        </p>
      </details>
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
        O percentual da fonte tem definição não confirmada: não comprova avanço
        físico da obra. Confira o contexto e os documentos no detalhe.
      </p>
    </main>
  );
}
