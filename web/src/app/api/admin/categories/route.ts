import { requireAccount } from "@/server/auth";
import { listAdminCategories, saveCategory } from "@/server/catalog/categories";
import { productCategorySchema } from "@/server/catalog/validation";
import { assertSameOrigin, handleApi, json, readBody } from "@/server/http";

export const GET = (request: Request) => handleApi(async () => {
  await requireAccount(request);
  return json(await listAdminCategories());
});

export const POST = (request: Request) => handleApi(async () => {
  assertSameOrigin(request);
  const actor = await requireAccount(request);
  return json(await saveCategory(await readBody(request, productCategorySchema), actor.id), 201);
});
