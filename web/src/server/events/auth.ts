import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { configuredOrigin } from "@/server/events/config";
import { getDatabase } from "@/server/events/db";
import { ApiError, configurationError } from "@/server/events/errors";

const cookieName = "bcs_admin_session";
const sessionSeconds = 8 * 60 * 60;
const loginWindowMs = 15 * 60 * 1000;
const loginLimit = 5;
// ponytail: one password uses one global throttle; add a trusted-proxy IP bucket only if concurrent admins need it.
const loginKey = "global";

type AttemptRow = {
  readonly window_started: number;
  readonly failures: number;
  readonly blocked_until: number;
};

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function password(): string {
  const value = process.env.ADMIN_PASSWORD;
  if (!value) throw configurationError("ADMIN_PASSWORD");
  return value;
}

function safePasswordEqual(candidate: string): boolean {
  return timingSafeEqual(Buffer.from(hash(candidate)), Buffer.from(hash(password())));
}

export function sessionTokenHash(token: string, secret: string): string {
  return createHmac("sha256", secret).update(token).digest("hex");
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

function recordFailure(key: string, now: number): boolean {
  const db = getDatabase();
  return db.transaction(() => {
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
    return blockedUntil > now;
  })();
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

export function login(candidate: string): string {
  const now = Date.now();
  assertLoginAllowed(loginKey, now);
  if (!safePasswordEqual(candidate)) {
    const blocked = recordFailure(loginKey, now);
    if (blocked) throw new ApiError(429, "RATE_LIMITED", "잠시 후 다시 시도해주세요.");
    throw new ApiError(401, "INVALID_CREDENTIALS", "암호가 올바르지 않습니다.");
  }
  const db = getDatabase();
  const token = randomBytes(32).toString("base64url");
  db.transaction(() => {
    db.prepare("DELETE FROM admin_sessions WHERE expires_at <= ?").run(now);
    db.prepare("DELETE FROM admin_login_attempts WHERE client_hash = ?").run(loginKey);
    db.prepare("INSERT INTO admin_sessions (token_hash, expires_at) VALUES (?, ?)").run(
      sessionTokenHash(token, password()),
      now + sessionSeconds * 1000,
    );
  })();
  return token;
}

export function isAuthenticated(request: NextRequest): boolean {
  const token = request.cookies.get(cookieName)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  const row = getDatabase()
    .prepare<[string, number], { readonly authenticated: 1 }>(
      "SELECT 1 AS authenticated FROM admin_sessions WHERE token_hash = ? AND expires_at > ?",
    )
    .get(sessionTokenHash(token, password()), Date.now());
  return row?.authenticated === 1;
}

export function requireAdmin(request: NextRequest): void {
  if (!isAuthenticated(request)) throw new ApiError(401, "UNAUTHORIZED", "관리자 인증이 필요합니다.");
}

export function logout(request: NextRequest): void {
  const token = request.cookies.get(cookieName)?.value;
  if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) {
    getDatabase().prepare("DELETE FROM admin_sessions WHERE token_hash = ?").run(sessionTokenHash(token, password()));
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
