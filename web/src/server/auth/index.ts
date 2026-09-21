import "server-only";
import type { NextRequest } from "next/server";
import { isAuthenticated } from "@/server/events/auth";
import { HttpError } from "@/server/http";

/**
 * Checkout is guest-only: this slice carries no customer accounts. Order and quote ownership is
 * proved by the per-resource access token in `@/server/orders/access`, never by a session.
 */
export type PublicAccount = { readonly id: string };

export async function optionalAccount(): Promise<PublicAccount | null> {
  return null;
}

/**
 * The existing SQLite-backed admin session is the only privileged identity. Its reader expects a
 * NextRequest purely for the cookie jar, so a plain Request is adapted rather than duplicated.
 */
function withCookieJar(request: Request): NextRequest {
  const jar = new Map<string, string>();
  for (const entry of (request.headers.get("cookie") ?? "").split(";")) {
    const separator = entry.indexOf("=");
    if (separator <= 0) continue;
    jar.set(entry.slice(0, separator).trim(), entry.slice(separator + 1).trim());
  }
  return {
    cookies: {
      get(name: string) {
        const value = jar.get(name);
        return value === undefined ? undefined : { name, value };
      },
    },
  } as unknown as NextRequest;
}

export async function requireAccount(request: Request): Promise<PublicAccount> {
  if (!isAuthenticated(withCookieJar(request))) {
    throw new HttpError(401, "AUTH_REQUIRED", "관리자 인증이 필요합니다. / Administrator sign-in is required.");
  }
  return { id: "admin" };
}
