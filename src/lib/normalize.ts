import { createHash } from "node:crypto";
import { load } from "cheerio";
import { z } from "zod";
import { workSchema, type Work } from "./schema";

export const rawWorkSchema = z
  .object({
    id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    nome: z.string().min(1),
    situacao: z.string().nullable().optional(),
    contrato: z
      .object({ id: z.number().int(), numero: z.string().optional() })
      .nullable()
      .optional(),
  })
  .passthrough();
export type RawWork = z.infer<typeof rawWorkSchema>;
type Raw = Record<string, unknown>;
const record = (v: unknown): Raw =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : {};
const items = (v: unknown): Raw[] => (Array.isArray(v) ? v.map(record) : []);
export function text(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  return load(`<div>${v}</div>`).text().replace(/\s+/g, " ").trim() || null;
}
export function moneyToCents(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "object") return moneyToCents(record(v).value);
  let value = String(v)
    .trim()
    .replace(/R\$|\s/g, "");
  if (value.includes(",")) value = value.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents >= 0 ? cents : null;
}
export function parsePercent(v: unknown): number | null {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = Number(String(v).replace("%", "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
}
export function parseDate(v: unknown): string | null {
  const s = text(v);
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const value = iso
    ? `${iso[1]}-${iso[2]}-${iso[3]}`
    : br
      ? `${br[3]}-${br[2]}-${br[1]}`
      : null;
  if (!value) return null;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value
    ? value
    : null;
}
export function officialUrl(v: unknown): string | null {
  if (typeof v !== "string") return null;
  try {
    const u = new URL(v);
    if (
      !["https:", "http:"].includes(u.protocol) ||
      !(
        u.hostname === "portovelho.ro.gov.br" ||
        u.hostname.endsWith(".portovelho.ro.gov.br")
      )
    )
      return null;
    u.protocol = "https:";
    return u.href;
  } catch {
    return null;
  }
}
export function stableHash(value: unknown): string {
  const stable = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(stable)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.entries(v)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, val]) => [k, stable(val)]),
          )
        : v;
  return createHash("sha256")
    .update(JSON.stringify(stable(value)))
    .digest("hex");
}
export function normalizeWork(
  input: unknown,
  contractInput: unknown,
  collectedAt: string,
  previous?: Work,
): Work {
  const raw = rawWorkSchema.parse(input),
    contract = record(contractInput),
    agency = record(contract.contratante);
  const moneyIssues: string[] = [];
  const amount = (value: unknown, label: string) => {
    const n = moneyToCents(value);
    if (value !== null && value !== undefined && n === null)
      moneyIssues.push(
        `${label}: formato monetário inválido; valor indisponível.`,
      );
    return n;
  };
  const percent = parsePercent(raw.porcentagem_executado);
  const data = {
    id: `pvh-${raw.id}`,
    sourceId: raw.id,
    title: raw.nome.trim(),
    status: text(raw.situacao) ?? "Não informada",
    category: text(raw.tipo),
    organization: text(agency.sigla),
    organizationName: text(agency.nome),
    neighborhood: null,
    locations: items(raw.localizacoes)
      .map((l) => text(l.nome))
      .filter((v): v is string => !!v),
    contractedCents: amount(raw.valor_contratado, "Contratado"),
    paidCents: amount(raw.valor_pago, "Pago"),
    toMeasureCents: amount(raw.valor_a_medir, "A medir"),
    reportedExecutionPercent: percent,
    contractNumber: text(raw.contrato?.numero) ?? text(contract.numero),
    contractId: raw.contrato?.id ?? null,
    contractSignedAt: parseDate(contract.data_assinatura),
    contractStartsAt: parseDate(contract.data_vigencia_inicio),
    contractEndsAt: parseDate(contract.data_vigencia_fim),
    contractValueCents: amount(contract.valor, "Contrato vinculado"),
    contractDateFromWork: parseDate(raw.data_contrato),
    startedAt: parseDate(raw.data_inicio),
    agreementEndsAt: parseDate(raw.data_vigencia_convenio),
    executionRaw: text(raw.execucao),
    agreement: text(raw.numero_convenio),
    procurement: text(raw.modelo_contratacao),
    process:
      text(record(raw.licitacao).processo) ?? text(contract.numero_processo),
    supplier: text(record(raw.fornecedor).nome),
    supplierDocument: text(record(raw.fornecedor).documento),
    observation: text(raw.observacao),
    measurements: items(raw.medicoes).map((m) => ({
      title: text(m.nome) ?? "Medição",
      amountCents: moneyToCents(m.valor_medicao),
      paidAt: parseDate(m.data_pagamento),
    })),
    documents: [
      ...items(raw.anexos).map((d) => ({
        title: text(d.name) ?? "Documento da obra",
        url: officialUrl(d.original_url),
        kind: "obra" as const,
      })),
      ...items(contract.arquivos).map((d) => ({
        title: text(d.nome) ?? "Documento do contrato",
        url: officialUrl(d.arquivo),
        kind: "contrato" as const,
      })),
      ...items(raw.medicoes).flatMap((m) =>
        items(m.anexos).map((d) => ({
          title: text(d.name) ?? "Documento de medição",
          url: officialUrl(d.original_url),
          kind: "medicao" as const,
        })),
      ),
    ].filter(
      (
        d,
      ): d is {
        title: string;
        url: string;
        kind: "obra" | "contrato" | "medicao";
      } => !!d.url,
    ),
    sourceUrl: `https://api.portovelho.ro.gov.br/api/v1/obras/${raw.id}`,
    contractSourceUrl: raw.contrato
      ? `https://api.portovelho.ro.gov.br/api/v1/contratos/${raw.contrato.id}`
      : null,
    sourceUpdatedAt:
      typeof raw.updated_at === "string" &&
      Number.isFinite(Date.parse(raw.updated_at))
        ? raw.updated_at
        : null,
    contractUpdatedAt:
      typeof contract.updated_at === "string" &&
      Number.isFinite(Date.parse(contract.updated_at))
        ? contract.updated_at
        : null,
  };
  data.documents = [...new Map(data.documents.map((d) => [d.url, d])).values()];
  const issues = [...moneyIssues];
  if (
    data.paidCents !== null &&
    data.contractedCents !== null &&
    data.paidCents > data.contractedCents
  ) {
    issues.push(
      "O valor pago publicado supera o contratado na ficha da obra. Confira os campos, o contrato e os aditivos; nenhuma causa é presumida.",
    );
  }
  if (percent === null)
    issues.push("Percentual de execução não informado ou inválido na API.");
  if (
    raw.porcentagem_executado !== null &&
    raw.porcentagem_executado !== undefined &&
    percent === null
  )
    issues.push("Percentual fora do intervalo 0–100; não exibido como válido.");
  if (
    data.contractDateFromWork &&
    data.contractDateFromWork > collectedAt.slice(0, 10)
  )
    issues.push(
      "A data do contrato na ficha da obra está no futuro em relação à coleta.",
    );
  if (
    data.contractDateFromWork &&
    data.startedAt &&
    data.startedAt < data.contractDateFromWork
  )
    issues.push(
      "A data de início antecede a data do contrato na ficha da obra. Confira o contrato vinculado.",
    );
  if (!data.organization)
    issues.push("Órgão responsável indisponível no contrato vinculado.");
  if (!data.sourceUpdatedAt)
    issues.push("A fonte não informou a data de atualização do registro.");
  if (
    data.contractValueCents !== null &&
    data.contractedCents !== null &&
    data.contractValueCents !== data.contractedCents
  )
    issues.push(
      "O valor da ficha da obra difere do valor no contrato vinculado; ambos são preservados.",
    );
  if (percent !== null)
    issues.push(
      "A fonte não define se o percentual representa avanço físico ou financeiro.",
    );
  const contentHash = stableHash({ ...data, issues });
  return workSchema.parse({
    ...data,
    issues,
    contentHash,
    collectedAt,
    firstSeenAt: previous?.firstSeenAt ?? collectedAt,
    lastChangedAt:
      previous?.contentHash === contentHash
        ? previous.lastChangedAt
        : collectedAt,
    inLatestSnapshot: true,
  });
}
