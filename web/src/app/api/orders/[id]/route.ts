import { prisma } from "@/server/db";
import { handleApi, HttpError, json } from "@/server/http";
import { requireResourceAccess } from "@/server/orders/access";
import { orderIncludes, orderView } from "@/server/orders/projection";
export const GET = (request: Request, context: { params: Promise<{ id: string }> }) => handleApi(async () => {
  const row = await prisma.order.findUnique({ where: { id: (await context.params).id }, include: orderIncludes });
  if (!row) throw new HttpError(404, "NOT_FOUND", "Record not found.");
  await requireResourceAccess(request, { ...row, kind: "order" });
  return json(orderView(row));
});
