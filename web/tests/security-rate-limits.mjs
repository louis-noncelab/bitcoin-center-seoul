import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";
import { randomBytes } from "node:crypto";
assert.ok(process.env.TEST_DATABASE_URL, "Set TEST_DATABASE_URL to a disposable migrated local PostgreSQL database");
Object.assign(process.env, {
  APP_MODE: "test", APP_ORIGIN: "http://127.0.0.1:3197", DATABASE_URL: process.env.TEST_DATABASE_URL,
  DATA_DIR: "/tmp", TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  PAYMENT_PROVIDER: "zaprite", PAYMENT_MODE: "review", EMAIL_MODE: "capture", TRUST_PROXY: "true",
});
const { prisma } = await import("../src/server/db.ts");
const { GET } = await import("../src/app/api/orders/confirm/[code]/route.ts");
const confirm = (code, ip = "198.51.100.1", headers = {}) => GET(new Request(`http://127.0.0.1:3197/api/orders/confirm/${code}`, {
  headers: { "x-bcs-client-ip": ip, ...headers },
}), { params: Promise.resolve({ code }) });
beforeEach(async () => { await prisma.rateLimitBucket.deleteMany(); });
after(async () => { await prisma.rateLimitBucket.deleteMany(); await prisma.$disconnect(); });

test("malformed confirmation paths allocate no persistent buckets", async () => {
  // Given malformed capabilities, when requested, then all fail before persistence.
  for (const code of ["invalid-0", "", "A".repeat(24), "a".repeat(23), "a".repeat(25)]) {
    assert.equal((await confirm(code)).status, 404);
  }
  assert.equal(await prisma.rateLimitBucket.count(), 0);
});
test("random valid-shape missing codes share a per-source budget and do not allocate per-code state", async () => {
  // Given a single verified source, when changing capabilities, then its budget remains shared.
  const statuses = [];
  for (let i = 0; i < 31; i++) statuses.push((await confirm(randomBytes(12).toString("hex"))).status);
  assert.deepEqual(statuses, [...Array(30).fill(404), 429]);
  assert.equal(await prisma.rateLimitBucket.count(), 2);
});
test("many verified sources cannot allocate beyond the global confirmation budget", async () => {
  // Given distinct verified sources, when they exceed the global budget, then allocation stops.
  const statuses = [];
  for (let i = 0; i < 305; i++) statuses.push((await confirm(randomBytes(12).toString("hex"), `198.51.${Math.floor(i / 250)}.${i % 250 + 1}`)).status);
  assert.equal(statuses.filter((value) => value === 404).length, 300);
  assert.equal(statuses.filter((value) => value === 429).length, 5);
  assert.equal(await prisma.rateLimitBucket.count(), 301);
});
test("expired buckets are reclaimed while active counters survive", async () => {
  // Given abandoned old keys, when a valid-shape request arrives, then expired rows are reclaimed.
  await prisma.rateLimitBucket.createMany({ data: Array.from({ length: 20 }, (_, i) => ({ key: `old-${i}`, count: 3, expiresAt: new Date(0) })) });
  assert.equal((await confirm("0".repeat(24))).status, 404);
  assert.equal(await prisma.rateLimitBucket.count({ where: { expiresAt: { lte: new Date() } } }), 0);
  assert.equal(await prisma.rateLimitBucket.count(), 2);
});
test("unverified forwarding headers cannot bypass trusted-proxy enforcement", async () => {
  // Given no verified identity, when spoofing public forwarding headers, then no buckets are allocated.
  const result = await confirm("0".repeat(24), "", { "x-forwarded-for": "198.51.100.5", "x-real-ip": "198.51.100.5" });
  assert.equal(result.status, 403);
  assert.equal(await prisma.rateLimitBucket.count(), 0);
});

test("a real confirmation capability still returns only its intended read-only projection", async () => {
  // Given a genuine capability, when read without guest auth, then the intended confirmation stays usable and private.
  const code = randomBytes(12).toString("hex");
  const quote = await prisma.quote.create({ data: { input: {}, snapshot: {}, amountSats: 10n, expiresAt: new Date(Date.now() + 60_000) } });
  let order;
  try {
    order = await prisma.order.create({ data: {
      quoteId: quote.id, customerName: "Test Guest", customerEmail: "guest@example.invalid", customerPhone: "test-phone",
      amountSats: 10n, fulfillment: "PICKUP", shippingSnapshot: {}, idempotencyScope: code, idempotencyKey: code,
      requestHash: code, accessTokenHash: code, confirmationCode: code,
    } });
    const response = await confirm(code);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
    const { data } = await response.json();
    assert.deepEqual(Object.keys(data).sort(), ["addressText", "amountSats", "code", "createdAt", "customerName", "fulfillment", "fulfillmentStatus", "items", "sessions", "status"].sort());
    assert.equal(data.customerName, "Test Guest");
    assert.equal(data.amountSats, "10");
    assert.deepEqual(data.sessions, []);
  } finally {
    if (order) await prisma.order.delete({ where: { id: order.id } });
    await prisma.quote.delete({ where: { id: quote.id } });
  }
});

test("concurrent random-source requests cannot race past the global allocation bound", async () => {
  // Given a small fixed budget, when requests race from different verified sources, then only five client rows exist.
  const { boundedRequestRateLimit } = await import("../src/server/auth/rate-limit.ts");
  const results = await Promise.allSettled(Array.from({ length: 16 }, (_, i) => boundedRequestRateLimit(
    new Request("http://127.0.0.1:3197", { headers: { "x-bcs-client-ip": `198.51.100.${i + 1}` } }), "concurrent-bound", 3, 5,
  )));
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 5);
  assert.equal(results.filter((result) => result.status === "rejected" && result.reason.status === 429).length, 11);
  assert.equal(await prisma.rateLimitBucket.count(), 6);
});

for (const [name, path, budget, expectedStatus] of [
  ["quote", "../src/app/api/orders/quote/route.ts", 100, 400],
  ["order", "../src/app/api/orders/route.ts", 40, 400],
  ["invoice", "../src/app/api/payments/[id]/invoice/route.ts", 20, 404],
  ["cancel", "../src/app/api/orders/[id]/cancel/route.ts", 30, 404],
]) {
  test(`${name} ingress enforces the existing client budget before allocating more resources`, async () => {
    // Given valid origin and proxy identity, when the client exhausts its quota, then ingress rejects before resource work.
    const { POST } = await import(path);
    for (let i = 0; i <= budget; i++) {
      const request = new Request(`http://127.0.0.1:3197/api/${name}`, { method: "POST", headers: {
        origin: "http://127.0.0.1:3197", "x-bcs-client-ip": "198.51.100.1", "content-type": "application/json",
      }, body: "{}" });
      const result = await POST(request, { params: Promise.resolve({ id: "nonexistent-payment" }) });
      assert.equal(result.status, i === budget ? 429 : expectedStatus);
    }
    assert.equal(await prisma.rateLimitBucket.count(), 2);
  });
}

test("one expiry cleanup pass removes at most 500 abandoned buckets and preserves active ones", async () => {
  // Given a backlog and an active key, when one limiter pass runs, then cleanup does bounded work.
  const { rateLimit } = await import("../src/server/auth/rate-limit.ts");
  await prisma.rateLimitBucket.createMany({ data: [
    ...Array.from({ length: 501 }, (_, i) => ({ key: `expired-${i}`, count: 2, expiresAt: new Date(0) })),
    { key: "active-unrelated", count: 9, expiresAt: new Date(Date.now() + 60_000) },
  ] });
  await rateLimit("cleanup-test", "fixed", 3);
  assert.equal(await prisma.rateLimitBucket.count({ where: { expiresAt: { lte: new Date() } } }), 1);
  assert.equal((await prisma.rateLimitBucket.findUnique({ where: { key: "active-unrelated" } })).count, 9);
});

test("a client that exhausted its quota cannot spend the remaining global allowance", async () => {
  // Given an exhausted source, when it keeps retrying, then other sources retain the remaining global allowance.
  const { boundedRequestRateLimit } = await import("../src/server/auth/rate-limit.ts");
  const request = (ip) => new Request("http://127.0.0.1:3197", { headers: { "x-bcs-client-ip": ip } });
  const limited = () => boundedRequestRateLimit(request("198.51.100.1"), "blocked-source", 2, 5);
  await limited();
  await limited();
  const blocked = await Promise.allSettled(Array.from({ length: 16 }, limited));
  assert.equal(blocked.filter((result) => result.status === "rejected" && result.reason.status === 429).length, 16);
  for (let i = 2; i <= 4; i++) await boundedRequestRateLimit(request(`198.51.100.${i}`), "blocked-source", 2, 5);
  await assert.rejects(() => boundedRequestRateLimit(request("198.51.100.5"), "blocked-source", 2, 5), (error) => error.status === 429);
  assert.equal(await prisma.rateLimitBucket.count(), 5);
});

test("blocked sources racing from independent processes cannot consume fresh sources' allowance", { timeout: 30_000 }, async () => {
  // Given an exhausted source, when independent processes race mixed traffic, then only three remaining requests are admitted.
  const { fork } = await import("node:child_process");
  const { boundedRequestRateLimit } = await import("../src/server/auth/rate-limit.ts");
  const exhausted = new Request("http://127.0.0.1:3197", { headers: { "x-bcs-client-ip": "198.51.100.1" } });
  await boundedRequestRateLimit(exhausted, "multi-process-bound", 2, 5);
  await boundedRequestRateLimit(exhausted, "multi-process-bound", 2, 5);
  const workers = Array.from({ length: 8 }, () => fork(new URL("./fixtures/security-rate-worker.mjs", import.meta.url), [], {
    execArgv: ["--conditions=react-server", "--import", "tsx"], stdio: ["ignore", "ignore", "pipe", "ipc"],
  }));
  try {
    await Promise.all(workers.map((worker) => new Promise((resolve, reject) => {
      worker.once("error", reject);
      worker.once("exit", () => reject(new Error("Rate fixture worker exited before responding")));
      worker.once("message", resolve);
    })));
    const outcomes = await Promise.all(workers.map((worker, i) => new Promise((resolve, reject) => {
      worker.once("error", reject);
      worker.once("exit", () => reject(new Error("Rate fixture worker exited before responding")));
      worker.once("message", ({ statuses }) => resolve(statuses));
      worker.send({ ip: i < 4 ? "198.51.100.1" : `198.51.100.${i + 1}`, action: "multi-process-bound", attempts: 2 });
    })));
    assert.deepEqual(outcomes.slice(0, 4).flat(), Array(8).fill(429));
    assert.equal(outcomes.slice(4).flat().filter((status) => status === 200).length, 3);
    assert.equal(outcomes.flat().filter((status) => status === 429).length, 13);
    assert.ok(await prisma.rateLimitBucket.count() <= 5);
  } finally { for (const worker of workers) worker.kill(); }
});

test("an expired global window does not let an active blocked source reserve the new window", async () => {
  // Given a still-blocked client after global expiry, when it retries, then fresh clients get the whole new global allowance.
  const { createHash } = await import("node:crypto");
  const { boundedRequestRateLimit } = await import("../src/server/auth/rate-limit.ts");
  const request = (ip) => new Request("http://127.0.0.1:3197", { headers: { "x-bcs-client-ip": ip } });
  await boundedRequestRateLimit(request("198.51.100.1"), "expiry-bound", 1, 2);
  const globalKey = createHash("sha256").update("api:expiry-bound:global:all").digest("hex");
  await prisma.rateLimitBucket.update({ where: { key: globalKey }, data: { expiresAt: new Date(0) } });
  await assert.rejects(() => boundedRequestRateLimit(request("198.51.100.1"), "expiry-bound", 1, 2), (error) => error.status === 429);
  assert.equal(await prisma.rateLimitBucket.findUnique({ where: { key: globalKey } }), null);
  await boundedRequestRateLimit(request("198.51.100.2"), "expiry-bound", 1, 2);
  await boundedRequestRateLimit(request("198.51.100.3"), "expiry-bound", 1, 2);
  assert.equal((await prisma.rateLimitBucket.findUnique({ where: { key: globalKey } })).count, 2);
});

test("fully expired client and global windows recover atomically", async () => {
  // Given exhausted expired counters, when the same client returns, then exactly its new allowance is available.
  const { boundedRequestRateLimit } = await import("../src/server/auth/rate-limit.ts");
  const request = new Request("http://127.0.0.1:3197", { headers: { "x-bcs-client-ip": "198.51.100.1" } });
  await boundedRequestRateLimit(request, "expiry-recovery", 1, 1);
  await prisma.rateLimitBucket.updateMany({ data: { expiresAt: new Date(0) } });
  await boundedRequestRateLimit(request, "expiry-recovery", 1, 1);
  await assert.rejects(() => boundedRequestRateLimit(request, "expiry-recovery", 1, 1), (error) => error.status === 429);
  const rows = await prisma.rateLimitBucket.findMany();
  assert.equal(rows.length, 2);
  assert.ok(rows.every((row) => row.count === 1 && row.expiresAt > new Date()));
});
