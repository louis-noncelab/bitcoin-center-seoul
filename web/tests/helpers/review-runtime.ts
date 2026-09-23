import { readFile } from "node:fs/promises";
import { z } from "zod";

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

export function reviewOrigin(baseURL?: string): string {
  const origin = process.env.COMMERCE_REVIEW_ORIGIN ?? process.env.COMMERCE_BASE_URL ?? baseURL ?? process.env.APP_ORIGIN;
  if (!origin || new URL(origin).hostname !== "127.0.0.1") throw new Error("An isolated local review origin is required.");
  return origin;
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
    if (runtime.env.APP_ORIGIN !== reviewOrigin(runtime.env.APP_ORIGIN)) {
      throw new Error("Review credentials and origin must identify the same server.");
    }
    if (new URL(runtime.env.DATABASE_URL).hostname !== "127.0.0.1") {
      throw new Error("An isolated local review database is required.");
    }
    return { APP_ORIGIN: runtime.env.APP_ORIGIN, ADMIN_PASSWORD: runtime.password, DATABASE_URL: runtime.env.DATABASE_URL };
  }
  const runtime = legacyRuntime.parse(JSON.parse(await readFile(new URL("../../.local/events-review/runtime.json", import.meta.url), "utf8")));
  if (runtime.APP_ORIGIN !== reviewOrigin(runtime.APP_ORIGIN)) throw new Error("Review credentials and origin must identify the same server.");
  return runtime;
}
