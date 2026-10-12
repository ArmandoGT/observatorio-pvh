import Link from "next/link";
import { getWorksData } from "@/lib/data";
import { dateLabel } from "@/lib/display";
import { defaultFilters, filterWorks } from "@/lib/work-filters";
import { workTitle } from "@/lib/work-presentation";
import { Status } from "@/components/Status";

export async function RecentUpdates() {
  const { latestWorks } = await getWorksData();
  const recent = filterWorks(latestWorks, defaultFilters).slice(0, 4);
  if (!recent.length) return null;
  return (
    <aside className="recent-updates" aria-labelledby="recent-updates-heading">
      <h2 id="recent-updates-heading">Obras atualizadas pela Prefeitura</h2>
      <ol>
        {recent.map((work) => (
          <li key={work.id}>
            <Link href={`/obras/${work.id}/`}>
              <strong>{workTitle(work.title)}</strong>
              <span className="recent-meta">
                <Status value={work.status} />
                <time dateTime={work.sourceUpdatedAt ?? undefined}>
                  {dateLabel(work.sourceUpdatedAt)}
                </time>
              </span>
            </Link>
          </li>
        ))}
      </ol>
      <Link href="/obras/" className="recent-updates-all">
        Ver todas as {latestWorks.length} obras
      </Link>
    </aside>
  );
}
