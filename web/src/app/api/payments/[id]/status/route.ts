import { handleApi, HttpError, json } from "@/server/http";
import { rateLimit } from "@/server/auth/rate-limit";
import { reconcilePayment } from "@/server/payments";
import { publicPayment, requirePaymentAccess } from "@/server/payments/access";
export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const { id } = await context.params;
    const current = await requirePaymentAccess(request, id);
    if (!current.order) throw new HttpError(404, "NOT_FOUND", "주문을 찾을 수 없습니다.");
    await rateLimit("payment:status", id, 30, 60);
    return json(publicPayment(await reconcilePayment(id), current.order.confirmationCode));
  });
}
