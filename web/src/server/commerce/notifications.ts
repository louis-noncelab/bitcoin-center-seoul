import "server-only";
import type { NotificationChannel } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { decryptPayload, encryptPayload } from "@/server/email";
import { openString } from "@/server/privacy";
import { purchaseKind, ticketEventId } from "@/lib/commerce-kind";

type NotificationFailureStage = "settings_lookup" | "customer_lookup" | "customer_decrypt" | "request_build" | "delivery";
type NotificationFailureReason =
  | "DB_LOOKUP_FAILED"
  | "ORDER_LOOKUP_FAILED"
  | "CUSTOMER_DECRYPT_FAILED"
  | "WEBHOOK_DECRYPT_FAILED"
  | "REQUEST_BUILD_FAILED"
  | "FETCH_FAILED"
  | "HTTP_NOT_OK";

function logNotificationFailure(orderId: string, stage: NotificationFailureStage, reasonCode: NotificationFailureReason): void {
  console.error("commerce.notification.failure", { event: "commerce.notification.failure", orderId, stage, reasonCode });
}

export function encryptWebhookUrl(url: string): string {
  return encryptPayload({ url });
}

export function decryptWebhookUrl(stored: string): string {
  const url = decryptPayload(stored).url;
  if (!url?.startsWith("https://")) throw new Error("WEBHOOK_URL_INVALID");
  return url;
}

function webhookBody(channel: NotificationChannel, text: string): string {
  if (channel === "DISCORD") return JSON.stringify({ content: text });
  if (channel === "MATTERMOST") return JSON.stringify({ text });
  return JSON.stringify({ text, content: text });
}

export async function postOrderNotification(orderId: string, text: string): Promise<void> {
  let row: { notificationWebhook: string | null; notificationChannel: NotificationChannel } | null;
  try {
    row = await prisma.siteSetting.findUnique({ where: { id: "site" }, select: { notificationWebhook: true, notificationChannel: true } });
  } catch {
    logNotificationFailure(orderId, "settings_lookup", "DB_LOOKUP_FAILED");
    return;
  }
  if (!row?.notificationWebhook) return;
  let url: string;
  try {
    url = decryptWebhookUrl(row.notificationWebhook);
  } catch {
    logNotificationFailure(orderId, "settings_lookup", "WEBHOOK_DECRYPT_FAILED");
    return;
  }
  let request: Request;
  try {
    request = new Request(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: webhookBody(row.notificationChannel, text),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    logNotificationFailure(orderId, "request_build", "REQUEST_BUILD_FAILED");
    return;
  }
  try {
    const response = await fetch(request);
    if (!response.ok) logNotificationFailure(orderId, "delivery", "HTTP_NOT_OK");
  } catch {
    logNotificationFailure(orderId, "delivery", "FETCH_FAILED");
  }
}

export async function notifyOrder(orderId: string, event: "접수" | "결제 완료" | "확정"): Promise<void> {
  let row: { notificationWebhook: string | null; productDisplayUnit: "SATS" | "BTC" | "KRW" } | null;
  try {
    row = await prisma.siteSetting.findUnique({ where: { id: "site" }, select: { notificationWebhook: true, productDisplayUnit: true } });
  } catch {
    logNotificationFailure(orderId, "settings_lookup", "DB_LOOKUP_FAILED");
    return;
  }
  if (!row?.notificationWebhook) return;
  let order: { customerName: string; amountSats: bigint; amountKrw: bigint | null; items: { sku: string; titleKo: string; quantity: number }[] } | null;
  try {
    order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { customerName: true, amountSats: true, amountKrw: true, items: { select: { sku: true, titleKo: true, quantity: true } } },
    });
  } catch {
    logNotificationFailure(orderId, "customer_lookup", "ORDER_LOOKUP_FAILED");
    return;
  }
  if (!order) return;
  const unit = row.productDisplayUnit;
  const btcWhole = order.amountSats / 100_000_000n;
  const btcFraction = (order.amountSats % 100_000_000n).toString().padStart(8, "0").replace(/0+$/, "");
  const amount = unit === "KRW" && order.amountKrw !== null
    ? `${new Intl.NumberFormat("ko-KR").format(order.amountKrw)}원`
    : unit === "BTC"
      ? `${btcFraction ? `${btcWhole.toString()}.${btcFraction}` : btcWhole.toString()} BTC`
      : `${new Intl.NumberFormat("ko-KR").format(order.amountSats)} sats`;
  const kind = purchaseKind(order.items);
  const titles = order.items.map((item) => `${item.titleKo} ${item.quantity}${ticketEventId(item.sku) !== null ? "명" : "개"}`).join("\n");
  const total = kind === "meetup" && order.amountSats === 0n ? "무료" : amount;
  let customerName: string;
  try {
    customerName = openString(order.customerName);
  } catch {
    logNotificationFailure(orderId, "customer_decrypt", "CUSTOMER_DECRYPT_FAILED");
    return;
  }
  await postOrderNotification(orderId, [`**${kind === "meetup" ? "밋업 신청" : kind === "mixed" ? "밋업과 상품" : "상품 주문"}, ${event}**`, titles, `${customerName}, ${total}`, orderId].join("\n"));
}
