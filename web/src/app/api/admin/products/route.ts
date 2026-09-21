import { requireAccount } from "@/server/auth";
import { assertSameOrigin, handleApi, json, readBody } from "@/server/http";
import { listAdminProducts, saveProduct } from "@/server/catalog";
import { productSchema } from "@/server/catalog/validation";

export const runtime = "nodejs";

export const GET = (request: Request) => handleApi(async () => {
  await requireAccount(request);
  return json(await listAdminProducts());
});

export const POST = (request: Request) => handleApi(async () => {
  assertSameOrigin(request);
  const actor = await requireAccount(request);
  return json(await saveProduct(await readBody(request, productSchema, 1_024 * 1_024), actor.id), 201);
});
