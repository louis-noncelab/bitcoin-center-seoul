import "server-only";
import { createHash } from "node:crypto";
import { prisma, type Tx } from "@/server/db";
import { getClientKey, HttpError } from "@/server/http";

const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");

async function cleanupExpiredBuckets(now: Date): Promise<void> {
  await prisma.$executeRaw`
    DELETE FROM "RateLimitBucket" WHERE "key" IN (
      SELECT "key" FROM "RateLimitBucket" WHERE "expiresAt" <= ${now}
      ORDER BY "expiresAt" LIMIT 500 FOR UPDATE SKIP LOCKED
    )
  `;
}

async function reserveBucket(
  database: Pick<Tx, "$queryRaw">, scope: string, subject: string, limit: number, now: Date, windowSeconds: number,
): Promise<void> {
  const key = hashToken(`${scope}:${subject}`);
  const expiresAt = new Date(now.getTime() + windowSeconds * 1000);
  const rows = await database.$queryRaw<readonly { readonly count: number }[]>`
    INSERT INTO "RateLimitBucket" ("key", "count", "expiresAt") VALUES (${key}, 1, ${expiresAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimitBucket"."expiresAt" <= ${now} THEN 1 ELSE LEAST("RateLimitBucket"."count" + 1, ${limit + 1}) END,
      "expiresAt" = CASE WHEN "RateLimitBucket"."expiresAt" <= ${now} THEN ${expiresAt} ELSE "RateLimitBucket"."expiresAt" END
    RETURNING "count"
  `;
  if (!rows[0] || rows[0].count > limit) throw new HttpError(429, "RATE_LIMITED", "잠시 후 다시 시도해 주세요. / Please try again shortly.");
}

export async function rateLimit(scope: string, subject: string, limit: number, windowSeconds = 900): Promise<void> {
  const now = new Date();
  await cleanupExpiredBuckets(now);
  await reserveBucket(prisma, scope, subject, limit, now, windowSeconds);
}

export async function requestRateLimit(request: Request, action: string, limit = 40): Promise<void> {
  await rateLimit(`api:${action}:ip`, getClientKey(request), limit);
}

/** A fixed global budget bounds the number of client buckets allocated per window. */
export async function boundedRequestRateLimit(
  request: Request, action: string, clientLimit: number, globalLimit: number, windowSeconds = 60,
): Promise<void> {
  const clientKey = getClientKey(request);
  const now = new Date();
  await cleanupExpiredBuckets(now);
  // Hold the fixed global row first; client denial rolls back both reservations.
  await prisma.$transaction(async (tx) => {
    await reserveBucket(tx, `api:${action}:global`, "all", globalLimit, now, windowSeconds);
    await reserveBucket(tx, `api:${action}:ip`, clientKey, clientLimit, now, windowSeconds);
  });
}
