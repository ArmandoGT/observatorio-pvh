"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { FigmaAsset } from "./FigmaAsset";

const tabs = [
  { id: "visao-geral", label: "Visão Geral e Indicadores", icon: "e72ba.svg" },
  { id: "medicoes", label: "Histórico e Medições", icon: "3e65c.svg" },
  { id: "documentos", label: "Contrato e Documentos", icon: "661ec.svg" },
];
export function DetailTabs({
  overview,
  history,
  documents,
}: {
  overview: ReactNode;
  history: ReactNode;
  documents: ReactNode;
}) {
  const [active, setActive] = useState("visao-geral");
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    const read = () => {
      const id = window.location.hash.slice(1);
      if (tabs.some((tab) => tab.id === id)) setActive(id);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  function select(index: number, focus = false) {
    const id = tabs[index].id;
    setActive(id);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}#${id}`,
    );
    if (focus) buttons.current[index]?.focus();
  }
  return (
    <>
      <div
        className="detail-tabs"
        role="tablist"
        aria-label="Informações da obra"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(element) => {
              buttons.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-controls={tab.id}
            aria-selected={active === tab.id}
            tabIndex={active === tab.id ? 0 : -1}
            onClick={() => select(index)}
            onKeyDown={(event) => {
              const next =
                event.key === "ArrowRight"
                  ? (index + 1) % tabs.length
                  : event.key === "ArrowLeft"
                    ? (index + tabs.length - 1) % tabs.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? tabs.length - 1
                        : null;
              if (next !== null) {
                event.preventDefault();
                select(next, true);
              }
            }}
          >
            <FigmaAsset file={tab.icon} />
            {tab.label}
          </button>
        ))}
      </div>
      {[overview, history, documents].map((content, index) => (
        <div
          className="detail-tab-panel"
          role="tabpanel"
          id={tabs[index].id}
          aria-labelledby={`tab-${tabs[index].id}`}
          hidden={active !== tabs[index].id}
          tabIndex={0}
          key={tabs[index].id}
        >
          {content}
        </div>
      ))}
    </>
  );
}
