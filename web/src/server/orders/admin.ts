import "server-only";
import { z } from "zod";
import { prisma } from "@/server/db";
import { enqueue } from "@/server/email";
import { HttpError } from "@/server/http";
import { orderIncludes, orderView } from "./projection";

export const fulfillmentSchema = z.object({ status: z.enum(["READY", "COLLECTED", "SHIPPED", "DELIVERED"]), carrier: z.string().trim().min(1).max(100).optional(), trackingNumber: z.string().trim().min(1).max(150).optional() }).strict();
export async function fulfillOrder(id: string, input: z.infer<typeof fulfillmentSchema>, actorId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${id} FOR UPDATE`;
    const order = await tx.order.findUnique({ where: { id } });
    if (!order) throw new HttpError(404, "NOT_FOUND", "Order not found.");
    if (order.status !== "PAID") throw new HttpError(409, "PAYMENT_REQUIRED", "Fulfillment requires confirmed payment.");
    const expected = order.fulfillment === "PICKUP" ? { READY: "UNFULFILLED", COLLECTED: "READY", SHIPPED: null, DELIVERED: null } : { READY: null, COLLECTED: null, SHIPPED: "UNFULFILLED", DELIVERED: "SHIPPED" };
    if (expected[input.status] !== order.fulfillmentStatus) throw new HttpError(409, "INVALID_STATE", "This fulfillment transition is not allowed.");
    if (Boolean(input.carrier) !== Boolean(input.trackingNumber)) throw new HttpError(400, "TRACKING_REQUIRED", "Carrier and tracking number must be provided together.");
    if (order.fulfillment === "PICKUP" && (input.carrier || input.trackingNumber)) throw new HttpError(400, "TRACKING_NOT_ALLOWED", "Pickup orders do not have shipping tracking.");
    if (input.status === "SHIPPED" && (!input.carrier || !input.trackingNumber)) throw new HttpError(400, "TRACKING_REQUIRED", "Enter the carrier and tracking number.");
    const updated = await tx.order.update({ where: { id }, data: { fulfillmentStatus: input.status, ...(input.carrier && input.trackingNumber ? { carrier: input.carrier, trackingNumber: input.trackingNumber } : {}), ...(["COLLECTED", "DELIVERED"].includes(input.status) ? { fulfilledAt: new Date() } : {}) }, include: orderIncludes });
    await tx.auditLog.create({ data: { actorId, action: "order.fulfillment", targetType: "Order", targetId: id, summary: { from: order.fulfillmentStatus, to: input.status } } });
    await enqueue(tx, `order:${id}:fulfillment:${input.status}`, order.customerEmail, order.locale === "en" ? "en" : "ko", "order.fulfillment", { id, status: input.status });
    return orderView(updated);
  });
}
