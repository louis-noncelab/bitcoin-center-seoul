import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/server/db";
import { getClientKey, HttpError } from "@/server/http";

const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");

export async function rateLimit(scope: string, subject: string, limit: number, windowSeconds = 900): Promise<void> {
  const key = hashToken(`${scope}:${subject}`);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowSeconds * 1000);
  const rows = await prisma.$queryRaw<readonly { readonly count: number }[]>`
    INSERT INTO "RateLimitBucket" ("key", "count", "expiresAt") VALUES (${key}, 1, ${expiresAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimitBucket"."expiresAt" <= ${now} THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
      "expiresAt" = CASE WHEN "RateLimitBucket"."expiresAt" <= ${now} THEN ${expiresAt} ELSE "RateLimitBucket"."expiresAt" END
    RETURNING "count"
  `;
  if (!rows[0] || rows[0].count > limit) throw new HttpError(429, "RATE_LIMITED", "잠시 후 다시 시도해 주세요. / Please try again shortly.");
}

export async function requestRateLimit(request: Request, action: string, limit = 40): Promise<void> {
  await rateLimit(`api:${action}:ip`, getClientKey(request), limit);
}
