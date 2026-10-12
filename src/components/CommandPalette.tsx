"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  ChartColumn,
  CircleDollarSign,
  CornerDownLeft,
  FileText,
  HardHat,
  House,
  Scale,
  Search,
  type LucideIcon,
} from "lucide-react";
import { searchKey } from "@/lib/display";

type Command = {
  id: string;
  label: string;
  hint: string;
  href: string;
  icon: LucideIcon;
  keywords?: string;
};

// Páginas do observatório; as palavras-chave ajudam quem busca pelo assunto, não pelo nome da seção.
const pages: Command[] = [
  {
    id: "inicio",
    label: "Início",
    hint: "Visão geral",
    href: "/",
    icon: House,
  },
  {
    id: "obras",
    label: "Obras públicas",
    hint: "Valores, situação e documentos",
    href: "/obras/",
    icon: HardHat,
    keywords: "pavimentacao praca drenagem bairro construcao",
  },
  {
    id: "contratos",
    label: "Contratos municipais",
    hint: "Empresas, valores e vigência",
    href: "/contratos/",
    icon: FileText,
    keywords: "empresa fornecedor cnpj processo licitacao aditivo",
  },
  {
    id: "receitas",
    label: "Receitas e orçamento",
    hint: "Previsão e arrecadação",
    href: "/receitas/",
    icon: CircleDollarSign,
    keywords: "arrecadacao imposto icms iss fundeb previsao orcamento",
  },
  {
    id: "indicadores",
    label: "Indicadores",
    hint: "Distribuição dos registros",
    href: "/indicadores/",
    icon: ChartColumn,
    keywords: "graficos numeros resumo",
  },
  {
    id: "metodologia",
    label: "Fontes e método",
    hint: "Origem, datas e limitações",
    href: "/metodologia/",
    icon: BookOpen,
    keywords: "metodologia limitacoes cobertura api fonte coleta",
  },
  {
    id: "termos",
    label: "Termos de uso",
    hint: "Licença e créditos",
    href: "/termos/",
    icon: Scale,
    keywords: "licenca privacidade creditos",
  },
];

const searchTargets = [
  { id: "buscar-obras", noun: "obras", href: "/obras/", icon: HardHat },
  {
    id: "buscar-contratos",
    noun: "contratos",
    href: "/contratos/",
    icon: FileText,
  },
  {
    id: "buscar-receitas",
    noun: "receitas",
    href: "/receitas/",
    icon: CircleDollarSign,
  },
];

export function CommandPalette() {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [shortcut, setShortcut] = useState("Ctrl K");

  const commands = useMemo(() => {
    const term = query.trim();
    const words = searchKey(term).split(/\s+/).filter(Boolean);
    const matchingPages = pages.filter((page) => {
      const haystack = searchKey(
        `${page.label} ${page.hint} ${page.keywords ?? ""}`,
      );
      return words.every((word) => haystack.includes(word));
    });
    if (!term) return matchingPages;
    return [
      ...searchTargets.map<Command>((target) => ({
        id: target.id,
        label: `Buscar “${term}” em ${target.noun}`,
        hint: "Abre a consulta já filtrada",
        href: `${target.href}?q=${encodeURIComponent(term)}`,
        icon: target.icon,
      })),
      ...matchingPages,
    ];
  }, [query]);

  function open() {
    setQuery("");
    setActive(0);
    dialog.current?.showModal();
    input.current?.focus();
  }
  function close() {
    dialog.current?.close();
  }
  function run(command: Command | undefined) {
    if (!command) return;
    close();
    router.push(command.href);
  }

  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform)) setShortcut("⌘ K");
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "");
      if (
        (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) ||
        (event.key === "/" && !typing)
      ) {
        event.preventDefault();
        if (dialog.current?.open) close();
        else open();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    document
      .getElementById(`comando-${commands[active]?.id}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, commands]);

  return (
    <>
      <button
        type="button"
        className="palette-trigger"
        onClick={open}
        aria-haspopup="dialog"
        aria-label="Buscar no observatório"
      >
        <Search size={18} aria-hidden="true" />
        <span className="palette-trigger-label">Buscar</span>
        <kbd aria-hidden="true">{shortcut}</kbd>
      </button>
      <dialog
        ref={dialog}
        className="palette"
        aria-label="Buscar no observatório"
        onClick={(event) => {
          if (event.target === dialog.current) close();
        }}
      >
        <div className="palette-panel">
          <div className="palette-field">
            <Search size={20} aria-hidden="true" />
            <input
              ref={input}
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls="palette-resultados"
              aria-activedescendant={
                commands[active] ? `comando-${commands[active].id}` : undefined
              }
              aria-autocomplete="list"
              autoComplete="off"
              spellCheck={false}
              placeholder="Busque uma obra, empresa, receita ou página"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActive((index) => (index + 1) % commands.length);
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActive(
                    (index) => (index - 1 + commands.length) % commands.length,
                  );
                } else if (event.key === "Enter") {
                  event.preventDefault();
                  run(commands[active]);
                }
              }}
            />
            <kbd aria-hidden="true">Esc</kbd>
          </div>
          <ul
            id="palette-resultados"
            role="listbox"
            aria-label="Resultados"
            className="palette-list"
          >
            {commands.map((command, index) => {
              const Icon = command.icon;
              return (
                <li
                  key={command.id}
                  id={`comando-${command.id}`}
                  role="option"
                  aria-selected={index === active}
                  className="palette-option"
                  onPointerMove={() => setActive(index)}
                  onClick={() => run(command)}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>
                    <strong>{command.label}</strong>
                    <small>{command.hint}</small>
                  </span>
                  {index === active && (
                    <CornerDownLeft
                      size={16}
                      aria-hidden="true"
                      className="palette-enter"
                    />
                  )}
                </li>
              );
            })}
            {!commands.length && (
              <li className="palette-empty" role="presentation">
                Nenhuma página com esse nome.
              </li>
            )}
          </ul>
          <p className="palette-footer" aria-hidden="true">
            <span>
              <kbd>↑</kbd>
              <kbd>↓</kbd> navegar
            </span>
            <span>
              <kbd>Enter</kbd> abrir
            </span>
            <span>
              <kbd>/</kbd> abre de qualquer página
            </span>
          </p>
        </div>
      </dialog>
    </>
  );
}
