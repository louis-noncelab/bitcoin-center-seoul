import { requireAccount } from "@/server/auth";
import { couponInputSchema, deactivateCoupon, saveCoupon } from "@/server/commerce/coupons";
import { identifier } from "@/server/orders/validation";
import { assertSameOrigin, handleApi, json, readBody } from "@/server/http";

export const PATCH = (request: Request, context: { params: Promise<{ id: string }> }) => handleApi(async () => {
  assertSameOrigin(request);
  const actor = await requireAccount(request);
  return json(await saveCoupon(await readBody(request, couponInputSchema), actor.id, identifier.parse((await context.params).id)));
});

export const DELETE = (request: Request, context: { params: Promise<{ id: string }> }) => handleApi(async () => {
  assertSameOrigin(request);
  const actor = await requireAccount(request);
  return json(await deactivateCoupon(identifier.parse((await context.params).id), actor.id));
});
