import { moneyToCents, stableHash, text, parseDate } from "../../lib/normalize";
import { revenueEntrySchema, type RevenueEntry } from "./schema";

export function signedCents(value: unknown): number | null {
  if (value && typeof value === "object") {
    const money = value as Record<string, unknown>;
    return signedCents(money.formatted ?? money.value);
  }
  if (value === null || value === undefined || value === "") return null;
  const cleaned = String(value)
    .trim()
    .replace(/R\$|\s/g, "");
  const negative = cleaned.startsWith("-");
  const cents = moneyToCents(negative ? cleaned.slice(1) : cleaned);
  return cents === null ? null : negative ? -cents : cents;
}
const code = (value: string) => value.split(" - ")[0].trim();
export function addCents(a: number, b: number): number {
  const result = a + b;
  if (!Number.isSafeInteger(result))
    throw new Error("Soma de receitas excede precisão segura.");
  return result;
}

export class RevenueAccumulator {
  private entries = new Map<string, RevenueEntry>();
  private receiptIds = new Set<string>();
  private plannedKeys = new Set<string>();
  lastDocumentDate: string | null = null;
  constructor(
    private year: number,
    private at: string,
  ) {}
  add(raw: Record<string, any>, planned: boolean) {
    const portalId = raw.portal_id ?? raw.portal?.id;
    if (portalId !== 12535 || raw.ano !== this.year || !raw.unidade_gestora_id)
      throw new Error(
        "Receita fora do portal, unidade ou exercício solicitado.",
      );
    const nature = raw.natureza_orcamentaria ?? {};
    const kind =
      planned || raw.receita_sigla === "O"
        ? "budget"
        : raw.receita_sigla === "EX"
          ? "extra"
          : "unknown";
    const account = text(nature.plano_conta) ?? "Conta não informada";
    const fundingSource = text(nature.fonte_recurso) ?? "Fonte não informada";
    const key = [
      this.year,
      raw.unidade_gestora_id,
      code(account),
      code(fundingSource),
      kind,
    ].join("|");
    if (planned) {
      const sourceKey = `${key}|${raw.id}`;
      if (
        !nature.plano_conta ||
        (raw.id > 0 && this.plannedKeys.has(sourceKey))
      )
        throw new Error(
          "Previsão sem conta ou com chave duplicada; coleta rejeitada.",
        );
      if (raw.id > 0) this.plannedKeys.add(sourceKey);
    } else {
      if (!raw.id || this.receiptIds.has(String(raw.id)))
        throw new Error(
          "IDs de receitas ausentes ou duplicados; coleta rejeitada.",
        );
      this.receiptIds.add(String(raw.id));
    }
    const entry = this.entries.get(key) ?? {
      id: `pvh-receita-${stableHash(key).slice(0, 24)}`,
      year: this.year,
      unitId: String(raw.unidade_gestora_id),
      unitName:
        text((raw.unidade_gestora ?? raw.unidadeGestora)?.nome) ??
        "Unidade não informada",
      account,
      fundingSource,
      kind,
      category: text(nature.plano_conta_categoria) ?? "Categoria não informada",
      origin: text(nature.plano_conta_origem) ?? "Origem não informada",
      plannedCents: null,
      plannedLines: 0,
      missingPlannedValues: 0,
      months: [],
      contentHash: "",
      inLatestSnapshot: true,
      firstSeenAt: this.at,
      lastSeenAt: this.at,
      lastChangedAt: this.at,
    };
    if (planned) {
      entry.plannedLines++;
      const value = signedCents(raw.valor_orcamento);
      if (value === null) entry.missingPlannedValues++;
      else entry.plannedCents = addCents(entry.plannedCents ?? 0, value);
    } else {
      const month = Number(
        String(raw.mes ?? "").match(/^(\d{1,2})(?:\s|-|$)/)?.[1],
      );
      if (!Number.isInteger(month) || month < 1 || month > 12)
        throw new Error("Mês de receita inválido; coleta rejeitada.");
      const date = parseDate(raw.data_documento);
      if (
        date &&
        (Number(date.slice(0, 4)) !== this.year ||
          Number(date.slice(5, 7)) !== month)
      )
        throw new Error("Data e competência de receita divergentes.");
      if (date && (!this.lastDocumentDate || date > this.lastDocumentDate))
        this.lastDocumentDate = date;
      const amount = signedCents(raw.valor_documento);
      const m = entry.months.find((m) => m.month === month) ?? {
        month,
        cents: null,
        documents: 0,
        missingValues: 0,
      };
      if (!entry.months.includes(m)) entry.months.push(m);
      m.documents++;
      if (amount === null) m.missingValues++;
      else m.cents = addCents(m.cents ?? 0, amount);
    }
    this.entries.set(key, entry);
  }
  finish(previous: RevenueEntry[] = []) {
    const before = new Map(previous.map((e) => [e.id, e]));
    return [...this.entries.values()]
      .map((entry) => {
        entry.months.sort((a, b) => a.month - b.month);
        const {
          contentHash,
          firstSeenAt,
          lastSeenAt,
          lastChangedAt,
          inLatestSnapshot,
          ...content
        } = entry;
        entry.contentHash = stableHash(content);
        const old = before.get(entry.id);
        entry.firstSeenAt = old?.firstSeenAt ?? this.at;
        entry.lastChangedAt =
          old?.contentHash === entry.contentHash ? old.lastChangedAt : this.at;
        return revenueEntrySchema.parse(entry);
      })
      .sort((a, b) => a.id.localeCompare(b.id));
  }
}
