import assert from "node:assert/strict";
import { after, before } from "node:test";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

assert.ok(process.env.TEST_DATABASE_URL, "Use a disposable PostgreSQL database.");
const root = await mkdtemp(path.join(tmpdir(), "bcs-event-integrity-"));
Object.assign(process.env, {
  APP_MODE: "test", APP_ORIGIN: "http://127.0.0.1:3100", DATABASE_URL: process.env.TEST_DATABASE_URL,
  DATA_DIR: root, BCS_EVENTS_UPLOADS: path.join(root, "uploads"),
  TOKEN_ENCRYPTION_KEY: randomBytes(32).toString("base64"), PAYMENT_PROVIDER: "zaprite",
  PAYMENT_MODE: "review", EMAIL_MODE: "capture", TRUST_PROXY: "false", REVIEW_KRW_PER_BTC: "150000000",
});
const { prisma } = await import("../src/server/db.ts");
const { createEvent, updateEvent, setEventRegistration, deleteEvent, getEvent } = await import("../src/server/events/index.ts");
const { syncEventTicket } = await import("../src/server/events/tickets.ts");
const { eventInputSchema } = await import("../src/lib/events-contract.ts");
const { makeQuote } = await import("../src/server/orders/quote.ts");
const { createOrder } = await import("../src/server/orders/create.ts");
const { checkoutPolicyVersion } = await import("../src/server/orders/checkout-policy.ts");
const { ensureInvoice, reconcilePayment } = await import("../src/server/payments/index.ts");
const prefix = `integrity-${randomUUID()}`;
const eventIds = [];
const orderIds = [];
const quoteIds = [];
const input = (extra = {}) => eventInputSchema.parse({
  venueType: "center", slug: `${prefix}-${randomBytes(4).toString("hex")}`, tags: [], title: "밋업", titleEn: "Meetup",
  date: "2099-10-01", time: "19:00", location: "", locationEn: "", description: "센터 밋업", descriptionEn: "Center meetup",
  image: "", images: [], link: "", externalPayment: false, ticketPriceKrw: "1500", ticketCapacity: 10, ...extra,
});
async function fixture(extra = {}) {
  const data = input(extra);
  const event = await createEvent(data);
  eventIds.push(event.id);
  await syncEventTicket(event, 0);
  const product = await prisma.product.findUniqueOrThrow({ where: { slug: `meetup-${event.id}` }, include: { variants: true } });
  return { data, event, product, variant: product.variants[0] };
}
async function quoteFor(variant, quantity = 1) {
  const result = await makeQuote({ items: [{ variantId: variant.id, quantity }], fulfillment: "PICKUP" }, null);
  quoteIds.push(result.quote.id);
  return result;
}
async function fromQuote({ quote, token }) {
  const request = new Request("http://127.0.0.1:3100/api/orders", { headers: {
    "idempotency-key": randomUUID(), "x-request-secret": randomBytes(32).toString("base64url"), "x-quote-token": token,
  } });
  const result = await createOrder(request, { quoteId: quote.id, customer: { name: "Tester", email: `${prefix}@example.invalid`, phone: "" }, locale: "en", acceptance: { accepted: true, version: checkoutPolicyVersion("en") } }, null);
  orderIds.push(result.order.id);
  return result;
}
async function pay(variant, quantity) {
  const result = await fromQuote(await quoteFor(variant, quantity));
  const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: result.order.id } });
  const issued = await ensureInvoice(payment.id);
  await prisma.payment.update({ where: { id: payment.id }, data: { metadata: { ...issued.metadata, reviewScenario: "paid" } } });
  await reconcilePayment(payment.id);
  return result;
}
before(async () => {
  await prisma.siteSetting.upsert({ where: { id: "site" }, update: { maintenanceMode: false, guestPurchaseAllowed: true }, create: { id: "site", maintenanceMode: false, guestPurchaseAllowed: true } });
});
after(async () => {
  await prisma.paymentEvent.deleteMany({ where: { payment: { orderId: { in: orderIds } } } });
  await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.quote.deleteMany({ where: { id: { in: quoteIds } } });
  await prisma.emailOutbox.deleteMany({ where: { OR: orderIds.map((id) => ({ eventKey: { contains: id } })) } });
  await prisma.productVariant.deleteMany({ where: { sku: { in: eventIds.map((id) => `MEETUP-${id}`) } } });
  await prisma.product.deleteMany({ where: { slug: { in: eventIds.map((id) => `meetup-${id}`) } } });
  await prisma.contentImage.deleteMany({ where: { kind: "event", contentId: { in: eventIds } } });
  await prisma.contentSlug.deleteMany({ where: { kind: "event", contentId: { in: eventIds } } });
  await prisma.centerEvent.deleteMany({ where: { id: { in: eventIds } } });
  await prisma.$disconnect();
  await rm(root, { recursive: true, force: true });
});

export { prisma, createEvent, updateEvent, setEventRegistration, deleteEvent, getEvent, syncEventTicket, input, fixture, quoteFor, fromQuote, pay, eventIds, ensureInvoice, reconcilePayment };
