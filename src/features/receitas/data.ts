import raw from "../../../data/revenues-snapshot.json";
import { revenueSnapshotSchema } from "./schema";
export const revenueSnapshot = revenueSnapshotSchema.parse(raw);
export const latestRevenue = revenueSnapshot.entries.filter(
  (e) => e.inLatestSnapshot,
);
export const latestRevenueYear = Math.max(
  ...revenueSnapshot.years.map((y) => y.year),
);
