import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { dateLabel } from "@/lib/display";

export function DataProvenance({
  collections,
  syncStatus,
}: {
  collections: { label: string; generatedAt: string | null }[];
  syncStatus: string;
}) {
  const dates = [...new Set(collections.map((c) => dateLabel(c.generatedAt)))];
  return (
    <section className="container data-provenance" aria-label="Sobre os dados">
      {syncStatus === "error" && (
        <div className="notice error" role="alert">
          A última sincronização falhou. A base da última coleta válida foi
          preservada. Consulte Fontes e método.
        </div>
      )}
      {syncStatus === "partial" && (
        <div className="notice" role="status">
          Coleta parcial de contratos. Alguns campos usam a última consulta
          válida ou estão indisponíveis.
        </div>
      )}
      <div className="data-provenance-row">
        <ShieldCheck size={20} aria-hidden="true" />
        <p>
          Dados compilados da API municipal e do Portal da Transparência.{" "}
          {dates.length === 1
            ? `Última coleta em ${dates[0]}.`
            : `Última coleta: ${collections
                .map((c) => `${c.label} em ${dateLabel(c.generatedAt)}`)
                .join(", ")}.`}{" "}
          Os registros podem não cobrir todas as obras e contratos da cidade.
        </p>
        <Link href="/metodologia/#limites">Cobertura e limitações</Link>
      </div>
    </section>
  );
}
