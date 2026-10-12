import Link from "next/link";
import { contractsModule } from "@/lib/observatory";
import { getContractsData } from "./data";
import { dateLabel } from "@/lib/display";
export async function ContractsOverview() {
  const { latestContracts, contractSnapshot } = await getContractsData();
  return (
    <section className="module-card" aria-labelledby="contracts-heading">
      <h2 id="contracts-heading">{contractsModule.title}</h2>
      <p>Encontre empresas, valores e documentos dos contratos.</p>
      <small className="contract-meta">
        {latestContracts.length.toLocaleString("pt-BR")} contratos · Coleta em{" "}
        {dateLabel(contractSnapshot.generatedAt)}
      </small>
      <Link href={contractsModule.href} className="button button-secondary">
        Explorar contratos →
      </Link>
    </section>
  );
}
