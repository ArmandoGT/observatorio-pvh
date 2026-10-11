"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="conteudo" className="container empty-state" role="alert">
      <h1>Não foi possível abrir esta página.</h1>
      <p>
        Tente novamente ou consulte o portal oficial de obras de Porto Velho.
      </p>
      <button className="button" onClick={reset}>
        Tentar novamente
      </button>
      <a href="https://transparencia.portovelho.ro.gov.br/obras">
        Consultar fonte oficial
      </a>
    </main>
  );
}
