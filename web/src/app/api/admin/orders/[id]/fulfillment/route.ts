import { requireAccount } from "@/server/auth";
import { assertSameOrigin, handleApi, json, readBody } from "@/server/http";
import { fulfillmentSchema, fulfillOrder } from "@/server/orders/admin";
export const POST = (request: Request, context: { params: Promise<{ id: string }> }) => handleApi(async () => { assertSameOrigin(request); const actor = await requireAccount(request); return json(await fulfillOrder((await context.params).id, await readBody(request, fulfillmentSchema), actor.id)); });
