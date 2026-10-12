import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import ts from "typescript";
import { getPlatformProxy } from "wrangler";

test("bindings do deploy inicializam sem credenciais ou banco local", async () => {
  const source = await readFile(
    new URL("../wrangler.jsonc", import.meta.url),
    "utf8",
  );
  const parsed = ts.parseConfigFileTextToJson("wrangler.jsonc", source);
  assert.equal(parsed.error, undefined);
  const config = parsed.config;
  const directory = await mkdtemp(path.join(os.tmpdir(), "pvh-bindings-"));
  const envName = "CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE";
  const previousValue = process.env[envName];
  delete process.env[envName];

  try {
    const configPath = path.join(directory, "wrangler.json");
    // O proxy do deploy le os bindings; nao executa o Worker nem consulta dados.
    await writeFile(
      configPath,
      JSON.stringify({
        name: config.name,
        compatibility_date: config.compatibility_date,
        compatibility_flags: config.compatibility_flags,
        vars: config.vars,
        hyperdrive: config.hyperdrive,
      }),
    );
    const proxy = await getPlatformProxy({
      configPath,
      envFiles: [],
      persist: false,
    });
    try {
      assert.equal(proxy.env.DATABASE_PROVIDER, "postgres");
      assert.ok(proxy.env.HYPERDRIVE);
      const uri = new URL(config.hyperdrive[0].localConnectionString);
      assert.equal(uri.hostname, "127.0.0.1");
      assert.equal(uri.port, "1");
      assert.equal(uri.password, "unused");
    } finally {
      await proxy.dispose();
    }
  } finally {
    if (previousValue === undefined) delete process.env[envName];
    else process.env[envName] = previousValue;
    await rm(directory, { recursive: true, force: true });
  }
});
