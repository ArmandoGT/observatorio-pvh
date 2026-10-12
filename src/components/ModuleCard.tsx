import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

export function ModuleCard({
  id,
  icon: Icon,
  title,
  href,
  cta,
  figure,
  figureLabel,
  gauge,
  note,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  href: string;
  cta: string;
  figure: string;
  figureLabel: string;
  gauge?: { percent: number | null; label: string };
  note: string;
}) {
  const fill =
    gauge?.percent == null ? 0 : Math.max(0, Math.min(100, gauge.percent));
  return (
    <article className="module-card" aria-labelledby={`${id}-heading`}>
      <header className="module-card-head">
        <span className="module-icon" aria-hidden="true">
          <Icon size={20} />
        </span>
        <h2 id={`${id}-heading`}>{title}</h2>
      </header>
      <p className="module-figure">
        <strong>{figure}</strong>
        <span>{figureLabel}</span>
      </p>
      {gauge && (
        <div className="module-gauge">
          <p>{gauge.label}</p>
          <div className="module-gauge-track" aria-hidden="true">
            <span style={{ width: `${fill}%` }} />
          </div>
        </div>
      )}
      <p className="module-note">{note}</p>
      <Link href={href} className="module-link">
        {cta}
        <ArrowUpRight size={18} aria-hidden="true" />
      </Link>
    </article>
  );
}
