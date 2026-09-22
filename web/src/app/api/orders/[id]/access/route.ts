import { z } from "zod";
import { prisma } from "@/server/db";
import { assertSameOrigin, handleApi, HttpError, json, readBody } from "@/server/http";
import { requireResourceAccess, resourceAccessCookie } from "@/server/orders/access";
export const POST = (request: Request, context: { params: Promise<{ id: string }> }) => handleApi(async () => {
  assertSameOrigin(request);
  const input = await readBody(request, z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).strict());
  const row = await prisma.order.findUnique({ where: { id: (await context.params).id } });
  if (!row) throw new HttpError(404, "NOT_FOUND", "Record not found.");
  const headers = new Headers(request.headers); headers.set("x-resource-token", input.token);
  await requireResourceAccess(new Request(request.url, { headers }), { ...row, kind: "order" });
  const response = json({ id: row.id });
  response.headers.append("set-cookie", resourceAccessCookie("order", row.id, input.token));
  return response;
});
