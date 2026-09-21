import "server-only";
import { createHash } from "node:crypto";
import type { Payment } from "@/generated/prisma/client";
import { prisma, type Tx } from "@/server/db";
import { HttpError } from "@/server/http";
import { applyPaymentOutcome } from "@/server/orders/payment-outcome";
import { metadataSchema, type Invoice, type Observation } from "./types";

export async function lockPayment(tx: Tx, id: string): Promise<Payment> {
  await tx.$queryRaw`SELECT id FROM "Payment" WHERE id = ${id} FOR UPDATE`;
  const payment = await tx.payment.findUnique({ where: { id } });
  if (!payment) throw new HttpError(404, "PAYMENT_NOT_FOUND", "결제를 찾을 수 없습니다. / Payment not found.");
  return payment;
}
export async function persistInvoice(id: string, invoice: Invoice): Promise<Payment> {
  return prisma.$transaction(async (tx) => {
    const payment = await lockPayment(tx, id);
    if (payment.externalId) return payment;
    if (payment.status !== "CREATING" && !payment.creationUnknown) return payment;
    const metadata = metadataSchema.parse(payment.metadata);
    const updated = await tx.payment.update({ where: { id }, data: {
      externalId: invoice.externalId, expiresAt: invoice.expiresAt, checkoutUrl: invoice.checkoutUrl,
      paymentRequest: invoice.paymentRequest, paymentHash: invoice.paymentHash, verifyUrl: invoice.verifyUrl,
      metadata: { ...metadata, ...(invoice.lnurlMetadata ? { lnurlMetadata: invoice.lnurlMetadata } : {}) },
      status: "PENDING", creationUnknown: false, reviewReason: null,
    } });
    await applyPaymentOutcome(tx, updated, "PROCESSING");
    return updated;
  });
}
export async function applyObservation(id: string, observation: Observation, eventKey?: string): Promise<Payment> {
  return prisma.$transaction(async (tx) => {
    const payment = await lockPayment(tx, id);
    if (observation.reason === "NO_INVOICE_ISSUED" && payment.status !== "NEW") return payment;
    const key = eventKey ?? `poll:${id}:${createHash("sha256").update(JSON.stringify(observation)).digest("hex")}`;
    const inserted = await tx.paymentEvent.createMany({ data: { paymentId: id, provider: payment.provider, mode: payment.mode, eventKey: key, summary: { status: observation.status, reason: observation.reason ?? null } }, skipDuplicates: true });
    if (!inserted.count || payment.status === "PAID") return payment;
    if (observation.status === "PENDING") return payment;
    const terminal = ["EXPIRED", "FAILED", "REVIEW"].includes(payment.status);
    if (terminal && observation.status === "EXPIRED") return payment;
    if (payment.status === "PROCESSING" && observation.status === "EXPIRED") return payment;
    const outcome = terminal && observation.status !== "REVIEW" ? "REVIEW" : observation.status;
    const fulfillment = await applyPaymentOutcome(tx, payment, outcome);
    return tx.payment.update({ where: { id }, data: {
      status: fulfillment === "REVIEW" ? "REVIEW" : outcome,
      reviewReason: fulfillment === "REVIEW" ? observation.reason ?? "LATE_OR_CONFLICTING_PAYMENT" : observation.reason ?? null,
      ...(observation.status === "PAID" ? { paidAt: payment.paidAt ?? new Date() } : {}),
    } });
  });
}
