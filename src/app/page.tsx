import { ObrasOverview } from "@/features/obras/Overview";

export default function Home() {
  return (
    <main id="conteudo" className="home-page">
      <section className="hero container">
        <h1>
          <em>Porto Velho</em>, em dados.
        </h1>
        <p>
          Dados públicos com contexto para acompanhar a cidade. Explore as obras
          municipais, confira as fontes e entenda o que cada informação revela.
        </p>
      </section>
      <ObrasOverview />
    </main>
  );
}
