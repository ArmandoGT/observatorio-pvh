import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readdir, readFile } from "node:fs/promises";
import {
  databaseProvider,
  postgresConfig,
  postgresRpcQuery,
} from "../src/lib/postgres";

test("PostgreSQL e opt-in e configuracao nao permite desabilitar TLS pela URL", () => {
  assert.equal(databaseProvider({}), "supabase");
  assert.equal(databaseProvider({ DATABASE_PROVIDER: "postgres" }), "postgres");
  assert.throws(() => databaseProvider({ DATABASE_PROVIDER: "sqlite" }));
  const url = "postgresql://writer:password@127.0.0.1:5432/observatorio";
  assert.throws(() => postgresConfig({}));
  assert.throws(() =>
    postgresConfig({ DATABASE_URL: url + "?sslmode=disable" }),
  );
  assert.throws(() =>
    postgresConfig({ DATABASE_URL: "https://writer:password@test/db" }),
  );
  assert.deepEqual(
    postgresConfig({ DATABASE_URL: url, DATABASE_SSL_CA: "a\\nb" }).ssl,
    { rejectUnauthorized: true, ca: "a\nb" },
  );
});

test("RPC PostgreSQL usa parametros e uma lista fechada de funcoes e argumentos", () => {
  const value = "x'); drop schema observatory; --";
  const query = postgresRpcQuery("observatory_load_state", { p_module: value });
  assert.equal(
    query.text,
    "select public.observatory_load_state(p_module => $1::text) as value",
  );
  assert.deepEqual(query.values, [value]);
  assert.throws(() => postgresRpcQuery("toString", {}));
  assert.throws(() =>
    postgresRpcQuery("observatory_load_state", { constructor: value }),
  );
  assert.throws(() => postgresRpcQuery("observatory_load_state", {}));
});

test("roles PostgreSQL: site somente le estado; coletor grava com RLS sem delete", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon;create role authenticated;create role service_role;create role observatory_reader;create role observatory_ingestor;",
    );
    for (const file of (await readdir("supabase/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    await db.exec(await readFile("ops/postgres/permissions.sql", "utf8"));
    await db.exec("set role observatory_reader");
    assert.equal(
      (
        await db.query(
          "select public.observatory_load_state('obras-pvh') as state",
        )
      ).rows.length,
      1,
    );
    await assert.rejects(
      db.query("select * from observatory.ingestion_runs"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("delete from observatory.module_state"),
      /permission denied/,
    );
    await assert.rejects(
      db.query(
        "select public.observatory_save_contract_snapshot('contratos-pvh',0,null,'seed',now(),'{}'::jsonb)",
      ),
      /permission denied/,
    );
    await db.exec("reset role;set role observatory_ingestor");
    assert.equal(
      (await db.query("select * from observatory.ingestion_runs")).rows.length,
      0,
    );
    await assert.rejects(
      db.query("delete from observatory.module_state"),
      /permission denied/,
    );
    const privileges = (
      await db.query<{ writes: boolean }>(
        "select has_table_privilege(current_user,'observatory.module_state','INSERT,UPDATE') as writes",
      )
    ).rows[0];
    assert.equal(privileges.writes, true);
  } finally {
    await db.close();
  }
});
