import { requireAccount } from "@/server/auth";
import { rateLimit } from "@/server/auth/rate-limit";
import { getClientKey, handleApi, json } from "@/server/http";
import { listAdminOrders } from "@/server/orders/list";

export const GET = (request: Request) => handleApi(async () => {
  await requireAccount(request);
  const url = new URL(request.url);
  if (url.searchParams.get("format") === "csv") await rateLimit("admin:orders-csv", getClientKey(request), 10);
  const result = await listAdminOrders(url);
  return result instanceof Response ? result : json(result);
});
