import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { optionalAccount } from "@/server/auth";
import { getServerConfig } from "@/server/config";
import { HttpError } from "@/server/http";

export const hashToken = (value: string) => createHash("sha256").update(value).digest("hex");
export const newAccessToken = () => randomBytes(32).toString("base64url");
export type ResourceOwner = { readonly id: string; readonly kind: "order" | "booking"; readonly accountId: string | null; readonly accessTokenHash: string; readonly accessTokenExpiresAt: Date };
export type CustomerAccount = Awaited<ReturnType<typeof optionalAccount>>;

export function matchesToken(raw: string | null, expected: string | null): boolean {
  if (!raw || !expected || !/^[A-Za-z0-9_-]{43}$/.test(raw)) return false;
  const actual = Buffer.from(hashToken(raw), "hex");
  const saved = Buffer.from(expected, "hex");
  return actual.length === saved.length && timingSafeEqual(actual, saved);
}

export function readAccessToken(request: Request, kind: "order" | "booking" | "quote", id: string): string | null {
  const header = request.headers.get(kind === "quote" ? "x-quote-token" : "x-resource-token");
  if (header) return header;
  const name = `bcs_${kind}_${id}=`;
  return request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(name))?.slice(name.length) ?? null;
}

export function resourceAccessCookie(kind: "order" | "booking" | "quote", id: string, rawToken: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(id) || !/^[A-Za-z0-9_-]{43}$/.test(rawToken)) throw new HttpError(400, "INVALID_TOKEN", "Invalid access token.");
  return `bcs_${kind}_${id}=${rawToken}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${kind === "quote" ? 3600 : 2592000}${getServerConfig().appOrigin.startsWith("https:") ? "; Secure" : ""}`;
}

export async function requireResourceAccess(request: Request, resource: ResourceOwner): Promise<void> {
  const account = await optionalAccount();
  if (account && resource.accountId === account.id) return;
  if (!resource.accountId && resource.accessTokenExpiresAt > new Date() && matchesToken(readAccessToken(request, resource.kind, resource.id), resource.accessTokenHash)) return;
  throw new HttpError(404, "NOT_FOUND", "The requested record was not found.");
}

export function requestIdentity(request: Request, account: CustomerAccount) {
  const key = request.headers.get("idempotency-key");
  if (!key || !/^[A-Za-z0-9_-]{16,100}$/.test(key)) throw new HttpError(400, "IDEMPOTENCY_REQUIRED", "A unique Idempotency-Key is required.");
  if (account) return { scope: `account:${account.id}`, key, secret: null };
  const secret = request.headers.get("x-request-secret");
  if (!secret || !/^[A-Za-z0-9_-]{43}$/.test(secret)) throw new HttpError(400, "REQUEST_SECRET_REQUIRED", "A secure request secret is required.");
  return { scope: `guest:${hashToken(secret)}`, key, secret };
}

export function requirePurchasePolicy(_account: CustomerAccount, requiresMembership: boolean): void {
  // This slice has no customer accounts, so a member-only product can never be purchased here.
  if (requiresMembership) throw new HttpError(403, "VERIFIED_MEMBER_REQUIRED", "A verified member account is required.");
}

export function resourceToken(identity: ReturnType<typeof requestIdentity>, kind: "order" | "booking", id: string): string {
  if (!identity.secret) return newAccessToken();
  return createHmac("sha256", Buffer.from(getServerConfig().tokenEncryptionKey, "base64")).update(`resource:${kind}:${id}:${identity.secret}`).digest("base64url");
}
