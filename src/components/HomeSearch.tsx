"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

type Scope = {
  id: string;
  label: string;
  count?: string;
  href: string;
  placeholder: string;
  examples: string[];
};

export function HomeSearch({ scopes }: { scopes: Scope[] }) {
  const router = useRouter();
  const [scopeId, setScopeId] = useState(scopes[0].id);
  const [query, setQuery] = useState("");
  const scope = scopes.find((item) => item.id === scopeId) ?? scopes[0];
  const target = (term: string) =>
    term.trim()
      ? `${scope.href}?q=${encodeURIComponent(term.trim())}`
      : scope.href;

  return (
    <form
      role="search"
      className="home-search"
      aria-label="Buscar nos dados da cidade"
      onSubmit={(event) => {
        event.preventDefault();
        router.push(target(query));
      }}
    >
      <fieldset className="home-search-scopes">
        <legend className="sr-only">Onde buscar</legend>
        {scopes.map((item) => (
          <label key={item.id} className="home-search-scope">
            <input
              type="radio"
              name="escopo"
              value={item.id}
              checked={item.id === scopeId}
              onChange={() => setScopeId(item.id)}
            />
            <span>
              {item.label}
              {item.count && <small>{item.count}</small>}
            </span>
          </label>
        ))}
      </fieldset>
      <div className="home-search-field">
        <Search size={22} aria-hidden="true" />
        <label htmlFor="busca-inicial" className="sr-only">
          Buscar em {scope.label.toLowerCase()}
        </label>
        <input
          id="busca-inicial"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          placeholder={scope.placeholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="submit" className="button">
          Buscar
        </button>
      </div>
      <p className="home-search-examples">
        <span>Experimente</span>
        {scope.examples.map((example) => (
          <Link key={example} href={target(example)}>
            {example}
          </Link>
        ))}
      </p>
    </form>
  );
}
