import "server-only";
import { z } from "zod";
import type { Tx } from "@/server/db";
import { prisma } from "@/server/db";
import { HttpError } from "@/server/http";
import { lockPayment } from "@/server/payments/state";
import { manualPaymentSchema } from "./manual-payment";
import { orderIncludes, orderView } from "./projection";

export const cancelPaidOrderSchema = manualPaymentSchema.omit({ decision: true });
export const externalRefundSchema = cancelPaidOrderSchema.extend({
  method: z.enum(["LIGHTNING", "ONCHAIN", "BANK", "OTHER"]),
  proof: z.string().trim().min(1).max(500),
  restock: z.boolean(),
}).strict();
type CancellationInput = z.infer<typeof cancelPaidOrderSchema>;
type RefundInput = z.infer<typeof externalRefundSchema>;

async function lockedOrder(tx: Tx, orderId: string, paymentId: string) {
  const payment = await lockPayment(tx, paymentId);
  if (payment.orderId !== orderId) throw new HttpError(404, "NOT_FOUND", "주문의 결제를 찾을 수 없습니다.");
  await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: orderIncludes });
  if (order.payments.length !== 1) throw new HttpError(409, "PAYMENT_CONFLICT", "여러 결제가 연결된 주문은 수동 처리할 수 없습니다.");
  return { order, payment };
}

async function isRetry(tx: Tx, orderId: string, action: string, input: CancellationInput | RefundInput, actorId: string) {
  return tx.auditLog.findFirst({ where: {
    action, actorId, targetType: "Order", targetId: orderId,
    AND: Object.entries(input).map(([key, value]) => ({ summary: { path: [key], equals: value } })),
  } });
}

function assertVersion(actual: Date, expected: string) {
  if (actual.getTime() !== new Date(expected).getTime()) throw new HttpError(409, "PAYMENT_STALE", "결제 상태가 변경되었습니다. 새로고침 후 다시 확인해 주세요.");
}

export async function cancelPaidOrder(orderId: string, input: CancellationInput, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const { order, payment } = await lockedOrder(tx, orderId, input.paymentId);
    if (order.status === "CANCELLED" && order.refundStatus !== "NONE" && await isRetry(tx, orderId, "order.paid.cancelled", input, actorId)) return orderView(order);
    assertVersion(payment.updatedAt, input.expectedPaymentUpdatedAt);
    if (order.refundStatus !== "NONE" || (order.status !== "PAID" && order.status !== "REVIEW")) {
      throw new HttpError(409, "INVALID_STATE", "입금이 확인된 주문만 환불 대기 상태로 취소할 수 있습니다.");
    }
    if (payment.creationUnknown || payment.status === "CREATING" || (payment.status !== "PAID" && payment.paidAt === null)) {
      throw new HttpError(409, "PAYMENT_UNCONFIRMED", "입금 확인이 완료되지 않았습니다.");
    }
    const inventoryConsumed = order.status === "PAID";
    if (!inventoryConsumed && order.holdExpiresAt !== null) {
      for (const item of [...order.items].sort((a, b) => a.sku.localeCompare(b.sku))) {
        await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE id = ${item.variantId} FOR UPDATE`;
        const variant = await tx.productVariant.findUniqueOrThrow({ where: { id: item.variantId } });
        if (variant.reservedStock < item.quantity) throw new HttpError(409, "INVENTORY_CONFLICT", "예약 재고가 주문 수량과 맞지 않습니다.");
        await tx.productVariant.update({ where: { id: item.variantId }, data: { reservedStock: { decrement: item.quantity } } });
      }
    }
    await tx.payment.update({ where: { id: payment.id }, data: {
      status: "PAID", paidAt: payment.paidAt ?? new Date(), updatedAt: new Date(Math.max(Date.now(), payment.updatedAt.getTime() + 1)),
    } });
    await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED", refundStatus: "PENDING", holdExpiresAt: null } });
    await tx.auditLog.create({ data: {
      actorId, action: "order.paid.cancelled", targetType: "Order", targetId: orderId,
      summary: { ...input, inventoryConsumed, originalFulfillmentStatus: order.fulfillmentStatus, fromOrderStatus: order.status, fromPaymentStatus: payment.status },
    } });
    return orderView(await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: orderIncludes }));
  });
}

const cancelledInventorySchema = z.object({ paymentId: z.string(), inventoryConsumed: z.boolean() });

export async function recordExternalRefund(orderId: string, input: RefundInput, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const { order, payment } = await lockedOrder(tx, orderId, input.paymentId);
    if (order.status === "CANCELLED" && order.refundStatus === "COMPLETED" && await isRetry(tx, orderId, "order.refund.recorded", input, actorId)) return orderView(order);
    assertVersion(payment.updatedAt, input.expectedPaymentUpdatedAt);
    if (order.status !== "CANCELLED" || order.refundStatus !== "PENDING" || payment.status !== "PAID") {
      throw new HttpError(409, "INVALID_STATE", "환불 대기 중인 취소 주문만 환불 완료로 기록할 수 있습니다.");
    }
    const cancellation = await tx.auditLog.findFirst({ where: { targetId: orderId, targetType: "Order", action: "order.paid.cancelled" }, orderBy: { createdAt: "desc" } });
    const inventory = cancelledInventorySchema.safeParse(cancellation?.summary);
    if (!inventory.success || inventory.data.paymentId !== payment.id) throw new HttpError(409, "CANCELLATION_AUDIT_MISSING", "취소 당시의 재고 처리 기록을 확인할 수 없습니다.");
    if (input.restock && !inventory.data.inventoryConsumed) throw new HttpError(409, "RESTOCK_NOT_APPLICABLE", "재고가 차감되지 않은 주문입니다. 재고 복구를 선택할 수 없습니다.");
    if (input.restock) {
      for (const item of [...order.items].sort((a, b) => a.sku.localeCompare(b.sku))) {
        await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE id = ${item.variantId} FOR UPDATE`;
        await tx.productVariant.update({ where: { id: item.variantId }, data: { stockOnHand: { increment: item.quantity } } });
      }
    }
    const refundedAt = new Date();
    await tx.payment.update({ where: { id: payment.id }, data: { updatedAt: new Date(Math.max(Date.now(), payment.updatedAt.getTime() + 1)) } });
    await tx.order.update({ where: { id: orderId }, data: { refundStatus: "COMPLETED", refundedAt } });
    await tx.auditLog.create({ data: { actorId, action: "order.refund.recorded", targetType: "Order", targetId: orderId, summary: { ...input, refundedAt: refundedAt.toISOString() } } });
    return orderView(await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: orderIncludes }));
  });
}
