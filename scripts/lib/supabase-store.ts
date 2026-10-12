import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { snapshotSchema, type Snapshot } from "../../src/lib/schema";
import { supabaseConfig } from "../../src/lib/supabase-config";
import { createPostgresRpc, databaseProvider } from "../../src/lib/postgres";
export { supabaseConfig } from "../../src/lib/supabase-config";

export const ingestionModule = "obras-pvh";
const stateSchema = z.object({
  revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  snapshot: snapshotSchema.nullable(),
  contracts: z.record(z.string(), z.unknown()),
});
export type IngestionState = z.infer<typeof stateSchema>;
export interface SnapshotStore {
  load(): Promise<IngestionState>;
  save(
    snapshot: Snapshot,
    contracts: Record<string, unknown>,
    revision: number,
    options?: { kind?: "seed" | "sync"; raw?: unknown[]; startedAt?: string },
  ): Promise<number>;
}

export function createIngestionRpc(
  env: Record<string, string | undefined> = process.env,
) {
  if (databaseProvider(env) === "postgres") return createPostgresRpc(env);
  const config = supabaseConfig(env);
  if (!config) return null;
  const client = createClient(config.url, config.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(30_000) }),
    },
  });
  async function rpc(
    name: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    // Um retry de gravação repete o mesmo run_id; a função no banco é idempotente.
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await client.rpc(name, args);
      if (!error) return data;
      if (
        attempt === 2 ||
        !["", "PGRST000", "PGRST001", "PGRST002", "57014"].includes(error.code)
      )
        throw new Error(
          `Falha de persistência Supabase (${error.code || "rede"}); publicação interrompida.`,
        );
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
    throw new Error("Falha de persistência Supabase.");
  }
  return rpc;
}

export function createSnapshotStore(
  env: Record<string, string | undefined> = process.env,
): SnapshotStore | null {
  const rpc = createIngestionRpc(env);
  if (!rpc) return null;
  return {
    async load() {
      return stateSchema.parse(
        await rpc("observatory_load_state", { p_module: ingestionModule }),
      );
    },
    async save(snapshot, contracts, revision, options = {}) {
      snapshotSchema.parse(snapshot);
      return z
        .number()
        .int()
        .positive()
        .max(Number.MAX_SAFE_INTEGER)
        .parse(
          await rpc("observatory_save_snapshot", {
            p_module: ingestionModule,
            p_expected_revision: revision,
            p_run_id: randomUUID(),
            p_kind: options.kind ?? "sync",
            p_started_at: options.startedAt ?? new Date().toISOString(),
            p_snapshot: snapshot,
            p_contracts: contracts,
            p_raw_works: options.raw ?? null,
          }),
        );
    },
  };
}
