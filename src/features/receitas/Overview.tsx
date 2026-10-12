import Link from "next/link";
import { revenueModule } from "@/lib/observatory";
import { dateLabel } from "@/lib/display";
import { revenueSnapshot } from "./data";
export function RevenueOverview() {
  return (
    <section className="module-card" aria-labelledby="revenue-heading">
      <h2 id="revenue-heading">{revenueModule.title}</h2>
      <p>Acompanhe a arrecadação e os documentos do orçamento.</p>
      <small className="contract-meta">
        Exercícios {revenueSnapshot.years.map((y) => y.year).join(" e ")} ·
        Coleta em {dateLabel(revenueSnapshot.generatedAt)}
      </small>
      <Link href={revenueModule.href} className="button button-secondary">
        Explorar receitas →
      </Link>
    </section>
  );
}
