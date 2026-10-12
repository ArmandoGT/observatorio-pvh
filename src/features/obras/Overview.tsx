import { HardHat } from "lucide-react";
import { worksModule } from "@/lib/observatory";
import { getWorksData } from "@/lib/data";
import { currency, sumKnown } from "@/lib/display";
import { ModuleCard } from "@/components/ModuleCard";

export async function ObrasOverview() {
  const { latestWorks } = await getWorksData();
  const contracted = sumKnown(latestWorks, "contractedCents"),
    paid = sumKnown(latestWorks, "paidCents");
  const percent =
    contracted.cents && paid.cents !== null
      ? (paid.cents / contracted.cents) * 100
      : null;
  return (
    <ModuleCard
      id="obras"
      icon={HardHat}
      title={worksModule.title}
      href={worksModule.href}
      cta="Explorar obras"
      figure={latestWorks.length ? String(latestWorks.length) : "—"}
      figureLabel="obras mapeadas"
      gauge={{
        percent,
        label: `${currency(paid.cents, true)} pagos de ${currency(contracted.cents, true)} contratados`,
      }}
      note="Somas de contratos de anos diferentes. Pagamento não comprova avanço físico."
    />
  );
}
