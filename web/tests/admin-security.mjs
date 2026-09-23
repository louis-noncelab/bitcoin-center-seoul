import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createPasswordHash, validPasswordHash, verifyPassword } from "../src/server/events/password.ts";
import { configuredOrigin } from "../src/server/events/config.ts";
import { prisma } from "../src/server/db.ts";
import { isAuthenticated, login, loginClientKey, logout, requireSameOrigin, setSessionCookie } from "../src/server/events/auth.ts";

const directory = mkdtempSync(join(tmpdir(), "bcs-admin-security-"));
const password = "기존 비밀번호 compatibility 2026!";
assert.ok(process.env.TEST_DATABASE_URL, "Set TEST_DATABASE_URL to a disposable migrated local PostgreSQL database");
Object.assign(process.env, {
  APP_MODE: "test", APP_ORIGIN: "http://127.0.0.1:3197", DATABASE_URL: process.env.TEST_DATABASE_URL,
  DATA_DIR: directory, TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  PAYMENT_PROVIDER: "zaprite", PAYMENT_MODE: "review", EMAIL_MODE: "capture", TRUST_PROXY: "false",
});
let encoded;
const cookieRequest = (token) => new NextRequest("https://center.example/api/admin/session", {
  headers: { cookie: `bcs_admin_session=${token}` },
});
const status = (expected) => (error) => error.status === expected;

before(async () => {
  encoded = await createPasswordHash(password);
});
beforeEach(async () => {
  process.env.ADMIN_PASSWORD_HASH = encoded;
  process.env.APP_ORIGIN = "http://127.0.0.1:3197";
  delete process.env.ADMIN_PASSWORD;
  delete process.env.BCS_TRUST_PROXY;
  await prisma.adminSession.deleteMany();
  await prisma.adminLoginAttempt.deleteMany();
});
after(async () => {
  await prisma.adminSession.deleteMany();
  await prisma.adminLoginAttempt.deleteMany();
  await prisma.$disconnect();
  rmSync(directory, { recursive: true, force: true });
});

test("scrypt retains the exact existing password with a unique salt and rejects weak/invalid encoded parameters", async () => {
  const second = await createPasswordHash(password);
  assert.notEqual(encoded, second);
  assert.equal(validPasswordHash(encoded), true);
  assert.equal(await verifyPassword(password, encoded), true);
  assert.equal(await verifyPassword(password + " ", encoded), false);
  assert.equal(validPasswordHash(encoded.replace("131072", "1024")), false);
  await assert.rejects(() => verifyPassword(password, "sha256$invalid"));
  await assert.rejects(() => createPasswordHash(""));
});

test("password CLI writes only a private verifier and refuses overwrite or password arguments", async () => {
  const output = join(directory, "admin-password.env");
  const run = (args) => spawnSync(process.execPath, ["--import", "tsx", "scripts/admin-password.ts", ...args], {
    cwd: process.cwd(), encoding: "utf8", env: { ...process.env, ADMIN_PASSWORD: password },
  });
  assert.equal(run(["--help"]).status, 0);
  const result = run(["--output", output, "--from-env"]);
  assert.equal(result.status, 0);
  assert.equal((result.stdout + result.stderr).includes(password), false);
  assert.equal(statSync(output).mode & 0o777, 0o600);
  const saved = readFileSync(output, "utf8");
  const match = /^ADMIN_PASSWORD_HASH='([^']+)'\n$/.exec(saved);
  assert.ok(match);
  assert.equal(saved.includes(password), false);
  assert.equal(await verifyPassword(password, match[1]), true);
  assert.equal(run(["--output", output, "--from-env"]).status, 1);
  assert.equal(readFileSync(output, "utf8"), saved);
  assert.equal(run(["--password", "should-never-be-an-argument"]).status, 1);
});

test("a plaintext environment password never enables authentication", async () => {
  delete process.env.ADMIN_PASSWORD_HASH;
  process.env.ADMIN_PASSWORD = password;
  await assert.rejects(() => login(password, "client"), status(503));
  process.env.ADMIN_PASSWORD_HASH = "malformed";
  await assert.rejects(() => login(password, "client"), status(503));
});

test("sessions use random tokens, store only digests, cannot replay a DB digest, and revoke on logout", async () => {
  const token = await login(password, "client");
  const row = await prisma.adminSession.findFirst();
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(row.tokenHash, token);
  assert.equal(row.tokenHash, createHash("sha256").update(token).digest("hex"));
  assert.equal(JSON.stringify(row, (_key, value) => typeof value === "bigint" ? String(value) : value).includes(password), false);
  assert.equal(await isAuthenticated(cookieRequest(row.tokenHash)), false);
  assert.equal(await isAuthenticated(cookieRequest(token)), true);
  await logout(cookieRequest(token));
  assert.equal(await isAuthenticated(cookieRequest(token)), false);
});

test("sessions expire after idle or absolute limits and password rotation invalidates old sessions", async () => {
  const idle = await login(password, "client");
  await prisma.adminSession.updateMany({ data: { lastSeenAt: BigInt(Date.now() - 31 * 60 * 1000) } });
  assert.equal(await isAuthenticated(cookieRequest(idle)), false);
  const expired = await login(password, "client");
  await prisma.adminSession.updateMany({ data: { expiresAt: BigInt(Date.now() - 1) } });
  assert.equal(await isAuthenticated(cookieRequest(expired)), false);
  const rotated = await login(password, "client");
  process.env.ADMIN_PASSWORD_HASH = await createPasswordHash(password);
  assert.equal(await isAuthenticated(cookieRequest(rotated)), false);
  const current = await login(password, "client");
  assert.equal(await isAuthenticated(cookieRequest(current)), true);
});

test("one verified IP cannot lock another out, and parallel KDF work is bounded", async () => {
  for (let i = 1; i <= 5; i += 1) await assert.rejects(() => login("wrong", "attacker"), status(401));
  await assert.rejects(() => login(password, "attacker"), status(429));
  const token = await login(password, "administrator");
  assert.equal(await isAuthenticated(cookieRequest(token)), true);
  const simultaneous = await Promise.allSettled(Array.from({ length: 8 }, () => login("wrong", "parallel")));
  assert.equal(simultaneous.filter((result) => result.status === "rejected" && result.reason.status === 401).length, 1);
  assert.equal(simultaneous.filter((result) => result.status === "rejected" && result.reason.status === 429).length, 7);
  const [attacker, administrator] = await Promise.allSettled([login("wrong", "other-attacker"), login(password, "other-administrator")]);
  assert.equal(attacker.status, "rejected");
  assert.equal(attacker.reason.status, 401);
  assert.equal(administrator.status, "fulfilled");
  assert.equal(await isAuthenticated(cookieRequest(administrator.value)), true);
  const capacity = await Promise.allSettled(Array.from({ length: 9 }, (_, index) => login("wrong", `capacity-${index}`)));
  assert.equal(capacity.slice(0, 8).every((result) => result.status === "rejected" && result.reason.status === 401), true);
  assert.equal(capacity[8].status, "rejected");
  assert.equal(capacity[8].reason.status, 429);
});

test("verified proxy IP is required remotely and arbitrary forwarding headers are ignored", () => {
  process.env.APP_ORIGIN = "https://center.example";
  const request = new NextRequest("https://center.example/api/admin/login", {
    headers: { "x-forwarded-for": "198.51.100.1", "x-real-ip": "198.51.100.2", "x-bcs-client-ip": "198.51.100.3" },
  });
  assert.throws(() => loginClientKey(request), status(503));
  process.env.APP_ORIGIN = "http://127.0.0.1:3102";
  assert.equal(loginClientKey(request), "global");
  process.env.APP_ORIGIN = "https://center.example";
  process.env.BCS_TRUST_PROXY = "true";
  assert.match(loginClientKey(request), /^[a-f0-9]{64}$/);
  const other = new NextRequest(request.url, { headers: { "x-bcs-client-ip": "198.51.100.4" } });
  assert.notEqual(loginClientKey(request), loginClientKey(other));
  for (const value of ["", "attacker", "198.51.100.3,198.51.100.4"]) {
    assert.throws(() => loginClientKey(new NextRequest(request.url, { headers: { "x-bcs-client-ip": value } })), status(403));
  }
});

test("nonlocal plaintext origins fail closed and HTTPS cookies remain protected", () => {
  for (const value of ["http://center.example", "https://user:secret@center.example", "https://center.example/path", "https://center.example?x=1", "file:///tmp"]) {
    process.env.APP_ORIGIN = value;
    assert.throws(() => configuredOrigin(), status(503));
  }
  process.env.APP_ORIGIN = "https://center.example";
  const response = new NextResponse();
  setSessionCookie(response, "example-session-token");
  const cookie = response.cookies.get("bcs_admin_session");
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.secure, true);
  assert.equal(cookie.sameSite, "strict");
  assert.equal(cookie.maxAge, 8 * 60 * 60);
  assert.throws(() => requireSameOrigin(new NextRequest("https://center.example/api/admin/login")), status(403));
  assert.throws(() => requireSameOrigin(new NextRequest("https://center.example/api/admin/login", { headers: { origin: "https://attacker.example" } })), status(403));
});

test("16 simultaneous invalid attempts reserve exactly one local admission", async () => {
  // Given one client, when 16 calls arrive before the database resolves, then 15 are refused.
  const results = await Promise.allSettled(Array.from({ length: 16 }, () => login("wrong", "burst")));
  assert.equal(results.filter((result) => result.status === "rejected" && result.reason.status === 401).length, 1);
  assert.equal(results.filter((result) => result.status === "rejected" && result.reason.status === 429).length, 15);
  assert.equal((await prisma.adminLoginAttempt.findUnique({ where: { clientHash: "burst" } })).failures, 1);
});

test("16 attempts from separate Node processes share five atomic persisted reservations", { timeout: 30_000 }, async () => {
  // Given independent process admission sets, when all processes start together, then the database budget is shared.
  const { fork } = await import("node:child_process");
  const workers = Array.from({ length: 8 }, () => fork(new URL("./fixtures/security-login-worker.mjs", import.meta.url), [], {
    execArgv: ["--conditions=react-server", "--import", "tsx"], stdio: ["ignore", "ignore", "pipe", "ipc"],
  }));
  try {
    await Promise.all(workers.map((worker) => new Promise((resolve, reject) => {
      worker.once("error", reject);
      worker.once("exit", () => reject(new Error("Login fixture worker exited before responding")));
      worker.once("message", resolve);
    })));
    const outcomes = workers.map((worker) => new Promise((resolve, reject) => {
      worker.once("error", reject);
      worker.once("exit", () => reject(new Error("Login fixture worker exited before responding")));
      worker.once("message", ({ statuses }) => resolve(statuses));
      worker.send({ clientKey: "multi-process", attempts: 2 });
    }));
    const statuses = (await Promise.all(outcomes)).flat();
    assert.equal(statuses.filter((value) => value === 401).length, 5);
    assert.equal(statuses.filter((value) => value === 429).length, 11);
    assert.equal((await prisma.adminLoginAttempt.findUnique({ where: { clientHash: "multi-process" } })).failures, 5);
  } finally { for (const worker of workers) worker.kill(); }
});

test("expired lockouts permit new attempts and rejection releases local admission", async () => {
  // Given a blocked client, when its window expires after a rejected reservation, then admission is released.
  await prisma.adminLoginAttempt.create({ data: { clientHash: "expired", failures: 5, windowStarted: BigInt(Date.now()), blockedUntil: BigInt(Date.now() + 900_000) } });
  await assert.rejects(() => login("wrong", "expired"), status(429));
  await prisma.adminLoginAttempt.update({ where: { clientHash: "expired" }, data: { windowStarted: 0n, blockedUntil: 0n } });
  await assert.rejects(() => login("wrong", "expired"), status(401));
  assert.equal((await prisma.adminLoginAttempt.findUnique({ where: { clientHash: "expired" } })).failures, 1);
});
