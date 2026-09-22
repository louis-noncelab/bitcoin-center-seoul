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
  await prisma.$transaction(async (tx) => {
    const row = await tx.adminLoginAttempt.findUnique({ where: { clientHash: key } });
    if (row && Number(row.blockedUntil) > now) throw new ApiError(429, "RATE_LIMITED", "잠시 후 다시 시도해주세요.");
    const currentFailures = row && Number(row.windowStarted) > now - loginWindowMs ? row.failures : 0;
    const failures = currentFailures + 1;
    const windowStarted = currentFailures === 0 ? now : Number(row?.windowStarted ?? now);
    const blockedUntil = failures >= loginLimit ? now + loginWindowMs : 0;
    await tx.adminLoginAttempt.upsert({
      where: { clientHash: key },
      create: { clientHash: key, windowStarted: BigInt(windowStarted), failures, blockedUntil: BigInt(blockedUntil) },
      update: { windowStarted: BigInt(windowStarted), failures, blockedUntil: BigInt(blockedUntil) },
    });
    await tx.adminLoginAttempt.deleteMany({
      where: { windowStarted: { lt: BigInt(now - loginWindowMs) }, blockedUntil: { lt: BigInt(now) } },
    });
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
  // Reserve the attempt before awaiting the KDF, including across Node processes.
  await reserveAttempt(clientKey, now);
  pendingClients.add(clientKey);
  const verification = verificationTail.then(() => verifyPassword(candidate, encoded));
  verificationTail = verification.then(() => undefined, () => undefined);
  try {
    if (!await verification) throw new ApiError(401, "INVALID_CREDENTIALS", "암호가 올바르지 않습니다.");
  } finally {
    pendingClients.delete(clientKey);
  }
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
