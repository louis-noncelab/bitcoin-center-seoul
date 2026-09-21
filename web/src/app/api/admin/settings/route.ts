import { requireAccount } from "@/server/auth";
import { adminSettings, commerceSettingsSchema, updateCommerceSettings } from "@/server/commerce/settings";
import { assertSameOrigin, handleApi, json, readBody } from "@/server/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleApi(async () => {
    await requireAccount(request);
    return json(await adminSettings());
  });
}

export async function PATCH(request: Request) {
  return handleApi(async () => {
    assertSameOrigin(request);
    const actor = await requireAccount(request);
    return json(await updateCommerceSettings(await readBody(request, commerceSettingsSchema), actor.id));
  });
}
