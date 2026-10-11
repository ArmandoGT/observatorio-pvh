import snapshotData from "../../data/snapshot.json";
import { snapshotSchema } from "./schema";
export const snapshot = snapshotSchema.parse(snapshotData);
export const latestWorks = snapshot.works
  .filter((w) => w.inLatestSnapshot)
  .sort(
    (a, b) =>
      (b.sourceUpdatedAt ?? "").localeCompare(a.sourceUpdatedAt ?? "") ||
      b.sourceId - a.sourceId,
  );
