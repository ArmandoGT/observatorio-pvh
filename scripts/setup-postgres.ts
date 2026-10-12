import { createHash, randomBytes } from "node:crypto";
import { readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { postgresConfig, withPostgresClient } from "../src/lib/postgres";

if (!process.argv.includes("--apply")) {
  console.log(
    "Preparacao manual: use --apply com o ambiente administrativo PostgreSQL. Nao executa sync nem deploy.",
  );
  process.exit(0);
}
const config = postgresConfig(process.env);
const migrations = await Promise.all(
  (await readdir("supabase/migrations"))
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map(async (name) => {
      const sql = await readFile(`supabase/migrations/${name}`, "utf8");
      return {
        name,
        sql,
        hash: createHash("sha256").update(sql).digest("hex"),
      };
    }),
);
const readerPassword = randomBytes(32).toString("hex");
const writerPassword = randomBytes(32).toString("hex");
const roles = [
  "anon",
  "authenticated",
  "service_role",
  "observatory_reader",
  "observatory_ingestor",
];
await withPostgresClient(config, async (client) => {
  const createdFiles: string[] = [];
  let commitAttempted = false;
  await client.query("begin");
  try {
    await client.query(
      "select pg_advisory_xact_lock(hashtextextended('observatorio-postgres-setup',0))",
    );
    const existing = (
      await client.query(
        "select to_regnamespace('observatory')::text as schema",
      )
    ).rows[0].schema;
    if (existing)
      throw new Error(
        "Schema observatory ja existe; preparacao interrompida sem sobrescrever dados.",
      );
    if (
      (
        await client.query(
          "select rolname from pg_roles where rolname = any($1::text[])",
          [roles],
        )
      ).rowCount
    )
      throw new Error(
        "Roles de destino ja existem; revise as permissoes antes de preparar este banco.",
      );
    for (const role of roles)
      await client.query(
        `create role ${role} nologin nosuperuser nocreatedb nocreaterole nobypassrls`,
      );
    await client.query(
      `alter role observatory_reader login password '${readerPassword}'`,
    );
    await client.query(
      `alter role observatory_ingestor login password '${writerPassword}'`,
    );
    for (const migration of migrations) await client.query(migration.sql);
    await client.query(
      "create table observatory.schema_migrations (name text primary key, hash text not null, applied_at timestamptz not null default now())",
    );
    await client.query(
      "alter table observatory.schema_migrations enable row level security",
    );
    for (const migration of migrations)
      await client.query(
        "insert into observatory.schema_migrations(name,hash) values($1,$2)",
        [migration.name, migration.hash],
      );
    await client.query(await readFile("ops/postgres/permissions.sql", "utf8"));
    const database = String(config.database).replaceAll('"', '""');
    await client.query(`revoke connect on database "${database}" from public`);
    await client.query(
      `grant connect on database "${database}" to observatory_reader, observatory_ingestor`,
    );
    function environment(user: string, password: string) {
      const url = new URL(process.env.DATABASE_URL!);
      url.username = user;
      url.password = password;
      return `DATABASE_PROVIDER=postgres\nDATABASE_URL=${url.href}\nDATABASE_SSL_CA=${JSON.stringify(process.env.DATABASE_SSL_CA ?? "")}\n`;
    }
    await writeFile(
      ".env.postgres.local",
      environment("observatory_reader", readerPassword),
      { flag: "wx", mode: 0o600 },
    );
    createdFiles.push(".env.postgres.local");
    await writeFile(
      ".env.postgres-sync.local",
      environment("observatory_ingestor", writerPassword),
      { flag: "wx", mode: 0o600 },
    );
    createdFiles.push(".env.postgres-sync.local");
    commitAttempted = true;
    await client.query("commit");
    console.log(
      JSON.stringify({
        database: config.database,
        migrations: migrations.length,
        reader: "observatory_reader",
        writer: "observatory_ingestor",
        credentials: "arquivos .env.postgres*.local ignorados pelo Git",
      }),
    );
  } catch (error) {
    await client.query("rollback").catch(() => {});
    // Um COMMIT sem resposta pode ter sido aplicado; preserve as credenciais.
    if (!commitAttempted)
      await Promise.all(createdFiles.map((path) => unlink(path)));
    throw error;
  }
});
