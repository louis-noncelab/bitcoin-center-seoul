import "server-only";
import { z } from "zod";
import { requireAccount } from "@/server/auth";
import { getServerConfig } from "@/server/config";
import { prisma } from "@/server/db";
import { assertSameOrigin, HttpError, readBody } from "@/server/http";
import { ensureInvoice, reconcilePayment } from "./index";
import { lockPayment } from "./state";
import { metadataSchema, reviewScenarios } from "./types";

// Drives REVIEW-mode payments through provider outcomes without any network access. The scenario
// only selects a fixture response; the real parser, state machine and outbox still run.
export async function simulatePayment(request: Request, paymentId: string) {
  assertSameOrigin(request);
  const actor = await requireAccount(request);
  if (!["review", "test"].includes(getServerConfig().appMode)) throw new HttpError(404, "REVIEW_DISABLED", "Review unavailable.");
  const { scenario } = await readBody(request, z.object({ scenario: z.enum(reviewScenarios) }).strict(), 1024);
  const payment = await prisma.$transaction(async (tx) => {
    const current = await lockPayment(tx, paymentId);
    if (current.mode !== "REVIEW") throw new HttpError(403, "LIVE_PAYMENT", "검토 결제만 변경할 수 있습니다. / Only review payments are supported.");
    if (current.status === "CREATING") throw new HttpError(409, "INVOICE_CREATING", "발행이 진행 중입니다. / Invoice creation is in progress.");
    const updated = await tx.payment.update({ where: { id: paymentId }, data: { metadata: { ...metadataSchema.parse(current.metadata), reviewScenario: scenario } } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "payment.review.scenario", targetType: "Payment", targetId: paymentId, summary: { scenario } } });
    return updated;
  });
  if (payment.status === "NEW") return ensureInvoice(paymentId);
  return reconcilePayment(paymentId);
}
