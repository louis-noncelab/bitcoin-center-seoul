import { z } from "zod";
import { requireAccount } from "@/server/auth";
import { prisma } from "@/server/db";
import { assertSameOrigin, handleApi, HttpError, json, readBody } from "@/server/http";
import { manualPaymentSchema, resolveManualPayment } from "@/server/orders/manual-payment";
import { identifier } from "@/server/orders/validation";
import { orderIncludes, orderView } from "@/server/orders/projection";
import { reconcilePayment } from "@/server/payments";
import { orderPaymentHistory, paymentActionLabels } from "@/lib/order-payment-contract";

type Context = { params: Promise<{ id: string }> };
export const GET = (request: Request, context: Context) => handleApi(async () => {
  await requireAccount(request);
  const id = identifier.parse((await context.params).id);
  if (!await prisma.order.findUnique({ where: { id }, select: { id: true } })) throw new HttpError(404, "NOT_FOUND", "Order not found.");
  const rows = await prisma.auditLog.findMany({
    where: { targetType: "Order", targetId: id, action: { in: Object.keys(paymentActionLabels) } },
    select: { id: true, action: true, actorId: true, summary: true, createdAt: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 50,
  });
  return json(orderPaymentHistory.parse(rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))));
});
export const POST = (request: Request, context: Context) => handleApi(async () => {
  assertSameOrigin(request);
  const actor = await requireAccount(request);
  return json(await resolveManualPayment(identifier.parse((await context.params).id), await readBody(request, manualPaymentSchema), actor.id));
});
export const PATCH = (request: Request, context: Context) => handleApi(async () => {
  assertSameOrigin(request);
  await requireAccount(request);
  const id = identifier.parse((await context.params).id);
  const { paymentId } = await readBody(request, z.object({ paymentId: identifier }).strict());
  if (!await prisma.payment.findFirst({ where: { id: paymentId, orderId: id }, select: { id: true } })) throw new HttpError(404, "NOT_FOUND", "Payment not found.");
  await reconcilePayment(paymentId);
  return json(orderView(await prisma.order.findUniqueOrThrow({ where: { id }, include: orderIncludes })));
});
