import { handleApi, json } from "@/server/http";
import { publicPayment } from "@/server/payments/access";
import { simulatePayment } from "@/server/payments/review";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handleApi(async () => json(publicPayment(await simulatePayment(request, (await context.params).id))));
}
