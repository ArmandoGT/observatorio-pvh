import {
  mkdir,
  open,
  readFile,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";
import { RevenueAccumulator } from "../src/features/receitas/normalize";
import {
  revenueSnapshotSchema,
  type RevenueSnapshot,
} from "../src/features/receitas/schema";
import { revenuePageUrl } from "../src/features/receitas/sync-core";
import { createRevenueStore } from "./lib/revenue-store";
import { createSourceRequester } from "./lib/source-request";

const store = createRevenueStore();
await mkdir(resolve("data"), { recursive: true });
const lockPath = resolve("data/revenues-sync.lock");
const lock = await open(lockPath, "wx").catch(() => {
  throw new Error("Já existe coleta de receitas em execução.");
});
const path = resolve("data/revenues-snapshot.json");
const at = new Date().toISOString();
const currentYear = Number(
  new Intl.DateTimeFormat("en", {
    timeZone: "America/Porto_Velho",
    year: "numeric",
  }).format(new Date()),
);
const years = [currentYear - 1, currentYear];
const request = createSourceRequester();
let previous: RevenueSnapshot | null = null;
let revision = 0;
let persistenceReady = false;
let collected = false;
async function exportSnapshot(snapshot: RevenueSnapshot) {
  for (const destination of [path, resolve("public/dados/receitas.json")]) {
    await mkdir(resolve("public/dados"), { recursive: true });
    await writeFile(
      `${destination}.tmp`,
      JSON.stringify(snapshot, null, 2) + "\n",
    );
    await rename(`${destination}.tmp`, destination);
  }
}
try {
  try {
    previous = revenueSnapshotSchema.parse(
      JSON.parse(await readFile(path, "utf8")),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (store) {
    const state = await store.load();
    revision = state.revision;
    previous = state.snapshot ?? previous;
  }
  persistenceReady = true;
  const entries = [];
  const summaries = [];
  const sources = [];
  for (const year of years) {
    const accumulator = new RevenueAccumulator(year, at);
    const totals = { receipts: 0, planned: 0 };
    for (const route of ["/receitas/previstas", "/receitas"] as const) {
      const planned = route.endsWith("previstas");
      let next: string | null = revenuePageUrl(route, year);
      let expectedTotal: number | null = null;
      let count = 0;
      let pageNumber = 0;
      const visited = new Set<string>();
      while (next) {
        const url = revenuePageUrl(route, year, next);
        if (visited.has(url) || visited.size >= 250)
          throw new Error("Paginação circular ou acima do limite de receitas.");
        visited.add(url);
        const response = await request(url, {
          headers: {
            Accept: "application/json",
            "User-Agent": "ObservatorioPVH/0.1",
            ...(process.env.PMPV_API_TOKEN
              ? { Authorization: `Bearer ${process.env.PMPV_API_TOKEN}` }
              : {}),
          },
        });
        if (
          !response.ok ||
          !response.headers.get("content-type")?.includes("json")
        )
          throw new Error(
            `Resposta inválida da API de receitas (HTTP ${response.status}).`,
          );
        const body = await response.text();
        if (Buffer.byteLength(body) > 20 * 1024 * 1024)
          throw new Error("Página de receitas excede 20 MiB.");
        const page = JSON.parse(body);
        pageNumber++;
        if (
          !Array.isArray(page.data) ||
          !Number.isInteger(page.meta?.total) ||
          page.meta.total < 0 ||
          page.meta.current_page !== pageNumber ||
          !page.links ||
          !(page.links.next === null || typeof page.links.next === "string")
        )
          throw new Error(
            "Envelope ou ordem de paginação de receitas inválidos.",
          );
        if (expectedTotal !== null && expectedTotal !== page.meta.total)
          throw new Error("Total de receitas mudou durante a coleta.");
        expectedTotal = page.meta.total;
        for (const raw of page.data) accumulator.add(raw, planned);
        count += page.data.length;
        next = page.links.next;
        if (pageNumber % 10 === 0)
          console.log(
            `[receitas] ${year} ${route}: ${count}/${expectedTotal} registros.`,
          );
      }
      if (count !== expectedTotal)
        throw new Error(
          `Coleta de receitas incompleta: ${count}/${expectedTotal}.`,
        );
      const old = previous?.years.find((y) => y.year === year);
      if (!count && (planned ? old?.planned : old?.receipts))
        throw new Error("Fonte retornou base vazia após dados existentes.");
      totals[planned ? "planned" : "receipts"] = count;
      sources.push({
        id: `api-receitas-${planned ? "previstas" : "documentos"}-${year}`,
        title: `API municipal · ${planned ? "Receitas previstas" : "Receitas registradas"} · ${year}`,
        url: revenuePageUrl(route, year),
        status: "available" as const,
        httpStatus: 200,
        checkedAt: at,
        note: `${count} registros do portal 12535; ${visited.size} páginas completas.`,
        termsUrl: "https://api.portovelho.ro.gov.br/docs/api",
        updateFrequency: "Periodicidade não informada pela fonte.",
      });
    }
    entries.push(...accumulator.finish(previous?.entries));
    summaries.push({
      year,
      ...totals,
      lastDocumentDate: accumulator.lastDocumentDate,
    });
    console.log(
      `[receitas] Exercício ${year}: ${totals.receipts} documentos e ${totals.planned} previsões.`,
    );
  }
  const currentIds = new Set(entries.map((e) => e.id));
  entries.push(
    ...(previous?.entries ?? [])
      .filter((e) => !currentIds.has(e.id))
      .map((e) => ({ ...e, inLatestSnapshot: false })),
  );
  const snapshot = revenueSnapshotSchema.parse({
    schemaVersion: 1,
    portalId: 12535,
    generatedAt: at,
    lastAttemptAt: at,
    syncStatus: "ok",
    syncError: null,
    years: summaries,
    entries,
    sources,
  });
  collected = true;
  if (store) await store.save(snapshot, revision);
  await exportSnapshot(snapshot);
  console.log(
    JSON.stringify({
      module: "receitas-pvh",
      status: "ok",
      years: summaries,
      groups: currentIds.size,
    }),
  );
} catch (error) {
  if (!persistenceReady || collected || !previous?.generatedAt) throw error;
  const message = error instanceof Error ? error.message : "Falha desconhecida";
  const failed = revenueSnapshotSchema.parse({
    ...previous,
    lastAttemptAt: at,
    syncStatus: "error",
    syncError: message,
  });
  if (store) await store.save(failed, revision);
  await exportSnapshot(failed);
  console.error(
    `Coleta de receitas falhou; última base preservada: ${message}`,
  );
  process.exitCode = 1;
} finally {
  await lock.close();
  await unlink(lockPath);
}
