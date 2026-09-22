import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { isIP } from "node:net";
import type { NextRequest, NextResponse } from "next/server";
import { configuredOrigin } from "@/server/events/config";
import { getDatabase } from "@/server/events/db";
import { ApiError, configurationError } from "@/server/events/errors";
import { validPasswordHash, verifyPassword } from "@/server/events/password";

const cookieName = "bcs_admin_session";
const sessionSeconds = 8 * 60 * 60;
const idleMilliseconds = 30 * 60 * 1000;
const loginWindowMs = 15 * 60 * 1000;
const loginLimit = 5;
const pendingClients = new Set<string>();
let verificationTail = Promise.resolve();

type AttemptRow = {
  readonly window_started: number;
  readonly failures: number;
  readonly blocked_until: number;
};

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function passwordHash(): string {
  const value = process.env.ADMIN_PASSWORD_HASH;
  if (!value || !validPasswordHash(value)) throw configurationError("ADMIN_PASSWORD_HASH");
  return value;
}

function assertLoginAllowed(key: string, now: number): void {
  const row = getDatabase()
    .prepare<[string], AttemptRow>(
      "SELECT window_started, failures, blocked_until FROM admin_login_attempts WHERE client_hash = ?",
    )
    .get(key);
  if (row && row.blocked_until > now) {
    throw new ApiError(429, "RATE_LIMITED", "잠시 후 다시 시도해주세요.");
  }
}

function reserveAttempt(key: string, now: number): void {
  const db = getDatabase();
  db.transaction(() => {
    assertLoginAllowed(key, now);
    const row = db
      .prepare<[string], AttemptRow>(
        "SELECT window_started, failures, blocked_until FROM admin_login_attempts WHERE client_hash = ?",
      )
      .get(key);
    const currentFailures = row && row.window_started > now - loginWindowMs ? row.failures : 0;
    const failures = currentFailures + 1;
    const windowStarted = currentFailures === 0 ? now : row?.window_started ?? now;
    const blockedUntil = failures >= loginLimit ? now + loginWindowMs : 0;
    db.prepare(`
      INSERT INTO admin_login_attempts (client_hash, window_started, failures, blocked_until)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(client_hash) DO UPDATE SET
        window_started = excluded.window_started, failures = excluded.failures, blocked_until = excluded.blocked_until
    `).run(key, windowStarted, failures, blockedUntil);
    db.prepare("DELETE FROM admin_login_attempts WHERE window_started < ? AND blocked_until < ?")
      .run(now - loginWindowMs, now);
  })();
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
  reserveAttempt(clientKey, now);
  pendingClients.add(clientKey);
  const verification = verificationTail.then(() => verifyPassword(candidate, encoded));
  verificationTail = verification.then(() => undefined, () => undefined);
  try {
    if (!await verification) {
      assertLoginAllowed(clientKey, Date.now());
      throw new ApiError(401, "INVALID_CREDENTIALS", "암호가 올바르지 않습니다.");
    }
  } finally {
    pendingClients.delete(clientKey);
  }
  const db = getDatabase();
  const token = randomBytes(32).toString("base64url");
  db.transaction(() => {
    db.prepare("DELETE FROM admin_sessions WHERE expires_at <= ? OR last_seen_at <= ? OR credential_version != ?")
      .run(now, now - idleMilliseconds, hash(encoded));
    db.prepare("DELETE FROM admin_login_attempts WHERE client_hash = ?").run(clientKey);
    db.prepare("INSERT INTO admin_sessions (token_hash, expires_at, last_seen_at, credential_version) VALUES (?, ?, ?, ?)").run(
      hash(token),
      now + sessionSeconds * 1000,
      now,
      hash(encoded),
    );
  })();
  return token;
}

export function isAuthenticated(request: NextRequest): boolean {
  const token = request.cookies.get(cookieName)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  const now = Date.now();
  const result = getDatabase().prepare(`
    UPDATE admin_sessions SET last_seen_at = ?
    WHERE token_hash = ? AND expires_at > ? AND last_seen_at > ? AND credential_version = ?
  `).run(now, hash(token), now, now - idleMilliseconds, hash(passwordHash()));
  return result.changes === 1;
}

export function requireAdmin(request: NextRequest): void {
  if (!isAuthenticated(request)) throw new ApiError(401, "UNAUTHORIZED", "관리자 인증이 필요합니다.");
}

export function currentSessionExpiry(request: NextRequest): number | null {
  const token = request.cookies.get(cookieName)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const now = Date.now();
  const row = getDatabase().prepare<[string, number, number, string], { expires_at: number }>(`
    SELECT expires_at FROM admin_sessions
    WHERE token_hash = ? AND expires_at > ? AND last_seen_at > ? AND credential_version = ?
  `).get(hash(token), now, now - idleMilliseconds, hash(passwordHash()));
  return row?.expires_at ?? null;
}

export function logout(request: NextRequest): void {
  const token = request.cookies.get(cookieName)?.value;
  if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) {
    getDatabase().prepare("DELETE FROM admin_sessions WHERE token_hash = ?").run(hash(token));
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
