import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createSnapshotStore } from "./lib/supabase-store";
import { createContractStore } from "./lib/contract-store";
import { createRevenueStore } from "./lib/revenue-store";

const store = createSnapshotStore({
  ...process.env,
  SUPABASE_REQUIRED: "true",
});
const state = await store!.load();
const contractState = await createContractStore({
  ...process.env,
  SUPABASE_REQUIRED: "true",
})!.load();
const revenueState = await createRevenueStore({
  ...process.env,
  SUPABASE_REQUIRED: "true",
})!.load();
if (!revenueState.snapshot || revenueState.snapshot.syncStatus !== "ok")
  throw new Error(
    "Não há coleta válida de receitas no banco para publicar. Execute npm run sync:revenues primeiro.",
  );
if (!contractState.snapshot || contractState.snapshot.syncStatus !== "ok")
  throw new Error(
    "Não há coleta válida de contratos no banco para publicar. Execute npm run sync:contracts primeiro.",
  );
if (!state.snapshot || !["ok", "partial"].includes(state.snapshot.syncStatus))
  throw new Error(
    "Não há coleta válida no banco para publicar. Execute npm run sync primeiro.",
  );
for (const [path, data] of [
  ["data/snapshot.json", state.snapshot],
  ["data/contracts.json", state.contracts],
  ["data/exports/obras.json", state.snapshot],
  ["data/contracts-snapshot.json", contractState.snapshot],
  ["data/exports/contratos.json", contractState.snapshot],
  ["data/revenues-snapshot.json", revenueState.snapshot],
  ["data/exports/receitas.json", revenueState.snapshot],
] as const) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(`${path}.tmp`, JSON.stringify(data, null, 2) + "\n");
  await rename(`${path}.tmp`, path);
}
console.log(
  `Base exportada do banco: revisão ${state.revision}, ${state.snapshot.sourceTotal} obras; contratos: ${contractState.snapshot.sourceTotal}.`,
);
