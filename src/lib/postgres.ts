import { Client, type ClientConfig } from "pg";

export function databaseProvider(env: Record<string, string | undefined>) {
  const provider = env.DATABASE_PROVIDER || "supabase";
  if (provider !== "supabase" && provider !== "postgres")
    throw new Error("DATABASE_PROVIDER deve ser supabase ou postgres.");
  return provider;
}

export function postgresConfig(
  env: Record<string, string | undefined>,
): ClientConfig {
  if (!env.DATABASE_URL) throw new Error("Configure DATABASE_URL no servidor.");
  let url: URL;
  try {
    url = new URL(env.DATABASE_URL);
  } catch {
    throw new Error("DATABASE_URL invalida.");
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !url.hostname ||
    !url.username ||
    !url.password ||
    url.pathname.length < 2 ||
    url.search ||
    url.hash
  )
    throw new Error(
      "DATABASE_URL deve ser PostgreSQL sem parametros SSL na URL.",
    );
  return {
    host: url.hostname,
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    ssl: {
      rejectUnauthorized: true,
      ...(env.DATABASE_SSL_CA
        ? { ca: env.DATABASE_SSL_CA.replaceAll("\\n", "\n") }
        : {}),
    },
  };
}

export async function withPostgresClient<T>(
  config: ClientConfig,
  action: (client: Client) => Promise<T>,
) {
  const client = new Client({
    connectionTimeoutMillis: 8000,
    query_timeout: 30000,
    statement_timeout: 25000,
    application_name: "observatorio-pvh",
    ...config,
  });
  try {
    await client.connect();
    return await action(client);
  } finally {
    await client.end();
  }
}

const functions: Record<string, Record<string, string>> = {
  observatory_load_state: { p_module: "text" },
  observatory_save_snapshot: {
    p_module: "text",
    p_expected_revision: "bigint",
    p_run_id: "uuid",
    p_kind: "text",
    p_started_at: "timestamptz",
    p_snapshot: "jsonb",
    p_contracts: "jsonb",
    p_raw_works: "jsonb",
  },
  observatory_save_contract_snapshot: {
    p_module: "text",
    p_expected_revision: "bigint",
    p_run_id: "uuid",
    p_kind: "text",
    p_started_at: "timestamptz",
    p_snapshot: "jsonb",
  },
  observatory_save_revenue_snapshot: {
    p_module: "text",
    p_expected_revision: "bigint",
    p_run_id: "uuid",
    p_started_at: "timestamptz",
    p_snapshot: "jsonb",
  },
};

export function postgresRpcQuery(name: string, args: Record<string, unknown>) {
  const signature = functions[name];
  if (
    !Object.hasOwn(functions, name) ||
    Object.keys(args).some((key) => !Object.hasOwn(signature, key))
  )
    throw new Error("Funcao ou parametros PostgreSQL nao permitidos.");
  const fields = Object.entries(signature);
  if (fields.some(([key]) => !(key in args)))
    throw new Error("Parametros PostgreSQL incompletos.");
  return {
    text: `select public.${name}(${fields.map(([key, type], index) => `${key} => $${index + 1}::${type}`).join(", ")}) as value`,
    values: fields.map(([key, type]) =>
      type === "jsonb" && args[key] !== null
        ? JSON.stringify(args[key])
        : args[key],
    ),
  };
}

export function createPostgresRpc(env: Record<string, string | undefined>) {
  const config = postgresConfig(env);
  return async (
    name: string,
    args: Record<string, unknown>,
  ): Promise<unknown> => {
    const query = postgresRpcQuery(name, args);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const value = await withPostgresClient(
          { ...config, query_timeout: 120000, statement_timeout: 115000 },
          async (client) => (await client.query(query)).rows[0]?.value,
        );
        if (name !== "observatory_load_state") {
          const revision = Number(value);
          if (!Number.isSafeInteger(revision) || revision < 1)
            throw new Error("Revisao PostgreSQL invalida.");
          return revision;
        }
        return value;
      } catch (error) {
        const code =
          error && typeof error === "object" && "code" in error
            ? String(error.code)
            : "rede";
        if (
          attempt === 2 ||
          !["ECONNRESET", "ETIMEDOUT", "57P01", "57014", "08006"].includes(code)
        )
          throw new Error(
            `Falha de persistencia PostgreSQL (${code}); processo interrompido.`,
          );
        await new Promise((resolve) =>
          setTimeout(resolve, 500 * (attempt + 1)),
        );
      }
    }
    throw new Error("Falha de persistencia PostgreSQL.");
  };
}
