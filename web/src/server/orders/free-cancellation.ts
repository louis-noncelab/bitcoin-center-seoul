import "server-only";
import { z } from "zod";
import { prisma } from "@/server/db";
import { ticketEventId } from "@/server/events/ticket-eligibility";
import { HttpError } from "@/server/http";
import { orderIncludes, orderView } from "./projection";

export const cancelFreeOrderSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
}).strict();

export async function cancelFreeOrder(orderId: string, input: z.infer<typeof cancelFreeOrderSchema>, actorId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    const order = await tx.order.findUnique({ where: { id: orderId }, include: orderIncludes });
    if (!order) throw new HttpError(404, "NOT_FOUND", "Order not found.");
    if (order.privacyRedactedAt) throw new HttpError(409, "PRIVACY_REDACTED", "개인정보가 삭제된 신청은 변경할 수 없습니다.");
    const freeRegistration = order.amountSats === 0n && order.amountKrw === 0n && order.payments.length === 0
      && order.items.length > 0 && order.items.every((item) => ticketEventId(item.sku) !== null && item.priceKind === "FREE" && item.amountSats === 0n);
    if (!freeRegistration) throw new HttpError(409, "INVALID_STATE", "무료 행사 신청만 결제 없이 취소할 수 있습니다.");
    if (order.status === "CANCELLED") {
      const retry = await tx.auditLog.findFirst({ where: {
        action: "order.free.cancelled", actorId, targetType: "Order", targetId: orderId,
        summary: { path: ["reason"], equals: input.reason },
      } });
      if (retry) return orderView(order);
      throw new HttpError(409, "INVALID_STATE", "이미 취소된 신청입니다.");
    }
    if (order.status !== "PAID" || order.refundStatus !== "NONE" || order.checkedInAt
      || !["UNFULFILLED", "READY"].includes(order.fulfillmentStatus)) {
      throw new HttpError(409, "INVALID_STATE", "입장 처리 전 확정된 무료 신청만 취소할 수 있습니다.");
    }
    for (const item of [...order.items].sort((a, b) => a.sku.localeCompare(b.sku))) {
      await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE id = ${item.variantId} FOR UPDATE`;
      await tx.productVariant.update({ where: { id: item.variantId }, data: { stockOnHand: { increment: item.quantity } } });
    }
    await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED", fulfillmentStatus: "UNFULFILLED" } });
    await tx.auditLog.create({ data: {
      actorId, action: "order.free.cancelled", targetType: "Order", targetId: orderId,
      summary: { reason: input.reason, fromOrderStatus: "PAID", toOrderStatus: "CANCELLED", restock: true, originalFulfillmentStatus: order.fulfillmentStatus },
    } });
    return orderView(await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: orderIncludes }));
  });
}
