import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
const path = "data/snapshot.json",
  original = await readFile(path, "utf8");
try {
  const snapshot = JSON.parse(original);
  await writeFile(
    path,
    JSON.stringify(
      {
        ...snapshot,
        generatedAt: null,
        works: [],
        sourceTotal: null,
        syncStatus: "never",
      },
      null,
      2,
    ),
  );
  const result = spawnSync(
    process.execPath,
    ["node_modules/next/dist/bin/next", "build"],
    { stdio: "inherit", env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } },
  );
  process.exitCode = result.status ?? 1;
} finally {
  await writeFile(path, original);
}
