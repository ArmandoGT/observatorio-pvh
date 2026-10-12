import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { snapshotSchema } from "../src/lib/schema";
import { contractSnapshotSchema } from "../src/features/contratos/schema";
import { revenueSnapshotSchema } from "../src/features/receitas/schema";
import {
  postgresConfig,
  postgresRpcQuery,
  withPostgresClient,
} from "../src/lib/postgres";

if (!process.argv.includes("--apply")) {
  console.log(
    "Importacao inicial manual: use --apply com o usuario de ingestao PostgreSQL. Nao consulta Supabase nem API municipal.",
  );
  process.exit(0);
}
const works = snapshotSchema.parse(
  JSON.parse(await readFile("data/snapshot.json", "utf8")),
);
const contracts = contractSnapshotSchema.parse(
  JSON.parse(await readFile("data/contracts-snapshot.json", "utf8")),
);
const revenues = revenueSnapshotSchema.parse(
  JSON.parse(await readFile("data/revenues-snapshot.json", "utf8")),
);
const cache = z
  .record(z.string(), z.unknown())
  .parse(JSON.parse(await readFile("data/contracts.json", "utf8")));
if (
  !["ok", "partial"].includes(works.syncStatus) ||
  contracts.syncStatus !== "ok" ||
  revenues.syncStatus !== "ok"
)
  throw new Error(
    "Seed exige snapshots locais validos; nao substitua o banco por uma coleta falha.",
  );
await withPostgresClient(postgresConfig(process.env), async (client) => {
  await client.query("begin");
  try {
    const modules = ["obras-pvh", "contratos-pvh", "receitas-pvh"];
    for (const module of modules)
      await client.query(
        "select pg_advisory_xact_lock(hashtextextended($1,0))",
        [module],
      );
    const states = (
      await client.query(
        "select module from observatory.module_state where module=any($1::text[])",
        [modules],
      )
    ).rows;
    if (states.length)
      throw new Error(
        "Modulos ja populados; seed nao sobrescreve a base existente.",
      );
    const started = new Date().toISOString();
    const base = (module: string) => ({
      p_module: module,
      p_expected_revision: 0,
      p_run_id: randomUUID(),
      p_started_at: started,
    });
    const workArgs = {
      ...base("obras-pvh"),
      p_kind: "seed",
      p_snapshot: works,
      p_contracts: cache,
      p_raw_works: null,
    };
    const contractArgs = {
      ...base("contratos-pvh"),
      p_kind: "seed",
      p_snapshot: contracts,
    };
    const revenueArgs = { ...base("receitas-pvh"), p_snapshot: revenues };
    await client.query(postgresRpcQuery("observatory_save_snapshot", workArgs));
    await client.query(
      postgresRpcQuery("observatory_save_contract_snapshot", contractArgs),
    );
    await client.query(
      postgresRpcQuery("observatory_save_revenue_snapshot", revenueArgs),
    );
    await client.query(
      "update observatory.ingestion_runs set kind='seed' where id=$1 and module='receitas-pvh'",
      [revenueArgs.p_run_id],
    );
    const counts = (
      await client.query(
        "select module, revision, snapshot->>'generatedAt' as generated_at, snapshot->>'sourceTotal' as source_total from observatory.module_state order by module",
      )
    ).rows;
    await client.query("commit");
    console.log(
      JSON.stringify({
        seed: true,
        source: "snapshots locais; sem copiar historico Supabase",
        modules: counts,
      }),
    );
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
});
