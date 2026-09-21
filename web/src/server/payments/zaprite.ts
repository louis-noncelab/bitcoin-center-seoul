import { z } from "zod";
import { getServerConfig } from "@/server/config";
import { PaymentError, type Invoice, type Observation, type ProviderContext } from "./types";

// Contract verified against https://api.zaprite.com/openapi.json on 2026-09-21.
// `amount` and `totalAmount` are denominated in the currency's smallest unit, i.e. satoshis when
// currency is BTC, so the quoted sat amount is pinned exactly rather than re-derived by Zaprite.
// ABANDONED is documented on the list filter as a valid order status; treat it as expired instead
// of failing the parse, which would strand the payment in REVIEW.
const statusSchema = z.enum(["PENDING", "PROCESSING", "PAID", "OVERPAID", "UNDERPAID", "COMPLETE", "ABANDONED"]);
const orderSchema = z.object({
  id: z.string().min(1),
  orgId: z.string().min(1).optional(),
  checkoutUrl: z.url(),
  status: statusSchema,
  totalAmount: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  currency: z.literal("BTC"),
  externalUniqId: z.string().nullable(),
  expiresAt: z.string().datetime().nullable(),
});

function safeSats(amount: bigint): number {
  if (amount <= 0n || amount > BigInt(Number.MAX_SAFE_INTEGER)) throw new PaymentError("ZAPRITE_AMOUNT_RANGE");
  return Number(amount);
}

export function trustedZapriteCheckout(url: string, apiOrigin: string): string {
  const parsed = URL.canParse(url) ? new URL(url) : null;
  if (!parsed || parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.hash || (parsed.port && parsed.port !== "443")) {
    throw new PaymentError("UNTRUSTED_PROVIDER_URL");
  }
  const host = parsed.hostname.toLowerCase();
  if (apiOrigin === "https://zaprite.review.invalid") {
    if (parsed.origin !== apiOrigin) throw new PaymentError("UNTRUSTED_PROVIDER_URL");
    return parsed.href;
  }
  if (host !== "zaprite.com" && !host.endsWith(".zaprite.com")) throw new PaymentError("UNTRUSTED_PROVIDER_URL");
  return parsed.href;
}

function parseOrder(raw: unknown, context: ProviderContext) {
  const order = orderSchema.parse(raw);
  const { payment, receiver } = context;
  if (receiver.provider !== "ZAPRITE") throw new PaymentError("PROVIDER_MISMATCH");
  if (order.externalUniqId !== payment.id) throw new PaymentError("ZAPRITE_ORDER_MISMATCH");
  if (payment.externalId && order.id !== payment.externalId) throw new PaymentError("ZAPRITE_ORDER_MISMATCH");
  const expectedOrg = getServerConfig().zaprite?.orgId;
  // The sandbox organization is shared with another product; never bind another org's order.
  if (expectedOrg && order.orgId && order.orgId !== expectedOrg) throw new PaymentError("ZAPRITE_ORG_MISMATCH");
  trustedZapriteCheckout(order.checkoutUrl, receiver.url);
  return order;
}

function lookupPath(context: ProviderContext) {
  // Documented: the path parameter accepts the Zaprite `id` or our `externalUniqId`, so an order
  // whose creation response was lost is still recoverable by our own payment id.
  const id = context.payment.externalId ?? context.payment.id;
  return `${context.receiver.provider === "ZAPRITE" ? context.receiver.url : ""}/v1/orders/${encodeURIComponent(id)}`;
}

export async function createZapriteInvoice(context: ProviderContext): Promise<Invoice> {
  const { payment, receiver, transport } = context;
  if (receiver.provider !== "ZAPRITE") throw new PaymentError("PROVIDER_MISMATCH");
  const config = getServerConfig();
  const locale = "ko";
  const resource = payment.orderId ?? payment.bookingId ?? payment.id;
  const checkoutId = receiver.accountId !== "default" ? receiver.accountId : config.zaprite?.checkoutId;
  const body: Record<string, unknown> = {
    amount: safeSats(payment.amountSats),
    currency: "BTC",
    externalUniqId: payment.id,
    redirectUrl: `${config.appOrigin}/${locale}/payments/${payment.id}`,
    redirectIfPending: false,
    expiresAt: payment.expiresAt.toISOString(),
    label: "Bitcoin Center Seoul",
    sendReceiptToCustomer: false,
    // Metadata values must be strings (max 50 pairs, 1000 chars each). Tags keep this product's
    // orders separable inside a shared organization.
    tags: ["bcs"],
    metadata: {
      source: "bitcoin-center-seoul",
      paymentId: payment.id,
      creationKey: payment.creationKey,
      resourceId: resource,
    },
  };
  if (checkoutId) body.customCheckoutId = checkoutId;
  const raw = await transport({
    url: `${receiver.url}/v1/orders`,
    method: "POST",
    body: JSON.stringify(body),
  });
  return bindZapriteInvoice(context, raw);
}

export async function bindZapriteInvoice(context: ProviderContext, raw: unknown): Promise<Invoice> {
  const order = parseOrder(raw, context);
  if (BigInt(order.totalAmount) !== context.payment.amountSats) throw new PaymentError("ZAPRITE_AMOUNT_MISMATCH");
  const expiresAt = order.expiresAt ? new Date(order.expiresAt) : context.payment.expiresAt;
  const checkout = trustedZapriteCheckout(order.checkoutUrl, context.receiver.provider === "ZAPRITE" ? context.receiver.url : "");
  return {
    externalId: order.id,
    expiresAt,
    checkoutUrl: context.payment.mode === "REVIEW" ? null : checkout,
    paymentRequest: null,
    paymentHash: null,
    verifyUrl: null,
  };
}

export async function recoverZapriteInvoice(context: ProviderContext): Promise<Invoice | null> {
  if (context.receiver.provider !== "ZAPRITE") throw new PaymentError("PROVIDER_MISMATCH");
  try {
    const raw = await context.transport({ url: lookupPath(context) });
    return bindZapriteInvoice(context, raw);
  } catch (error) {
    if (error instanceof PaymentError && ["ZAPRITE_ORDER_MISMATCH", "ZAPRITE_ORG_MISMATCH", "ZAPRITE_AMOUNT_MISMATCH"].includes(error.code)) throw error;
    return null;
  }
}

export async function readZapriteInvoice(context: ProviderContext): Promise<Observation> {
  const { payment, receiver, transport } = context;
  if (receiver.provider !== "ZAPRITE" || !payment.externalId) throw new PaymentError("INVOICE_INCOMPLETE");
  const order = parseOrder(await transport({ url: lookupPath(context) }), context);
  switch (order.status) {
    case "PENDING":
      return { status: "PENDING" };
    case "PROCESSING":
      return { status: "PROCESSING" };
    case "PAID":
    case "COMPLETE":
    case "OVERPAID":
      return BigInt(order.totalAmount) >= payment.amountSats ? { status: "PAID" } : { status: "REVIEW", reason: "UNDERPAYMENT" };
    case "UNDERPAID":
      return { status: "REVIEW", reason: "UNDERPAYMENT" };
    case "ABANDONED":
      return { status: "EXPIRED" };
  }
}
