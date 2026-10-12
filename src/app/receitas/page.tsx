import type { Metadata } from "next";
import { RevenueDashboard } from "@/features/receitas/Dashboard";
import { getRevenueData } from "@/features/receitas/data";
import { revenueDashboardView } from "@/features/receitas/dashboard-view";
import { searchParamsQuery, type PageSearchParams } from "@/lib/catalog-query";
import { ArrowUpRight } from "lucide-react";
export const metadata: Metadata = {
  title: "Receitas e orçamento",
  description:
    "Previsão de receitas, arrecadação mensal e documentos de planejamento orçamentário de Porto Velho.",
};
const documents = [
  {
    name: "LOA",
    title: "Lei Orçamentária Anual",
    text: "Estimativas de receita e despesas fixadas para cada exercício. Consulte a lei e os anexos oficiais.",
    href: "https://transparencia.portovelho.ro.gov.br/arquivos?pasta=173",
  },
  {
    name: "LDO",
    title: "Lei de Diretrizes Orçamentárias",
    text: "Diretrizes e prioridades que orientam a elaboração do orçamento anual.",
    href: "https://transparencia.portovelho.ro.gov.br/arquivos?pasta=171",
  },
  {
    name: "PPA",
    title: "Plano Plurianual",
    text: "Programas e metas do planejamento de quatro anos. A pasta inclui leis e alterações publicadas.",
    href: "https://transparencia.portovelho.ro.gov.br/arquivos?pasta=168",
  },
];
export default async function RevenuePage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  const { revenueSnapshot } = await getRevenueData();
  const view = revenueDashboardView(
    revenueSnapshot,
    searchParamsQuery(await searchParams),
  );
  return (
    <main id="conteudo" className="container page-main revenue-page">
      <h1 className="page-title">Receitas e orçamento</h1>
      <p className="page-intro">
        Acompanhe quanto foi previsto e o que a fonte registrou de arrecadação.
        Explore as contas, os meses e as unidades gestoras, com acesso ao
        planejamento oficial.
      </p>
      {revenueSnapshot.syncStatus === "error" && (
        <div className="notice error" role="alert">
          A última coleta de receitas falhou. Exibimos a última base válida.
        </div>
      )}
      {revenueSnapshot.years.length ? (
        <RevenueDashboard view={view} />
      ) : (
        <div className="notice" role="status">
          Nenhum exercício de receitas está disponível na base consultada.
        </div>
      )}
      <section
        className="revenue-panel"
        aria-labelledby="budget-documents-heading"
      >
        <h2 id="budget-documents-heading">Planejamento e orçamento</h2>
        <p className="overview-note">
          Os documentos abrangem o orçamento municipal. O recorte de receitas
          acima considera apenas o portal da Prefeitura; valores de despesas não
          são inferidos a partir da arrecadação.
        </p>
        <div className="budget-documents">
          {documents.map((d) => (
            <a
              key={d.name}
              href={d.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>
                {d.name}
                <ArrowUpRight size={18} />
              </span>
              <h3>{d.title}</h3>
              <p>{d.text}</p>
              <small>Abrir documentos oficiais</small>
            </a>
          ))}
        </div>
      </section>
      <section
        className="revenue-panel revenue-method"
        aria-labelledby="revenue-method-heading"
      >
        <h2 id="revenue-method-heading">Como ler estes dados</h2>
        <p>
          A previsão anual vem de uma coleta separada de receitas previstas. O
          valor de orçamento repetido em cada documento de arrecadação não é
          somado. Anulações e outros valores negativos são preservados
          exatamente como publicados.
        </p>
        <p>
          Os resumos agrupam documentos por exercício, unidade, conta, fonte de
          recurso e tipo. Cada mês indica quantos documentos compõem seu valor.
          Contas sem arrecadação no período e campos sem valor permanecem
          indisponíveis, sem serem convertidos em zero.
        </p>
        <p>
          Os dados da API podem estar defasados; a data do último documento não
          garante atualização completa até aquele dia. Este módulo não
          representa saldo em caixa, execução de despesas ou orçamento
          consolidado de todos os órgãos do município.
        </p>
      </section>
    </main>
  );
}
