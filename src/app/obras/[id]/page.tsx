import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowUpRight, FileText } from "lucide-react";
import { snapshot } from "@/lib/data";
import {
  contractLabel,
  currency,
  dateLabel,
  percentLabel,
  freshness,
} from "@/lib/display";
import { Status } from "@/components/Status";
import { FigmaAsset } from "@/components/FigmaAsset";
import { ShareButton } from "@/components/ShareButton";
import { DetailTabs } from "@/components/DetailTabs";

export const dynamicParams = false;
export function generateStaticParams() {
  return snapshot.works.length
    ? snapshot.works.map((work) => ({ id: work.id }))
    : [{ id: "base-indisponivel" }];
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title:
      snapshot.works.find((work) => work.id === id)?.title ??
      "Obra não encontrada",
  };
}

export default async function WorkDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params,
    work = snapshot.works.find((item) => item.id === id);
  if (!snapshot.works.length && id === "base-indisponivel")
    return (
      <main id="conteudo" className="container page-main empty-state">
        <h1>A base de obras está indisponível.</h1>
        <p>
          Nenhuma obra foi coletada. Consulte as fontes e o estado da última
          tentativa.
        </p>
        <Link className="button" href="/metodologia/">
          Consultar fontes e método
        </Link>
      </main>
    );
  if (!work) notFound();
  const title =
    work.title === work.title.toUpperCase()
      ? work.title.charAt(0) + work.title.slice(1).toLowerCase()
      : work.title;

  const overview = (
    <>
      <div
        className="stats detail-metrics"
        aria-label="Valores publicados na ficha oficial da obra"
      >
        <article className="stat">
          <div className="metric-label">
            <span>VALOR TOTAL CONTRATADO</span>
            <FigmaAsset file="8f5b1.svg" />
          </div>
          <strong>{currency(work.contractedCents)}</strong>
          <p>Valor publicado na ficha oficial da obra.</p>
          <div className="metric-footnote">
            Contrato vinculado: {currency(work.contractValueCents)}
          </div>
        </article>
        <article className="stat">
          <div className="metric-label">
            <span>VALOR PAGO</span>
            <FigmaAsset file="e2912.svg" />
          </div>
          <strong>{currency(work.paidCents)}</strong>
          <p>Pagamento acumulado informado pela fonte.</p>
          <div className="metric-footnote">
            Valor a medir: {currency(work.toMeasureCents)}
          </div>
        </article>
        <article className="stat">
          <div className="metric-label">
            <span>EXECUÇÃO INFORMADA</span>
            <FigmaAsset file="e938f.svg" />
          </div>
          <strong className="gold-text">
            {percentLabel(work.reportedExecutionPercent)}
          </strong>
          <p>A fonte não define se o percentual é físico ou financeiro.</p>
          {work.reportedExecutionPercent !== null ? (
            <div
              className="progress-track"
              role="meter"
              aria-label="Execução informada pela fonte"
              aria-valuenow={work.reportedExecutionPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span style={{ width: `${work.reportedExecutionPercent}%` }} />
            </div>
          ) : (
            <div className="metric-footnote">
              Ausência de dado não equivale a 0%.
            </div>
          )}
        </article>
      </div>
      <section className="explainer-banner">
        <span className="icon-box">
          <FigmaAsset file="30f20.svg" />
        </span>
        <div>
          <h2>COMO FUNCIONA O ACOMPANHAMENTO PÚBLICO?</h2>
          <p>
            Contratado, pago e executado são medidas diferentes. Não calculamos
            execução física a partir dos pagamentos. Confira as medições e os
            documentos originais.
          </p>
        </div>
        <a className="text-link" href="#medicoes">
          Ver histórico de medições <FigmaAsset file="419d1.svg" />
        </a>
      </section>
      <div className="detail-grid">
        <section className="surface-card work-summary">
          <h2 className="accent-heading">Resumo da Obra e Locais Publicados</h2>
          <dl className="summary-facts">
            <div>
              <dt>EMPRESA CONTRATADA</dt>
              <dd>
                {work.supplier ?? "Não informada"}
                {work.supplierDocument && (
                  <small>CNPJ: {work.supplierDocument}</small>
                )}
              </dd>
            </div>
            <div>
              <dt>VIGÊNCIA DO CONTRATO</dt>
              <dd className="gold-text">
                {dateLabel(work.contractEndsAt)}
                <small>Início da obra: {dateLabel(work.startedAt)}</small>
              </dd>
            </div>
            <div>
              <dt>ÓRGÃO RESPONSÁVEL</dt>
              <dd>{work.organizationName ?? "Não informado"}</dd>
            </div>
            <div>
              <dt>PROCESSO</dt>
              <dd>{work.process ?? "Não informado"}</dd>
            </div>
          </dl>
          <h3 className="small-label">LOCAIS INFORMADOS NA FONTE:</h3>
          <div className="location-tags">
            {work.locations.length ? (
              work.locations.map((location) => (
                <span key={location}>
                  <span className="gold-dot" />
                  {location}
                </span>
              ))
            ) : (
              <p>Localização não informada.</p>
            )}
          </div>
          {work.observation && (
            <div className="official-observation">
              <h3 className="small-label">OBSERVAÇÃO OFICIAL:</h3>
              <p>{work.observation}</p>
            </div>
          )}
          <div className="field-records">
            <h3 className="small-label">REGISTROS DE CAMPO:</h3>
            <p>
              A base consultada não fornece fotografias de campo nem execução
              física verificada para este registro.
            </p>
          </div>
        </section>
        <aside className="detail-sidebar">
          <section className="surface-card location-card">
            <div className="card-heading">
              <h2 className="small-label">LOCALIZAÇÃO PUBLICADA</h2>
              <FigmaAsset file="63956.svg" />
            </div>
            <div className="location-panel">
              {work.locations.length ? (
                work.locations.map((location) => (
                  <p key={location}>{location}</p>
                ))
              ) : (
                <p>Não informada na fonte.</p>
              )}
              <small>
                Bairro padronizado: {work.neighborhood ?? "não disponível"}
                <br />A fonte não fornece coordenadas verificadas para exibir um
                mapa.
              </small>
            </div>
          </section>
          <section className="surface-card source-box">
            <h2>
              <FigmaAsset file="53414.svg" />
              Consulta cidadã
            </h2>
            <p>
              Confira os registros e anexos oficiais. Dados ausentes ou
              divergentes exigem contexto antes de qualquer conclusão.
            </p>
            <a
              className="button button-secondary"
              href={work.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Consultar registro original <ArrowUpRight size={14} />
            </a>
            <Link className="text-link" href="/metodologia/#limites">
              Conheça os limites da base
            </Link>
          </section>
        </aside>
      </div>
      <section className="surface-card limitations-card">
        <h2 className="accent-heading">Leia com contexto</h2>
        <ul className="issue-list">
          {work.issues.map((issue, index) => (
            <li key={index}>{issue}</li>
          ))}
        </ul>
        <p>
          As observações indicam limitações ou divergências nos campos, sem
          constituir alegação de irregularidade.
        </p>
      </section>
      <div className="explainer-banner legal-banner">
        <span className="icon-box">
          <FigmaAsset file="aeaa4.svg" />
        </span>
        <p>
          Dados públicos extraídos da API municipal de Porto Velho. Iniciativa
          cívica independente, com origem e limitações rastreáveis.
        </p>
        <Link className="button button-secondary" href="/metodologia/#sobre">
          Sobre o Observatório
        </Link>
      </div>
    </>
  );

  const history = (
    <div className="detail-grid">
      <div className="surface-card">
        <h2 className="accent-heading">O tempo da obra</h2>
        <dl className="facts">
          <div>
            <dt>Data do contrato na ficha da obra</dt>
            <dd>{dateLabel(work.contractDateFromWork)}</dd>
          </div>
          <div>
            <dt>Assinatura no contrato vinculado</dt>
            <dd>{dateLabel(work.contractSignedAt)}</dd>
          </div>
          <div>
            <dt>Início da obra</dt>
            <dd>{dateLabel(work.startedAt)}</dd>
          </div>
          <div>
            <dt>Início da vigência do contrato</dt>
            <dd>{dateLabel(work.contractStartsAt)}</dd>
          </div>
          <div>
            <dt>Fim da vigência do contrato</dt>
            <dd>{dateLabel(work.contractEndsAt)}</dd>
          </div>
          <div>
            <dt>Vigência do convênio</dt>
            <dd>{dateLabel(work.agreementEndsAt)}</dd>
          </div>
          <div>
            <dt>Campo “Execução” da fonte</dt>
            <dd>
              {work.executionRaw ?? "Não informado"}
              <small>
                Sem definição confirmada. Não é tratado como prazo de conclusão.
              </small>
            </dd>
          </div>
        </dl>
        <h2 className="accent-heading">Medições publicadas</h2>
        {work.measurements.length ? (
          <div className="table-scroll">
            <table>
              <caption className="sr-only">
                Medições e datas de pagamento informadas pela fonte
              </caption>
              <thead>
                <tr>
                  <th scope="col">Medição</th>
                  <th scope="col">Valor</th>
                  <th scope="col">Pagamento informado</th>
                </tr>
              </thead>
              <tbody>
                {work.measurements.map((measurement, index) => (
                  <tr key={index}>
                    <th scope="row">{measurement.title}</th>
                    <td>{currency(measurement.amountCents)}</td>
                    <td>{dateLabel(measurement.paidAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="notice">
            Nenhuma medição foi publicada na API para este registro. Isso não
            comprova ausência de execução.
          </div>
        )}
      </div>
      <aside className="surface-card">
        <h2>Rastreabilidade da coleta</h2>
        <dl className="facts">
          <div>
            <dt>Primeira coleta</dt>
            <dd>{dateLabel(work.firstSeenAt)}</dd>
          </div>
          <div>
            <dt>Última alteração detectada</dt>
            <dd>{dateLabel(work.lastChangedAt)}</dd>
          </div>
          <div>
            <dt>Registro atualizado na fonte</dt>
            <dd>{dateLabel(work.sourceUpdatedAt)}</dd>
          </div>
          <div>
            <dt>Contrato atualizado na fonte</dt>
            <dd>{dateLabel(work.contractUpdatedAt)}</dd>
          </div>
        </dl>
        <p>
          Datas da fonte e da coleta têm significados diferentes. Não há
          frequência oficial confirmada de publicação.
        </p>
      </aside>
    </div>
  );

  const documents = (
    <div className="detail-grid">
      <section className="surface-card">
        <h2 className="accent-heading">O contrato por trás da obra</h2>
        <dl className="facts">
          <div>
            <dt>Número do contrato</dt>
            <dd>{work.contractNumber ?? "Não informado"}</dd>
          </div>
          <div>
            <dt>Fornecedor</dt>
            <dd>
              {work.supplier ?? "Não informado"}
              {work.supplierDocument && (
                <small>CNPJ: {work.supplierDocument}</small>
              )}
            </dd>
          </div>
          <div>
            <dt>Órgão contratante</dt>
            <dd>{work.organizationName ?? "Não informado"}</dd>
          </div>
          <div>
            <dt>Processo</dt>
            <dd>{work.process ?? "Não informado"}</dd>
          </div>
          <div>
            <dt>Modelo de contratação</dt>
            <dd>{work.procurement ?? "Não informado"}</dd>
          </div>
          <div>
            <dt>Convênio / repasse</dt>
            <dd>{work.agreement ?? "Não informado"}</dd>
          </div>
          <div>
            <dt>Valor no contrato vinculado</dt>
            <dd>
              {currency(work.contractValueCents)}
              <small>Este campo pode divergir do valor na ficha da obra.</small>
            </dd>
          </div>
          <div>
            <dt>Atualização do contrato</dt>
            <dd>{dateLabel(work.contractUpdatedAt)}</dd>
          </div>
        </dl>
        {work.contractSourceUrl && (
          <a
            className="text-link"
            href={work.contractSourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Consultar registro original do contrato <ArrowUpRight size={16} />
          </a>
        )}
        <details className="integrity-details">
          <summary>Identificador e integridade</summary>
          <p>ID da fonte: {work.sourceId}</p>
          <code>{work.contentHash}</code>
        </details>
      </section>
      <aside className="surface-card documents-box">
        <div className="sidebar-heading">
          <FileText size={20} />
          <h2>Documentos oficiais</h2>
          <span>{work.documents.length}</span>
        </div>
        {work.documents.length ? (
          <ul>
            {work.documents.map((document) => (
              <li key={document.url}>
                <a
                  href={document.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>
                    <small>
                      {document.kind === "obra"
                        ? "OBRA"
                        : document.kind === "contrato"
                          ? "CONTRATO"
                          : "MEDIÇÃO"}
                    </small>
                    {document.title}
                  </span>
                  <ArrowUpRight size={16} />
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p>Nenhum documento vinculado disponível na API.</p>
        )}
        <small>
          Links publicados pela fonte. A disponibilidade e o conteúdo de cada
          arquivo podem variar.
        </small>
      </aside>
    </div>
  );

  return (
    <main id="conteudo" className="detail-page">
      <div className="detail-context">
        <div className="container">
          <div className="detail-breadcrumb">
            <Link href="/obras/">
              <FigmaAsset file="7b963.svg" />
              EXPLORAR OBRAS
            </Link>
            <span>/</span>
            <span>PORTO VELHO · REGISTRO {work.sourceId}</span>
            <span className="contract-reference">
              {contractLabel(work.contractNumber)}
            </span>
          </div>
          <div className="detail-heading">
            <div>
              <div className="detail-tags">
                <Status value={work.status} />
                <span className="category">
                  {work.category ?? "OBRA MUNICIPAL"}
                </span>
                <span className="source-updated">
                  <FigmaAsset file="2b588.svg" />
                  Atualizado na fonte em {dateLabel(work.sourceUpdatedAt)}
                </span>
              </div>
              <h1>{title}</h1>
              <p>
                {work.organizationName ?? "Órgão não informado"} · Coletado em{" "}
                {dateLabel(work.collectedAt)} ·{" "}
                {freshness(work, snapshot.generatedAt ?? work.collectedAt)}
              </p>
            </div>
            <div className="detail-actions">
              <ShareButton title={title} />
              <a href="#documentos" className="button button-soft">
                <FigmaAsset file="1d799.svg" />
                Auditar Documentos
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="container detail-content">
        {!work.inLatestSnapshot && (
          <div className="notice error">
            Este registro não apareceu na última coleta completa. A ficha
            histórica foi preservada; confirme a situação na fonte.
          </div>
        )}
        {snapshot.syncStatus !== "ok" && (
          <div className="notice">
            A última sincronização está{" "}
            {snapshot.syncStatus === "error" ? "com falha" : "parcial"}. Confira
            o estado da coleta em Fontes e método.
          </div>
        )}
        <DetailTabs
          overview={overview}
          history={history}
          documents={documents}
        />
      </div>
    </main>
  );
}
