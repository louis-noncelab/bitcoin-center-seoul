import assert from "node:assert/strict";
import test from "node:test";
import { prisma, updateEvent, setEventRegistration, deleteEvent, getEvent, syncEventTicket, fixture, quoteFor, fromQuote, pay, ensureInvoice, reconcilePayment } from "./event-integrity-fixture.mjs";

test("free event registration immediately confirms a seat without a payment", async () => {
  // Given: a free center event with ten available seats.
  const { product, variant } = await fixture({ ticketPriceKrw: "0" });
  // When: a guest registers through the normal quote and order flow.
  const quoted = await quoteFor(variant);
  const { order } = await fromQuote(quoted);
  // Then: the reservation is confirmed without creating a payment or holding stock.
  assert.equal(product.priceKind, "FREE");
  assert.equal(quoted.quote.amountSats, "0");
  assert.equal(quoted.quote.snapshot.rate, null);
  assert.equal(order.status, "PAID");
  assert.equal(order.payments.length, 0);
  assert.equal(order.holdExpiresAt, null);
  const { confirmationByCode } = await import("../src/server/orders/confirmation.ts");
  assert.equal((await confirmationByCode(order.confirmationCode)).status, "PAID");
  assert.deepEqual(await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } }).then(({ stockOnHand, reservedStock }) => ({ stockOnHand, reservedStock })), { stockOnHand: 9, reservedStock: 0 });
});

test("zero-satoshi meetup uses the free registration path", async () => {
  // Given: an internal event with a zero-satoshi price.
  const { product, variant } = await fixture({ ticketPriceKrw: "", ticketPriceSats: "0" });
  // When: a guest completes its normal registration.
  const quoted = await quoteFor(variant);
  const { order } = await fromQuote(quoted);
  // Then: it creates neither a conversion rate nor a payment.
  assert.equal(product.priceKind, "FREE");
  assert.equal(quoted.quote.amountSats, "0");
  assert.equal(quoted.quote.snapshot.rate, null);
  assert.equal(order.status, "PAID");
  assert.equal(order.payments.length, 0);
});

test("satoshi-priced meetup keeps its fixed amount through quote and REVIEW order", async () => {
  // Given: an internal meetup with a fixed satoshi price.
  const { event, product, variant } = await fixture({ ticketPriceKrw: "", ticketPriceSats: "21000" });
  assert.equal(event.ticketPriceSats, "21000");
  assert.equal(product.priceKind, "BTC_FIXED");
  assert.equal(product.priceAmount, 21000n);
  // When: a guest requests two seats and places an order.
  const quoted = await quoteFor(variant, 2);
  const { order } = await fromQuote(quoted);
  // Then: the fixed amount is copied unchanged into the quote and order.
  assert.equal(quoted.quote.snapshot.items[0].priceKind, "BTC_FIXED");
  assert.equal(quoted.quote.snapshot.items[0].unitPriceAmount, "21000");
  assert.equal(quoted.quote.amountSats, "42000");
  assert.equal(order.amountSats, "42000");
  assert.equal((await getEvent(event.id))?.ticketPriceSats, "21000");
});

test("satoshi-priced meetup settles the fixed amount in REVIEW mode", async () => {
  // Given: an internal ticket with a fixed 21,000-sat price.
  const { variant } = await fixture({ ticketPriceKrw: "", ticketPriceSats: "21000" });
  // When: its REVIEW payment is completed without any network charge.
  const { order } = await pay(variant, 1);
  // Then: the confirmed order retains the satoshi amount.
  assert.equal(order.amountSats, "21000");
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status, "PAID");
});

test("editing a KRW meetup to satoshis updates the existing ticket product", async () => {
  // Given: a previously published meetup priced in KRW.
  const { event, data, product, variant } = await fixture();
  assert.equal(product.priceKind, "KRW_FIXED");
  // When: its administrator switches the fixed price unit to satoshis.
  const updated = await updateEvent(event.id, { ...data, ticketPriceKrw: "", ticketPriceSats: "21000" }, event.revision);
  // Then: the same ticket variant now quotes fixed sats without converting KRW.
  const ticket = await prisma.product.findUniqueOrThrow({ where: { slug: `meetup-${event.id}` } });
  const quoted = await quoteFor(variant);
  assert.equal(updated.ticketPriceKrw, "");
  assert.equal(updated.ticketPriceSats, "21000");
  assert.equal(ticket.id, product.id);
  assert.equal(ticket.priceKind, "BTC_FIXED");
  assert.equal(ticket.priceAmount, 21000n);
  assert.equal(quoted.quote.amountSats, "21000");
});

test("concurrent free registrations cannot take the same last seat", async () => {
  // Given: a free event with one seat and two guests holding valid quotes.
  const { variant } = await fixture({ ticketPriceKrw: "0", ticketCapacity: 1 });
  const quotes = await Promise.all([quoteFor(variant), quoteFor(variant)]);
  // When: both guests submit their registrations concurrently.
  const results = await Promise.allSettled(quotes.map(fromQuote));
  // Then: exactly one is confirmed, without reserved stock or a payment.
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.find((result) => result.status === "rejected").reason.code, "OUT_OF_STOCK");
  const stock = await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } });
  assert.equal(stock.stockOnHand, 0);
  assert.equal(stock.reservedStock, 0);
});

test("free reservation cancellation restores a seat without creating a refund", async () => {
  // Given: a confirmed free reservation occupying the event's last seat.
  const { variant } = await fixture({ ticketPriceKrw: "0", ticketCapacity: 1 });
  const { order } = await fromQuote(await quoteFor(variant));
  const { cancelFreeOrder } = await import("../src/server/orders/free-cancellation.ts");
  // When: an operator cancels it, including an identical retry.
  const cancelled = await cancelFreeOrder(order.id, { reason: "참가자 요청" }, "review-admin");
  await cancelFreeOrder(order.id, { reason: "참가자 요청" }, "review-admin");
  // Then: the seat is open once; no payment or refund is recorded.
  assert.equal(cancelled.status, "CANCELLED");
  assert.equal(cancelled.refundStatus, "NONE");
  assert.equal(cancelled.payments.length, 0);
  const stock = await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } });
  assert.deepEqual({ available: stock.stockOnHand, reserved: stock.reservedStock }, { available: 1, reserved: 0 });
  const audits = await prisma.auditLog.findMany({ where: { targetType: "Order", targetId: order.id, action: "order.free.cancelled" } });
  assert.equal(audits.length, 1);
  assert.equal(audits[0].summary.restock, true);
  assert.equal(audits[0].summary.toOrderStatus, "CANCELLED");
  const { confirmationByCode } = await import("../src/server/orders/confirmation.ts");
  assert.equal((await confirmationByCode(order.confirmationCode)).status, "CANCELLED");
});

test("sold-out meetup disables registration until cancellation restores a seat", async () => {
  // Given: an event with one available free seat.
  const { event, variant } = await fixture({ ticketPriceKrw: "0", ticketCapacity: 1 });
  const { meetupPaymentHrefs } = await import("../src/server/events/tickets.ts");
  const { soldOutBookingHref } = await import("../src/lib/event-booking.ts");
  const available = (await meetupPaymentHrefs([event.id]))[event.id];
  assert.match(available, new RegExp(`variant=${variant.id}`));
  // When: the last seat is confirmed, then the operator cancels that registration.
  const { order } = await fromQuote(await quoteFor(variant));
  assert.equal((await meetupPaymentHrefs([event.id]))[event.id], soldOutBookingHref);
  const { cancelFreeOrder } = await import("../src/server/orders/free-cancellation.ts");
  await cancelFreeOrder(order.id, { reason: "참가자 요청" }, "review-admin");
  // Then: the public registration link becomes available again.
  assert.equal((await meetupPaymentHrefs([event.id]))[event.id], available);
});

test("paid meetup also closes its registration link when sold out", async () => {
  // Given: the last seat of a paid event has settled.
  const { event, variant } = await fixture({ ticketPriceKrw: "1000", ticketCapacity: 1 });
  await pay(variant, 1);
  // Then: its public link shows the same sold-out state as a free event.
  const { meetupPaymentHrefs } = await import("../src/server/events/tickets.ts");
  const { soldOutBookingHref } = await import("../src/lib/event-booking.ts");
  assert.equal((await meetupPaymentHrefs([event.id]))[event.id], soldOutBookingHref);
});

test("paid registration cannot use the free cancellation path", async () => {
  // Given: a settled paid reservation.
  const { variant } = await fixture();
  const { order } = await pay(variant, 1);
  const { cancelFreeOrder } = await import("../src/server/orders/free-cancellation.ts");
  // When: an operator submits the free cancellation action for that order.
  await assert.rejects(cancelFreeOrder(order.id, { reason: "참가자 요청" }, "review-admin"), { code: "INVALID_STATE" });
  // Then: its paid status and inventory stay unchanged.
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status, "PAID");
  assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).stockOnHand, 9);
});

test("check-in and free cancellation serialize on the order row", async () => {
  // Given: a confirmed free registration.
  const { variant } = await fixture({ ticketPriceKrw: "0", ticketCapacity: 1 });
  const { order } = await fromQuote(await quoteFor(variant));
  const { cancelFreeOrder } = await import("../src/server/orders/free-cancellation.ts");
  const { setMeetupCheckin } = await import("../src/server/orders/checkin.ts");
  // When: an operator checks in while another operator cancels the same registration.
  const results = await Promise.allSettled([
    cancelFreeOrder(order.id, { reason: "참가자 요청" }, "review-admin"),
    setMeetupCheckin({ orderId: order.id }, "checkin-admin"),
  ]);
  // Then: only one outcome commits; attended seats are never reopened.
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  const current = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  const stock = await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } });
  assert.equal(stock.stockOnHand, current.status === "CANCELLED" ? 1 : 0);
  assert.equal(Boolean(current.checkedInAt), current.status === "PAID");
});

test("capacity reduction below paid seats rejects atomically without manufacturing stock", async () => {
  // Given: eight of ten seats are actually paid through the review provider.
  const { event, data, variant } = await fixture();
  await pay(variant, 8);
  // When: an administrator attempts to reduce capacity below paid seats.
  await assert.rejects(updateEvent(event.id, { ...data, ticketCapacity: 1 }, event.revision), { code: "CAPACITY_BELOW_COMMITMENTS" });
  // Then: event revision, capacity and the two remaining seats are unchanged.
  assert.equal((await getEvent(event.id)).ticketCapacity, 10);
  assert.equal((await getEvent(event.id)).revision, event.revision);
  assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).stockOnHand, 2);
});

test("stale delayed ticket sync cannot reopen a closed event", async () => {
  // Given: two sequential valid edits, followed by an obsolete synchronization task.
  const { event, data, product } = await fixture();
  const stale = await updateEvent(event.id, { ...data, ticketCapacity: 20 }, event.revision);
  const closed = await setEventRegistration(event.id, true, stale.revision);
  await syncEventTicket(closed);
  // When: the earlier task finally runs.
  await syncEventTicket(stale, event.ticketCapacity);
  // Then: the current closed state remains authoritative.
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).published, false);
});

test("past event is rejected by the actual quote service", async () => {
  // Given: an event whose Seoul calendar date has passed.
  const { variant } = await fixture({ date: "2020-01-01" });
  // When / Then: a direct checkout request cannot obtain a quote.
  await assert.rejects(quoteFor(variant), { code: "PRODUCT_UNAVAILABLE" });
});

test("valid capacity decrease and increase preserve all eight paid seats", async () => {
  // Given: eight paid seats and two seats remaining.
  const { event, data, variant } = await fixture();
  await pay(variant, 8);
  // When: capacity reaches exactly the commitments then returns to ten.
  const reduced = await updateEvent(event.id, { ...data, ticketCapacity: 8 }, event.revision);
  await updateEvent(event.id, data, reduced.revision);
  // Then: only two further seats can be bought, reaching ten paid seats total.
  assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).stockOnHand, 2);
  await pay(variant, 2);
  await assert.rejects(fromQuote(await quoteFor(variant)), { code: "OUT_OF_STOCK" });
  const paid = await prisma.orderItem.aggregate({ where: { variantId: variant.id, order: { status: "PAID" } }, _sum: { quantity: true } });
  assert.equal(paid._sum.quantity, 10);
});

test("capacity edits racing checkout never undercut a committed reservation", async () => {
  // Given: a quote for eight seats in a ten-seat event.
  const { event, data, variant } = await fixture();
  const quote = await quoteFor(variant, 8);
  // When: an order and a capacity reduction contend on the actual PostgreSQL rows.
  const results = await Promise.allSettled([
    fromQuote(quote), updateEvent(event.id, { ...data, ticketCapacity: 1 }, event.revision),
  ]);
  // Then: exactly one operation succeeds and inventory matches that winner.
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  const current = await getEvent(event.id);
  const stock = await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } });
  if (results[0].status === "fulfilled") {
    assert.equal(results[1].reason.code, "CAPACITY_BELOW_COMMITMENTS");
    assert.equal(current.ticketCapacity, 10);
    assert.equal(stock.reservedStock, 8);
  } else {
    assert.equal(results[0].reason.code, "QUOTE_STALE");
    assert.equal(current.ticketCapacity, 1);
    assert.equal(stock.reservedStock, 0);
  }
  assert.ok(stock.stockOnHand >= stock.reservedStock);
});

test("concurrent valid revision edits commit one coherent event and ticket", async () => {
  // Given: two administrators loaded the same revision.
  const { event, data, product } = await fixture();
  // When: close and price/capacity edits compete.
  const results = await Promise.allSettled([
    setEventRegistration(event.id, true, event.revision),
    updateEvent(event.id, { ...data, ticketCapacity: 20, ticketPriceKrw: "3000" }, event.revision),
  ]);
  // Then: one stale editor loses and the ticket matches the committed event.
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.find((result) => result.status === "rejected").reason.code, "EDIT_CONFLICT");
  const current = await getEvent(event.id);
  const ticket = await prisma.product.findUniqueOrThrow({ where: { id: product.id }, include: { variants: true } });
  assert.equal(ticket.published, !current.registrationClosed);
  assert.equal(ticket.priceAmount, BigInt(current.ticketPriceKrw));
  assert.equal(ticket.variants[0].stockOnHand, current.ticketCapacity);
});

for (const change of ["close", "external", "delete"]) test(`${change} atomically stops new orders and preserves an existing paid order`, async () => {
  // Given: one paid historical order and another customer's outstanding quote.
  const { event, data, variant, product } = await fixture();
  const paid = await pay(variant, 1);
  const quote = await quoteFor(variant);
  // When: registration is disabled through the domain operation alone.
  if (change === "close") await setEventRegistration(event.id, true, event.revision);
  else if (change === "external") await updateEvent(event.id, { ...data, externalPayment: true, link: "https://example.invalid/tickets" }, event.revision);
  else await deleteEvent(event.id, event.revision);
  // Then: the retained checkout cannot place an order; history is intact.
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).published, false);
  await assert.rejects(fromQuote(quote), { code: "PRODUCT_UNAVAILABLE" });
  await assert.rejects(quoteFor(variant), { code: "PRODUCT_UNAVAILABLE" });
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: paid.order.id } })).status, "PAID");
  await syncEventTicket(event, 0);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).published, false);
});

for (const action of ["quote", "order"]) test(`Seoul midnight stops ${action} even when the stored ticket remains published`, async (context) => {
  // Given: an available ticket just before the event's Seoul date ends.
  const { variant, product } = await fixture();
  context.mock.timers.enable({ apis: ["Date"], now: Date.parse("2099-10-01T14:59:59.999Z") });
  const quote = await quoteFor(variant);
  // When: time alone crosses the cutoff, with no administrator edit or cron job.
  context.mock.timers.tick(1);
  // Then: both new quotes and existing quotes fail closed at purchase time.
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).published, true);
  await assert.rejects(action === "quote" ? quoteFor(variant) : fromQuote(quote), { code: "PRODUCT_UNAVAILABLE" });
});

test("an already reserved order can settle after the event is deleted", async () => {
  // Given: a customer already holds a legitimate reservation.
  const { event, variant } = await fixture();
  const { order } = await fromQuote(await quoteFor(variant, 2));
  const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } });
  const issued = await ensureInvoice(payment.id);
  await deleteEvent(event.id, event.revision);
  // When: the provider confirms the existing invoice.
  await prisma.payment.update({ where: { id: payment.id }, data: { metadata: { ...issued.metadata, reviewScenario: "paid" } } });
  await reconcilePayment(payment.id);
  // Then: settlement and the immutable item history survive event deletion.
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status, "PAID");
  assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).stockOnHand, 8);
});

for (const mutation of ["edit", "rename", "archive", "create", "sku"]) test(`ordinary catalog ${mutation} cannot mutate event-owned inventory`, async () => {
  // Given: a generated event ticket with available seats.
  const { product, variant } = await fixture();
  const { saveProduct, archiveProduct } = await import("../src/server/catalog/index.ts");
  const data = {
    slug: product.slug, titleKo: "변경", titleEn: "Changed", descriptionKo: "", descriptionEn: "",
    imageUrl: "", images: [], published: true, memberOnly: false, priceKind: "KRW_FIXED", priceAmount: "1", allowedFulfillments: ["PICKUP"],
    variants: [{ id: variant.id, sku: variant.sku, stockOnHand: 100, billableWeightG: 0, active: true, optionLabelKo: "", optionLabelEn: "" }],
  };
  // When / Then: every generic mutation rejects before changing stock or publication.
  if (mutation === "archive") await assert.rejects(archiveProduct(product.id, "test"), { code: "EVENT_TICKET_MANAGED" });
  else if (mutation === "rename") await assert.rejects(saveProduct({ ...data, slug: "ordinary-book", variants: [{ ...data.variants[0], sku: "ORDINARY-BOOK" }] }, "test", product.id), { code: "EVENT_TICKET_MANAGED" });
  else if (mutation === "sku") await assert.rejects(saveProduct({ ...data, slug: "ordinary-book", variants: [{ ...data.variants[0], id: undefined, sku: "MEETUP-2147483646" }] }, "test"), { code: "EVENT_TICKET_MANAGED" });
  else if (mutation === "edit") await assert.rejects(saveProduct(data, "test", product.id), { code: "EVENT_TICKET_MANAGED" });
  else await assert.rejects(saveProduct({ ...data, slug: `meetup-2147483646`, variants: [{ ...data.variants[0], id: undefined, sku: "MEETUP-2147483646" }] }, "test"), { code: "EVENT_TICKET_MANAGED" });
  assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).stockOnHand, 10);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).published, true);
});
