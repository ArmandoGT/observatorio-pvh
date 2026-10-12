import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, CheckCircle2, AlertCircle } from "lucide-react";
import { getWorksData } from "@/lib/data";
import { getContractsData } from "@/features/contratos/data";
import { getRevenueData } from "@/features/receitas/data";
import type { Snapshot } from "@/lib/schema";
import { dateLabel } from "@/lib/display";
import { FigmaAsset } from "@/components/FigmaAsset";
import { oldWorkCount } from "@/lib/work-presentation";
import { DisclosureAnchors } from "@/components/DisclosureAnchors";
export const metadata: Metadata = { title: "Fontes e método" };

function SourceCard({ source }: { source: Snapshot["sources"][number] }) {
  return (
    <article className="source-card">
      <h3>{source.title}</h3>
      <span
        className={`source-state ${source.status === "available" ? "ok" : "unavailable"}`}
      >
        {source.status === "available" ? (
          <CheckCircle2 size={16} aria-hidden="true" />
        ) : (
          <AlertCircle size={16} aria-hidden="true" />
        )}
        {source.status === "available"
          ? "Acessível na verificação"
          : source.status === "partial"
            ? "Consulta parcial"
            : "Indisponível na verificação"}
      </span>
      <dl>
        <div>
          <dt>Verificada em</dt>
          <dd>{dateLabel(source.checkedAt)}</dd>
        </div>
        <div>
          <dt>Frequência da Prefeitura</dt>
          <dd>{source.updateFrequency}</dd>
        </div>
      </dl>
      {source.status !== "available" && <p>{source.note}</p>}
      <a
        className="text-link"
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        Visitar fonte <ArrowUpRight size={16} aria-hidden="true" />
      </a>
      {source.termsUrl && (
        <a
          className="text-link"
          href={source.termsUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Regras de uso <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      )}
      <details className="source-technical">
        <summary>Detalhes técnicos da consulta</summary>
        {source.httpStatus && <p>Resposta HTTP: {source.httpStatus}</p>}
        <p>{source.note}</p>
      </details>
    </article>
  );
}

export default async function Method() {
  const [
    { snapshot, latestWorks },
    { contractSnapshot, latestContracts },
    { revenueSnapshot },
  ] = await Promise.all([getWorksData(), getContractsData(), getRevenueData()]);
  const old = oldWorkCount(latestWorks, snapshot.generatedAt);
  return (
    <main id="conteudo" className="container page-main method-page">
      <DisclosureAnchors />
      <header className="method-heading">
        <h1 className="page-title">Fontes e método</h1>
        <p className="page-intro">
          Saiba de onde vêm os dados, quando foram consultados e o que eles
          permitem concluir.
        </p>
        <section
          className="method-summary"
          aria-label="Origem, coleta e cobertura"
        >
          <dl className="module-collections">
            <div>
              <dt>Obras · {latestWorks.length} registros</dt>
              <dd>Coleta em {dateLabel(snapshot.generatedAt)}</dd>
            </div>
            <div>
              <dt>
                Contratos · {latestContracts.length.toLocaleString("pt-BR")}
              </dt>
              <dd>Coleta em {dateLabel(contractSnapshot.generatedAt)}</dd>
            </div>
            <div>
              <dt>
                Receitas ·{" "}
                {revenueSnapshot.years.map((year) => year.year).join(" e ")}
              </dt>
              <dd>Coleta em {dateLabel(revenueSnapshot.generatedAt)}</dd>
            </div>
          </dl>
          <p>
            Os dados vêm dos sistemas e do Portal da Transparência da
            Prefeitura. O Observatório é uma iniciativa cívica independente.
          </p>
          <p>
            <strong>Coleta recente não significa registro recente.</strong> A
            frequência de publicação municipal não foi confirmada.
            {old > 0 && (
              <>
                {" "}
                Na coleta de obras, {old} de {latestWorks.length} registros
                tinham atualização da fonte há mais de 180 dias.
              </>
            )}
          </p>
          <p>
            Os registros disponíveis podem não cobrir todas as obras da cidade.
            Contratado, pago e percentual informado são medidas diferentes;
            pagamentos não comprovam avanço físico.
          </p>
        </section>
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
              A Prefeitura publica os registros em um sistema de dados (API).
              Consultamos obras e contratos separadamente. Uma obra só é
              associada ao contrato cujo identificador foi publicado na sua
              ficha.
            </p>
            <details className="source-technical">
              <summary>Como os registros são compilados</summary>
              <p>
                A coleta percorre todas as páginas da API de obras. O catálogo
                de contratos percorre todas as páginas do modelo “Contratos”, em
                todos os anos disponíveis. Obras e contratos são associados
                somente pelo ID publicado pela fonte. Despesas não são
                associadas por aproximação de nomes ou valores.
              </p>
            </details>
            <p>
              O módulo de receitas coleta separadamente previsões anuais e
              documentos de arrecadação do portal da Prefeitura. Entradas
              extraorçamentárias não compõem os indicadores de receita
              orçamentária, e valores negativos são preservados. Consulte os
              recortes e a cobertura na{" "}
              <Link href="/receitas/">página de Receitas e orçamento</Link>.
            </p>
            {[
              { title: "Obras", sources: snapshot.sources },
              { title: "Contratos", sources: contractSnapshot.sources },
              { title: "Receitas", sources: revenueSnapshot.sources },
            ].map((group) => (
              <details className="source-group" key={group.title}>
                <summary>
                  {group.title} · {group.sources.length} fontes consultadas
                </summary>
                <div className="sources-grid">
                  {group.sources.map((source) => (
                    <SourceCard key={source.id} source={source} />
                  ))}
                </div>
              </details>
            ))}
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
                <span>3. PERCENTUAL INFORMADO PELA FONTE</span>
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
                <strong>
                  {latestContracts.length.toLocaleString("pt-BR")} contratos
                </strong>{" "}
                do modelo “Contratos” na API municipal. Outros instrumentos,
                como convênios e termos de fomento, não estão incluídos neste
                catálogo. Coleta válida de contratos:{" "}
                {dateLabel(contractSnapshot.generatedAt)}; última tentativa:{" "}
                {dateLabel(contractSnapshot.lastAttemptAt)}.
              </li>
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
                sincronização é programada diariamente às 06:17, no horário de
                Porto Velho, e também pode ser acionada manualmente. A base
                persistida é consultada a cada acesso, sem nova construção após
                a coleta.
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
                Abra os anexos em “Documentos” e as medições em “Histórico”.
                Ausência de documentos não comprova ausência de execução.
              </li>
              <li>
                Consulte o registro original antes de formular qualquer
                conclusão.
              </li>
            </ol>
          </div>
        </details>
      </div>
      <section className="method-about" id="sobre">
        <h2>Sobre o Observatório</h2>
        <p>
          Iniciativa cívica independente, sem vínculo com a administração
          pública. Apresentamos os registros publicados com suas fontes e
          limitações. Dados ausentes ou divergentes exigem contexto antes de
          qualquer conclusão.
        </p>
        <Link className="text-link" href="/termos/">
          Termos de uso
        </Link>
      </section>
    </main>
  );
}
