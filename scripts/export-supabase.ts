import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createSnapshotStore } from "./lib/supabase-store";
import { createContractStore } from "./lib/contract-store";

const store = createSnapshotStore({
  ...process.env,
  SUPABASE_REQUIRED: "true",
});
const state = await store!.load();
const contractState = await createContractStore({
  ...process.env,
  SUPABASE_REQUIRED: "true",
})!.load();
if (!contractState.snapshot || contractState.snapshot.syncStatus !== "ok")
  throw new Error(
    "Não há coleta válida de contratos no Supabase para publicar. Execute npm run sync:contracts primeiro.",
  );
if (!state.snapshot || !["ok", "partial"].includes(state.snapshot.syncStatus))
  throw new Error(
    "Não há coleta válida no Supabase para publicar. Execute npm run sync primeiro.",
  );
for (const [path, data] of [
  ["data/snapshot.json", state.snapshot],
  ["data/contracts.json", state.contracts],
  ["public/dados/obras.json", state.snapshot],
  ["data/contracts-snapshot.json", contractState.snapshot],
  ["public/dados/contratos.json", contractState.snapshot],
] as const) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(`${path}.tmp`, JSON.stringify(data, null, 2) + "\n");
  await rename(`${path}.tmp`, path);
}
console.log(
  `Base exportada do Supabase: revisão ${state.revision}, ${state.snapshot.sourceTotal} obras; contratos: ${contractState.snapshot.sourceTotal}.`,
);
