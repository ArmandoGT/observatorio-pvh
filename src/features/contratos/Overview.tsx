import { FileText } from "lucide-react";
import { contractsModule } from "@/lib/observatory";
import { ModuleCard } from "@/components/ModuleCard";
import { getContractsData } from "./data";

export async function ContractsOverview() {
  const { latestContracts } = await getContractsData();
  const total = latestContracts.length;
  const active = latestContracts.filter((contract) =>
    /^ativo$/i.test(contract.status.trim()),
  ).length;
  return (
    <ModuleCard
      id="contratos"
      icon={FileText}
      title={contractsModule.title}
      href={contractsModule.href}
      cta="Explorar contratos"
      figure={total.toLocaleString("pt-BR")}
      figureLabel="contratos publicados"
      gauge={{
        percent: total ? (active / total) * 100 : null,
        label: `${active.toLocaleString("pt-BR")} com situação “Ativo” na fonte`,
      }}
      note="Empresas, valores, vigência e documentos de cada contrato."
    />
  );
}
