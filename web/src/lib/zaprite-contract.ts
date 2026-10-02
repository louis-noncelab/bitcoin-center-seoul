import { z } from "zod";

export const zapriteOrderStatus = z.enum(["PENDING", "PROCESSING", "PAID", "OVERPAID", "UNDERPAID", "COMPLETE", "ABANDONED"]);
export const zapriteTransaction = z.object({
  id: z.string().nullable(),
  status: z.enum(["PENDING", "CONFIRMED", "CANCELED"]),
  method: z.string(),
  externalRef: z.string().nullable(),
  amountInOrderCurrency: z.number().int().min(-Number.MAX_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER).nullable(),
});
export const zapriteSnapshot = z.object({
  orderId: z.string(),
  status: zapriteOrderStatus,
  expiresAt: z.string().datetime().nullable(),
  transactions: z.array(zapriteTransaction.readonly()).readonly().nullable(),
}).readonly();
export type ZapriteSnapshot = z.infer<typeof zapriteSnapshot>;
export const zapriteObservationSummary = z.object({
  status: z.enum(["PENDING", "PROCESSING", "PAID", "EXPIRED", "REVIEW"]),
  reason: z.string().nullable(),
  zaprite: zapriteSnapshot,
});
export const zapriteObservationHistory = z.array(z.object({
  id: z.string(), paymentId: z.string(), createdAt: z.string().datetime(),
  summary: zapriteObservationSummary,
}));
