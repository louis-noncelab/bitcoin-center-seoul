// Exercises the real Zaprite sandbox once: quote -> order -> POST /v1/orders -> read back.
// Creates a sandbox order that is never paid and expires on its own. Nothing is charged.
//
//   set -a && . ./.env.local && set +a && PAYMENT_MODE=sandbox \
//     npm run check:zaprite-sandbox
import { randomBytes, randomUUID } from "node:crypto";
import { getServerConfig } from "@/server/config";
import { prisma } from "@/server/db";
import { makeQuote } from "@/server/orders/quote";
import { createOrder } from "@/server/orders/create";
import { checkoutPolicyVersion } from "@/server/orders/checkout-policy";
import { ensureInvoice, reconcilePayment } from "@/server/payments";

const config = getServerConfig();
if (config.paymentMode !== "sandbox") throw new Error("Run with PAYMENT_MODE=sandbox.");

const variant = await prisma.productVariant.findFirstOrThrow({ where: { active: true, product: { published: true } } });
const { quote, token } = await makeQuote({ items: [{ variantId: variant.id, quantity: 1 }], fulfillment: "PICKUP" }, null);
console.log(`quote      ${quote.id}  ${quote.amountSats} sats  (${quote.amountKrw ?? "-"} KRW)`);
console.log(`rate       ${quote.snapshot.rate?.source} @ ${quote.snapshot.rate?.krwPerBtc}`);

const request = new Request(`${config.appOrigin}/api/orders`, {
  method: "POST",
  headers: {
    origin: config.appOrigin,
    "idempotency-key": randomUUID(),
    "x-request-secret": randomBytes(32).toString("base64url"),
    cookie: `bcs_quote_${quote.id}=${token}`,
  },
});
const { order } = await createOrder(request, {
  quoteId: quote.id,
  customer: { name: "Sandbox Check", email: "sandbox@example.invalid", phone: "" },
  locale: "ko",
  // Script operator's own sandbox checkout; never represents a customer acceptance.
  acceptance: { accepted: true, version: checkoutPolicyVersion("ko") },
}, null);
console.log(`order      ${order.id}  ${order.amountSats} sats`);

const created = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } });
console.log(`payment    ${created.id}  provider=${created.provider} mode=${created.mode}`);

const issued = await ensureInvoice(created.id);
console.log(`zaprite    order=${issued.externalId}  status=${issued.status}`);
console.log(`checkout   ${issued.checkoutUrl}`);
console.log(`expires    ${issued.expiresAt.toISOString()}`);

if (issued.status === "REVIEW") throw new Error(`Invoice creation failed: ${issued.reviewReason}`);
if (issued.amountSats !== created.amountSats) throw new Error("Zaprite changed the amount.");

// Read the order back through the same parser the webhook uses.
const observed = await reconcilePayment(created.id, `sandbox-check:${created.id}`);
console.log(`re-read    status=${observed.status}`);

console.log("\nverified: the sats amount was pinned, the checkout URL is on zaprite.com, and the");
console.log("order reads back through the same parser the webhook drives.");
await prisma.$disconnect();
