import { handleApi, json } from "@/server/http";
import { listCheckoutProduct, listProducts } from "@/server/catalog";
export const GET = (request: Request) => handleApi(async () => {
  const variant = new URL(request.url).searchParams.get("variant");
  if (variant !== null && !/^[A-Za-z0-9_-]{1,100}$/.test(variant)) return json([]);
  return json(variant ? await listCheckoutProduct(variant) : await listProducts());
});
