import Link from "next/link";
import { contractsModule } from "@/lib/observatory";
import { latestContracts, contractSnapshot } from "./data";
import { dateLabel } from "@/lib/display";
export function ContractsOverview() {
  return (
    <section
      className="module-intro container contracts-module-intro"
      aria-labelledby="contracts-heading"
    >
      <div className="module-heading">
        <div>
          <span className="eyebrow gold-text">MÓDULO DISPONÍVEL</span>
          <h2 id="contracts-heading">{contractsModule.title}</h2>
          <p>{contractsModule.description}</p>
          <small className="contract-meta">
            {latestContracts.length.toLocaleString("pt-BR")} contratos · Coleta
            em {dateLabel(contractSnapshot.generatedAt)}
          </small>
        </div>
        <Link href={contractsModule.href} className="button button-secondary">
          Explorar contratos →
        </Link>
      </div>
    </section>
  );
}
