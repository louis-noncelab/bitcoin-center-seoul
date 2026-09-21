import { requireAccount } from "@/server/auth";
import { couponInputSchema, listAdminCoupons, saveCoupon } from "@/server/commerce/coupons";
import { assertSameOrigin, handleApi, json, readBody } from "@/server/http";

export const GET = (request: Request) => handleApi(async () => {
  await requireAccount(request);
  return json(await listAdminCoupons());
});

export const POST = (request: Request) => handleApi(async () => {
  assertSameOrigin(request);
  const actor = await requireAccount(request);
  return json(await saveCoupon(await readBody(request, couponInputSchema), actor.id), 201);
});
