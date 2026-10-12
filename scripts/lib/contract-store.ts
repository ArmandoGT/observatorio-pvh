import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  contractSnapshotSchema,
  type ContractSnapshot,
} from "../../src/features/contratos/schema";
import { createIngestionRpc } from "./supabase-store";

export const contractModule = "contratos-pvh";
const stateSchema = z.object({
  revision: z.number().int().nonnegative(),
  snapshot: contractSnapshotSchema.nullable(),
});
export function createContractStore(
  env: Record<string, string | undefined> = process.env,
) {
  const rpc = createIngestionRpc(env);
  if (!rpc) return null;
  return {
    async load() {
      return stateSchema.parse(
        await rpc("observatory_load_state", { p_module: contractModule }),
      );
    },
    async save(snapshot: ContractSnapshot, revision: number, kind = "sync") {
      contractSnapshotSchema.parse(snapshot);
      return z
        .number()
        .int()
        .positive()
        .parse(
          await rpc("observatory_save_contract_snapshot", {
            p_module: contractModule,
            p_expected_revision: revision,
            p_run_id: randomUUID(),
            p_kind: kind,
            p_started_at: snapshot.lastAttemptAt,
            p_snapshot: snapshot,
          }),
        );
    },
  };
}
