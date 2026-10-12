import Link from "next/link";
import { ObrasOverview } from "@/features/obras/Overview";
import { RecentUpdates } from "@/features/obras/RecentUpdates";
import { ContractsOverview } from "@/features/contratos/Overview";
import { RevenueOverview } from "@/features/receitas/Overview";
import { getWorksData } from "@/lib/data";
import { getContractsData } from "@/features/contratos/data";
import { getRevenueData } from "@/features/receitas/data";
import { dateLabel } from "@/lib/display";
import { HomeSearch } from "@/components/HomeSearch";
import { DataProvenance } from "@/components/DataProvenance";

export default async function Home() {
  const [works, contracts, revenue] = await Promise.all([
    getWorksData(),
    getContractsData(),
    getRevenueData(),
  ]);
  const collections = [
    { label: "obras", generatedAt: works.snapshot.generatedAt },
    { label: "contratos", generatedAt: contracts.contractSnapshot.generatedAt },
    { label: "receitas", generatedAt: revenue.revenueSnapshot.generatedAt },
  ];
  const latest = collections
    .map((c) => c.generatedAt)
    .filter((value): value is string => !!value)
    .sort()
    .at(-1);
  return (
    <main id="conteudo" className="home-page">
      <section className="hero container" aria-labelledby="home-title">
        <div className="hero-main">
          <Link href="/metodologia/" className="live-pill">
            <span className="live-dot" aria-hidden="true" />
            Dados coletados em {dateLabel(latest ?? null)}
          </Link>
          <h1 id="home-title">
            <em>Porto Velho</em>, em dados.
          </h1>
          <p>
            Consulte obras, contratos e receitas municipais, com fontes e
            contexto.
          </p>
          <HomeSearch
            scopes={[
              {
                id: "obras",
                label: "Obras",
                count: works.latestWorks.length.toLocaleString("pt-BR"),
                href: "/obras/",
                placeholder: "Obra, bairro ou empresa",
                examples: ["Flamboyant", "Pavimentação", "União Bandeirantes"],
              },
              {
                id: "contratos",
                label: "Contratos",
                count: contracts.latestContracts.length.toLocaleString("pt-BR"),
                href: "/contratos/",
                placeholder: "Número, objeto ou empresa",
                examples: ["SEMUSA", "Engenharia", "Higienização"],
              },
              {
                id: "receitas",
                label: "Receitas",
                href: "/receitas/",
                placeholder: "Receita, conta ou fonte",
                examples: ["ICMS", "ISSQN", "FUNDEB"],
              },
            ]}
          />
        </div>
        <RecentUpdates />
      </section>
      <section
        className="container home-modules"
        aria-label="Explore os dados da cidade"
      >
        <ObrasOverview />
        <ContractsOverview />
        <RevenueOverview />
      </section>
      <DataProvenance
        collections={collections}
        syncStatus={works.snapshot.syncStatus}
      />
    </main>
  );
}
