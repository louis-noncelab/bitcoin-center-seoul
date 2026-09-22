import { z } from "zod";
import { requireAccount } from "@/server/auth";
import { prisma } from "@/server/db";
import { assertSameOrigin, handleApi, json, readBody } from "@/server/http";
import { cancelUnpaidOrder } from "@/server/orders/cancel-unpaid";
import { identifier } from "@/server/orders/validation";
import { reconcilePayment } from "@/server/payments";

const bodySchema = z.object({
  reason: z.string().trim().min(1).max(2000),
  changeRequestId: identifier.optional(),
}).strict();

export const POST = (request: Request, context: { params: Promise<{ id: string }> }) => handleApi(async () => {
  assertSameOrigin(request);
  const actor = await requireAccount(request);
  const id = identifier.parse((await context.params).id);
  const payment = await prisma.payment.findFirst({ where: { orderId: id }, orderBy: { createdAt: "asc" } });
  if (payment?.status === "PENDING" && payment.externalId) await reconcilePayment(payment.id);
  const body = await readBody(request, bodySchema);
  return json(await cancelUnpaidOrder(id, "admin", { ...body, actorId: actor.id }));
});
