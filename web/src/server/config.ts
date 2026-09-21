import "server-only";
import { isAbsolute } from "node:path";
import { z } from "zod";

const optionalText = z.preprocess((value) => (value === "" ? undefined : value), z.string().min(1).optional());
const booleanText = z.enum(["true", "false"]).transform((value) => value === "true");

const environment = z.object({
  APP_MODE: z.enum(["review", "test", "production"]),
  APP_ORIGIN: z.url(),
  DATABASE_URL: z.url(),
  DATA_DIR: z.string().refine(isAbsolute),
  TOKEN_ENCRYPTION_KEY: z.string().regex(/^[A-Za-z0-9+/]{43}=$/).refine((value) => Buffer.from(value, "base64").length === 32),
  PAYMENT_PROVIDER: z.enum(["lnurl", "zaprite"]),
  PAYMENT_MODE: z.enum(["review", "sandbox", "live"]),
  LNURL_LIGHTNING_ADDRESS: optionalText,
  LNURL_ALLOWED_ORIGINS: optionalText,
  ZAPRITE_API_URL: optionalText,
  ZAPRITE_API_KEY: optionalText,
  ZAPRITE_WEBHOOK_SECRET: optionalText,
  ZAPRITE_CHECKOUT_ID: optionalText,
  ZAPRITE_ORG_ID: optionalText,
  EMAIL_MODE: z.enum(["capture", "smtp"]),
  SMTP_HOST: optionalText,
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: booleanText.default(false),
  SMTP_USER: optionalText,
  SMTP_PASSWORD: optionalText,
  SMTP_FROM: optionalText,
  TRUST_PROXY: booleanText,
  REVIEW_KRW_PER_BTC: z.string().regex(/^[1-9]\d*(\.\d{1,10})?$/).optional(),
  QUOTE_TTL_MINUTES: z.coerce.number().int().min(1).max(60).default(10),
  PAYMENT_PENDING_TTL_MINUTES: z.coerce.number().int().min(5).max(1440).default(30),
});

export class ServerConfigError extends Error {
  readonly fields: readonly string[];
  constructor(fields: readonly string[]) {
    const uniqueFields = [...new Set(fields)];
    super(`Invalid server configuration. Check: ${uniqueFields.join(", ")}.`);
    this.name = "ServerConfigError";
    this.fields = uniqueFields;
  }
}

function secureOrigin(value: string): boolean {
  const parsed = URL.canParse(value) ? new URL(value) : null;
  return parsed !== null && parsed.protocol === "https:" && !parsed.username && !parsed.password && !parsed.search && !parsed.hash;
}

export function parseServerConfig(raw: Readonly<Record<string, string | undefined>>) {
  const result = environment.safeParse(raw);
  if (!result.success) throw new ServerConfigError(result.error.issues.map((issue) => String(issue.path[0])));
  const value = result.data;
  const failures: string[] = [];
  const origin = new URL(value.APP_ORIGIN);
  const database = new URL(value.DATABASE_URL);
  const localHosts = new Set(["127.0.0.1", "localhost", "[::1]"]);
  if (!["http:", "https:"].includes(origin.protocol) || origin.origin !== value.APP_ORIGIN) failures.push("APP_ORIGIN");
  if (!["postgres:", "postgresql:"].includes(database.protocol) || !database.pathname.slice(1)) failures.push("DATABASE_URL");
  switch (value.APP_MODE) {
    case "review":
    case "test":
      // `sandbox` reaches a real provider from a local origin; `live` never may.
      if (!["review", "sandbox"].includes(value.PAYMENT_MODE)) failures.push("PAYMENT_MODE");
      if (value.EMAIL_MODE !== "capture") failures.push("EMAIL_MODE");
      if (!localHosts.has(database.hostname) || database.searchParams.has("host")) failures.push("DATABASE_URL");
      if (!localHosts.has(origin.hostname)) failures.push("APP_ORIGIN");
      break;
    case "production":
      if (value.PAYMENT_MODE !== "live") failures.push("PAYMENT_MODE");
      if (value.EMAIL_MODE !== "smtp") failures.push("EMAIL_MODE");
      if (!secureOrigin(value.APP_ORIGIN) || localHosts.has(origin.hostname)) failures.push("APP_ORIGIN");
      if (value.REVIEW_KRW_PER_BTC) failures.push("REVIEW_KRW_PER_BTC");
      break;
  }
  const allowedOrigins = value.LNURL_ALLOWED_ORIGINS?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
  const lnurl = value.LNURL_LIGHTNING_ADDRESS && allowedOrigins.length
    ? { lightningAddress: value.LNURL_LIGHTNING_ADDRESS, allowedOrigins }
    : null;
  const zapriteUrl = value.ZAPRITE_API_URL ?? "https://api.zaprite.com";
  const zaprite = value.ZAPRITE_API_KEY && value.ZAPRITE_WEBHOOK_SECRET
    ? {
      url: zapriteUrl.replace(/\/$/, ""),
      apiKey: value.ZAPRITE_API_KEY,
      webhookSecret: value.ZAPRITE_WEBHOOK_SECRET,
      checkoutId: value.ZAPRITE_CHECKOUT_ID ?? null,
      orgId: value.ZAPRITE_ORG_ID ?? null,
    }
    : null;

  function requireZaprite() {
    if (!zaprite) failures.push("ZAPRITE_API_KEY", "ZAPRITE_WEBHOOK_SECRET");
    else if (!secureOrigin(zaprite.url)) failures.push("ZAPRITE_API_URL");
  }

  if (value.PAYMENT_MODE === "sandbox") {
    // A lightning address is mainnet money with no test network, so only Zaprite has a sandbox.
    if (value.PAYMENT_PROVIDER !== "zaprite") failures.push("PAYMENT_PROVIDER");
    requireZaprite();
    // Without an organization to compare against, a sandbox webhook cannot be attributed.
    if (zaprite && !zaprite.orgId) failures.push("ZAPRITE_ORG_ID");
  }
  if (value.PAYMENT_MODE === "live") {
    switch (value.PAYMENT_PROVIDER) {
      case "lnurl":
        if (!lnurl) failures.push("LNURL_LIGHTNING_ADDRESS", "LNURL_ALLOWED_ORIGINS");
        else {
          if (!/^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(lnurl.lightningAddress)) failures.push("LNURL_LIGHTNING_ADDRESS");
          if (!lnurl.allowedOrigins.every((item) => secureOrigin(item) && new URL(item).origin === item)) failures.push("LNURL_ALLOWED_ORIGINS");
        }
        break;
      case "zaprite":
        requireZaprite();
        break;
    }
  }
  const smtp = value.EMAIL_MODE === "smtp" && value.SMTP_HOST && value.SMTP_USER && value.SMTP_PASSWORD && value.SMTP_FROM
    ? { host: value.SMTP_HOST, port: value.SMTP_PORT, secure: value.SMTP_SECURE, user: value.SMTP_USER, password: value.SMTP_PASSWORD, from: value.SMTP_FROM }
    : null;
  if (value.EMAIL_MODE === "smtp" && !smtp) failures.push("SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM");
  if (value.QUOTE_TTL_MINUTES > value.PAYMENT_PENDING_TTL_MINUTES) failures.push("QUOTE_TTL_MINUTES", "PAYMENT_PENDING_TTL_MINUTES");
  if (failures.length) throw new ServerConfigError(failures);
  return {
    appMode: value.APP_MODE,
    appOrigin: value.APP_ORIGIN,
    databaseUrl: value.DATABASE_URL,
    dataDir: value.DATA_DIR,
    tokenEncryptionKey: value.TOKEN_ENCRYPTION_KEY,
    paymentMode: value.PAYMENT_MODE,
    paymentProvider: value.PAYMENT_PROVIDER,
    lnurl,
    zaprite,
    emailMode: value.EMAIL_MODE,
    smtp,
    trustProxy: value.TRUST_PROXY,
    reviewKrwPerBtc: value.REVIEW_KRW_PER_BTC ?? null,
    quoteTtlMinutes: value.QUOTE_TTL_MINUTES,
    paymentPendingTtlMinutes: value.PAYMENT_PENDING_TTL_MINUTES,
  } as const;
}

export type ServerConfig = ReturnType<typeof parseServerConfig>;
let cached: ServerConfig | undefined;

export function getServerConfig(): ServerConfig {
  cached ??= parseServerConfig(process.env);
  return cached;
}

/** The database payment mode implied by the runtime configuration. */
export function paymentModeOf(config: ServerConfig = getServerConfig()): "REVIEW" | "SANDBOX" | "LIVE" {
  switch (config.paymentMode) {
    case "review": return "REVIEW";
    case "sandbox": return "SANDBOX";
    case "live": return "LIVE";
  }
}
