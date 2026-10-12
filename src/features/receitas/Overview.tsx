import { CircleDollarSign } from "lucide-react";
import { revenueModule } from "@/lib/observatory";
import { currency, dateLabel, percentLabel } from "@/lib/display";
import { ModuleCard } from "@/components/ModuleCard";
import { getRevenueData } from "./data";
import { revenueTotals } from "./filters";

export async function RevenueOverview() {
  const { latestRevenue, latestRevenueYear, revenueSnapshot } =
    await getRevenueData();
  const totals = revenueTotals(
    latestRevenue.filter(
      (entry) => entry.year === latestRevenueYear && entry.kind === "budget",
    ),
  );
  const asOf =
    revenueSnapshot.years.find((year) => year.year === latestRevenueYear)
      ?.lastDocumentDate ?? null;
  return (
    <ModuleCard
      id="receitas"
      icon={CircleDollarSign}
      title={revenueModule.title}
      href={revenueModule.href}
      cta="Explorar receitas"
      figure={currency(totals.realizedCents, true)}
      figureLabel={`arrecadados em ${latestRevenueYear ?? "—"}`}
      gauge={{
        percent: totals.percent,
        label: `${percentLabel(totals.percent)} da previsão anual de ${currency(totals.plannedCents, true)}`,
      }}
      note={`Documentos até ${dateLabel(asOf)}. Não representa saldo em caixa.`}
    />
  );
}
