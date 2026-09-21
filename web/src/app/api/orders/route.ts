import { rateLimit } from "@/server/auth/rate-limit";
import { getClientKey } from "@/server/http";
import { optionalAccount } from "@/server/auth";
import { assertSameOrigin, handleApi, json, readBody } from "@/server/http";
import { createOrderSchema } from "@/server/orders/validation";
import { createOrder } from "@/server/orders/create";
import { resourceAccessCookie } from "@/server/orders/access";
export const POST = (request: Request) => handleApi(async () => {
  assertSameOrigin(request);
  await rateLimit("order-create", getClientKey(request), 40);
  const result = await createOrder(request, await readBody(request, createOrderSchema), await optionalAccount());
  const response = json({ ...result.order, ...(result.created && result.token ? { accessToken: result.token } : {}) }, result.created ? 201 : 200);
  if (result.token) response.headers.append("set-cookie", resourceAccessCookie("order", result.order.id, result.token));
  return response;
});
