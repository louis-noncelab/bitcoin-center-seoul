import { boundedRequestRateLimit } from "@/server/auth/rate-limit";
import { optionalAccount } from "@/server/auth";
import { assertSameOrigin, handleApi, json, readBody } from "@/server/http";
import { cartSchema } from "@/server/orders/validation";
import { makeQuote } from "@/server/orders/quote";
import { resourceAccessCookie } from "@/server/orders/access";
export const POST = (request: Request) => handleApi(async () => {
  assertSameOrigin(request);
  await boundedRequestRateLimit(request, "order-quote", 100, 1000, 900);
  const result = await makeQuote(await readBody(request, cartSchema), await optionalAccount());
  const response = json({ ...result.quote, ...(result.token ? { quoteToken: result.token } : {}) }, 201);
  if (result.token) response.headers.append("set-cookie", resourceAccessCookie("quote", result.quote.id, result.token));
  return response;
});
