import "server-only";
import { z } from "zod";
import { prisma } from "@/server/db";
import { enqueue } from "@/server/email";
import { scheduleEmailDelivery } from "@/server/email/queue";
import { openString } from "@/server/privacy";
import { HttpError } from "@/server/http";
import { orderIncludes, orderView } from "./projection";

export const fulfillmentSchema = z.object({ status: z.enum(["READY", "COLLECTED", "SHIPPED", "DELIVERED"]), carrier: z.string().trim().min(1).max(100).optional(), trackingNumber: z.string().trim().min(1).max(150).optional() }).strict();
export async function fulfillOrder(id: string, input: z.infer<typeof fulfillmentSchema>, actorId: string) {
  const view = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${id} FOR UPDATE`;
    const order = await tx.order.findUnique({ where: { id } });
    if (!order) throw new HttpError(404, "NOT_FOUND", "Order not found.");
    if (order.privacyRedactedAt) throw new HttpError(409, "ORDER_REDACTED", "개인정보가 파기된 주문은 변경할 수 없습니다.");
    if (order.status !== "PAID") throw new HttpError(409, "PAYMENT_REQUIRED", "Fulfillment requires confirmed payment.");
    const expected = order.fulfillment === "PICKUP" ? { READY: "UNFULFILLED", COLLECTED: "READY", SHIPPED: null, DELIVERED: null } : { READY: null, COLLECTED: null, SHIPPED: "UNFULFILLED", DELIVERED: "SHIPPED" };
    if (expected[input.status] !== order.fulfillmentStatus) throw new HttpError(409, "INVALID_STATE", "This fulfillment transition is not allowed.");
    if (Boolean(input.carrier) !== Boolean(input.trackingNumber)) throw new HttpError(400, "TRACKING_REQUIRED", "Carrier and tracking number must be provided together.");
    if (order.fulfillment === "PICKUP" && (input.carrier || input.trackingNumber)) throw new HttpError(400, "TRACKING_NOT_ALLOWED", "Pickup orders do not have shipping tracking.");
    if (input.status === "SHIPPED" && (!input.carrier || !input.trackingNumber)) throw new HttpError(400, "TRACKING_REQUIRED", "Enter the carrier and tracking number.");
    const updated = await tx.order.update({ where: { id }, data: { fulfillmentStatus: input.status, ...(input.carrier && input.trackingNumber ? { carrier: input.carrier, trackingNumber: input.trackingNumber } : {}), ...(["COLLECTED", "DELIVERED"].includes(input.status) ? { fulfilledAt: new Date() } : {}) }, include: orderIncludes });
    await tx.auditLog.create({ data: { actorId, action: "order.fulfillment", targetType: "Order", targetId: id, summary: { from: order.fulfillmentStatus, to: input.status } } });
    await enqueue(tx, `order:${id}:fulfillment:${input.status}`, openString(order.customerEmail), order.locale === "en" ? "en" : "ko", "order.fulfillment", { id, status: input.status });
    return orderView(updated);
  });
  scheduleEmailDelivery();
  return view;
}

export const trackingSchema = z.object({
  carrier: z.string().trim().min(1).max(100), trackingNumber: z.string().trim().min(1).max(150),
  expectedCarrier: z.string().max(100).nullable(), expectedTrackingNumber: z.string().max(150).nullable(),
}).strict();

export async function correctOrderTracking(id: string, input: z.infer<typeof trackingSchema>, actorId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${id} FOR UPDATE`;
    const order = await tx.order.findUnique({ where: { id } });
    if (!order) throw new HttpError(404, "NOT_FOUND", "Order not found.");
    if (order.privacyRedactedAt) throw new HttpError(409, "ORDER_REDACTED", "개인정보가 파기된 주문은 변경할 수 없습니다.");
    if (order.status !== "PAID" || order.refundStatus !== "NONE" || order.fulfillment === "PICKUP" || !["SHIPPED", "DELIVERED"].includes(order.fulfillmentStatus)) {
      throw new HttpError(409, "INVALID_STATE", "발송한 결제 완료 주문만 송장을 수정할 수 있습니다.");
    }
    if (order.carrier !== input.expectedCarrier || order.trackingNumber !== input.expectedTrackingNumber) {
      throw new HttpError(409, "STALE_ORDER", "송장 정보가 변경되었습니다. 새로고침 후 다시 확인해 주세요.");
    }
    const updated = await tx.order.update({ where: { id }, data: { carrier: input.carrier, trackingNumber: input.trackingNumber }, include: orderIncludes });
    await tx.auditLog.create({ data: { actorId, action: "order.tracking", targetType: "Order", targetId: id,
      summary: { before: { carrier: order.carrier, trackingNumber: order.trackingNumber }, after: { carrier: input.carrier, trackingNumber: input.trackingNumber } },
    } });
    return orderView(updated);
  });
}
