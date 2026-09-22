import { requireAccount } from "@/server/auth";
import { assertSameOrigin, handleApi, json, readBody } from "@/server/http";
import { externalRefundSchema, recordExternalRefund } from "@/server/orders/paid-cancellation";
import { identifier } from "@/server/orders/validation";

export const POST = (request: Request, context: { params: Promise<{ id: string }> }) => handleApi(async () => {
  assertSameOrigin(request);
  const actor = await requireAccount(request);
  return json(await recordExternalRefund(identifier.parse((await context.params).id), await readBody(request, externalRefundSchema), actor.id));
});
