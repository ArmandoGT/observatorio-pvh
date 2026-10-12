import {
  mkdir,
  open,
  readFile,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";
import {
  contractSnapshotSchema,
  type ContractSnapshot,
} from "../src/features/contratos/schema";
import { normalizeContract } from "../src/features/contratos/normalize";
import {
  contractListUrl,
  failedContractSnapshot,
  mergeContracts,
  safeContractPageUrl,
} from "../src/features/contratos/sync-core";
import { createContractStore } from "./lib/contract-store";

const path = resolve("data/contracts-snapshot.json");
const lockPath = resolve("data/contracts-sync.lock");
await mkdir(resolve("data"), { recursive: true });
const store = createContractStore();
const lock = await open(lockPath, "wx").catch(() => {
  throw new Error("Já existe uma sincronização de contratos em execução.");
});
const at = new Date().toISOString();
let previous: ContractSnapshot | null = null;
let revision = 0;
let persistenceReady = false;
let sourceCollected = false;
async function exportSnapshot(snapshot: ContractSnapshot) {
  for (const destination of [path, resolve("public/dados/contratos.json")]) {
    await mkdir(resolve("public/dados"), { recursive: true });
    await writeFile(
      `${destination}.tmp`,
      JSON.stringify(snapshot, null, 2) + "\n",
    );
    await rename(`${destination}.tmp`, destination);
  }
}
async function pageJson(url: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "ObservatorioPVH/0.1",
          ...(process.env.PMPV_API_TOKEN
            ? { Authorization: `Bearer ${process.env.PMPV_API_TOKEN}` }
            : {}),
        },
        signal: AbortSignal.timeout(15000),
      });
      if ([429, 502, 503, 504].includes(response.status) && attempt < 2) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1)),
        );
        continue;
      }
      if (
        !response.ok ||
        !response.headers.get("content-type")?.includes("json")
      )
        throw new Error(
          `Resposta inválida da API de contratos (HTTP ${response.status}).`,
        );
      const body = await response.text();
      if (Buffer.byteLength(body) > 20 * 1024 * 1024)
        throw new Error("Página de contratos excede 20 MiB.");
      return JSON.parse(body);
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw new Error("Falha na coleta de contratos.");
}
try {
  try {
    previous = contractSnapshotSchema.parse(
      JSON.parse(await readFile(path, "utf8")),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (store) {
    const state = await store.load();
    revision = state.revision;
    if (state.snapshot) previous = state.snapshot;
    else if (previous?.syncStatus === "ok")
      revision = await store.save(previous, revision, "seed");
  }
  persistenceReady = true;
  const before = new Map(
    previous?.contracts.map((item) => [item.id, item]) ?? [],
  );
  const current = [];
  let next: string | null = contractListUrl;
  let total: number | null = null;
  const visited = new Set<string>();
  while (next) {
    const url = safeContractPageUrl(next);
    if (visited.has(url) || visited.size >= 200)
      throw new Error("Paginação circular ou acima do limite de contratos.");
    visited.add(url);
    const page = await pageJson(url);
    if (
      !Array.isArray(page.data) ||
      !Number.isInteger(page.meta?.total) ||
      page.meta.total < 0 ||
      !page.links ||
      !(page.links.next === null || typeof page.links.next === "string")
    )
      throw new Error("Envelope da API de contratos mudou; coleta rejeitada.");
    if (total !== null && total !== page.meta.total)
      throw new Error(
        "Total de contratos mudou durante a paginação; tentar novamente.",
      );
    total = page.meta.total;
    for (const raw of page.data)
      current.push(
        normalizeContract(raw, at, before.get(`pvh-contrato-${raw.id}`)),
      );
    next = page.links.next;
    if (next) await new Promise((resolve) => setTimeout(resolve, 120));
  }
  if (current.length !== total)
    throw new Error(
      `Coleta de contratos incompleta: ${current.length}/${total}.`,
    );
  if (!current.length && previous?.contracts.length)
    throw new Error(
      "A origem retornou contratos vazios após uma base existente; requer revisão.",
    );
  const merged = mergeContracts(previous?.contracts ?? [], current);
  const snapshot = contractSnapshotSchema.parse({
    schemaVersion: 1,
    generatedAt: at,
    lastAttemptAt: at,
    syncStatus: "ok",
    syncError: null,
    sourceTotal: total,
    ...merged,
    sources: [
      {
        id: "api-contratos-catalogo",
        title: "API municipal · Contratos",
        url: contractListUrl,
        status: "available",
        httpStatus: 200,
        checkedAt: at,
        note: `${total} contratos do modelo Contratos, de todos os anos disponíveis. Paginação e IDs validados.`,
        termsUrl: "https://api.portovelho.ro.gov.br/docs/api",
        updateFrequency: "Periodicidade não informada pela fonte.",
      },
    ],
  });
  sourceCollected = true;
  if (store) await store.save(snapshot, revision);
  await exportSnapshot(snapshot);
  console.log(
    JSON.stringify({
      module: "contratos-pvh",
      status: "ok",
      contracts: total,
      pages: visited.size,
      changes: merged.changeSummary,
      at,
    }),
  );
} catch (error) {
  if (!persistenceReady || sourceCollected || !previous?.generatedAt)
    throw error;
  const message = error instanceof Error ? error.message : "Falha desconhecida";
  const failed = failedContractSnapshot(previous, message, at);
  if (store) await store.save(failed, revision);
  await exportSnapshot(failed);
  console.error(
    `Sincronização de contratos falhou; última base preservada: ${message}`,
  );
  process.exitCode = 1;
} finally {
  await lock.close();
  await unlink(lockPath);
}
