import { handleApi, json } from "@/server/http";
import { processZapriteWebhook } from "@/server/payments/webhook";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  return handleApi(async () => {
    const { token } = await context.params;
    await processZapriteWebhook(request, token);
    return json({ received: true });
  });
}
