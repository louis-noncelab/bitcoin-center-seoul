import { rateLimit } from "@/server/auth/rate-limit";
import { getClientKey } from "@/server/http";
import { optionalAccount } from "@/server/auth";
import { assertSameOrigin, handleApi, json, readBody } from "@/server/http";
import { cartSchema } from "@/server/orders/validation";
import { makeQuote } from "@/server/orders/quote";
import { resourceAccessCookie } from "@/server/orders/access";
export const POST = (request: Request) => handleApi(async () => {
  assertSameOrigin(request);
  await rateLimit("order-quote", getClientKey(request), 100);
  const result = await makeQuote(await readBody(request, cartSchema), await optionalAccount());
  const response = json({ ...result.quote, ...(result.token ? { quoteToken: result.token } : {}) }, 201);
  if (result.token) response.headers.append("set-cookie", resourceAccessCookie("quote", result.quote.id, result.token));
  return response;
});
