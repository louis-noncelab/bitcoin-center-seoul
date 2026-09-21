import { requireAccount } from "@/server/auth";
import { assertSameOrigin, handleApi, json, readBody } from "@/server/http";
import { productSchema } from "@/server/catalog/validation";
import { archiveProduct, saveProduct } from "@/server/catalog";
export const PATCH = (request: Request, context: { params: Promise<{ id: string }> }) => handleApi(async () => { assertSameOrigin(request); const actor = await requireAccount(request); return json(await saveProduct(await readBody(request, productSchema, 1_024 * 1_024), actor.id, (await context.params).id)); });
export const DELETE = (request: Request, context: { params: Promise<{ id: string }> }) => handleApi(async () => { assertSameOrigin(request); const actor = await requireAccount(request); return json(await archiveProduct((await context.params).id, actor.id)); });
