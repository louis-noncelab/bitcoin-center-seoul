import { requireAccount } from "@/server/auth";
import { deactivateCategory, saveCategory } from "@/server/catalog/categories";
import { productCategorySchema } from "@/server/catalog/validation";
import { identifier } from "@/server/orders/validation";
import { assertSameOrigin, handleApi, json, readBody } from "@/server/http";

export const PATCH = (request: Request, context: { params: Promise<{ id: string }> }) => handleApi(async () => {
  assertSameOrigin(request);
  const actor = await requireAccount(request);
  const id = identifier.parse((await context.params).id);
  return json(await saveCategory(await readBody(request, productCategorySchema), actor.id, id));
});

export const DELETE = (request: Request, context: { params: Promise<{ id: string }> }) => handleApi(async () => {
  assertSameOrigin(request);
  const actor = await requireAccount(request);
  return json(await deactivateCategory(identifier.parse((await context.params).id), actor.id));
});
