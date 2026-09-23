import { handleApi, HttpError, json } from "@/server/http";
import { boundedRequestRateLimit } from "@/server/auth/rate-limit";
import { confirmationByCode, confirmationCodePattern } from "@/server/orders/confirmation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  return handleApi(async () => {
    const { code } = await context.params;
    if (!confirmationCodePattern.test(code)) throw new HttpError(404, "NOT_FOUND", "확인 페이지를 찾을 수 없습니다. / Confirmation not found.");
    await boundedRequestRateLimit(request, "order:confirm", 30, 300);
    return json(await confirmationByCode(code));
  });
}
