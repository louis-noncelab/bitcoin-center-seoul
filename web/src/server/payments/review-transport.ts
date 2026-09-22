import "server-only";
import { createHash } from "node:crypto";
import bolt11 from "bolt11";
import { z } from "zod";
import { getServerConfig } from "@/server/config";
import type { Payment } from "@/generated/prisma/client";
import { metadataSchema, PaymentError, TransportError, type Transport } from "./types";

// REVIEW mode never leaves the process: every provider call is answered from these fixtures, and
// any other origin is refused. Signed invoices are testnet-only and use a published test key.
export const reviewReceiver = {
  LNURL: { provider: "LNURL", lightningAddress: "TEST@lnurl.review.invalid", allowedOrigins: ["https://lnurl.review.invalid"] },
  ZAPRITE: { provider: "ZAPRITE", url: "https://zaprite.review.invalid", accountId: "TEST-ACCOUNT" },
} as const;

export function reviewInvoice(payment: Payment) {
  const metadata = JSON.stringify([["text/plain", `TEST ONLY — Bitcoin Center Seoul — ${payment.creationKey}`]]);
  const preimage = createHash("sha256").update(`TEST-preimage:${payment.creationKey}`).digest("hex");
  const hash = createHash("sha256").update(Buffer.from(preimage, "hex")).digest("hex");
  const timestamp = Math.floor(payment.createdAt.getTime() / 1000);
  const signed = bolt11.sign(bolt11.encode({
    network: { bech32: "tb", pubKeyHash: 111, scriptHash: 196, validWitnessVersions: [0, 1] },
    millisatoshis: (payment.amountSats * 1000n).toString(), timestamp,
    tags: [{ tagName: "payment_hash", data: hash }, { tagName: "purpose_commit_hash", data: createHash("sha256").update(metadata).digest("hex") },
      { tagName: "expire_time", data: Math.max(60, Math.floor(payment.expiresAt.getTime() / 1000) - timestamp) }],
  }), "11".repeat(32));
  if (!signed.paymentRequest) throw new PaymentError("REVIEW_FIXTURE_INVALID");
  return { pr: signed.paymentRequest, preimage, hash, metadata };
}

export function reviewTransport(payment: Payment): Transport {
  if (payment.mode !== "REVIEW" || !["review", "test"].includes(getServerConfig().appMode)) throw new PaymentError("REVIEW_DISABLED");
  const scenario = metadataSchema.parse(payment.metadata).reviewScenario ?? "pending";
  const fixture = reviewInvoice(payment);
  const paid = ["paid", "late", "mismatch"].includes(scenario);
  const id = payment.externalId ?? `TEST-${payment.creationKey}`;
  return async (input) => {
    const url = new URL(input.url);
    if (scenario === "outage" || (scenario === "timeout" && (input.method === "POST" || url.pathname === "/callback"))) throw new TransportError();
    if (url.origin === "https://zaprite.review.invalid") {
      const amount = Number(payment.amountSats);
      const order = {
        id,
        orgId: getServerConfig().zaprite?.orgId ?? undefined,
        status: paid ? "PAID" : scenario === "processing" ? "PROCESSING" : "PENDING",
        checkoutUrl: `https://zaprite.review.invalid/c/${id}`,
        totalAmount: scenario === "mismatch" ? amount + 1 : amount,
        currency: "BTC",
        externalUniqId: payment.id,
        expiresAt: payment.expiresAt.toISOString(),
      };
      if (input.method === "POST") {
        if (url.pathname !== "/v1/orders") throw new PaymentError("REVIEW_REQUEST_UNSUPPORTED");
        z.object({
          amount: z.literal(amount), currency: z.literal("BTC"), externalUniqId: z.literal(payment.id),
          redirectIfPending: z.literal(false), sendReceiptToCustomer: z.boolean(),
          customerData: z.object({ email: z.string(), name: z.string().optional() }).optional(),
        }).passthrough().parse(JSON.parse(input.body ?? "null"));
        return { ...order, status: "PENDING", totalAmount: amount };
      }
      if (url.pathname === `/v1/orders/${encodeURIComponent(id)}` || url.pathname === `/v1/orders/${encodeURIComponent(payment.id)}`) return order;
      throw new PaymentError("REVIEW_REQUEST_UNSUPPORTED");
    }
    if (url.origin !== "https://lnurl.review.invalid") throw new PaymentError("REVIEW_EXTERNAL_REQUEST_BLOCKED");
    if (url.pathname.startsWith("/.well-known/lnurlp/")) return { tag: "payRequest", callback: "https://lnurl.review.invalid/callback", minSendable: 1000, maxSendable: Number.MAX_SAFE_INTEGER, metadata: fixture.metadata };
    if (url.pathname === "/callback") {
      if (url.searchParams.get("amount") !== (payment.amountSats * 1000n).toString()) throw new PaymentError("REVIEW_AMOUNT_MISMATCH");
      return { pr: fixture.pr, verify: `https://lnurl.review.invalid/verify/${fixture.hash}` };
    }
    if (url.pathname.startsWith("/verify/")) return { status: "OK", settled: paid || scenario === "bad_preimage" || scenario === "wrong_pr", preimage: scenario === "bad_preimage" ? "00".repeat(32) : fixture.preimage, pr: ["wrong_pr", "mismatch"].includes(scenario) ? "invalid" : payment.paymentRequest ?? fixture.pr };
    throw new PaymentError("REVIEW_REQUEST_UNSUPPORTED");
  };
}
