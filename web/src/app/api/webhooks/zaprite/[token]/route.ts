import { handleApi, json } from "@/server/http";
import { processZapriteWebhook } from "@/server/payments/webhook";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  return handleApi(async () => {
    const { token } = await context.params;
    // `handled: false` means the delivery was authentic but belongs to another product sharing
    // this Zaprite organization. Both answer 200 so Zaprite stops retrying.
    const { handled } = await processZapriteWebhook(request, token);
    return json({ received: true, handled });
  });
}
