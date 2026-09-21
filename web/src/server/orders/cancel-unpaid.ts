import "server-only";
import type { Payment, Prisma } from "@/generated/prisma/client";
import { prisma, type Tx } from "@/server/db";
import { HttpError } from "@/server/http";
import { lockPayment } from "@/server/payments/state";
import { applyPaymentOutcome } from "./payment-outcome";
import { orderIncludes, orderView } from "./projection";

export type CancelActor = "customer" | "admin";

function cancelReason(value: string | undefined) {
  const reason = value?.trim() ?? "";
  if (reason.length > 2000) throw new HttpError(400, "INVALID_INPUT", "Reason is too long.");
  return reason;
}

function unpaidNew(payment: Payment) {
  return payment.status === "NEW" && payment.externalId === null && payment.creationUnknown === false;
}

async function failPayment(tx: Tx, payment: Payment, reason: string) {
  if (payment.status === "FAILED" || payment.status === "EXPIRED") return payment;
  const metadata = payment.metadata && typeof payment.metadata === "object" && !Array.isArray(payment.metadata)
    ? payment.metadata as Prisma.JsonObject
    : {};
  return tx.payment.update({
    where: { id: payment.id },
    data: {
      status: "FAILED",
      reviewReason: "CANCELLED_UNPAID",
      metadata: { ...metadata, cancelReason: reason || "unpaid-cancel" },
    },
  });
}

export async function cancelUnpaidOrder(
  orderId: string,
  actor: CancelActor,
  input: { readonly reason?: string | undefined; readonly actorId?: string | undefined },
) {
  const reason = cancelReason(input.reason);
  return prisma.$transaction(async (tx) => {
    const existingPayment = await tx.payment.findFirst({ where: { orderId }, orderBy: { createdAt: "asc" } });
    if (existingPayment) await lockPayment(tx, existingPayment.id);
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    const order = await tx.order.findUnique({ where: { id: orderId }, include: orderIncludes });
    if (!order) throw new HttpError(404, "NOT_FOUND", "Order not found.");
    const payment = existingPayment ? await tx.payment.findUniqueOrThrow({ where: { id: existingPayment.id } }) : null;
    if (order.status === "CANCELLED") {
        return orderView(order);
    }
    if (order.status === "EXPIRED") {
      await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED", holdExpiresAt: null } });
        await tx.auditLog.create({ data: { actorId: input.actorId ?? null, action: "order.cancelled", targetType: "Order", targetId: order.id, summary: { actor, from: "EXPIRED" } } });
      return orderView(await tx.order.findUniqueOrThrow({ where: { id: order.id }, include: orderIncludes }));
    }
    if (order.status !== "PENDING_PAYMENT") throw new HttpError(409, "INVALID_STATE", "This order cannot be cancelled.");
    if (!payment) throw new HttpError(409, "INVALID_STATE", "This order cannot be cancelled.");
    if (actor === "customer" && !unpaidNew(payment)) throw new HttpError(409, "CANCEL_NOT_NEW", "An issued invoice cannot be cancelled here.");
    if (["CREATING", "PROCESSING", "REVIEW", "PAID"].includes(payment.status) || payment.creationUnknown) {
      throw new HttpError(409, actor === "customer" ? "CANCEL_NOT_NEW" : "CANCEL_UNPROVEN", "This payment cannot be cancelled until it is proven unpaid.");
    }
    if (actor === "admin" && !unpaidNew(payment) && payment.status !== "FAILED" && payment.status !== "EXPIRED") {
      throw new HttpError(409, "CANCEL_UNPROVEN", "This payment cannot be cancelled until it is proven unpaid.");
    }
    const failed = await failPayment(tx, payment, reason);
    await applyPaymentOutcome(tx, failed, "CANCELLED");
    await tx.couponUsage.deleteMany({ where: { orderId: order.id } });
    await tx.auditLog.create({ data: { actorId: input.actorId ?? null, action: "order.cancelled", targetType: "Order", targetId: order.id, summary: { actor, reason } } });
    return orderView(await tx.order.findUniqueOrThrow({ where: { id: order.id }, include: orderIncludes }));
  });
}
