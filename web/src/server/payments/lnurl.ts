import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { validateBolt11 } from "./bolt11";
import { lightningAddressOrigin, publicHttpsUrl } from "./transport";
import { digestHexSchema, PaymentError, type Invoice, type Observation, type ProviderContext } from "./types";

// Generic LUD-06 / LUD-16 payer with LUD-21 settlement proof. Any lightning address whose
// origins are allowlisted works; nothing here is specific to one wallet provider.
const payRequest = z.object({
  tag: z.literal("payRequest"),
  callback: z.url(),
  minSendable: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  maxSendable: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  metadata: z.string().max(32_768),
}).refine((value) => value.maxSendable >= value.minSendable, { message: "LNURL_RANGE_INVALID" });
const invoiceResponse = z.object({
  status: z.literal("OK").optional(),
  pr: z.string().min(1).max(20_000),
  verify: z.url().optional(),
});
const verifyResponse = z.object({ status: z.literal("OK"), settled: z.boolean(), pr: z.string(), preimage: z.string().nullable().optional() });

export async function createLnurlInvoice({ payment, receiver, transport }: ProviderContext): Promise<Invoice> {
  if (receiver.provider !== "LNURL") throw new PaymentError("PROVIDER_MISMATCH");
  const [name, domain] = receiver.lightningAddress.split("@");
  const origin = lightningAddressOrigin(receiver.lightningAddress);
  if (!name || !domain || !origin || !/^[A-Za-z0-9._-]+$/.test(name)) throw new PaymentError("INVALID_RECEIVER");
  const resolveUrl = publicHttpsUrl(`https://${domain}/.well-known/lnurlp/${encodeURIComponent(name)}`);
  if (resolveUrl.origin !== origin) throw new PaymentError("UNTRUSTED_PROVIDER_URL");
  const resolved = payRequest.parse(await transport({ url: resolveUrl.href }));
  const metadata = z.array(z.tuple([z.string()]).rest(z.unknown())).parse(JSON.parse(resolved.metadata));
  if (metadata.filter(([kind]) => kind === "text/plain").length !== 1) throw new PaymentError("INVALID_LNURL_METADATA");
  const msats = payment.amountSats * 1000n;
  if (msats < BigInt(resolved.minSendable) || msats > BigInt(resolved.maxSendable)) throw new PaymentError("LNURL_AMOUNT_RANGE");
  // The address domain is fixed by the address itself. The callback may live on another public
  // host that the address document names; private networks stay refused by the transport.
  const callback = publicHttpsUrl(resolved.callback);
  callback.searchParams.set("amount", msats.toString());
  const result = invoiceResponse.parse(await transport({ url: callback.href }));
  // Without LUD-21 there is no way to confirm settlement, so the address cannot be accepted.
  if (result.verify === undefined) throw new PaymentError("LNURL_VERIFY_UNSUPPORTED");
  const verifyUrl = publicHttpsUrl(result.verify).href;
  const invoice = validateBolt11(result.pr, { amountSats: payment.amountSats, review: payment.mode === "REVIEW", metadata: resolved.metadata, future: true });
  // Some providers issue month-long invoices. The local timeout triggers REVIEW, not stock release;
  // manual unpaid resolution separately verifies the signed provider expiry.
  const expiresAt = invoice.expiresAt < payment.expiresAt ? invoice.expiresAt : payment.expiresAt;
  return { externalId: invoice.paymentHash, paymentHash: invoice.paymentHash, expiresAt, paymentRequest: result.pr, verifyUrl, checkoutUrl: null, lnurlMetadata: resolved.metadata };
}

export async function readLnurlInvoice({ payment, receiver, transport }: ProviderContext): Promise<Observation> {
  if (receiver.provider !== "LNURL" || !payment.verifyUrl || !payment.paymentHash || !payment.paymentRequest) throw new PaymentError("INVOICE_INCOMPLETE");
  const result = verifyResponse.parse(await transport({ url: publicHttpsUrl(payment.verifyUrl).href }));
  if (result.pr !== payment.paymentRequest) throw new PaymentError("VERIFY_INVOICE_MISMATCH");
  if (!result.settled) {
    // LUD-21 offers no signed negative settlement proof; an expired invoice can still await provider reconciliation.
    return payment.expiresAt <= new Date() ? { status: "REVIEW", reason: "LNURL_EXPIRED_REQUIRES_RECONCILIATION" } : { status: "PENDING" };
  }
  const preimage = digestHexSchema.parse(result.preimage);
  const digest = createHash("sha256").update(Buffer.from(preimage, "hex")).digest();
  if (!timingSafeEqual(digest, Buffer.from(digestHexSchema.parse(payment.paymentHash), "hex"))) throw new PaymentError("VERIFY_PREIMAGE_MISMATCH");
  return { status: "PAID" };
}
