import "server-only";
import { prisma } from "@/server/db";
import { paidOnlineSessions } from "@/server/events";
import { HttpError } from "@/server/http";
import { orderIncludes, orderView } from "./projection";

const codePattern = /^[a-f0-9]{24}$/;

export async function confirmationByCode(code: string) {
  if (!codePattern.test(code)) throw new HttpError(404, "NOT_FOUND", "확인 페이지를 찾을 수 없습니다. / Confirmation not found.");
  const order = await prisma.order.findUnique({ where: { confirmationCode: code }, include: orderIncludes });
  if (!order) throw new HttpError(404, "NOT_FOUND", "확인 페이지를 찾을 수 없습니다. / Confirmation not found.");
  const view = orderView(order);
  const address = view.address as { postalCode?: string; region?: string; city?: string; line1?: string; line2?: string } | null;
  return {
    code,
    status: view.status,
    customerName: view.customerName,
    fulfillment: view.fulfillment,
    fulfillmentStatus: view.fulfillmentStatus,
    addressText: address ? [address.postalCode, address.region, address.city, address.line1, address.line2].filter(Boolean).join(" ") : null,
    items: view.items.map((item) => ({ titleKo: item.titleKo, titleEn: item.titleEn, quantity: item.quantity, amountSats: item.amountSats })),
    sessions: view.status === "PAID" ? paidOnlineSessions(view.items.map((item) => item.sku)) : [],
    amountSats: view.amountSats,
    createdAt: view.createdAt instanceof Date ? view.createdAt.toISOString() : String(view.createdAt),
  };
}
