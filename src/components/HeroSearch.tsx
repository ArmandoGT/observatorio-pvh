"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { FigmaAsset } from "./FigmaAsset";

export function HeroSearch({ suggestions }: { suggestions: string[] }) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const focus = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", focus);
    return () => window.removeEventListener("keydown", focus);
  }, []);
  return (
    <div className="hero-search-container">
      <form action="/obras/" method="get" className="hero-search" role="search">
        <label className="hero-search-field">
          <FigmaAsset file="72712.svg" />
          <span className="sr-only">
            Buscar por obra, localização, contrato ou fornecedor
          </span>
          <input
            ref={input}
            type="search"
            name="q"
            placeholder="Pesquise uma obra, local, empresa ou contrato..."
          />
          <kbd title="Control ou Command + K">Ctrl K</kbd>
        </label>
        <button className="button" type="submit">
          Explorar obras <FigmaAsset file="1707e.svg" />
        </button>
      </form>
      {suggestions.length > 0 && (
        <div className="search-suggestions">
          <span>SUGESTÕES:</span>
          {suggestions.map((suggestion) => (
            <Link
              key={suggestion}
              href={`/obras/?q=${encodeURIComponent(suggestion)}`}
            >
              {suggestion}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
