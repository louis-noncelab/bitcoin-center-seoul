import "server-only";
import type { Payment } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { HttpError } from "@/server/http";
import { requireResourceAccess } from "@/server/orders/access";

export async function requirePaymentAccess(request: Request, paymentId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
  if (!payment) throw new HttpError(404, "PAYMENT_NOT_FOUND", "결제를 찾을 수 없습니다. / Payment not found.");
  if (!payment.order) throw new HttpError(404, "PAYMENT_NOT_FOUND", "결제를 찾을 수 없습니다. / Payment not found.");
  await requireResourceAccess(request, { ...payment.order, kind: "order" });
  return payment;
}
export function publicPayment(payment: Payment) {
  return {
    id: payment.id, provider: payment.provider, mode: payment.mode, status: payment.status,
    amountSats: payment.amountSats.toString(), currency: payment.currency, expiresAt: payment.expiresAt,
    checkoutUrl: payment.checkoutUrl, paymentRequest: payment.paymentRequest,
    review: payment.mode === "REVIEW", creationUnknown: payment.creationUnknown, reviewReason: payment.reviewReason,
  };
}
