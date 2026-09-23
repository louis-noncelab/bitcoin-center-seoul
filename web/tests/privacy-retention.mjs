import assert from "node:assert/strict";
import test, { after } from "node:test";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";

assert.ok(process.env.TEST_DATABASE_URL, "Use an isolated disposable database.");
Object.assign(process.env, {
  APP_MODE: "test", APP_ORIGIN: "http://127.0.0.1:3100", DATABASE_URL: process.env.TEST_DATABASE_URL,
  DATA_DIR: "/tmp", TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  PAYMENT_PROVIDER: "zaprite", PAYMENT_MODE: "review", EMAIL_MODE: "capture", TRUST_PROXY: "false",
});
const { prisma } = await import("../src/server/db.ts");
const { sealString, openString } = await import("../src/server/privacy.ts");
const { runPrivacyRetentionPass, retentionDate } = await import("../src/server/privacy-retention.ts");
const { cleanExpiredPrivacyRecords } = await import("../src/server/privacy-retention-cleanup.ts");
const { orderView, orderIncludes } = await import("../src/server/orders/projection.ts");
const { applyObservation } = await import("../src/server/payments/state.ts");
const { fulfillOrder } = await import("../src/server/orders/admin.ts");
const { resolveManualPayment } = await import("../src/server/orders/manual-payment.ts");
const now = new Date("2030-03-01T00:00:00Z");
const old = new Date("2028-02-28T00:00:00Z");
after(() => prisma.$disconnect());

async function fixture(overrides = {}) {
  const id = randomUUID();
  return prisma.order.create({ data: {
    id, quote: { create: { input: {}, snapshot: {}, amountSats: 100n, expiresAt: old, createdAt: old, ownerHash: "owner-secret" } },
    customerName: sealString("Customer"), customerEmail: sealString("customer@example.invalid"), customerEmailHash: "email-hash",
    customerPhone: sealString("01012345678"), customerNotes: sealString("Personal note"), address: sealString('{"line1":"Private address"}'),
    amountSats: 100n, fulfillment: "PICKUP", fulfillmentStatus: "COLLECTED", fulfilledAt: old,
    shippingSnapshot: {}, status: "PAID", createdAt: old, updatedAt: old,
    idempotencyScope: id, idempotencyKey: id, requestHash: "request-secret", accessTokenHash: id,
    payments: { create: { provider: "ZAPRITE", mode: "REVIEW", creationKey: randomUUID(), amountSats: 100n, metadata: { orderId: id }, status: "PAID", paidAt: old, expiresAt: old, paymentHash: randomUUID() } },
    ...overrides,
  } });
}

test("dry run reports eligible orders without modifying contact details", async () => {
  // Given an expired, fulfilled order.
  const order = await fixture();
  // When the default dry run selects that order.
  const result = await runPrivacyRetentionPass({ now, orderId: order.id });
  // Then its data is unchanged and no archive is written.
  assert.equal(result.orders, 1);
  assert.equal(openString((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).customerName), "Customer");
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).contractAcceptance, null);
  assert.equal(await prisma.privacyLegalRecord.count({ where: { orderId: order.id } }), 0);
});

test("apply removes operational PII and preserves separately encrypted legal evidence", async () => {
  const acceptance = { locale: "ko", acceptedAt: old.toISOString(), version: "fixture-version", disclosure: ["fixture disclosure"], terms: { title: "fixture terms" }, refunds: { title: "fixture refunds" } };
  const order = await fixture({ contractAcceptance: acceptance });
  const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } });
  await prisma.payment.update({ where: { id: payment.id }, data: { metadata: { orderId: order.id, cancelReason: "Private complaint" } } });
  await prisma.auditLog.create({ data: { action: "order.cancelled", targetType: "Order", targetId: order.id, summary: { reason: "Private complaint" }, createdAt: old } });
  await prisma.emailOutbox.create({ data: { eventKey: `order:${order.id}:created`, to: sealString("customer@example.invalid"), kind: "order.created", payload: {}, encryptedPayload: sealString("Private message"), status: "CAPTURED", createdAt: old } });
  const result = await runPrivacyRetentionPass({ apply: true, now, orderId: order.id });
  assert.equal(result.orders, 1);
  const row = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: orderIncludes });
  const view = orderView(row);
  assert.deepEqual([view.customerName, view.customerEmail, view.customerPhone, view.customerNotes, view.address], ["", "", "", "", null]);
  assert.equal(row.customerEmailHash, null);
  assert.equal(row.contractAcceptance, null);
  assert.notEqual(row.accessTokenHash, order.accessTokenHash);
  assert.equal(row.confirmationCode, null);
  const transaction = await prisma.privacyLegalRecord.findUniqueOrThrow({ where: { orderId_kind: { orderId: order.id, kind: "TRANSACTION" } } });
  assert.ok(transaction.encryptedPayload.startsWith("v1."));
  const sealed = JSON.parse(openString(transaction.encryptedPayload));
  assert.equal(openString(sealed.name), "Customer");
  assert.deepEqual(sealed.contractAcceptance, acceptance);
  assert.equal(JSON.stringify(sealed).includes("Private complaint"), false);
  const dispute = await prisma.privacyLegalRecord.findUniqueOrThrow({ where: { orderId_kind: { orderId: order.id, kind: "DISPUTE" } } });
  assert.equal(dispute.expiresAt.toISOString(), "2031-02-28T00:00:00.000Z");
  assert.equal(JSON.parse(openString(dispute.encryptedPayload)).cancellationReasons[0].reason, "Private complaint");
  const afterPayment = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
  assert.equal(afterPayment.paymentHash, payment.paymentHash);
  assert.deepEqual(afterPayment.metadata, { orderId: order.id });
  assert.equal(await prisma.emailOutbox.count({ where: { eventKey: { contains: order.id } } }), 0);
});

test("repeated apply is idempotent", async () => {
  const order = await fixture();
  await runPrivacyRetentionPass({ apply: true, now, orderId: order.id });
  const result = await runPrivacyRetentionPass({ apply: true, now, orderId: order.id });
  assert.equal(result.orders, 0);
  assert.equal(await prisma.privacyLegalRecord.count({ where: { orderId: order.id } }), 1);
});

for (const [label, overrides] of [
  ["legal hold", { privacyHold: true }], ["pending refund", { refundStatus: "PENDING" }],
  ["review", { status: "REVIEW" }], ["pending payment", { status: "PENDING_PAYMENT" }],
  ["unfulfilled shipment", { fulfillmentStatus: "UNFULFILLED" }],
]) test(`${label} prevents even explicit early erasure`, async () => {
  const order = await fixture(overrides);
  const result = await runPrivacyRetentionPass({ apply: true, now, orderId: order.id, early: true });
  assert.equal(result.orders, 0);
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).privacyRedactedAt, null);
});

test("recent contacts require an explicit early request", async () => {
  const order = await fixture({ createdAt: new Date("2030-01-01") });
  const result = await runPrivacyRetentionPass({ apply: true, now, orderId: order.id });
  assert.equal(result.orders, 0);
});

test("early request erases completed orders before one year", async () => {
  const order = await fixture({ createdAt: new Date("2030-01-01") });
  const result = await runPrivacyRetentionPass({ apply: true, now, orderId: order.id, early: true });
  assert.equal(result.orders, 1);
});

test("in-flight outbox claim defers order erasure", async () => {
  const order = await fixture();
  await prisma.emailOutbox.create({ data: { eventKey: `order:${order.id}:created`, to: "fixture", kind: "order.created", payload: {}, status: "PROCESSING", createdAt: old } });
  const result = await runPrivacyRetentionPass({ apply: true, now, orderId: order.id });
  assert.equal(result.orders, 0);
});

test("late payment after erasure preserves review evidence without new recipient mail", async () => {
  const order = await fixture({ status: "EXPIRED", fulfillmentStatus: "UNFULFILLED" });
  const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } });
  await prisma.payment.update({ where: { id: payment.id }, data: { status: "EXPIRED", paidAt: null } });
  await runPrivacyRetentionPass({ apply: true, now, orderId: order.id });
  await applyObservation(payment.id, { status: "PAID" });
  const row = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  assert.equal(row.status, "REVIEW");
  assert.equal(row.customerEmail, "");
  assert.equal(await prisma.emailOutbox.count({ where: { eventKey: { contains: order.id } } }), 0);
  assert.equal(await prisma.paymentEvent.count({ where: { paymentId: payment.id } }), 1);
});

test("redacted order cannot be reopened through manual payment or fulfillment", async () => {
  const order = await fixture();
  await runPrivacyRetentionPass({ apply: true, now, orderId: order.id });
  const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } });
  await assert.rejects(fulfillOrder(order.id, { status: "READY" }, "fixture"), (error) => error.code === "ORDER_REDACTED");
  await assert.rejects(resolveManualPayment(order.id, { paymentId: payment.id, expectedPaymentUpdatedAt: payment.updatedAt.toISOString(), decision: "PAID", reason: "fixture" }, "fixture"), (error) => error.code === "ORDER_REDACTED");
});

test("legal archive expiration respects holds and reopened review cases", async () => {
  const free = await fixture();
  const held = await fixture();
  const reopened = await fixture();
  for (const order of [free, held, reopened]) await runPrivacyRetentionPass({ apply: true, now, orderId: order.id });
  await prisma.order.update({ where: { id: held.id }, data: { privacyHold: true } });
  await prisma.order.update({ where: { id: reopened.id }, data: { status: "REVIEW" } });
  await cleanExpiredPrivacyRecords({ apply: true, now: new Date("2040-01-01") });
  assert.equal(await prisma.privacyLegalRecord.count({ where: { orderId: free.id } }), 0);
  assert.equal(await prisma.privacyLegalRecord.count({ where: { orderId: held.id } }), 1);
  assert.equal(await prisma.privacyLegalRecord.count({ where: { orderId: reopened.id } }), 1);
});

test("calendar anniversary includes leap-day orders on February 28", async () => {
  const order = await fixture({ createdAt: new Date("2028-02-29T12:00:00Z") });
  const result = await runPrivacyRetentionPass({ apply: true, now: new Date("2029-02-28T12:00:00Z"), orderId: order.id });
  assert.equal(result.orders, 1);
  assert.equal(retentionDate(new Date("2028-02-29T12:00:00Z"), 1).toISOString(), "2029-02-28T12:00:00.000Z");
});

test("cleanup erases old completed mail after a recent retry and leaves processing mail", async () => {
  const completed = await prisma.emailOutbox.create({ data: { eventKey: randomUUID(), to: "fixture", kind: "notice", payload: {}, status: "SENT", createdAt: old, updatedAt: now } });
  const processing = await prisma.emailOutbox.create({ data: { eventKey: randomUUID(), to: "fixture", kind: "notice", payload: {}, status: "PROCESSING", createdAt: old } });
  const pending = await prisma.emailOutbox.create({ data: { eventKey: randomUUID(), to: "fixture", kind: "notice", payload: {}, status: "PENDING", createdAt: old } });
  const quote = await prisma.quote.create({ data: { input: {}, snapshot: {}, amountSats: 1n, expiresAt: old, createdAt: old } });
  await cleanExpiredPrivacyRecords({ apply: true, now });
  assert.equal(await prisma.emailOutbox.count({ where: { id: completed.id } }), 0);
  assert.equal(await prisma.emailOutbox.count({ where: { id: processing.id } }), 1);
  assert.equal(await prisma.emailOutbox.count({ where: { id: pending.id } }), 0);
  assert.equal(await prisma.quote.count({ where: { id: quote.id } }), 0);
});

test("bounded scan advances past protected records and rejects invalid batch size", async () => {
  const first = await runPrivacyRetentionPass({ now, limit: 1 });
  assert.equal(first.checked, 1);
  assert.ok(first.nextCursor);
  const next = await runPrivacyRetentionPass({ now, limit: 1, afterId: first.nextCursor });
  assert.notEqual(next.nextCursor, first.nextCursor);
  await assert.rejects(runPrivacyRetentionPass({ limit: 101 }), RangeError);
});

test("concurrent legal hold prevents archive deletion", async () => {
  const order = await fixture();
  await runPrivacyRetentionPass({ apply: true, now, orderId: order.id });
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${order.id} FOR UPDATE`;
    await tx.order.update({ where: { id: order.id }, data: { privacyHold: true } });
    await cleanExpiredPrivacyRecords({ apply: true, now: new Date("2040-01-01") });
  });
  assert.equal(await prisma.privacyLegalRecord.count({ where: { orderId: order.id } }), 1);
});

test("CLI help, bad input, dry run, explicit apply and hold are usable", async () => {
  const run = (...args) => spawnSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "scripts/privacy-retention.ts", ...args], { env: process.env, encoding: "utf8" });
  assert.equal(run("--help").status, 0);
  assert.equal(run("--unknown").status, 1);
  const order = await fixture();
  assert.equal(run("--hold", order.id, "--apply").status, 0);
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).privacyHold, true);
  assert.equal(run("--release-hold", order.id, "--apply").status, 0);
  const preview = run("--order", order.id, "--early");
  assert.equal(preview.status, 0);
  assert.equal(JSON.parse(preview.stdout).apply, false);
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).privacyRedactedAt, null);
  const applied = run("--order", order.id, "--early", "--apply");
  assert.equal(applied.status, 0);
  assert.equal(JSON.parse(applied.stdout).orders, 1);
  assert.ok((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).privacyRedactedAt);
});

test("CLI help and malformed arguments work without server configuration", () => {
  for (const [argument, status] of [["--help", 0], ["--unknown", 1]]) {
    const result = spawnSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "scripts/privacy-retention.ts", argument], { env: { PATH: process.env.PATH }, encoding: "utf8" });
    assert.equal(result.status, status);
    assert.equal(result.stderr.includes("DATABASE_URL"), false);
  }
});
