import { ObrasOverview, ObrasSummary } from "@/features/obras/Overview";
import { ContractsOverview } from "@/features/contratos/Overview";
import { RevenueOverview } from "@/features/receitas/Overview";

export default function Home() {
  return (
    <main id="conteudo" className="home-page">
      <section className="hero container">
        <h1>
          <em>Porto Velho</em>, em dados.
        </h1>
        <p>
          Consulte obras, contratos e receitas municipais, com fontes e
          contexto.
        </p>
      </section>
      <section
        className="container home-modules"
        aria-label="Explore os dados da cidade"
      >
        <ObrasOverview />
        <ContractsOverview />
        <RevenueOverview />
      </section>
      <ObrasSummary />
    </main>
  );
}
