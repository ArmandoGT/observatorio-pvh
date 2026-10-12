import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { postgresConfig, withPostgresClient } from "../src/lib/postgres";

const execute = promisify(execFile);
const caIndex = process.argv.indexOf("--ca-id");
const accountIndex = process.argv.indexOf("--account-id");
const caId = process.argv[caIndex + 1];
const accountId = process.argv[accountIndex + 1];
if (!process.argv.includes("--apply")) {
  console.log(
    "Configuracao manual: autentique Wrangler e use --apply --ca-id UUID --account-id ID com o ambiente PostgreSQL de leitura. Nao executa deploy.",
  );
  process.exit(0);
}
if (
  caIndex < 0 ||
  !/^[a-f0-9-]{36}$/.test(caId) ||
  accountIndex < 0 ||
  !/^[a-f0-9]{32}$/.test(accountId)
)
  throw new Error("Informe --ca-id e --account-id validos.");
const config = postgresConfig(process.env);
if (config.user !== "observatory_reader")
  throw new Error("Hyperdrive deve usar somente a conta observatory_reader.");
await withPostgresClient(config, async (client) => {
  await client.query("select 1");
});
try {
  // O CLI envia a credencial diretamente a Cloudflare, sem passar pelo console.
  await execute(
    process.execPath,
    [
      "node_modules/wrangler/bin/wrangler.js",
      "hyperdrive",
      "create",
      "observatorio-pvh-postgres",
      "--origin-host",
      config.host!,
      "--origin-port",
      String(config.port),
      "--database",
      String(config.database),
      "--origin-user",
      config.user!,
      "--origin-password",
      String(config.password),
      "--ca-certificate-id",
      caId,
      "--sslmode",
      "verify-full",
      "--caching-disabled",
      "--origin-connection-limit",
      "5",
      "--binding",
      "HYPERDRIVE",
      "--update-config",
    ],
    {
      env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: accountId },
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    },
  );
  console.log(
    "Hyperdrive criado com acesso somente leitura, TLS verify-full e cache desativado. Binding salvo no wrangler.jsonc; nenhum deploy realizado.",
  );
} catch (error) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "CLI";
  const stderr =
    error && typeof error === "object" && "stderr" in error
      ? String(error.stderr)
      : "";
  const details = stderr
    .replaceAll(String(config.password), "[REDACTED]")
    .replaceAll(process.env.DATABASE_URL!, "[REDACTED_DATABASE_URL]")
    .replace(/postgres(?:ql)?:\/\/[^\s]+/g, "[REDACTED_DATABASE_URL]")
    .replace(/\x1b\[[0-9;]*m/g, "")
    .split("\n")
    .filter((line) => !line.includes("Logs were written"))
    .join("\n")
    .trim()
    .slice(0, 1200);
  throw new Error(`Configuracao Hyperdrive falhou (${code}). ${details}`);
}
