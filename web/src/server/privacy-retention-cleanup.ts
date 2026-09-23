import "server-only";
import { prisma } from "@/server/db";
import { retentionDate } from "./privacy-retention";

export async function cleanExpiredPrivacyRecords(options: { readonly apply?: boolean; readonly now?: Date; readonly limit?: number } = {}) {
  const now = options.now ?? new Date();
  const limit = options.limit ?? 100;
  if (!Number.isFinite(now.getTime()) || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new RangeError("Invalid retention date or batch size.");
  const cutoff = retentionDate(now, -1);
  return prisma.$transaction(async (tx) => {
    const archives = await tx.$queryRaw<{ id: string }[]>`
      SELECT r.id FROM "PrivacyLegalRecord" r JOIN "Order" o ON o.id = r."orderId"
      WHERE r."expiresAt" <= ${now} AND NOT o."privacyHold"
      AND o.status NOT IN ('REVIEW', 'PENDING_PAYMENT') AND o."refundStatus" <> 'PENDING'
      ORDER BY r.id LIMIT ${limit} FOR UPDATE OF o SKIP LOCKED`;
    const mail = await tx.$queryRaw<{ id: string }[]>`
      SELECT e.id FROM "EmailOutbox" e WHERE e."createdAt" <= ${cutoff}
      AND e.status <> 'PROCESSING'
      AND NOT EXISTS (SELECT 1 FROM "Order" o WHERE o.id = COALESCE(e."orderId", split_part(e."eventKey", ':', 2))
        AND o."privacyRedactedAt" IS NULL)
      ORDER BY e.id LIMIT ${limit} FOR UPDATE OF e SKIP LOCKED`;
    const quotes = await tx.$queryRaw<{ id: string }[]>`
      SELECT q.id FROM "Quote" q WHERE q."createdAt" <= ${cutoff} AND q."expiresAt" <= ${now}
      AND NOT EXISTS (SELECT 1 FROM "Order" o WHERE o."quoteId" = q.id)
      ORDER BY q.id LIMIT ${limit} FOR UPDATE OF q SKIP LOCKED`;
    if (options.apply) {
      await tx.privacyLegalRecord.deleteMany({ where: { id: { in: archives.map(({ id }) => id) } } });
      await tx.emailOutbox.deleteMany({ where: { id: { in: mail.map(({ id }) => id) } } });
      await tx.quote.deleteMany({ where: { id: { in: quotes.map(({ id }) => id) } } });
    }
    return { archives: archives.length, emails: mail.length, quotes: quotes.length,
      more: [archives, mail, quotes].some((rows) => rows.length === limit) };
  });
}
