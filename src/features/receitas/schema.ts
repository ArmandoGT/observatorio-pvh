import { z } from "zod";
import { sourceSchema } from "../../lib/schema";

const cents = z
  .number()
  .int()
  .min(-Number.MAX_SAFE_INTEGER)
  .max(Number.MAX_SAFE_INTEGER)
  .nullable();
export const revenueEntrySchema = z.object({
  id: z.string().min(1),
  year: z.number().int().min(2000).max(2100),
  unitId: z.string().min(1),
  unitName: z.string(),
  account: z.string(),
  category: z.string(),
  origin: z.string(),
  fundingSource: z.string(),
  kind: z.enum(["budget", "extra", "unknown"]),
  plannedCents: cents,
  plannedLines: z.number().int().nonnegative(),
  missingPlannedValues: z.number().int().nonnegative(),
  months: z.array(
    z.object({
      month: z.number().int().min(1).max(12),
      cents,
      documents: z.number().int().positive(),
      missingValues: z.number().int().nonnegative(),
    }),
  ),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  inLatestSnapshot: z.boolean(),
  firstSeenAt: z.string(),
  lastSeenAt: z.string(),
  lastChangedAt: z.string(),
});
export const revenueSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  portalId: z.literal(12535),
  generatedAt: z.string().nullable(),
  lastAttemptAt: z.string(),
  syncStatus: z.enum(["ok", "error"]),
  syncError: z.string().nullable(),
  years: z.array(
    z.object({
      year: z.number().int(),
      receipts: z.number().int().nonnegative(),
      planned: z.number().int().nonnegative(),
      lastDocumentDate: z.string().nullable(),
    }),
  ),
  entries: z.array(revenueEntrySchema),
  sources: z.array(sourceSchema),
});
export type RevenueEntry = z.infer<typeof revenueEntrySchema>;
export type RevenueSnapshot = z.infer<typeof revenueSnapshotSchema>;
