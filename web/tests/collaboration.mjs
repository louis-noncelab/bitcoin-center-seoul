import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { after, test } from "node:test";

assert.ok(process.env.TEST_DATABASE_URL, "Set TEST_DATABASE_URL to an isolated, migrated local PostgreSQL database");
Object.assign(process.env, {
  APP_MODE: "test", APP_ORIGIN: "http://127.0.0.1:3100", DATABASE_URL: process.env.TEST_DATABASE_URL,
  DATA_DIR: "/tmp", TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  PAYMENT_PROVIDER: "zaprite", PAYMENT_MODE: "review", EMAIL_MODE: "capture", TRUST_PROXY: "true",
});

const { prisma } = await import("../src/server/db.ts");
const { decryptPayload, renderEmail } = await import("../src/server/email/index.ts");
const { POST } = await import("../src/app/api/collaboration/route.ts");
const ip = "198.51.100.143";
const key = (value) => createHash("sha256").update(value).digest("hex");
const bucketKeys = [key("api:collaboration:global:all"), key(`api:collaboration:ip:${key(ip)}`)];
const createdIds = [];
const valid = {
  locale: "ko", type: "community", name: "테스트 제안자", email: "proposal@example.invalid",
  organization: "테스트 모임", message: "함께 비트코인 교육 행사를 열고 싶습니다.", consent: true,
};
const request = (body = valid, headers = {}) => POST(new Request("http://127.0.0.1:3100/api/collaboration", {
  method: "POST", headers: { origin: "http://127.0.0.1:3100", "content-type": "application/json", "x-bcs-client-ip": ip, ...headers },
  body: JSON.stringify(body),
}));

after(async () => {
  if (createdIds.length) await prisma.emailOutbox.deleteMany({ where: { id: { in: createdIds } } });
  await prisma.rateLimitBucket.deleteMany({ where: { key: { in: bucketKeys } } });
  await prisma.$disconnect();
});

test("captures a proposal for the fixed center mailbox with encrypted data", async () => {
  await prisma.rateLimitBucket.deleteMany({ where: { key: { in: bucketKeys } } });
  const before = new Date();
  const response = await request();
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { data: { received: true } });
  const row = await prisma.emailOutbox.findFirstOrThrow({ where: { eventKey: { startsWith: "collaboration:" }, createdAt: { gte: before } }, orderBy: { createdAt: "desc" } });
  createdIds.push(row.id);
  assert.equal(row.status, "CAPTURED");
  assert.equal(row.kind, "COLLABORATION");
  assert.equal(decryptPayload(row.to).v, "hello@noncelab.com");
  const payload = decryptPayload(row.encryptedPayload);
  assert.equal(payload.email, valid.email);
  assert.equal(payload.message, valid.message);
  assert.equal(renderEmail(row.kind, row.locale, payload).subject, "협업 제안이 도착했습니다");
  assert.equal(JSON.stringify(row.payload).includes(valid.email), false);
});

test("accepts the full Korean message limit within the byte cap", async () => {
  const before = new Date();
  assert.equal((await request({ ...valid, message: "가".repeat(3000) })).status, 201);
  const row = await prisma.emailOutbox.findFirstOrThrow({ where: { eventKey: { startsWith: "collaboration:" }, createdAt: { gte: before } }, orderBy: { createdAt: "desc" } });
  createdIds.push(row.id);
  assert.equal(decryptPayload(row.encryptedPayload).message.length, 3000);
});

test("rejects invalid input, absent consent, and cross-origin submission", async () => {
  await prisma.rateLimitBucket.deleteMany({ where: { key: { in: bucketKeys } } });
  for (const body of [
    { ...valid, consent: false },
    { ...valid, email: "attacker@example.invalid\r\nBcc: guest@example.invalid" },
    { ...valid, message: "short" },
    { ...valid, to: "attacker@example.invalid" },
  ]) {
    await prisma.rateLimitBucket.deleteMany({ where: { key: { in: bucketKeys } } });
    assert.equal((await request(body)).status, 400);
  }
  assert.equal((await request(valid, { origin: "https://evil.example" })).status, 403);
});

test("bounds attempts per verified source", async () => {
  await prisma.rateLimitBucket.deleteMany({ where: { key: { in: bucketKeys } } });
  const statuses = [];
  for (let index = 0; index < 4; index += 1) statuses.push((await request({ ...valid, message: "short" })).status);
  assert.deepEqual(statuses, [400, 400, 400, 429]);
});

test("returns body errors without reflecting proposal data", async () => {
  await prisma.rateLimitBucket.deleteMany({ where: { key: { in: bucketKeys } } });
  const unsupported = await request(valid, { "content-type": "text/plain" });
  assert.equal(unsupported.status, 415);
  assert.equal((await unsupported.text()).includes(valid.email), false);
  const oversized = await request({ ...valid, message: "가".repeat(6000) });
  assert.equal(oversized.status, 413);
  assert.equal((await oversized.text()).includes(valid.email), false);
});
