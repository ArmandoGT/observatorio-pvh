"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FileSearch, X } from "lucide-react";
import type { Work } from "@/lib/schema";
import { contractLabel, currency, percentLabel } from "@/lib/display";
import {
  defaultFilters,
  filterQuery,
  filterWorks,
  readFilters,
  type Filters,
} from "@/lib/work-filters";
import { Status } from "./Status";
import { FigmaAsset } from "./FigmaAsset";

const labelTitle = (s: string) =>
  s === s.toUpperCase() ? s.charAt(0) + s.slice(1).toLowerCase() : s;

export function WorkList({
  works,
  home = false,
}: {
  works: Work[];
  home?: boolean;
}) {
  const [filters, setFilters] = useState<Filters>(defaultFilters),
    [page, setPage] = useState(1);
  useEffect(() => {
    if (home) return;
    const read = () => {
      setFilters(readFilters(window.location.search));
      setPage(1);
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, [home]);
  const statuses = [...new Set(works.map((w) => w.status))].sort();
  const orgs = [
    ...new Set(
      works.map((w) => w.organization).filter((s): s is string => !!s),
    ),
  ].sort();
  const neighborhoods = [
    ...new Set(
      works.map((w) => w.neighborhood).filter((s): s is string => !!s),
    ),
  ].sort();
  const update = (patch: Partial<Filters>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    setPage(1);
    const query = filterQuery(next);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query ? "?" + query : ""}`,
    );
  };
  const filtered = useMemo(
    () => (home ? works : filterWorks(works, filters)),
    [works, filters, home],
  );
  const limit = home ? 5 : 12,
    pages = Math.ceil(filtered.length / limit),
    shown = filtered.slice((page - 1) * limit, page * limit);
  const active = !!(
    filters.q ||
    filters.status ||
    filters.org ||
    filters.neighborhood ||
    filters.sort !== "updated"
  );

  return (
    <section
      className={`work-list ${home ? "recent-works" : "catalog-works"}`}
      id="explorar"
      aria-label="Consulta de obras"
    >
      {!home && (
        <div className="search-panel">
          <label className="search-field">
            <FigmaAsset file="a4191.svg" />
            <span className="sr-only">
              Buscar por obra, localização, contrato, fornecedor ou órgão
            </span>
            <input
              value={filters.q}
              onChange={(e) => update({ q: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Escape") update({ q: "" });
              }}
              placeholder="Buscar por nome da obra, contrato, local ou empreiteira..."
              type="search"
            />
            <kbd>ESC</kbd>
          </label>
          <div className="filter-row">
            <div className="filter-selects">
              <label className="select-wrap">
                <span className="sr-only">Situação</span>
                <select
                  value={filters.status}
                  onChange={(e) => update({ status: e.target.value })}
                >
                  <option value="">Situação: Todas</option>
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <FigmaAsset file="82f2d.svg" />
              </label>
              <label
                className="select-wrap"
                title={
                  !neighborhoods.length
                    ? "A fonte não oferece bairro padronizado. Use a busca por localização."
                    : undefined
                }
              >
                <span className="sr-only">Bairro</span>
                <select
                  value={filters.neighborhood}
                  disabled={!neighborhoods.length}
                  onChange={(e) => update({ neighborhood: e.target.value })}
                >
                  <option value="">
                    {neighborhoods.length
                      ? "Bairro: Todos"
                      : "Bairro: Indisponível"}
                  </option>
                  {neighborhoods.map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
                <FigmaAsset file="82f2d.svg" />
              </label>
              <label className="select-wrap">
                <span className="sr-only">Órgão responsável</span>
                <select
                  value={filters.org}
                  disabled={!orgs.length}
                  onChange={(e) => update({ org: e.target.value })}
                >
                  <option value="">Órgão: Todos</option>
                  {orgs.map((org) => (
                    <option key={org}>{org}</option>
                  ))}
                </select>
                <FigmaAsset file="82f2d.svg" />
              </label>
              {active && (
                <button
                  className="clear-button"
                  onClick={() => update(defaultFilters)}
                >
                  <X size={13} />
                  Limpar filtros
                </button>
              )}
            </div>
            <div
              className="status-filters"
              aria-label="Filtros rápidos por situação"
            >
              <button
                aria-pressed={!filters.status}
                onClick={() => update({ status: "" })}
              >
                Todas ({works.length})
              </button>
              {statuses.map((status) => (
                <button
                  key={status}
                  aria-pressed={filters.status === status}
                  onClick={() => update({ status })}
                >
                  {status} ({works.filter((w) => w.status === status).length})
                </button>
              ))}
            </div>
          </div>
          <div className="results-bar">
            <span role="status" aria-live="polite">
              <span className="gold-dot" />
              Exibindo <strong>{filtered.length}</strong>{" "}
              {filtered.length === 1 ? "obra" : "obras"}
            </span>
            <label className="sort-select">
              Ordenar:
              <select
                aria-label="Ordenação"
                value={filters.sort}
                onChange={(e) => update({ sort: e.target.value })}
              >
                <option value="updated">Atualização da fonte</option>
                <option value="value">Maior valor contratado</option>
                <option value="name">Nome da obra</option>
              </select>
              <FigmaAsset file="62026.svg" />
            </label>
          </div>
        </div>
      )}
      {shown.length ? (
        <div className="works-table-card">
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Tabela de obras; role horizontalmente em telas pequenas"
          >
            <table
              className={`works-table ${home ? "compact-table" : "catalog-table"}`}
            >
              <caption className="sr-only">
                {home
                  ? "Cinco obras mais recentemente atualizadas na fonte"
                  : "Obras da base municipal que correspondem aos filtros"}
              </caption>
              <thead>
                <tr>
                  <th scope="col">
                    {home ? "OBRA / PROJETO" : "OBRA E DETALHES"}
                  </th>
                  <th scope="col">
                    {home ? "LOCALIZAÇÃO" : "ÓRGÃO E LOCALIZAÇÃO"}
                  </th>
                  <th scope="col" className={home ? "" : "numeric"}>
                    {home ? "ÓRGÃO" : "VALORES (CONTRATADO / PAGO)"}
                  </th>
                  <th scope="col" className={home ? "numeric" : ""}>
                    {home ? "VALOR CONTRATADO" : "EXECUÇÃO INFORMADA"}
                  </th>
                  <th scope="col" className="center">
                    SITUAÇÃO
                  </th>
                  <th scope="col" className="action-column">
                    AÇÃO
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((work) => (
                  <tr key={work.id}>
                    <th scope="row">
                      <Link className="work-title" href={`/obras/${work.id}/`}>
                        {home && (
                          <span
                            className={`work-dot ${/finalizada|concluída/i.test(work.status) ? "finished" : ""}`}
                          />
                        )}
                        {labelTitle(work.title)}
                      </Link>
                      <div className="work-subtitle">
                        {contractLabel(work.contractNumber)}
                        {!home && work.supplier && (
                          <span> · {work.supplier}</span>
                        )}
                      </div>
                    </th>
                    <td>
                      {!home && (
                        <strong className="organization-name">
                          {work.organization ?? "Não informado"}
                        </strong>
                      )}
                      <span className="location-text">
                        {work.locations[0]
                          ? labelTitle(work.locations[0])
                          : "Localização não informada"}
                      </span>
                    </td>
                    <td className={home ? "" : "numeric"}>
                      {home ? (
                        <span className="org-badge">
                          {work.organization ?? "Não informado"}
                        </span>
                      ) : (
                        <>
                          <span className="money">
                            {currency(work.contractedCents)}
                          </span>
                          <small className="paid-value">
                            Pago: {currency(work.paidCents)}
                          </small>
                        </>
                      )}
                    </td>
                    <td className={home ? "numeric" : ""}>
                      {home ? (
                        <span className="money">
                          {currency(work.contractedCents)}
                        </span>
                      ) : (
                        <>
                          <div className="progress-header">
                            <strong>
                              {percentLabel(work.reportedExecutionPercent)}
                            </strong>
                          </div>
                          {work.reportedExecutionPercent !== null ? (
                            <div
                              className="progress-track"
                              role="meter"
                              aria-label={`Execução informada: ${work.title}`}
                              aria-valuenow={work.reportedExecutionPercent}
                              aria-valuemin={0}
                              aria-valuemax={100}
                            >
                              <span
                                style={{
                                  width: `${work.reportedExecutionPercent}%`,
                                }}
                              />
                            </div>
                          ) : (
                            <small className="progress-unavailable">
                              Sem percentual na API
                            </small>
                          )}
                        </>
                      )}
                    </td>
                    <td className="center">
                      <Status value={work.status} />
                    </td>
                    <td className="action-column">
                      <Link
                        className={home ? "text-link" : "row-button"}
                        href={`/obras/${work.id}/`}
                        aria-label={`Ver detalhes: ${work.title}`}
                      >
                        {home ? (
                          <>
                            Ver detalhes
                            <FigmaAsset file="e2b85.svg" />
                          </>
                        ) : (
                          "Ver Obra"
                        )}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {home ? (
            <div className="table-note">
              <span>
                <strong>Nota de transparência:</strong> Registros oficiais, com
                limitações sinalizadas. Não são conclusões de irregularidade.
              </span>
              <Link href="/metodologia/#termos">Termos de uso dos dados</Link>
            </div>
          ) : (
            <div className="pagination-footer">
              <span>
                Mostrando {(page - 1) * limit + 1} a{" "}
                {Math.min(page * limit, filtered.length)} de {filtered.length}{" "}
                obras registradas
              </span>
              {pages > 1 && (
                <nav aria-label="Paginação" className="pagination">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <FigmaAsset file="3a1bc.svg" />
                    Anterior
                  </button>
                  {Array.from({ length: pages }, (_, i) => i + 1).map(
                    (number) => (
                      <button
                        key={number}
                        aria-current={page === number ? "page" : undefined}
                        aria-label={`Página ${number}`}
                        onClick={() => setPage(number)}
                      >
                        {number}
                      </button>
                    ),
                  )}
                  <button
                    disabled={page === pages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Próxima
                    <FigmaAsset file="0eb03.svg" />
                  </button>
                </nav>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state">
          <FileSearch size={42} />
          <h2>
            {works.length
              ? "Nenhuma obra para estes filtros"
              : "A base de obras ainda não está disponível"}
          </h2>
          <p>
            {works.length
              ? "Tente outro termo ou remova os filtros. Você pode buscar pelo nome da localização."
              : "Consulte as fontes oficiais e o estado da coleta em Fontes e método."}
          </p>
          {works.length ? (
            <button className="button" onClick={() => update(defaultFilters)}>
              Limpar busca
            </button>
          ) : (
            <Link className="button" href="/metodologia/">
              Consultar fontes
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
