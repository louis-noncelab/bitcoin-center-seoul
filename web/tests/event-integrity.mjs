import assert from "node:assert/strict";
import test from "node:test";
import { prisma, updateEvent, setEventRegistration, deleteEvent, getEvent, syncEventTicket, fixture, quoteFor, fromQuote, pay, ensureInvoice, reconcilePayment } from "./event-integrity-fixture.mjs";

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
