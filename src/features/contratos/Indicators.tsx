import Link from "next/link";
import { FileText } from "lucide-react";
import { dateLabel } from "@/lib/display";
import { getContractsData, contractTotal } from "./data";
export async function ContractsIndicators() {
  const { latestContracts, contractSnapshot } = await getContractsData();
  const statuses = [
    ...new Set(latestContracts.map((contract) => contract.status)),
  ]
    .map((status) => ({
      name: status,
      count: latestContracts.filter((contract) => contract.status === status)
        .length,
    }))
    .sort((a, b) => b.count - a.count);
  const orgs = [
    ...new Set(
      latestContracts.flatMap((contract) =>
        contract.organization ? [contract.organization] : [],
      ),
    ),
  ]
    .map((name) => ({
      name,
      count: latestContracts.filter(
        (contract) => contract.organization === name,
      ).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const total = contractTotal(latestContracts);
  return (
    <section
      className="analytics"
      aria-labelledby="contracts-indicators-heading"
    >
      <div className="analytics-header">
        <div className="analytics-heading">
          <span className="icon-box" aria-hidden="true">
            <FileText size={20} />
          </span>
          <div>
            <h2 id="contracts-indicators-heading">Contratos municipais</h2>
            <p>
              {latestContracts.length.toLocaleString("pt-BR")} registros ·
              Coleta em {dateLabel(contractSnapshot.generatedAt)}
            </p>
          </div>
        </div>
        <Link href="/contratos/" className="button button-secondary">
          Explorar contratos →
        </Link>
      </div>
      {contractSnapshot.syncStatus === "error" && (
        <div className="notice error" role="alert">
          A última coleta de contratos falhou; os indicadores usam a última base
          válida.
        </div>
      )}
      <div className="analytics-grid">
        {[
          { title: "Contratos por situação", data: statuses },
          { title: "Órgãos com mais contratos", data: orgs },
        ].map((chart) => (
          <section key={chart.title}>
            <h3>{chart.title}</h3>
            {!chart.data.length && (
              <p className="overview-note">Sem dados disponíveis.</p>
            )}
            {chart.data.map(({ name, count }) => (
              <div className="chart-row" key={name}>
                <div>
                  <span>{name}</span>
                  <strong>{count.toLocaleString("pt-BR")}</strong>
                </div>
                <div className="chart-track" aria-hidden="true">
                  <span
                    style={{
                      width: `${(count / latestContracts.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </section>
        ))}
        <p className="overview-note">
          {total.count.toLocaleString("pt-BR")} contratos possuem valor
          informado. Não apresentamos soma global: a origem contém valores
          excepcionalmente elevados que precisam ser conferidos nos documentos.
          As barras mostram proporções sobre o total de contratos, com os cinco
          órgãos com mais registros.
        </p>
      </div>
    </section>
  );
}
