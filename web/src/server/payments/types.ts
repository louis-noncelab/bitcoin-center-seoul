import { z } from "zod";
import type { Payment } from "@/generated/prisma/client";

export class PaymentError extends Error {
  override readonly name = "PaymentError";
  constructor(readonly code: string) { super(code); }
}
export class TransportError extends PaymentError {
  constructor() { super("PROVIDER_UNAVAILABLE"); }
}
export const reviewScenarios = ["pending", "processing", "paid", "expired", "mismatch", "timeout", "late", "bad_preimage", "wrong_pr", "outage"] as const;
export const receiverSchema = z.discriminatedUnion("provider", [
  z.object({ provider: z.literal("LNURL"), lightningAddress: z.string(), allowedOrigins: z.array(z.url()).min(1).readonly() }),
  z.object({ provider: z.literal("ZAPRITE"), url: z.url(), accountId: z.string().min(1) }),
]);
export const metadataSchema = z.object({
  orderId: z.string().optional(), bookingId: z.string().optional(),
  receiverSnapshot: receiverSchema.optional(), lnurlMetadata: z.string().optional(),
  reviewScenario: z.enum(reviewScenarios).optional(),
});
export type Receiver = z.infer<typeof receiverSchema>;
export type WireRequest = { readonly url: string; readonly method?: "GET" | "POST"; readonly body?: string; readonly headers?: Readonly<Record<string, string>> };
export type Transport = (request: WireRequest) => Promise<unknown>;
export type Invoice = {
  readonly externalId: string; readonly expiresAt: Date;
  readonly checkoutUrl: string | null; readonly paymentRequest: string | null;
  readonly paymentHash: string | null; readonly verifyUrl: string | null;
  readonly lnurlMetadata?: string;
};
export type Observation = { readonly status: "PENDING" | "PROCESSING" | "PAID" | "EXPIRED" | "REVIEW"; readonly reason?: string };
export type ProviderContext = { readonly payment: Payment; readonly receiver: Receiver; readonly transport: Transport };
export const digestHexSchema = z.string().regex(/^[0-9a-f]{64}$/i).transform((value) => value.toLowerCase());
export function btcDecimal(sats: bigint): string { return `${sats / 100_000_000n}.${(sats % 100_000_000n).toString().padStart(8, "0")}`; }
export function btcSats(value: string): bigint {
  if (!/^\d+(\.\d{1,8})?$/.test(value)) throw new PaymentError("INVALID_BTC_AMOUNT");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole ?? "0") * 100_000_000n + BigInt(fraction.padEnd(8, "0"));
}
