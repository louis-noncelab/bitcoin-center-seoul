import { handleApi, json } from "@/server/http";
import { rateLimit } from "@/server/auth/rate-limit";
import { confirmationByCode } from "@/server/orders/confirmation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  return handleApi(async () => {
    const { code } = await context.params;
    await rateLimit("order:confirm", code, 30, 60);
    return json(await confirmationByCode(code));
  });
}
