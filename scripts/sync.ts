import {
  mkdir,
  open,
  readFile,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";
import { load } from "cheerio";
import { snapshotSchema, type Snapshot } from "../src/lib/schema";
import { normalizeWork, rawWorkSchema, stableHash } from "../src/lib/normalize";
import { failureSnapshot, mergeWorks, safePageUrl } from "../src/lib/sync-core";
import { createSnapshotStore } from "./lib/supabase-store";

const dataDir = resolve("data"),
  snapshotPath = resolve(dataDir, "snapshot.json"),
  lockPath = resolve(dataDir, "sync.lock");
const store = createSnapshotStore();
await mkdir(dataDir, { recursive: true });
const attemptedAt = new Date().toISOString();
let previous = snapshotSchema.parse(
  JSON.parse(await readFile(snapshotPath, "utf8")),
);
let contractCache: Record<string, unknown> = {};
try {
  contractCache = JSON.parse(
    await readFile(resolve(dataDir, "contracts.json"), "utf8"),
  );
} catch {}
const lock = await open(lockPath, "wx").catch(() => {
  throw new Error("Já existe uma sincronização em execução (data/sync.lock).");
});
async function atomic(path: string, data: unknown) {
  const tmp = `${path}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2) + "\n");
  await rename(tmp, path);
}
async function request(url: string): Promise<Response> {
  const u = new URL(url);
  if (!u.hostname.endsWith(".portovelho.ro.gov.br") || u.protocol !== "https:")
    throw new Error("Origem da requisição não permitida.");
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "ObservatorioObrasPVH/0.1 (+independent civic data)",
          ...(process.env.PMPV_API_TOKEN &&
          u.hostname === "api.portovelho.ro.gov.br"
            ? { Authorization: `Bearer ${process.env.PMPV_API_TOKEN}` }
            : {}),
        },
        signal: AbortSignal.timeout(15000),
      });
      if ([429, 502, 503, 504].includes(r.status) && attempt < 2) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      return r;
    } catch (e) {
      if (attempt === 2) throw e;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw new Error("Falha de rede.");
}
async function json(url: string) {
  const r = await request(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} em ${new URL(url).pathname}`);
  if (!r.headers.get("content-type")?.includes("json"))
    throw new Error("Resposta sem Content-Type JSON.");
  const body = await r.text();
  if (Buffer.byteLength(body) > 20 * 1024 * 1024)
    throw new Error("Resposta excede limite de 20 MiB.");
  return JSON.parse(body);
}
const registry: Snapshot["sources"] = [];
let revision = 0;
let previousContractCache = structuredClone(contractCache);
let persistenceReady = false;
let sourceCollected = false;
try {
  if (store) {
    const state = await store.load();
    revision = state.revision;
    if (state.snapshot) {
      previous = state.snapshot;
      contractCache = state.contracts;
    } else {
      revision = await store.save(previous, contractCache, revision, {
        kind: "seed",
      });
    }
  }
  previousContractCache = structuredClone(contractCache);
  persistenceReady = true;
  let next: string | null =
    "https://api.portovelho.ro.gov.br/api/v1/obras?por-pagina=100";
  const visited = new Set<string>(),
    raw: unknown[] = [];
  let sourceTotal: number | null = null;
  while (next) {
    const url = safePageUrl(next);
    if (visited.has(url) || visited.size >= 100)
      throw new Error("Paginação circular ou acima do limite.");
    visited.add(url);
    const page = await json(url);
    if (
      !Array.isArray(page.data) ||
      !Number.isInteger(page.meta?.total) ||
      page.meta.total < 0
    )
      throw new Error("Envelope da API mudou; coleta rejeitada.");
    if (sourceTotal !== null && sourceTotal !== page.meta.total)
      throw new Error(
        "Total da origem mudou durante a paginação; tentar novamente.",
      );
    sourceTotal = page.meta.total;
    raw.push(...page.data);
    next = page.links?.next ?? null;
  }
  if (raw.length !== sourceTotal)
    throw new Error(
      `Coleta incompleta: ${raw.length}/${sourceTotal} registros.`,
    );
  if (raw.length === 0 && previous.works.length > 0)
    throw new Error(
      "A API retornou uma base vazia após uma base existente; requer revisão.",
    );
  const parsed = raw.map((r) => rawWorkSchema.parse(r));
  const contractIds = [
    ...new Set(
      parsed.map((w) => w.contrato?.id).filter((id): id is number => !!id),
    ),
  ];
  const failedContracts = new Set<number>();
  for (const id of contractIds) {
    try {
      const result = await json(
        `https://api.portovelho.ro.gov.br/api/v1/contratos/${id}`,
      );
      if (result.data?.id !== id) throw new Error("ID de contrato divergente.");
      const c = result.data;
      contractCache[id] = {
        id: c.id,
        numero: c.numero,
        contratante: c.contratante
          ? { sigla: c.contratante.sigla, nome: c.contratante.nome }
          : null,
        data_assinatura: c.data_assinatura,
        data_vigencia_inicio: c.data_vigencia_inicio,
        data_vigencia_fim: c.data_vigencia_fim,
        valor: c.valor,
        numero_processo: c.numero_processo,
        updated_at: c.updated_at,
        arquivos: c.arquivos,
      };
    } catch {
      failedContracts.add(id);
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  const before = new Map(previous.works.map((w) => [w.id, w]));
  const normalized = parsed.map((raw) => {
    const w = normalizeWork(
      raw,
      raw.contrato ? contractCache[raw.contrato.id] : null,
      attemptedAt,
      before.get(`pvh-${raw.id}`),
    );
    if (raw.contrato && failedContracts.has(raw.contrato.id)) {
      w.issues.push(
        "Contrato vinculado indisponível nesta coleta; campos podem vir da última consulta válida.",
      );
      w.contentHash = stableHash({ hash: w.contentHash, issues: w.issues });
      w.lastChangedAt =
        before.get(w.id)?.contentHash === w.contentHash
          ? before.get(w.id)!.lastChangedAt
          : attemptedAt;
    }
    return w;
  });
  const apiBase = "https://api.portovelho.ro.gov.br";
  const termsUrl = `${apiBase}/docs/api`;
  registry.push({
    id: "api-obras",
    title: "API municipal · Obras",
    url: `${apiBase}/api/v1/obras`,
    status: "available",
    httpStatus: 200,
    checkedAt: attemptedAt,
    note: `${sourceTotal} registros coletados. Paginação validada. Acesso anônimo confirmado.`,
    termsUrl,
    updateFrequency: "Periodicidade não informada pela fonte.",
  });
  registry.push({
    id: "api-contratos",
    title: "API municipal · Contratos vinculados",
    url: `${apiBase}/api/v1/contratos`,
    status: failedContracts.size ? "partial" : "available",
    httpStatus: failedContracts.size ? null : 200,
    checkedAt: attemptedAt,
    note: `${contractIds.length - failedContracts.size} de ${contractIds.length} contratos vinculados consultados nesta coleta.`,
    termsUrl,
    updateFrequency: "Periodicidade não informada pela fonte.",
  });
  for (const [id, title, url] of [
    [
      "portal-obras",
      "Portal da Transparência · Obras",
      "https://transparencia.portovelho.ro.gov.br/obras",
    ],
    [
      "dados-abertos",
      "Catálogo de dados abertos",
      "https://dados.portovelho.ro.gov.br/",
    ],
    ["api-docs", "Documentação e regras da API", termsUrl],
  ]) {
    try {
      const r = await request(url);
      const body = await r.text();
      const p = load(body).text().replace(/\s+/g, " ");
      const last = p.match(/Última atualização:\s*([\d/]+\s*[\d:]+)/)?.[1];
      registry.push({
        id,
        title,
        url,
        status: r.ok ? "available" : "unavailable",
        httpStatus: r.status,
        checkedAt: attemptedAt,
        note:
          id === "portal-obras"
            ? `Página oficial consultada. Atualização declarada: ${last ?? "não identificada"}. A consulta padrão é filtrada por exercício; não equivale à base completa da API.`
            : id === "dados-abertos"
              ? r.ok
                ? "Catálogo acessível; datasets ainda não validados."
                : "Não foi possível validar datasets, campos, licença ou periodicidade do catálogo."
              : "Regras declaram acesso universal e uso livre com respeito às limitações legais. OpenAPI 3.1.0 versão 1.0.0.",
        termsUrl: id === "dados-abertos" ? null : termsUrl,
        updateFrequency: "Sem frequência de publicação confirmada.",
      });
    } catch {
      registry.push({
        id,
        title,
        url,
        status: "unavailable",
        httpStatus: null,
        checkedAt: attemptedAt,
        note: "Falha de rede; conteúdo e periodicidade não confirmados.",
        termsUrl: null,
        updateFrequency: "Não confirmada.",
      });
    }
  }
  const merged = mergeWorks(previous.works, normalized);
  const snapshot = snapshotSchema.parse({
    schemaVersion: 1,
    generatedAt: attemptedAt,
    lastAttemptAt: attemptedAt,
    syncStatus: failedContracts.size ? "partial" : "ok",
    syncError: failedContracts.size
      ? `${failedContracts.size} contratos indisponíveis.`
      : null,
    sourceTotal,
    works: merged.works,
    sources: registry,
    changeSummary: merged.changeSummary,
  });
  sourceCollected = true;
  if (store)
    await store.save(snapshot, contractCache, revision, {
      raw,
      startedAt: attemptedAt,
    });
  await mkdir(resolve(dataDir, "raw"), { recursive: true });
  await atomic(resolve(dataDir, "raw", `${stableHash(raw)}.json`), raw);
  await atomic(resolve(dataDir, "contracts.json"), contractCache);
  await atomic(snapshotPath, snapshot);
  await mkdir(resolve("public", "dados"), { recursive: true });
  await atomic(resolve("public", "dados", "obras.json"), snapshot);
  console.log(
    JSON.stringify(
      {
        status: snapshot.syncStatus,
        works: normalized.length,
        contracts: contractIds.length,
        changes: merged.changeSummary,
        sources: registry.map((s) => ({
          id: s.id,
          status: s.status,
          http: s.httpStatus,
        })),
        at: attemptedAt,
      },
      null,
      2,
    ),
  );
} catch (error) {
  // Falhas do banco/exportação não são atribuídas à API municipal.
  if (!persistenceReady || sourceCollected) throw error;
  const message = error instanceof Error ? error.message : "Falha desconhecida";
  previous = failureSnapshot(previous, message, attemptedAt);
  previous.sources = previous.sources.map((s) =>
    s.id === "api-obras"
      ? {
          ...s,
          status: "unavailable",
          httpStatus: null,
          checkedAt: attemptedAt,
          note: `Última tentativa falhou: ${message}`,
        }
      : s,
  );
  if (store)
    await store.save(previous, previousContractCache, revision, {
      startedAt: attemptedAt,
    });
  await atomic(snapshotPath, previous);
  await mkdir(resolve("public", "dados"), { recursive: true });
  await atomic(resolve("public", "dados", "obras.json"), previous);
  console.error(`Sincronização falhou; última base preservada: ${message}`);
  process.exitCode = 1;
} finally {
  await lock.close();
  await unlink(lockPath);
}
