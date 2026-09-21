import { assertSameOrigin, handleApi, json } from "@/server/http";
import { rateLimit } from "@/server/auth/rate-limit";
import { ensureInvoice } from "@/server/payments";
import { publicPayment, requirePaymentAccess } from "@/server/payments/access";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    assertSameOrigin(request);
    const { id } = await context.params;
    await requirePaymentAccess(request, id);
    await rateLimit("payment:invoice", id, 20, 60);
    return json(publicPayment(await ensureInvoice(id)));
  });
}
