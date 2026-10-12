import "server-only";
import { cache } from "react";
import { getDatabaseSnapshot } from "../../lib/database";

export const getRevenueData = cache(async () => {
  const revenueSnapshot = await getDatabaseSnapshot("receitas-pvh");
  const latestRevenue = revenueSnapshot.entries.filter(
    (e) => e.inLatestSnapshot,
  );
  const latestRevenueYear = revenueSnapshot.years.length
    ? Math.max(...revenueSnapshot.years.map((y) => y.year))
    : null;
  return { revenueSnapshot, latestRevenue, latestRevenueYear };
});
