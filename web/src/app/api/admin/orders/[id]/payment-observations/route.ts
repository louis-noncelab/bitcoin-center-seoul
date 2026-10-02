import { Prisma } from "@/generated/prisma/client";
import { zapriteObservationHistory } from "@/lib/zaprite-contract";
import { requireAccount } from "@/server/auth";
import { prisma } from "@/server/db";
import { handleApi, HttpError, json } from "@/server/http";
import { identifier } from "@/server/orders/validation";

export const GET = (request: Request, context: { params: Promise<{ id: string }> }) => handleApi(async () => {
  await requireAccount(request);
  const id = identifier.parse((await context.params).id);
  if (!await prisma.order.findUnique({ where: { id }, select: { id: true } })) throw new HttpError(404, "NOT_FOUND", "Order not found.");
  const rows = await prisma.paymentEvent.findMany({
    where: { provider: "ZAPRITE", payment: { orderId: id }, summary: { path: ["zaprite"], not: Prisma.AnyNull } },
    select: { id: true, paymentId: true, summary: true, processedAt: true },
    orderBy: [{ processedAt: "desc" }, { id: "desc" }], take: 20,
  });
  return json(zapriteObservationHistory.parse(rows.map(({ processedAt, ...row }) => ({ ...row, createdAt: processedAt.toISOString() }))));
});
