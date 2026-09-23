import { boundedRequestRateLimit } from "@/server/auth/rate-limit";
import { optionalAccount } from "@/server/auth";
import { assertSameOrigin, handleApi, json, readBody } from "@/server/http";
import { createOrderSchema } from "@/server/orders/validation";
import { notifyOrder } from "@/server/commerce/notifications";
import { createOrder } from "@/server/orders/create";
import { resourceAccessCookie } from "@/server/orders/access";
export const POST = (request: Request) => handleApi(async () => {
  assertSameOrigin(request);
  await boundedRequestRateLimit(request, "order-create", 40, 400, 900);
  const result = await createOrder(request, await readBody(request, createOrderSchema), await optionalAccount());
  if (result.created) {
    void notifyOrder(result.order.id, "접수");
  }
  const response = json({ ...result.order, ...(result.created && result.token ? { accessToken: result.token } : {}) }, result.created ? 201 : 200);
  if (result.token) response.headers.append("set-cookie", resourceAccessCookie("order", result.order.id, result.token));
  return response;
});
