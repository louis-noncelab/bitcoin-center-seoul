import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma, type Order, type Payment } from "@/generated/prisma/client";
import { prisma, type Tx } from "@/server/db";
import { sealString } from "@/server/privacy";

export function retentionDate(date: Date, years: number): Date {
  const result = new Date(date);
  result.setUTCFullYear(result.getUTCFullYear() + years);
  // February 29 expires on February 28 in a non-leap year.
  if (result.getUTCMonth() !== date.getUTCMonth()) result.setUTCDate(0);
  return result;
}

type Options = {
  readonly apply?: boolean;
  readonly now?: Date;
  readonly afterId?: string | null;
  readonly limit?: number;
  readonly orderId?: string;
  readonly early?: boolean;
};

function settled(order: Order, payments: readonly Payment[], eventCompleted: boolean): boolean {
  if (order.privacyHold || order.refundStatus === "PENDING" || order.holdExpiresAt) return false;
  if (payments.some((payment) => payment.creationUnknown || !["PAID", "EXPIRED", "FAILED"].includes(payment.status))) return false;
  return ["CANCELLED", "EXPIRED"].includes(order.status)
    || (order.status === "PAID" && (["DELIVERED", "COLLECTED"].includes(order.fulfillmentStatus) || eventCompleted));
}

async function redact(tx: Tx, id: string, options: Options & { readonly now: Date }): Promise<boolean> {
  // Payment writers acquire payment then order locks. Use their order to avoid deadlocks.
  await tx.$queryRaw`SELECT id FROM "Payment" WHERE "orderId" = ${id} ORDER BY id FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${id} FOR UPDATE`;
  const order = await tx.order.findUniqueOrThrow({ where: { id }, include: { payments: true, items: { select: { sku: true } } } });
  const eventIds = order.items.flatMap(({ sku }) => /^MEETUP-\d+$/.test(sku) ? [Number(sku.slice(7))] : []);
  const events = eventIds.length ? await tx.centerEvent.findMany({ where: { id: { in: eventIds } }, select: { id: true, date: true } }) : [];
  const eventCompleted = eventIds.length > 0 && eventIds.length === order.items.length && eventIds.every((eventId) => {
    const date = events.find((event) => event.id === eventId)?.date;
    return date !== undefined && new Date(`${date.replaceAll(".", "-")}T23:59:59+09:00`) < options.now;
  });
  if (order.privacyRedactedAt || !settled(order, order.payments, eventCompleted)) return false;
  if (!options.early && retentionDate(order.createdAt, 1) > options.now) return false;
  const mailWhere: Prisma.EmailOutboxWhereInput = { OR: [{ orderId: id }, { eventKey: { startsWith: `order:${id}:` } }, { eventKey: { startsWith: `operator:${id}:` } }] };
  await tx.$queryRaw`SELECT id FROM "EmailOutbox" WHERE "orderId" = ${id} OR "eventKey" LIKE ${`order:${id}:%`} OR "eventKey" LIKE ${`operator:${id}:%`} ORDER BY id FOR UPDATE`;
  if (await tx.emailOutbox.count({ where: { ...mailWhere, status: "PROCESSING" } })) return false;
  if (!options.apply) return true;
  const audits = await tx.auditLog.findMany({ where: { targetType: "Order", targetId: id } });
  const disputeDetails = audits.flatMap(({ action, summary, createdAt }) => {
    if (!summary || typeof summary !== "object" || Array.isArray(summary)) return [];
    const details = Object.fromEntries(Object.entries(summary).filter(([key]) => ["reason", "unpaidEvidence"].includes(key)));
    return Object.keys(details).length ? [{ action, details, createdAt }] : [];
  });
  const cancellationReasons = order.payments.flatMap(({ id: paymentId, metadata }) => {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata) || !metadata.cancelReason) return [];
    return [{ paymentId, reason: metadata.cancelReason }];
  });
  const disputeExpiresAt = retentionDate(new Date(Math.max(order.createdAt.getTime(), ...disputeDetails.map(({ createdAt }) => createdAt.getTime()))), 3);
  if ((disputeDetails.length || cancellationReasons.length) && disputeExpiresAt > options.now) {
    await tx.privacyLegalRecord.upsert({ where: { orderId_kind: { orderId: id, kind: "DISPUTE" } }, update: {}, create: {
      orderId: id, kind: "DISPUTE", expiresAt: disputeExpiresAt,
      encryptedPayload: sealString(JSON.stringify({ disputeDetails, cancellationReasons })),
    } });
  }
  const lastTransaction = new Date(Math.max(order.createdAt.getTime(), order.fulfilledAt?.getTime() ?? 0,
    order.refundedAt?.getTime() ?? 0, ...order.payments.map((payment) => payment.paidAt?.getTime() ?? 0),
    ...events.map(({ date }) => { const timestamp = new Date(`${date.replaceAll(".", "-")}T23:59:59+09:00`).getTime(); return Number.isFinite(timestamp) ? timestamp : 0; })));
  const expiresAt = retentionDate(lastTransaction, 5);
  if (expiresAt > options.now) {
    await tx.privacyLegalRecord.upsert({ where: { orderId_kind: { orderId: id, kind: "TRANSACTION" } }, update: {}, create: {
      orderId: id, kind: "TRANSACTION", expiresAt,
      encryptedPayload: sealString(JSON.stringify({ name: order.customerName, email: order.customerEmail,
        address: order.address, trackingNumber: order.trackingNumber, contractAcceptance: order.contractAcceptance,
        refunds: audits.filter(({ action }) => action === "order.refund.recorded").map(({ summary, createdAt }) => ({ createdAt,
          evidence: summary && typeof summary === "object" && !Array.isArray(summary)
            ? Object.fromEntries(Object.entries(summary).filter(([key]) => ["paymentId", "method", "proof", "refundedAt", "amountSats", "amountKrw", "currency", "restock"].includes(key))) : {},
        })) })),
    } });
  }
  await tx.order.update({ where: { id }, data: {
    customerName: "", customerEmail: "", customerPhone: "", customerNotes: "", customerEmailHash: null,
    address: Prisma.DbNull, contractAcceptance: Prisma.DbNull, accountId: null, carrier: null, trackingNumber: null, confirmationCode: null,
    accessTokenHash: randomUUID(), accessTokenExpiresAt: options.now,
    idempotencyScope: `redacted:${id}`, idempotencyKey: randomUUID(), requestHash: randomUUID(), privacyRedactedAt: options.now,
  } });
  await tx.quote.update({ where: { id: order.quoteId }, data: { accountId: null, ownerHash: null, input: {} } });
  await tx.couponUsage.updateMany({ where: { orderId: id }, data: { accountId: null } });
  for (const payment of order.payments) {
    const metadata = payment.metadata;
    if (metadata && typeof metadata === "object" && !Array.isArray(metadata) && "cancelReason" in metadata) {
      await tx.payment.update({ where: { id: payment.id }, data: { metadata: Object.fromEntries(Object.entries(metadata).filter(([key]) => key !== "cancelReason")) } });
    }
  }
  await tx.emailOutbox.deleteMany({ where: mailWhere });
  // The sealed archive retains financial audit evidence; free-text reasons and tracking leave the ordinary log.
  await tx.auditLog.updateMany({ where: { targetType: "Order", targetId: id }, data: { summary: { privacyRedacted: true } } });
  await tx.auditLog.create({ data: { action: "privacy.order.redacted", targetType: "Order", targetId: id, summary: {} } });
  return true;
}

export async function runPrivacyRetentionPass(options: Options = {}) {
  const now = options.now ?? new Date();
  const limit = options.limit ?? 100;
  if (!Number.isFinite(now.getTime()) || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new RangeError("Invalid retention date or batch size.");
  if (options.early && !options.orderId) throw new RangeError("Early erasure requires one explicit order ID.");
  const candidates = await prisma.order.findMany({ where: {
    privacyRedactedAt: null, privacyHold: false,
    ...(options.orderId ? { id: options.orderId } : options.afterId ? { id: { gt: options.afterId } } : {}),
    ...(!options.early ? { createdAt: { lte: new Date(retentionDate(now, -1).getTime() + 86_400_000) } } : {}),
  }, orderBy: { id: "asc" }, take: limit, select: { id: true } });
  let orders = 0;
  for (const { id } of candidates) {
    if (await prisma.$transaction((tx) => redact(tx, id, { ...options, now }))) orders += 1;
  }
  return { orders, checked: candidates.length, nextCursor: candidates.length === limit ? candidates.at(-1)?.id ?? null : null };
}
