import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowUpRight, FileText } from "lucide-react";
import { snapshot } from "@/lib/data";
import { contractsBySourceId } from "@/features/contratos/data";
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
import { BackToWorks } from "@/components/BackToWorks";
import { workTitle, groupWorkDocuments } from "@/lib/work-presentation";

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
  const linkedContract =
    work.contractId === null
      ? undefined
      : contractsBySourceId.get(work.contractId);
  const title = workTitle(work.title);

  const valueDiscrepancy =
    work.contractedCents !== null &&
    work.contractValueCents !== null &&
    work.contractedCents !== work.contractValueCents;
  const moneyIssues = work.issues.filter((issue) =>
    /valor|pago|pagamento/i.test(issue),
  );
  const dateIssues = work.issues.filter((issue) =>
    /data|vigência/i.test(issue),
  );
  const overview = (
    <>
      <div
        className="stats detail-metrics"
        aria-label="Valores publicados na ficha oficial da obra"
      >
        <article className="stat">
          <div className="metric-label">
            <span>Contratado na ficha da obra</span>
          </div>
          <strong>{currency(work.contractedCents)}</strong>
          <div className="metric-footnote">
            Contrato vinculado: {currency(work.contractValueCents)}
          </div>
          {valueDiscrepancy && (
            <div className="inline-context">
              <p>
                <strong>Os valores publicados são diferentes.</strong> A ficha
                da obra e o contrato vinculado informam valores distintos. Ambos
                são preservados.
              </p>
              <p>
                <a
                  href={work.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ver ficha original
                </a>
                {work.contractSourceUrl && (
                  <>
                    {" "}
                    ·{" "}
                    <a
                      href={work.contractSourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Ver contrato original
                    </a>
                  </>
                )}
              </p>
            </div>
          )}
        </article>
        <article className="stat">
          <div className="metric-label">
            <span>Pago na ficha da obra</span>
          </div>
          <strong>{currency(work.paidCents)}</strong>
          <p>Pagamento acumulado informado pela Prefeitura.</p>
          <div className="metric-footnote">
            Valor a medir informado: {currency(work.toMeasureCents)}
          </div>
          {moneyIssues
            .filter((issue) => !/contrato vinculado/i.test(issue))
            .map((issue, index) => (
              <div className="inline-context" key={index}>
                <p>{issue}</p>
              </div>
            ))}
        </article>
      </div>
      <section
        className="reported-percent"
        aria-label="Percentual informado pela fonte"
      >
        <strong>
          Percentual informado pela fonte:{" "}
          {percentLabel(work.reportedExecutionPercent)}
        </strong>
        <p>
          A Prefeitura não define se esse percentual é físico ou financeiro. Ele
          não comprova o avanço físico da obra.
          {work.reportedExecutionPercent === null &&
            " Ausência de dado não equivale a 0%."}{" "}
          <a className="text-link" href="#medicoes">
            Ver medições
          </a>
        </p>
      </section>
      <div className="detail-grid">
        <section className="surface-card work-summary">
          <h2>Sobre esta obra</h2>
          <dl className="summary-facts">
            <div>
              <dt>Empresa contratada</dt>
              <dd>
                {work.supplier ?? "Não informada"}
                {work.supplierDocument && (
                  <small>CNPJ: {work.supplierDocument}</small>
                )}
              </dd>
            </div>
            <div>
              <dt>Fim da vigência do contrato</dt>
              <dd>
                {dateLabel(work.contractEndsAt)}
                <small>Início da obra: {dateLabel(work.startedAt)}</small>
              </dd>
            </div>
          </dl>
          {dateIssues.length > 0 && (
            <div className="inline-context">
              {dateIssues.map((issue, index) => (
                <p key={index}>{issue}</p>
              ))}
              <a className="text-link" href="#medicoes">
                Conferir as datas publicadas
              </a>
            </div>
          )}
          {work.observation && (
            <div className="official-observation">
              <h3>Observação da Prefeitura</h3>
              <p>{work.observation}</p>
            </div>
          )}
          <p className="field-records">
            A base não fornece fotografias de campo nem execução física
            verificada para este registro.
          </p>
          <details className="integrity-details">
            <summary>Todas as observações deste registro</summary>
            <ul className="issue-list">
              {work.issues.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
            <p>
              As observações indicam limitações ou divergências nos campos, sem
              constituir alegação de irregularidade.
            </p>
          </details>
        </section>
        <aside className="detail-sidebar">
          <section className="surface-card source-box">
            <h2>Conferir na Prefeitura</h2>
            <p>
              Consulte o registro e os documentos oficiais para interpretar
              dados ausentes ou divergentes.
            </p>
            <a
              className="button button-secondary"
              href={work.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ver registro original{" "}
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
            <Link className="text-link" href="/metodologia/#limites">
              Conheça a cobertura e os limites
            </Link>
          </section>
        </aside>
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
            <dt>Fim da vigência do convênio</dt>
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
        <p>
          Valores e datas de pagamento informados pela Prefeitura. Uma medição é
          um registro de avaliação dos serviços da obra.
        </p>
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
        <h2>Datas da consulta</h2>
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
            <dd>
              {linkedContract ? (
                <Link href={`/contratos/${linkedContract.id}/`}>
                  {work.contractNumber ?? linkedContract.number}
                </Link>
              ) : (
                (work.contractNumber ?? "Não informado")
              )}
            </dd>
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
          <summary>Detalhes técnicos do registro</summary>
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
          <div>
            {groupWorkDocuments(work.documents).map((group) => (
              <section className="document-group" key={group.title}>
                <h3>{group.title}</h3>
                <ul>
                  {group.documents.map((document, index) => (
                    <li key={document.url + index}>
                      <a
                        href={document.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span>
                          <small>
                            Origem:{" "}
                            {document.kind === "contrato"
                              ? "registro do contrato"
                              : document.kind === "medicao"
                                ? "medição da obra"
                                : "ficha da obra"}
                          </small>
                          {document.title}
                        </span>
                        <ArrowUpRight size={16} aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
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
            <BackToWorks />
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
              </div>
              <h1>{title}</h1>
              <p className="detail-location">
                {work.locations.length
                  ? work.locations.join(" · ")
                  : "Localização não informada"}
              </p>
              <p>
                {work.organizationName ??
                  work.organization ??
                  "Responsável não informado"}
              </p>
              <dl className="work-dates">
                <div>
                  <dt>Atualizado pela Prefeitura</dt>
                  <dd>
                    {dateLabel(work.sourceUpdatedAt)}
                    {freshness(
                      work,
                      snapshot.generatedAt ?? work.collectedAt,
                    ) === "Registro com mais de 180 dias" && (
                      <small>Há mais de 180 dias na data da coleta</small>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Consultado pelo Observatório</dt>
                  <dd>{dateLabel(work.collectedAt)}</dd>
                </div>
              </dl>
              <details className="official-object">
                <summary>Objeto oficial completo</summary>
                <p>{work.title}</p>
              </details>
            </div>
            <div className="detail-actions">
              <ShareButton title={title} />
              <a href="#documentos" className="button button-soft">
                <FigmaAsset file="1d799.svg" />
                Ver documentos oficiais
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
