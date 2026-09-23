// Meetup broadcast queues one letter per paid address and the delivery report lists it.
// TEST_DATABASE_URL=postgresql://localhost/center_test npm run test:commerce
import assert from "node:assert/strict";
import test, { after } from "node:test";
import { randomBytes } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.APP_MODE = "test";
process.env.APP_ORIGIN = "http://127.0.0.1:3100";
assert.ok(process.env.TEST_DATABASE_URL, "Set TEST_DATABASE_URL to a disposable migrated local PostgreSQL database");
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "bcs-broadcast-"));
process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
process.env.PAYMENT_PROVIDER = "zaprite";
process.env.PAYMENT_MODE = "review";
process.env.EMAIL_MODE = "capture";
process.env.TRUST_PROXY = "false";
process.env.REVIEW_KRW_PER_BTC = "150000000";
process.env.ZAPRITE_API_KEY = "test-key";
process.env.ZAPRITE_WEBHOOK_SECRET = "test-secret";
process.env.ZAPRITE_ORG_ID = "org_test";

const { prisma } = await import("../src/server/db.ts");
const { sealString } = await import("../src/server/privacy.ts");
const { decryptPayload } = await import("../src/server/email/index.ts");
const { meetupAudiences, sendMeetupBroadcast } = await import("../src/server/email/meetup-broadcast.ts");
const { emailDeliveryReport } = await import("../src/server/email/status.ts");

const tag = `bcast${randomBytes(4).toString("hex")}`;
const event = await prisma.centerEvent.create({ data: {
  title: "단체 메일 밋업", titleEn: "Group mail meetup", date: "2026-10-01", time: "19:00",
  venueType: "external", location: "온라인", locationEn: "Online", description: "설명", descriptionEn: "Description",
  isOnline: true, onlineUrl: "https://meet.example.invalid/bcs-broadcast-test", onlineInstructions: "카메라를 켜 주세요.",
} });
const eventId = event.id;

async function paidOrder(email, status = "PAID") {
  const product = await prisma.product.create({
    data: {
      slug: `${tag}-${email.split("@")[0]}-${status.toLowerCase()}-${randomBytes(2).toString("hex")}`,
      titleKo: "단체 메일 밋업", titleEn: "Group mail meetup",
      descriptionKo: "설명", descriptionEn: "Description",
      priceKind: "KRW_FIXED", priceAmount: 1000n, allowedFulfillments: ["PICKUP"],
    },
  });
  const variant = await prisma.productVariant.create({
    data: { productId: product.id, sku: `${tag}-${randomBytes(3).toString("hex")}` },
  });
  const quote = await prisma.quote.create({
    data: { input: {}, snapshot: {}, amountSats: 100n, expiresAt: new Date(Date.now() + 60_000) },
  });
  const order = await prisma.order.create({
    data: {
      quoteId: quote.id,
      customerName: sealString("손님"),
      customerEmail: sealString(email),
      amountSats: 100n,
      fulfillment: "PICKUP",
      shippingSnapshot: {},
      idempotencyScope: tag,
      idempotencyKey: randomBytes(8).toString("hex"),
      requestHash: randomBytes(8).toString("hex"),
      accessTokenHash: randomBytes(16).toString("hex"),
      confirmationCode: randomBytes(12).toString("hex"),
      status,
      items: {
        create: {
          variantId: variant.id, quantity: 1, sku: `MEETUP-${eventId}`,
          titleKo: "단체 메일 밋업", titleEn: "Group mail meetup",
          optionLabelKo: "", optionLabelEn: "", priceKind: "KRW_FIXED",
          unitPriceAmount: 1000n, amountSats: 100n, snapshot: {},
        },
      },
    },
  });
  return order.id;
}

after(async () => {
  await prisma.emailOutbox.deleteMany({ where: { eventKey: { startsWith: `meetup:${eventId}:` } } });
  await prisma.auditLog.deleteMany({ where: { action: "meetup.broadcast", targetId: String(eventId) } });
  const orders = await prisma.order.findMany({ where: { idempotencyScope: tag }, select: { id: true, quoteId: true } });
  const ids = orders.map((order) => order.id);
  if (ids.length) {
    await prisma.orderItem.deleteMany({ where: { orderId: { in: ids } } });
    await prisma.order.deleteMany({ where: { id: { in: ids } } });
    await prisma.quote.deleteMany({ where: { id: { in: orders.map((order) => order.quoteId) } } });
  }
  await prisma.productVariant.deleteMany({ where: { sku: { startsWith: tag } } });
  await prisma.product.deleteMany({ where: { slug: { startsWith: tag } } });
  await prisma.centerEvent.delete({ where: { id: eventId } });
  await prisma.$disconnect();
});

test("queues one meetup notice per paid address and lists it in the delivery report", async () => {
  await paidOrder("guest@example.invalid");
  await paidOrder("guest@example.invalid");
  await paidOrder("second@example.invalid");
  await paidOrder("waiting@example.invalid", "PENDING_PAYMENT");

  const audience = (await meetupAudiences()).find((item) => item.id === eventId);
  assert.ok(audience);
  assert.equal(audience.recipients, 2);
  assert.equal(audience.online, true);
  assert.equal(audience.title, "단체 메일 밋업");

  const first = await sendMeetupBroadcast({ eventId, subject: "내일 밋업 안내", message: "일곱 시에 입장해 주세요." }, "broadcast-test");
  assert.deepEqual(first, { recipients: 2, queued: 2, skipped: 0 });
  const again = await sendMeetupBroadcast({ eventId, subject: "내일 밋업 안내", message: "일곱 시에 입장해 주세요." }, "broadcast-test");
  assert.deepEqual(again, { recipients: 2, queued: 0, skipped: 2 });

  const rows = await prisma.emailOutbox.findMany({ where: { eventKey: { startsWith: `meetup:${eventId}:broadcast:` } } });
  assert.equal(rows.length, 2);
  for (const row of rows) {
    assert.equal(row.status, "CAPTURED");
    assert.equal(row.kind, "meetup.notice");
    const body = decryptPayload(row.encryptedPayload);
    assert.equal(body.subject, "내일 밋업 안내");
    assert.match(body.text, /일곱 시에 입장해 주세요/);
    assert.match(body.html, /https:\/\/meet\.example\.invalid\/bcs-broadcast-test/);
    assert.match(body.html, /온라인 참여/);
  }
  const recipients = rows.map((row) => decryptPayload(row.to).v).sort();
  assert.deepEqual(recipients, ["guest@example.invalid", "second@example.invalid"]);

  const report = await emailDeliveryReport();
  const listed = report.letters.filter((item) => item.kind === "meetup.notice" && item.subject === "내일 밋업 안내");
  assert.equal(listed.length, 2);
  assert.equal(listed.every((item) => item.status === "CAPTURED"), true);
  assert.equal(report.mode, "capture");
});

test("skips an order redacted while a meetup broadcast is waiting to queue", async () => {
  // Given a paid attendee whose order is being redacted in another transaction.
  const orderId = await paidOrder("erased@example.invalid");
  let broadcast;
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;

    // When the broadcaster starts before the redaction commits, it must wait for the order.
    broadcast = sendMeetupBroadcast({ eventId, subject: "삭제 경합 안내", message: "예약 안내입니다." }, "broadcast-test");
    await Promise.race([broadcast.then(() => undefined), new Promise((resolve) => setTimeout(resolve, 500))]);
    await tx.order.update({ where: { id: orderId }, data: {
      customerName: "", customerEmail: "", customerPhone: "", confirmationCode: null,
      privacyRedactedAt: new Date(),
    } });
  });

  // Then only the two retained addresses get linked mail; the erased one has no outbox row.
  const result = await broadcast;
  assert.deepEqual(result, { recipients: 2, queued: 2, skipped: 0 });
  const rows = await prisma.emailOutbox.findMany({ where: { eventKey: { startsWith: `meetup:${eventId}:broadcast:` } } });
  const raceRows = rows.filter((row) => decryptPayload(row.encryptedPayload).subject === "삭제 경합 안내");
  assert.equal(raceRows.length, 2);
  assert.deepEqual(raceRows.map((row) => decryptPayload(row.to).v).sort(), ["guest@example.invalid", "second@example.invalid"]);
  assert.equal(raceRows.every((row) => typeof row.orderId === "string" && row.orderId.length > 0), true);
  assert.equal((await meetupAudiences()).find((item) => item.id === eventId)?.recipients, 2);
});
