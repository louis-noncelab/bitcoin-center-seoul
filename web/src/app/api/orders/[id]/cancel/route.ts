import { z } from "zod";
import { boundedRequestRateLimit } from "@/server/auth/rate-limit";
import { prisma } from "@/server/db";
import { assertSameOrigin, handleApi, HttpError, json, readBody } from "@/server/http";
import { requireResourceAccess } from "@/server/orders/access";
import { cancelUnpaidOrder } from "@/server/orders/cancel-unpaid";
import { identifier } from "@/server/orders/validation";

const bodySchema = z.object({ reason: z.string().trim().max(2000).optional() }).strict();

export const POST = (request: Request, context: { params: Promise<{ id: string }> }) => handleApi(async () => {
  assertSameOrigin(request);
  // Cancelling opens a locking transaction, so cap it the way the other order routes are capped.
  await boundedRequestRateLimit(request, "order-cancel", 30, 300, 900);
  const id = identifier.parse((await context.params).id);
  const row = await prisma.order.findUnique({ where: { id } });
  if (!row) throw new HttpError(404, "NOT_FOUND", "Order not found.");
  await requireResourceAccess(request, { ...row, kind: "order" });
  return json(await cancelUnpaidOrder(id, "customer", await readBody(request, bodySchema)));
});
