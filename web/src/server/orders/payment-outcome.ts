import "server-only";
import type { Payment } from "@/generated/prisma/client";
import type { Tx } from "@/server/db";
import { getServerConfig } from "@/server/config";
import { enqueueOperatorLetter, enqueuePaymentLetter } from "@/server/email/payment-letter";
import { openAddress, openString } from "@/server/privacy";
import { HttpError } from "@/server/http";
import { releaseCouponUsage } from "@/server/commerce/coupons";

export type PaymentOutcome = "PAID" | "PROCESSING" | "EXPIRED" | "CANCELLED" | "REVIEW";
export type FulfillmentOutcome = "FULFILLED" | "REVIEW" | "UNCHANGED";

function confirmUrl(locale: string, code: string | null): string {
  return `${getServerConfig().appOrigin}/${locale === "en" ? "en" : "ko"}/orders/confirm/${code ?? ""}`;
}

// Caller locks Payment first. Parent rows precede Event / lexicographically ordered SKU locks.
export async function applyPaymentOutcome(tx: Tx, payment: Payment, outcome: PaymentOutcome): Promise<FulfillmentOutcome> {
  if (payment.orderId) {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${payment.orderId} FOR UPDATE`;
    const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId }, include: { items: true } });
    if (order.status === "PAID") return "UNCHANGED";
    if (order.status !== "PENDING_PAYMENT") {
      if (outcome === "PAID" || outcome === "REVIEW") {
        await tx.order.update({ where: { id: order.id }, data: { status: "REVIEW" } });
        await enqueuePaymentLetter(tx, { eventKey: `order:${order.id}:REVIEW`, to: openString(order.customerEmail), locale: order.locale, kind: "order.review", order, url: confirmUrl(order.locale, order.confirmationCode) });
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
      await enqueuePaymentLetter(tx, { eventKey: `order:${order.id}:REVIEW`, to: openString(order.customerEmail), locale: order.locale, kind: "order.review", order, url: confirmUrl(order.locale, order.confirmationCode) });
      return "REVIEW";
    }
    for (const item of [...order.items].sort((a, b) => a.sku.localeCompare(b.sku))) {
      await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE id = ${item.variantId} FOR UPDATE`;
      const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
      if (!variant) throw new HttpError(409, "PRODUCT_UNAVAILABLE", "A selected product is unavailable.");
      await tx.productVariant.update({ where: { id: item.variantId }, data: { reservedStock: { decrement: item.quantity }, ...(outcome === "PAID" ? { stockOnHand: { decrement: item.quantity } } : {}) } });
    }
    const status = outcome === "PAID" ? "PAID" : outcome === "CANCELLED" ? "CANCELLED" : "EXPIRED";
    if (outcome !== "PAID") await releaseCouponUsage(tx, order.id);
    await tx.order.update({ where: { id: order.id }, data: { status, holdExpiresAt: null } });
    const locale = order.locale === "en" ? "en" : "ko";
    const kind = status === "PAID" ? "order.paid" : status === "CANCELLED" ? "order.cancelled" : "order.expired";
    await enqueuePaymentLetter(tx, { eventKey: `order:${order.id}:${status}`, to: openString(order.customerEmail), locale, kind, order, url: confirmUrl(order.locale, order.confirmationCode) });
    if (status === "PAID") {
      const address = openAddress(order.address) as { postalCode?: string; region?: string; city?: string; line1?: string; line2?: string } | null;
      await enqueueOperatorLetter(tx, {
        eventKey: `operator:${order.id}:PAID`,
        kind: "operator.paid",
        order,
        contact: {
          name: openString(order.customerName),
          email: openString(order.customerEmail),
          phone: openString(order.customerPhone),
          address: address ? [address.postalCode, address.region, address.city, address.line1, address.line2].filter(Boolean).join(" ") : "",
        },
      });
    }
    return outcome === "PAID" ? "FULFILLED" : "UNCHANGED";
  }
  return "REVIEW";
}
