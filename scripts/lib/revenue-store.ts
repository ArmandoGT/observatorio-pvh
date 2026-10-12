import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  revenueSnapshotSchema,
  type RevenueSnapshot,
} from "../../src/features/receitas/schema";
import { createIngestionRpc } from "./supabase-store";

export const revenueModule = "receitas-pvh";
const stateSchema = z.object({
  revision: z.number().int().nonnegative(),
  snapshot: revenueSnapshotSchema.nullable(),
});
export function createRevenueStore(
  env: Record<string, string | undefined> = process.env,
) {
  const rpc = createIngestionRpc(env);
  if (!rpc) return null;
  return {
    async load() {
      return stateSchema.parse(
        await rpc("observatory_load_state", { p_module: revenueModule }),
      );
    },
    async save(snapshot: RevenueSnapshot, revision: number) {
      revenueSnapshotSchema.parse(snapshot);
      return z
        .number()
        .int()
        .positive()
        .parse(
          await rpc("observatory_save_revenue_snapshot", {
            p_module: revenueModule,
            p_expected_revision: revision,
            p_run_id: randomUUID(),
            p_started_at: snapshot.lastAttemptAt,
            p_snapshot: snapshot,
          }),
        );
    },
  };
}
