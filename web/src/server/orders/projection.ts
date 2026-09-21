import type { Prisma } from "@/generated/prisma/client";

export const orderIncludes = { items: true, payments: { select: { id: true, status: true, mode: true, expiresAt: true } } } as const;
export type OrderDetails = Prisma.OrderGetPayload<{ include: typeof orderIncludes }>;
export function orderView(order: OrderDetails) {
  return {
    id: order.id, status: order.status, customerName: order.customerName, customerEmail: order.customerEmail,
    customerPhone: order.customerPhone, customerNotes: order.customerNotes, locale: order.locale, amountSats: order.amountSats.toString(), amountKrw: order.amountKrw?.toString() ?? null,
    fulfillment: order.fulfillment, fulfillmentStatus: order.fulfillmentStatus, address: order.address,
    shipping: order.shippingSnapshot, shippingAmountSats: order.shippingAmountSats.toString(),
    carrier: order.carrier, trackingNumber: order.trackingNumber, fulfilledAt: order.fulfilledAt,
    holdExpiresAt: order.holdExpiresAt, createdAt: order.createdAt,
    items: order.items.map((item) => ({ id: item.id, sku: item.sku, quantity: item.quantity, titleKo: item.titleKo, titleEn: item.titleEn, optionLabelKo: item.optionLabelKo, optionLabelEn: item.optionLabelEn, amountSats: item.amountSats.toString() })),
    payments: order.payments,
  };
}
