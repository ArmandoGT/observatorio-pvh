import Link from "next/link";
import Image from "next/image";
import { Github } from "lucide-react";
import { FigmaAsset } from "./FigmaAsset";
import { Navigation } from "./Navigation";
import { observatory } from "@/lib/observatory";

export function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link
          href="/"
          className="brand"
          aria-label={`${observatory.name}, início`}
        >
          <span className="brand-mark" aria-hidden="true">
            <Image
              src="/images/caixas-dagua-porto-velho.png"
              alt=""
              width={40}
              height={40}
              unoptimized
            />
          </span>
          <span className="brand-copy" aria-hidden="true">
            <span className="brand-name">
              Observatório <b>PVH</b>
            </span>
            <span className="brand-tagline">
              Dados públicos · Transparência municipal
            </span>
          </span>
        </Link>
        <Navigation />
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
          <Link href="/termos/">
            <FigmaAsset file="16ebc.svg" />
            Termos de uso
          </Link>
          <a
            href="https://github.com/santidev95/observatorio-pvh"
            className="footer-github"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Github size={20} aria-hidden="true" />
            Contribuir no GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
