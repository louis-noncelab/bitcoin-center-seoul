import "server-only";
import { z } from "zod";
import { prisma } from "@/server/db";
import { HttpError } from "@/server/http";
import { createInvoice, observeInvoice, providerContext, receiverFor, recoverInvoice } from "./provider";
import { applyObservation, lockPayment, persistInvoice } from "./state";
import { metadataSchema, PaymentError, TransportError } from "./types";

export async function ensureInvoice(paymentId: string) {
  const claimed = await prisma.$transaction(async (tx) => {
    const payment = await lockPayment(tx, paymentId);
    if (payment.status !== "NEW") return { payment, claimed: false };
    if (payment.orderId) await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${payment.orderId} FOR UPDATE`;
    const parent = payment.orderId ? await tx.order.findUnique({ where: { id: payment.orderId } }) : null;
    if (!parent || parent.status !== "PENDING_PAYMENT" || !parent.holdExpiresAt || parent.holdExpiresAt <= new Date() || payment.expiresAt <= new Date()) throw new HttpError(409, "PAYMENT_HOLD_EXPIRED", "신청 또는 주문의 결제 기한을 확인해 주세요. / The payment reservation has expired.");
    const metadata = metadataSchema.parse(payment.metadata);
    const updated = await tx.payment.update({ where: { id: paymentId }, data: { status: "CREATING", metadata: { ...metadata, locale: parent.locale === "en" ? "en" : "ko", receiverSnapshot: await receiverFor(payment) } } });
    return { payment: updated, claimed: true };
  });
  if (!claimed.claimed) return claimed.payment;
  try {
    const invoice = await createInvoice(await providerContext(claimed.payment));
    return await persistInvoice(paymentId, invoice);
  } catch (error) {
    // Creation may have reached the provider even when parsing or persistence failed. Never issue a second callback.
    if (!(error instanceof Error)) throw error;
    await prisma.payment.updateMany({ where: { id: paymentId, status: "CREATING", externalId: null }, data: { status: "REVIEW", creationUnknown: true, reviewReason: error instanceof PaymentError ? error.code : "INVOICE_CREATION_UNKNOWN" } });
    return prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
  }
}
export async function reconcilePayment(paymentId: string, eventKey?: string) {
  let payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new HttpError(404, "PAYMENT_NOT_FOUND", "결제를 찾을 수 없습니다. / Payment not found.");
  if (payment.status === "NEW") {
    if (payment.expiresAt <= new Date()) return applyObservation(paymentId, { status: "EXPIRED", reason: "NO_INVOICE_ISSUED" });
    return payment;
  }
  if (payment.status === "PAID") return payment;
  if (payment.status === "CREATING" && payment.updatedAt.getTime() + 30_000 > Date.now()) return payment;
  if (payment.status === "CREATING") {
    await prisma.payment.updateMany({ where: { id: paymentId, status: "CREATING", externalId: null }, data: { creationUnknown: true, status: "REVIEW", reviewReason: "INVOICE_CREATION_INTERRUPTED" } });
    payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
  }
  if (!payment.externalId && !payment.creationUnknown) return payment;
  try {
    let context = await providerContext(payment);
    if (!payment.externalId) {
      const recovered = await recoverInvoice(context);
      if (!recovered) return payment;
      payment = await persistInvoice(paymentId, recovered);
      context = await providerContext(payment);
    }
    return applyObservation(paymentId, await observeInvoice(context), eventKey);
  } catch (error) {
    if (error instanceof TransportError) throw new HttpError(503, error.code, "결제 제공자 확인이 지연됩니다. / Payment provider verification is unavailable.");
    if (error instanceof PaymentError || error instanceof z.ZodError) return applyObservation(paymentId, { status: "REVIEW", reason: error instanceof PaymentError ? error.code : "INVALID_PROVIDER_RESPONSE" }, eventKey);
    throw error;
  }
}
