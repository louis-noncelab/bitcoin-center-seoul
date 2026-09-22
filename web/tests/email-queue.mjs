// Email queue claim, retry, and delivery report. Capture mode must not send.
// TEST_DATABASE_URL=postgresql://localhost/center_test npm run test:commerce
import assert from "node:assert/strict";
import test, { after } from "node:test";
import { randomBytes } from "node:crypto";

process.env.APP_MODE = "test";
process.env.APP_ORIGIN = "http://127.0.0.1:3100";
assert.ok(process.env.TEST_DATABASE_URL, "Set TEST_DATABASE_URL to a disposable migrated local PostgreSQL database");
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.DATA_DIR = "/tmp";
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
const { encryptPayload } = await import("../src/server/email/index.ts");
const { processEmailQueue, scheduleEmailDelivery, flushEmailDelivery } = await import("../src/server/email/queue.ts");
const { emailDeliveryReport, retryFailedEmail } = await import("../src/server/email/status.ts");
const { HttpError } = await import("../src/server/http.ts");

const prefix = `emailq${randomBytes(6).toString("hex")}`;

function letter(name, status, extra = {}) {
  return prisma.emailOutbox.create({
    data: {
      eventKey: `${prefix}-${name}`,
      to: encryptPayload({ v: `${name}@example.com` }),
      locale: "ko",
      kind: "order.paid",
      payload: {},
      encryptedPayload: encryptPayload({ subject: `제목 ${name}`, text: "본문", html: "<p>본문</p>", id: "order" }),
      status,
      nextAttemptAt: new Date(),
      ...extra,
    },
  });
}

after(async () => {
  await prisma.emailOutbox.deleteMany({ where: { eventKey: { startsWith: prefix } } });
  await prisma.$disconnect();
});

test("claims due mail, retries with a pause, and reports what the mail server accepted", async () => {
  const sentTo = [];
  const ok = await letter("ok", "PENDING");
  const captured = await letter("cap", "CAPTURED");
  const later = await letter("later", "PENDING", { nextAttemptAt: new Date(Date.now() + 60 * 60_000) });
  const stale = await letter("stale", "PROCESSING", {
    claimedAt: new Date(Date.now() - 16 * 60_000),
    claimToken: "old-token",
    attempts: 0,
  });
  const stolen = await letter("stolen", "PENDING");
  const failing = await letter("fail", "PENDING");

  const pass = await processEmailQueue({
    force: true,
    eventKeyPrefix: prefix,
    send: async (message) => {
      sentTo.push(message.to);
      if (message.to.startsWith("fail@")) throw new Error("mailbox fail@example.com refused");
      if (message.to.startsWith("stolen@")) {
        await prisma.emailOutbox.update({ where: { id: stolen.id }, data: { claimToken: "other-worker" } });
      }
    },
  });

  assert.equal(pass.skipped, false);
  assert.equal(pass.claimed, 4);
  assert.equal(pass.sent, 2);
  assert.equal(pass.failed, 1);
  assert.deepEqual(sentTo.filter((address) => address.endsWith("@example.com")).sort(), ["fail@example.com", "ok@example.com", "stale@example.com", "stolen@example.com"]);

  const okRow = await prisma.emailOutbox.findUniqueOrThrow({ where: { id: ok.id } });
  assert.equal(okRow.status, "SENT");
  assert.equal(okRow.claimToken, null);
  assert.ok(okRow.sentAt);
  const staleRow = await prisma.emailOutbox.findUniqueOrThrow({ where: { id: stale.id } });
  assert.equal(staleRow.status, "SENT");
  const capturedRow = await prisma.emailOutbox.findUniqueOrThrow({ where: { id: captured.id } });
  assert.equal(capturedRow.status, "CAPTURED");
  const laterRow = await prisma.emailOutbox.findUniqueOrThrow({ where: { id: later.id } });
  assert.equal(laterRow.status, "PENDING");
  const stolenRow = await prisma.emailOutbox.findUniqueOrThrow({ where: { id: stolen.id } });
  assert.equal(stolenRow.status, "PROCESSING");
  assert.equal(stolenRow.claimToken, "other-worker");
  const failedOnce = await prisma.emailOutbox.findUniqueOrThrow({ where: { id: failing.id } });
  assert.equal(failedOnce.status, "PENDING");
  assert.equal(failedOnce.attempts, 1);
  assert.equal(failedOnce.lastError.includes("fail@example.com"), false);
  assert.match(failedOnce.lastError, /\[email\]/);
  assert.ok(failedOnce.nextAttemptAt.getTime() > Date.now() + 30_000);

  const idle = await processEmailQueue({
    force: true,
    eventKeyPrefix: prefix,
    send: async () => { throw new Error("should not send"); },
  });
  assert.equal(idle.claimed, 0);

  await prisma.emailOutbox.update({ where: { id: failing.id }, data: { nextAttemptAt: new Date(Date.now() - 1000) } });
  await processEmailQueue({ force: true, eventKeyPrefix: prefix, send: async () => { throw new Error("still down"); } });
  await prisma.emailOutbox.update({ where: { id: failing.id }, data: { nextAttemptAt: new Date(Date.now() - 1000) } });
  await processEmailQueue({ force: true, eventKeyPrefix: prefix, send: async () => { throw new Error("still down"); } });
  const failed = await prisma.emailOutbox.findUniqueOrThrow({ where: { id: failing.id } });
  assert.equal(failed.status, "FAILED");
  assert.equal(failed.attempts, 3);

  const report = await emailDeliveryReport();
  const listed = report.letters.find((item) => item.id === ok.id);
  assert.ok(listed);
  assert.equal(listed.status, "SENT");
  assert.equal(listed.recipient, "ok@example.com");
  assert.equal(listed.subject, "제목 ok");
  assert.equal(report.failures.some((item) => item.id === failing.id), true);
  assert.equal(report.mode, "capture");

  await assert.rejects(retryFailedEmail(failing.id, "admin"), (error) => {
    assert.ok(error instanceof HttpError);
    assert.equal(error.code, "EMAIL_CAPTURE_MODE");
    return true;
  });
  const unchanged = await prisma.emailOutbox.findUniqueOrThrow({ where: { id: failing.id } });
  assert.equal(unchanged.status, "FAILED");

  const hold = await letter("hold", "PENDING");
  scheduleEmailDelivery();
  await flushEmailDelivery();
  const held = await prisma.emailOutbox.findUniqueOrThrow({ where: { id: hold.id } });
  assert.equal(held.status, "PENDING");
});
