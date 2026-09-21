import { handleApi, json } from "@/server/http";
import { rateLimit } from "@/server/auth/rate-limit";
import { reconcilePayment } from "@/server/payments";
import { publicPayment, requirePaymentAccess } from "@/server/payments/access";
export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const { id } = await context.params;
    await requirePaymentAccess(request, id);
    await rateLimit("payment:status", id, 30, 60);
    return json(publicPayment(await reconcilePayment(id)));
  });
}
