import Link from "next/link";
import { CircleDollarSign } from "lucide-react";
import { currency, dateLabel, percentLabel } from "@/lib/display";
import { latestRevenue, latestRevenueYear, revenueSnapshot } from "./data";
import { revenueTotals } from "./filters";
export function RevenueIndicators() {
  const totals = revenueTotals(
    latestRevenue.filter(
      (e) => e.year === latestRevenueYear && e.kind === "budget",
    ),
  );
  const asOf =
    revenueSnapshot.years.find((y) => y.year === latestRevenueYear)
      ?.lastDocumentDate ?? null;
  return (
    <section
      className="analytics revenue-indicators"
      aria-labelledby="revenue-indicators-heading"
    >
      <div className="analytics-header">
        <div className="analytics-heading">
          <span className="icon-box" aria-hidden="true">
            <CircleDollarSign size={22} />
          </span>
          <div>
            <h2 id="revenue-indicators-heading">Receitas e orçamento</h2>
            <p>
              Receita orçamentária · {latestRevenueYear} · Documentos até{" "}
              {dateLabel(asOf)}
            </p>
          </div>
        </div>
        <Link href="/receitas/" className="button button-secondary">
          Explorar receitas →
        </Link>
      </div>
      <dl className="revenue-indicator-values">
        <div>
          <dt>Previsão anual</dt>
          <dd>{currency(totals.plannedCents, true)}</dd>
          <small>Prefeitura e suas unidades</small>
        </div>
        <div className="revenue-primary-value">
          <dt>Arrecadação registrada</dt>
          <dd>{currency(totals.realizedCents, true)}</dd>
          <small>Receita orçamentária</small>
        </div>
        <div className="revenue-secondary-value">
          <dt>Arrecadado / previsto</dt>
          <dd>{percentLabel(totals.percent)}</dd>
          <small>Percentual da previsão anual</small>
        </div>
        <div className="revenue-secondary-value">
          <dt>Documentos de receita</dt>
          <dd>{totals.documents.toLocaleString("pt-BR")}</dd>
          <small>Registros de arrecadação</small>
        </div>
      </dl>
      <p className="overview-note">
        Coleta em {dateLabel(revenueSnapshot.generatedAt)}. Estes valores não
        representam saldo em caixa nem execução de despesas.
      </p>
      <details className="revenue-indicator-context">
        <summary>Como os valores são apresentados</summary>
        <p>
          Entradas extraorçamentárias são apresentadas separadamente. Valores
          negativos publicados pela fonte são preservados.
        </p>
      </details>
    </section>
  );
}
