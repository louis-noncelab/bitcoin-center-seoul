import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes, randomUUID } from "node:crypto";
import { prisma, fixture, quoteFor, fromQuote, pay } from "./event-integrity-fixture.mjs";
import { createOrder } from "../src/server/orders/create.ts";
import { makeQuote } from "../src/server/orders/quote.ts";
import { fulfillOrder } from "../src/server/orders/admin.ts";
import { confirmationByCode } from "../src/server/orders/confirmation.ts";
import { listCheckoutProduct } from "../src/server/catalog/index.ts";
import { setMeetupCheckin } from "../src/server/orders/checkin.ts";
import { checkoutPolicyVersion } from "../src/server/orders/checkout-policy.ts";
import { decryptPayload } from "../src/server/email/index.ts";

test("the server derives paid/free event acceptance and never exposes joining credentials before confirmation", async () => {
  for (const free of [false, true]) {
    const { event, variant } = await fixture({ ticketPriceKrw: free ? "0" : "1500", isOnline: true, onlineUrl: "https://meet.example.invalid/private-join" });
    const quoted = await quoteFor(variant, 2);
    const request = new Request("http://127.0.0.1:3100/api/orders", { headers: {
      "idempotency-key": randomUUID(), "x-request-secret": randomBytes(32).toString("base64url"), "x-quote-token": quoted.token,
    } });
    const wrong = { quoteId: quoted.quote.id, locale: "en", customer: { name: "Fixture", email: "fixture@example.invalid", phone: "" }, acceptance: { accepted: true, version: checkoutPolicyVersion("en", free ? "meetup" : "goods") } };
    await assert.rejects(createOrder(request, wrong, null), error => error.code === "POLICY_STALE");
    assert.equal(await prisma.order.count({ where: { quoteId: quoted.quote.id } }), 0);
    assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).reservedStock, 0);
    const catalog = await listCheckoutProduct(variant.id);
    assert.equal(catalog[0].meetup.id, event.id);
    assert.equal(catalog[0].meetup.isOnline, true);
    assert(!JSON.stringify(catalog).includes("private-join"));
    const created = await fromQuote(quoted);
    const row = await prisma.order.findUniqueOrThrow({ where: { id: created.order.id } });
    assert.equal(row.contractAcceptance.kind, free ? "free_meetup" : "meetup");
    const confirmation = await confirmationByCode(row.confirmationCode);
    assert.equal(confirmation.items[0].sku, `MEETUP-${event.id}`);
    assert.equal(confirmation.meetups[0].isOnline, true);
    assert.equal(confirmation.sessions.length, free ? 1 : 0);
    const mail = await prisma.emailOutbox.findUniqueOrThrow({ where: { eventKey: `order:${row.id}:${free ? "PAID" : "created"}` } });
    assert.equal(mail.status, "CAPTURED");
    assert.doesNotMatch(decryptPayload(mail.encryptedPayload).text, /shipping|pickup|packaging|products?/i);
    if (!free) assert(!decryptPayload(mail.encryptedPayload).text.includes("private-join"));
  }
});

test("paid and free attendees use check-in, with no fulfillment mutation or fulfillment mail", async () => {
  for (const free of [false, true]) {
    const { variant } = await fixture({ ticketPriceKrw: free ? "0" : "1500" });
    const created = free ? await fromQuote(await quoteFor(variant, 2)) : await pay(variant, 2);
    const outboxCount = await prisma.emailOutbox.count();
    await assert.rejects(fulfillOrder(created.order.id, { status: "READY" }, "fixture-admin"), error => error.code === "MEETUP_FULFILLMENT");
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: created.order.id } })).fulfillmentStatus, "UNFULFILLED");
    assert.equal(await prisma.emailOutbox.count(), outboxCount);
    const checkin = await setMeetupCheckin({ orderId: created.order.id }, "fixture-admin");
    assert.equal(checkin.status, "checked_in");
    assert.equal(checkin.booking.quantity, 2);
  }
});

test("a mixed goods/event cart is rejected before it can create a quote or hold seats", async () => {
  const { variant } = await fixture();
  const product = await prisma.product.create({ data: { slug: `goods-${randomUUID()}`, titleKo: "책", titleEn: "Book", descriptionKo: "", descriptionEn: "", published: true, priceKind: "BTC_FIXED", priceAmount: 1000n, allowedFulfillments: ["PICKUP"], variants: { create: { sku: `BOOK-${randomUUID()}`, stockOnHand: 5 } } }, include: { variants: true } });
  try {
    const count = await prisma.quote.count();
    await assert.rejects(makeQuote({ fulfillment: "PICKUP", items: [{ variantId: variant.id, quantity: 1 }, { variantId: product.variants[0].id, quantity: 1 }] }, null), error => error.code === "MIXED_CHECKOUT");
    assert.equal(await prisma.quote.count(), count);
    assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).reservedStock, 0);
  } finally {
    await prisma.productVariant.deleteMany({ where: { productId: product.id } });
    await prisma.product.delete({ where: { id: product.id } });
  }
});
