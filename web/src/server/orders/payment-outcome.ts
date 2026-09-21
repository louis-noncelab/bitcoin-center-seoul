import "server-only";
import type { Payment } from "@/generated/prisma/client";
import type { Tx } from "@/server/db";
import { enqueue } from "@/server/email";
import { HttpError } from "@/server/http";

export type PaymentOutcome = "PAID" | "PROCESSING" | "EXPIRED" | "CANCELLED" | "REVIEW";
export type FulfillmentOutcome = "FULFILLED" | "REVIEW" | "UNCHANGED";

// Caller locks Payment first. Parent rows precede Event / lexicographically ordered SKU locks.
export async function applyPaymentOutcome(tx: Tx, payment: Payment, outcome: PaymentOutcome): Promise<FulfillmentOutcome> {
  if (payment.orderId) {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${payment.orderId} FOR UPDATE`;
    const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId }, include: { items: true } });
    if (order.status === "PAID") return "UNCHANGED";
    if (order.status !== "PENDING_PAYMENT") {
      if (outcome === "PAID" || outcome === "REVIEW") {
        await tx.order.update({ where: { id: order.id }, data: { status: "REVIEW" } });
        await enqueue(tx, `order:${order.id}:REVIEW`, order.customerEmail, order.locale === "en" ? "en" : "ko", "order.review", { id: order.id, status: "REVIEW" });
        return "REVIEW";
      }
      return "UNCHANGED";
    }
    if (outcome === "PROCESSING") {
      await tx.order.update({ where: { id: order.id }, data: { holdExpiresAt: order.holdExpiresAt && order.holdExpiresAt > payment.expiresAt ? order.holdExpiresAt : payment.expiresAt } });
      return "UNCHANGED";
    }
    if (outcome === "REVIEW") {
      await tx.order.update({ where: { id: order.id }, data: { status: "REVIEW" } });
      await enqueue(tx, `order:${order.id}:REVIEW`, order.customerEmail, order.locale === "en" ? "en" : "ko", "order.review", { id: order.id, status: "REVIEW" });
      return "REVIEW";
    }
    for (const item of [...order.items].sort((a, b) => a.sku.localeCompare(b.sku))) {
      await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE id = ${item.variantId} FOR UPDATE`;
      const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
      if (!variant) throw new HttpError(409, "PRODUCT_UNAVAILABLE", "A selected product is unavailable.");
      await tx.productVariant.update({ where: { id: item.variantId }, data: { reservedStock: { decrement: item.quantity }, ...(outcome === "PAID" ? { stockOnHand: { decrement: item.quantity } } : {}) } });
    }
    const status = outcome === "PAID" ? "PAID" : outcome === "CANCELLED" ? "CANCELLED" : "EXPIRED";
    await tx.order.update({ where: { id: order.id }, data: { status, holdExpiresAt: null } });
    await enqueue(tx, `order:${order.id}:${status}`, order.customerEmail, order.locale === "en" ? "en" : "ko", `order.${status.toLowerCase()}`, { id: order.id, status });
    return outcome === "PAID" ? "FULFILLED" : "UNCHANGED";
  }
  return "REVIEW";
}
