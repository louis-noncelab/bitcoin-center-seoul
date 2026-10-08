import { readFile } from "node:fs/promises";
import { z } from "zod";

const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

const legacyRuntime = z.object({
  APP_ORIGIN: z.literal("http://127.0.0.1:3102"),
  ADMIN_PASSWORD: z.string().min(1),
  BCS_EVENTS_DB: z.string().min(1),
});

const isolatedRuntime = z.object({
  env: z.object({
    APP_ORIGIN: z.string().url(),
    APP_MODE: z.literal("review"),
    PAYMENT_MODE: z.literal("review"),
    EMAIL_MODE: z.literal("capture"),
    DATABASE_URL: z.string().url(),
  }),
  password: z.string().min(1),
});

function safeReviewUrl(value: string, label: string): URL {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error(`${label}:UNSUPPORTED_PROTOCOL`);
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error(`${label}:INVALID_ORIGIN_IDENTITY`);
  if (!loopbackHosts.has(url.hostname)) throw new Error(`${label}:NON_LOOPBACK_HOST`);
  return url;
}

function assertSameOrigin(left: string, right: string): void {
  if (safeReviewUrl(left, "APP_ORIGIN").origin !== safeReviewUrl(right, "REVIEW_ORIGIN").origin) {
    throw new Error("APP_ORIGIN:ORIGIN_MISMATCH");
  }
}

function assertSafeReviewDatabaseUrl(value: string): void {
  const url = new URL(value);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("DATABASE_URL:UNSUPPORTED_PROTOCOL");
  if (url.searchParams.has("host") || url.searchParams.has("port")) throw new Error("DATABASE_URL:CONNECTION_IDENTITY_OVERRIDE");
  if (!loopbackHosts.has(url.hostname)) throw new Error("DATABASE_URL:NON_LOOPBACK_HOST");
  if (!url.pathname || url.pathname === "/") throw new Error("DATABASE_URL:MISSING_DATABASE_NAME");
  const encodedName = url.pathname.slice(1);
  if (encodedName.includes("/")) throw new Error("DATABASE_URL:INVALID_DATABASE_PATH");
  const databaseName = decodeURIComponent(encodedName);
  if (!databaseName || databaseName.includes("/")) throw new Error("DATABASE_URL:INVALID_DATABASE_NAME");
  if (!databaseName.endsWith("_test")) throw new Error("DATABASE_URL:UNSAFE_DATABASE_NAME");
}

export function reviewOrigin(baseURL?: string): string {
  const origin = process.env.COMMERCE_REVIEW_ORIGIN ?? process.env.COMMERCE_BASE_URL ?? baseURL ?? process.env.APP_ORIGIN;
  if (!origin) throw new Error("REVIEW_ORIGIN:MISSING_INPUT");
  return safeReviewUrl(origin, "REVIEW_ORIGIN").origin;
}

export async function reviewRuntime(): Promise<{
  readonly APP_ORIGIN: string;
  readonly ADMIN_PASSWORD: string;
  readonly DATABASE_URL?: string;
  readonly BCS_EVENTS_DB?: string;
}> {
  const credentials = process.env.COMMERCE_REVIEW_CREDENTIALS;
  if (credentials) {
    const runtime = isolatedRuntime.parse(JSON.parse(await readFile(credentials, "utf8")));
    assertSameOrigin(runtime.env.APP_ORIGIN, reviewOrigin(runtime.env.APP_ORIGIN));
    assertSafeReviewDatabaseUrl(runtime.env.DATABASE_URL);
    return { APP_ORIGIN: runtime.env.APP_ORIGIN, ADMIN_PASSWORD: runtime.password, DATABASE_URL: runtime.env.DATABASE_URL };
  }
  const runtime = legacyRuntime.parse(JSON.parse(await readFile(new URL("../../.local/events-review/runtime.json", import.meta.url), "utf8")));
  assertSameOrigin(runtime.APP_ORIGIN, reviewOrigin(runtime.APP_ORIGIN));
  return runtime;
}
