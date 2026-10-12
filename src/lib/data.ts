import "server-only";
import { cache } from "react";
import { getDatabaseSnapshot } from "./database";

export const getWorksData = cache(async () => {
  const snapshot = await getDatabaseSnapshot("obras-pvh");
  const latestWorks = snapshot.works
    .filter((w) => w.inLatestSnapshot)
    .sort(
      (a, b) =>
        (b.sourceUpdatedAt ?? "").localeCompare(a.sourceUpdatedAt ?? "") ||
        b.sourceId - a.sourceId,
    );
  return { snapshot, latestWorks };
});
