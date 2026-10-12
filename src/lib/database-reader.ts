import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { snapshotSchema } from "./schema";
import { contractSnapshotSchema } from "../features/contratos/schema";
import { revenueSnapshotSchema } from "../features/receitas/schema";
import { supabaseConfig } from "./supabase-config";
import type { ClientConfig } from "pg";
import {
  databaseProvider,
  postgresConfig,
  withPostgresClient,
} from "./postgres";

const schemas = {
  "obras-pvh": snapshotSchema,
  "contratos-pvh": contractSnapshotSchema,
  "receitas-pvh": revenueSnapshotSchema,
};
export type DataModule = keyof typeof schemas;
type ModuleSnapshot<M extends DataModule> = z.infer<(typeof schemas)[M]>;

export async function readDatabaseSnapshot<M extends DataModule>(
  module: M,
  env: Record<string, string | undefined> = process.env,
  fetcher: typeof fetch = fetch,
  postgresOptions?: ClientConfig,
): Promise<ModuleSnapshot<M>> {
  if (databaseProvider(env) === "postgres") {
    const config = postgresOptions ?? postgresConfig(env);
    let data: unknown;
    try {
      data = await withPostgresClient(
        config,
        async (client) =>
          (
            await client.query(
              "select snapshot from observatory.module_state where module = $1",
              [module],
            )
          ).rows[0]?.snapshot,
      );
    } catch {
      throw new Error(`Base de ${module} indisponivel.`);
    }
    const snapshot = schemas[module].safeParse(data);
    if (!snapshot.success)
      throw new Error(`Base de ${module} ausente ou invalida.`);
    return snapshot.data as ModuleSnapshot<M>;
  }
  const config = supabaseConfig({ ...env, SUPABASE_REQUIRED: "true" })!;
  const client = createClient(config.url, config.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (input, init) =>
        fetcher(input, {
          ...init,
          cache: "no-store",
          signal: AbortSignal.timeout(15_000),
        }),
    },
  });
  const { data, error } = await client.rpc("observatory_load_state", {
    p_module: module,
  });
  if (error) throw new Error(`Base de ${module} indisponivel.`);
  const state = z.object({ snapshot: z.unknown() }).safeParse(data);
  if (!state.success) throw new Error(`Base de ${module} ausente ou invalida.`);
  const snapshot = schemas[module].safeParse(state.data.snapshot);
  if (!snapshot.success)
    throw new Error(`Base de ${module} ausente ou invalida.`);
  return snapshot.data as ModuleSnapshot<M>;
}
