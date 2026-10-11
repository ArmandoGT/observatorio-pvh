import Link from "next/link";
export default function NotFound() {
  return (
    <main id="conteudo" className="container empty-state">
      <span className="eyebrow">404 · REGISTRO NÃO ENCONTRADO</span>
      <h1>Esta página não está na base.</h1>
      <p>
        A obra pode não ter sido coletada ou o endereço pode estar incorreto.
      </p>
      <Link className="button" href="/obras/">
        Consultar obras
      </Link>
    </main>
  );
}
