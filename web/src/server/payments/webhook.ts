import "server-only";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getServerConfig, paymentModeOf } from "@/server/config";
import { prisma } from "@/server/db";
import { HttpError } from "@/server/http";
import { reconcilePayment } from "./index";
import { metadataSchema } from "./types";

// Verified against https://api.zaprite.com/openapi.json (webhooks.order.change) on 2026-09-21:
// the delivery carries nothing but identifiers, and Zaprite publishes no signature scheme —
// no signing secret is returned by POST /v1/webhooks and no operation declares a header
// parameter. Authenticity therefore rests on an unguessable secret in the delivery path, and the
// order state is always re-read from Zaprite rather than trusted from the body.
const zapriteEventSchema = z.object({
  eventType: z.literal("order.change"),
  orderId: z.string().min(1).max(200),
  orgId: z.string().min(1).max(200),
});

export function verifyZapriteWebhookToken(provided: string, secret: string): boolean {
  const left = Buffer.from(provided);
  const right = Buffer.from(secret);
  if (left.length === 0 || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

async function readWebhookBody(request: Request) {
  if (!request.body || request.headers.has("content-encoding")) throw new HttpError(400, "INVALID_WEBHOOK", "Invalid webhook.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > 65_536) { await reader.cancel(); throw new HttpError(413, "BODY_TOO_LARGE", "Webhook too large."); }
      chunks.push(next.value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}

export async function processZapriteWebhook(request: Request, token: string): Promise<{ readonly handled: boolean }> {
  const config = getServerConfig();
  if (!["sandbox", "live"].includes(config.paymentMode) || !config.zaprite) throw new HttpError(404, "WEBHOOK_DISABLED", "Webhook unavailable.");
  if (!verifyZapriteWebhookToken(token, config.zaprite.webhookSecret)) throw new HttpError(401, "INVALID_WEBHOOK_SIGNATURE", "Invalid webhook signature.");
  const raw = await readWebhookBody(request);
  let input: unknown;
  try { input = JSON.parse(raw.toString("utf8")); }
  catch { throw new HttpError(400, "INVALID_WEBHOOK", "Invalid webhook."); }
  const event = zapriteEventSchema.parse(input);
  if (config.zaprite.orgId && event.orgId !== config.zaprite.orgId) {
    throw new HttpError(400, "WEBHOOK_ORG_MISMATCH", "Invalid webhook organization.");
  }
  const mode = paymentModeOf(config);
  const payment = await prisma.payment.findUnique({
    where: { provider_mode_externalId: { provider: "ZAPRITE", mode, externalId: event.orderId } },
  });
  if (!payment) {
    // The Zaprite organization is shared with another product, so deliveries for orders this app
    // never created are expected. Acknowledge them instead of forcing Zaprite to retry.
    console.info("[webhook] zaprite delivery for an unknown order");
    return { handled: false };
  }
  const receiver = metadataSchema.parse(payment.metadata).receiverSnapshot;
  if (receiver?.provider !== "ZAPRITE" || receiver.url !== config.zaprite.url) throw new HttpError(400, "WEBHOOK_STORE_MISMATCH", "Invalid webhook receiver.");
  await reconcilePayment(payment.id, `webhook:zaprite:${event.orderId}`);
  return { handled: true };
}
