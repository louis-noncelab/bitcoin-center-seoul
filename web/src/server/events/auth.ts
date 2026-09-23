import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { isIP } from "node:net";
import type { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { configuredOrigin } from "@/server/events/config";
import { ApiError, configurationError } from "@/server/events/errors";
import { validPasswordHash, verifyPassword } from "@/server/events/password";

const cookieName = "bcs_admin_session";
const sessionSeconds = 8 * 60 * 60;
const idleMilliseconds = 30 * 60 * 1000;
const loginWindowMs = 15 * 60 * 1000;
const loginLimit = 5;
const pendingClients = new Set<string>();
let verificationTail = Promise.resolve();

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function passwordHash(): string {
  const value = process.env.ADMIN_PASSWORD_HASH;
  if (!value || !validPasswordHash(value)) throw configurationError("ADMIN_PASSWORD_HASH");
  return value;
}

async function reserveAttempt(key: string, now: number): Promise<void> {
  const rows = await prisma.$queryRaw<readonly { readonly failures: number }[]>`
    INSERT INTO "admin_login_attempts" ("client_hash", "window_started", "failures", "blocked_until")
    VALUES (${key}, ${BigInt(now)}, 1, 0)
    ON CONFLICT ("client_hash") DO UPDATE SET
      "failures" = CASE WHEN "admin_login_attempts"."window_started" <= ${BigInt(now - loginWindowMs)}
        THEN 1 ELSE "admin_login_attempts"."failures" + 1 END,
      "window_started" = CASE WHEN "admin_login_attempts"."window_started" <= ${BigInt(now - loginWindowMs)}
        THEN ${BigInt(now)} ELSE "admin_login_attempts"."window_started" END,
      "blocked_until" = CASE WHEN "admin_login_attempts"."window_started" > ${BigInt(now - loginWindowMs)}
        AND "admin_login_attempts"."failures" + 1 >= ${loginLimit}
        THEN ${BigInt(now + loginWindowMs)}::bigint ELSE 0::bigint END
    WHERE "admin_login_attempts"."blocked_until" <= ${BigInt(now)}
    RETURNING "failures"
  `;
  if (!rows[0]) throw new ApiError(429, "RATE_LIMITED", "잠시 후 다시 시도해주세요.");
  await prisma.adminLoginAttempt.deleteMany({
    where: { windowStarted: { lt: BigInt(now - loginWindowMs) }, blockedUntil: { lt: BigInt(now) } },
  });
}

export function loginClientKey(request: NextRequest): string {
  const origin = configuredOrigin();
  if (process.env.BCS_TRUST_PROXY !== "true") {
    if (origin.protocol === "http:") return "global";
    throw configurationError("BCS_TRUST_PROXY");
  }
  const address = request.headers.get("x-bcs-client-ip");
  if (!address || !isIP(address)) throw new ApiError(403, "PROXY_REQUIRED", "요청 경로를 확인할 수 없습니다.");
  return hash(address);
}

export function requireSameOrigin(request: NextRequest): void {
  const supplied = request.headers.get("origin");
  if (!supplied) throw new ApiError(403, "ORIGIN_REJECTED", "요청 출처를 확인할 수 없습니다.");
  try {
    if (new URL(supplied).origin !== configuredOrigin().origin) {
      throw new ApiError(403, "ORIGIN_REJECTED", "허용되지 않은 요청 출처입니다.");
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof TypeError) {
      throw new ApiError(403, "ORIGIN_REJECTED", "요청 출처가 올바르지 않습니다.");
    }
    throw error;
  }
}

export async function login(candidate: string, clientKey: string): Promise<string> {
  const encoded = passwordHash();
  const now = Date.now();
  if (pendingClients.has(clientKey) || pendingClients.size >= 8) throw new ApiError(429, "RATE_LIMITED", "잠시 후 다시 시도해주세요.");
  // Synchronous admission bounds queued KDF work before any database await.
  pendingClients.add(clientKey);
  try {
    await reserveAttempt(clientKey, now);
    const verification = verificationTail.then(() => verifyPassword(candidate, encoded));
    verificationTail = verification.then(() => undefined, () => undefined);
    if (!await verification) throw new ApiError(401, "INVALID_CREDENTIALS", "암호가 올바르지 않습니다.");
    const token = randomBytes(32).toString("base64url");
    const credentialVersion = hash(encoded);
    await prisma.$transaction([
      prisma.adminSession.deleteMany({
        where: { OR: [{ expiresAt: { lte: BigInt(now) } }, { lastSeenAt: { lte: BigInt(now - idleMilliseconds) } }, { NOT: { credentialVersion } }] },
      }),
      prisma.adminLoginAttempt.deleteMany({ where: { clientHash: clientKey } }),
      prisma.adminSession.create({
        data: { tokenHash: hash(token), expiresAt: BigInt(now + sessionSeconds * 1000), lastSeenAt: BigInt(now), credentialVersion },
      }),
    ]);
    return token;
  } finally {
    pendingClients.delete(clientKey);
  }
}

export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(cookieName)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  const now = Date.now();
  const updated = await prisma.adminSession.updateMany({
    where: {
      tokenHash: hash(token),
      expiresAt: { gt: BigInt(now) },
      lastSeenAt: { gt: BigInt(now - idleMilliseconds) },
      credentialVersion: hash(passwordHash()),
    },
    data: { lastSeenAt: BigInt(now) },
  });
  return updated.count === 1;
}

export async function requireAdmin(request: NextRequest): Promise<void> {
  if (!await isAuthenticated(request)) throw new ApiError(401, "UNAUTHORIZED", "관리자 인증이 필요합니다.");
}

export async function currentSessionExpiry(request: NextRequest): Promise<number | null> {
  const token = request.cookies.get(cookieName)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const now = Date.now();
  const row = await prisma.adminSession.findFirst({
    where: {
      tokenHash: hash(token),
      expiresAt: { gt: BigInt(now) },
      lastSeenAt: { gt: BigInt(now - idleMilliseconds) },
      credentialVersion: hash(passwordHash()),
    },
  });
  return row ? Number(row.expiresAt) : null;
}

export async function logout(request: NextRequest): Promise<void> {
  const token = request.cookies.get(cookieName)?.value;
  if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) {
    await prisma.adminSession.deleteMany({ where: { tokenHash: hash(token) } });
  }
}

export function setSessionCookie(response: NextResponse, token: string): void {
  const origin = configuredOrigin();
  response.cookies.set(cookieName, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: origin.protocol === "https:",
    path: "/",
    maxAge: sessionSeconds,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(cookieName, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: configuredOrigin().protocol === "https:",
    path: "/",
    maxAge: 0,
  });
}
