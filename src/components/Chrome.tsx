import Link from "next/link";
import { FigmaAsset } from "./FigmaAsset";
import { Navigation } from "./Navigation";
import { observatory, worksModule } from "@/lib/observatory";

export function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link
          href="/"
          className="brand"
          aria-label={`${observatory.name}, início`}
        >
          <img
            src="/figma/bac06.png"
            width={160}
            height={32}
            alt=""
            className="brand-logo"
          />
          <span>
            Observatório <b>PVH</b>
          </span>
        </Link>
        <Navigation />
        <div className="header-actions">
          <a
            href={worksModule.downloadHref}
            download
            className="open-data-pill"
          >
            <span /> DADOS DE OBRAS
          </a>
          <Link href="/metodologia/#fontes" className="sources-link">
            <FigmaAsset file="601c7.svg" />
            Fontes de dados
          </Link>
          <Link
            href="/metodologia/#sobre"
            className="about-icon"
            aria-label="Sobre o Observatório"
          >
            <FigmaAsset file="b79c4.svg" />
          </Link>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-copy">
          <div className="footer-title">
            <Link href="/">Observatório PVH</Link>
            <span>TRANSPARÊNCIA CÍVICA</span>
          </div>
          <p>
            Iniciativa cívica e independente para compreender os dados públicos
            de Porto Velho/RO. Comece pelas obras municipais.
            <br />
            Sem vínculo com a administração pública.
          </p>
          <small>
            Dados compilados da API municipal e do Portal da Transparência.
            <br />
            Limitações, datas e fontes acompanham cada registro.
          </small>
        </div>
        <nav aria-label="Informações sobre o projeto">
          <Link href="/metodologia/">
            <FigmaAsset file="0c30f.svg" />
            Metodologia e fontes
          </Link>
          <Link href="/metodologia/#termos">
            <FigmaAsset file="16ebc.svg" />
            Termos e Dados Públicos
          </Link>
        </nav>
      </div>
    </footer>
  );
}
