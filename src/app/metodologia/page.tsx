import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, CheckCircle2, AlertCircle } from "lucide-react";
import { snapshot, latestWorks } from "@/lib/data";
import { dateLabel } from "@/lib/display";
import { FigmaAsset } from "@/components/FigmaAsset";
export const metadata: Metadata = { title: "Fontes e método" };

export default function Method() {
  const old = latestWorks.filter(
    (work) =>
      work.sourceUpdatedAt &&
      snapshot.generatedAt &&
      (Date.parse(snapshot.generatedAt) - Date.parse(work.sourceUpdatedAt)) /
        86400000 >
        180,
  ).length;
  return (
    <main id="conteudo" className="container page-main method-page">
      <header className="method-heading">
        <h1 className="page-title">
          Metodologia e Governança <em>de Dados</em>
        </h1>
        <p className="page-intro">
          Entenda a origem das informações, os processos de compilação, o
          significado de cada indicador e as limitações das fontes públicas de
          Porto Velho/RO.
        </p>
        <div className="method-meta">
          <span>
            <FigmaAsset file="9744b.svg" />
            Base coletada em {dateLabel(snapshot.generatedAt)}
          </span>
          <span>
            <FigmaAsset file="4d5f3.svg" />
            Dados públicos e fontes rastreáveis
          </span>
          <span>
            <FigmaAsset file="30907.svg" />
            Atualização acionada manualmente
          </span>
        </div>
      </header>
  
      <div className="method-accordions">
        <details className="method-accordion" id="fontes">
          <summary>
            <span className="accordion-icon">
              <FigmaAsset file="d03f3.svg" />
            </span>
            <span>
              <strong>De onde vêm os dados oficiais?</strong>
              <small>
                Origem, disponibilidade e datas das fontes consultadas
              </small>
            </span>
            <FigmaAsset file="f0243.svg" className="accordion-chevron" />
          </summary>
          <div className="accordion-content">
            <p>
              A coleta consulta a API de obras, percorre toda a paginação e
              busca contratos pelo identificador explicitamente vinculado.
              Despesas não são associadas por aproximação de nomes ou valores.
            </p>
            <div className="sources-grid">
              {snapshot.sources.map((source) => (
                <article className="source-card" key={source.id}>
                  <h3>{source.title}</h3>
                  <span
                    className={`source-state ${source.status === "available" ? "ok" : "unavailable"}`}
                  >
                    {source.status === "available" ? (
                      <CheckCircle2 size={13} />
                    ) : (
                      <AlertCircle size={13} />
                    )}
                    {source.status === "available"
                      ? "Acessível"
                      : source.status === "partial"
                        ? "Consulta parcial"
                        : "Indisponível"}
                    {source.httpStatus ? ` · HTTP ${source.httpStatus}` : ""}
                  </span>
                  <p>{source.note}</p>
                  <dl>
                    <div>
                      <dt>Verificada em</dt>
                      <dd>{dateLabel(source.checkedAt)}</dd>
                    </div>
                    <div>
                      <dt>Atualização</dt>
                      <dd>{source.updateFrequency}</dd>
                    </div>
                  </dl>
                  <a
                    className="text-link"
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Visitar fonte <ArrowUpRight size={13} />
                  </a>
                  {source.termsUrl && (
                    <a
                      className="text-link"
                      href={source.termsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Regras de uso <ArrowUpRight size={13} />
                    </a>
                  )}
                </article>
              ))}
            </div>
          </div>
        </details>
        <details className="method-accordion">
          <summary>
            <span className="accordion-icon">
              <FigmaAsset file="089c6.svg" />
            </span>
            <span>
              <strong>
                Qual a diferença entre contratado, pago e executado?
              </strong>
              <small>
                Entenda os indicadores sem confundir valores com avanço físico
              </small>
            </span>
            <FigmaAsset file="f0243.svg" className="accordion-chevron" />
          </summary>
          <div className="accordion-content">
            <div className="method-definitions">
              <article>
                <span>1. VALOR CONTRATADO</span>
                <h2>Valor da contratação</h2>
                <p>
                  Valor que a fonte publica para a contratação. Pode refletir o
                  contrato inicial ou atualizações; o campo não esclarece
                  sozinho a inclusão de aditivos.
                </p>
              </article>
              <article>
                <span>2. VALOR PAGO</span>
                <h2>Pagamento informado</h2>
                <p>
                  Pagamento acumulado publicado na ficha da obra. Não equivale
                  ao total empenhado ou ao avanço físico. Zero publicado é
                  diferente de campo ausente.
                </p>
              </article>
              <article>
                <span>3. EXECUÇÃO INFORMADA</span>
                <h2>Percentual da fonte</h2>
                <p>
                  A fonte não confirma se a execução é física ou financeira.
                  Preservamos o indicador sem inferir progresso físico por
                  divisão dos valores.
                </p>
              </article>
            </div>
          </div>
        </details>
        <details className="method-accordion" id="limites">
          <summary>
            <span className="accordion-icon icon-dark">
              <FigmaAsset file="fb526.svg" />
            </span>
            <span>
              <strong>Quais as limitações dos dados?</strong>
              <small>
                Transparência sobre cobertura, atualização e qualidade dos
                registros
              </small>
            </span>
            <FigmaAsset file="8ab77.svg" className="accordion-chevron" />
          </summary>
          <div className="accordion-content">
            <h2>Cobertura e atualização</h2>
            <ul className="prose-list">
              <li>
                <strong>{latestWorks.length} registros</strong> na última
                consulta completa. Não garantimos que a API contenha todas as
                obras municipais.
              </li>
              <li>
                Última coleta válida:{" "}
                <strong>{dateLabel(snapshot.generatedAt)}</strong>. Última
                tentativa: <strong>{dateLabel(snapshot.lastAttemptAt)}</strong>.
                Estado:{" "}
                <strong>
                  {snapshot.syncStatus === "ok"
                    ? "concluída"
                    : snapshot.syncStatus === "partial"
                      ? "parcial"
                      : snapshot.syncStatus === "error"
                        ? "falha"
                        : "ainda não executada"}
                </strong>
                .
              </li>
              <li>
                {old} registros têm data de atualização da fonte superior a 180
                dias em relação à coleta. É um sinal de antiguidade, sem
                atribuição de irregularidade.
              </li>
              <li>
                A periodicidade de publicação municipal não foi confirmada. A
                sincronização é acionada manualmente; a publicação estática
                exige nova construção após a coleta.
              </li>
              <li>
                Se a coleta falhar, conservamos a última base válida. Registros
                ausentes ficam preservados como históricos, fora dos totais da
                consulta atual.
              </li>
            </ul>
            {snapshot.syncError && (
              <div className="notice error">
                Última tentativa: {snapshot.syncError}
              </div>
            )}
            <h2>Qualidade e limites</h2>
            <ul className="prose-list">
              <li>
                Valores ausentes permanecem indisponíveis; zero informado
                continua zero.
              </li>
              <li>
                Datas futuras e divergências entre ficha da obra e contrato são
                sinalizadas, sem alteração dos dados oficiais.
              </li>
              <li>
                Localizações são textos livres. Não inferimos bairros, órgãos ou
                identidade de obras por semelhança de nomes.
              </li>
              <li>
                O portal mostra recortes por exercício. Datas globais não
                substituem a atualização individual de cada registro da API.
              </li>
              <li>
                Links de documentos são os publicados pela fonte. Este site não
                verifica o conteúdo de todos os anexos.
              </li>
              <li>
                Não há fotografias de campo, coordenadas verificadas, denúncias
                ou classificação automática de irregularidade nesta base.
              </li>
            </ul>
          </div>
        </details>
        <details className="method-accordion">
          <summary>
            <span className="accordion-icon icon-dark">
              <FigmaAsset file="ed556.svg" />
            </span>
            <span>
              <strong>Como o cidadão pode conferir por conta própria?</strong>
              <small>Do registro publicado ao documento original</small>
            </span>
            <FigmaAsset file="8ab77.svg" className="accordion-chevron" />
          </summary>
          <div className="accordion-content">
            <ol className="prose-list">
              <li>
                Encontre a obra pelo objeto, local, contrato ou fornecedor na{" "}
                <Link href="/obras/">consulta de obras</Link>.
              </li>
              <li>
                Confira a atualização da fonte, a data de coleta e as limitações
                na ficha.
              </li>
              <li>
                Compare a ficha da obra com o contrato explicitamente vinculado.
                Os valores podem divergir.
              </li>
              <li>
                Abra os anexos em “Contrato e Documentos” e as medições em
                “Histórico e Medições”. Ausência de documentos não comprova
                ausência de execução.
              </li>
              <li>
                Consulte o registro original antes de formular qualquer
                conclusão.
              </li>
            </ol>
          </div>
        </details>
      </div>
      
    </main>
  );
}
