import { z } from "zod";

const money = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER)
  .nullable();
const date = z.string().nullable();
export const documentSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  kind: z.enum(["obra", "contrato", "medicao"]),
});
export const workSchema = z.object({
  id: z.string(),
  sourceId: z.number().int().positive(),
  title: z.string().min(1),
  status: z.string(),
  category: z.string().nullable(),
  organization: z.string().nullable(),
  organizationName: z.string().nullable(),
  neighborhood: z.string().nullable(),
  locations: z.array(z.string()),
  contractedCents: money,
  paidCents: money,
  toMeasureCents: money,
  reportedExecutionPercent: z.number().min(0).max(100).nullable(),
  contractNumber: z.string().nullable(),
  contractId: z.number().int().nullable(),
  contractSignedAt: date,
  contractStartsAt: date,
  contractEndsAt: date,
  contractValueCents: money,
  contractDateFromWork: date,
  startedAt: date,
  agreementEndsAt: date,
  executionRaw: z.string().nullable(),
  agreement: z.string().nullable(),
  procurement: z.string().nullable(),
  process: z.string().nullable(),
  supplier: z.string().nullable(),
  supplierDocument: z.string().nullable(),
  observation: z.string().nullable(),
  measurements: z.array(
    z.object({ title: z.string(), amountCents: money, paidAt: date }),
  ),
  documents: z.array(documentSchema),
  sourceUrl: z.string().url(),
  contractSourceUrl: z.string().url().nullable(),
  sourceUpdatedAt: date,
  contractUpdatedAt: date,
  collectedAt: z.string(),
  firstSeenAt: z.string(),
  lastChangedAt: z.string(),
  contentHash: z.string(),
  issues: z.array(z.string()),
  inLatestSnapshot: z.boolean(),
});
export type Work = z.infer<typeof workSchema>;
export const sourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url(),
  status: z.enum(["available", "unavailable", "partial"]),
  httpStatus: z.number().nullable(),
  checkedAt: z.string(),
  note: z.string(),
  termsUrl: z.string().url().nullable(),
  updateFrequency: z.string(),
});
export const snapshotSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string().nullable(),
  lastAttemptAt: z.string().nullable(),
  syncStatus: z.enum(["never", "ok", "partial", "error"]),
  syncError: z.string().nullable(),
  sourceTotal: z.number().int().nonnegative().nullable(),
  works: z.array(workSchema),
  sources: z.array(sourceSchema),
  changeSummary: z.object({
    added: z.number(),
    updated: z.number(),
    unchanged: z.number(),
    notSeen: z.number(),
  }),
});
export type Snapshot = z.infer<typeof snapshotSchema>;
