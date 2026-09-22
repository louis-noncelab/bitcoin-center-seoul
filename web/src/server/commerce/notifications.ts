import "server-only";
import type { NotificationChannel } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { decryptPayload, encryptPayload } from "@/server/email";
import { openString } from "@/server/privacy";

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

export async function postOrderNotification(text: string): Promise<void> {
  const row = await prisma.siteSetting.findUnique({ where: { id: "site" }, select: { notificationWebhook: true, notificationChannel: true } });
  if (!row?.notificationWebhook) return;
  let url: string;
  try {
    url = decryptWebhookUrl(row.notificationWebhook);
  } catch (error) {
    console.error("[notify] webhook unreadable", error instanceof Error ? error.name : "UnknownError");
    return;
  }
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: webhookBody(row.notificationChannel, text),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) console.error("[notify] failed", response.status);
  } catch (error) {
    console.error("[notify] failed", error instanceof Error ? error.name : "UnknownError");
  }
}

export async function notifyOrder(orderId: string, event: "접수" | "결제 완료"): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { customerName: true, amountSats: true, amountKrw: true, items: { select: { sku: true, titleKo: true, quantity: true } } },
  });
  if (!order) return;
  const settings = await prisma.siteSetting.findUnique({ where: { id: "site" }, select: { productDisplayUnit: true } });
  const unit = settings?.productDisplayUnit ?? "SATS";
  const btcWhole = order.amountSats / 100_000_000n;
  const btcFraction = (order.amountSats % 100_000_000n).toString().padStart(8, "0").replace(/0+$/, "");
  const amount = unit === "KRW" && order.amountKrw !== null
    ? `${new Intl.NumberFormat("ko-KR").format(order.amountKrw)}원`
    : unit === "BTC"
      ? `${btcFraction ? `${btcWhole.toString()}.${btcFraction}` : btcWhole.toString()} BTC`
      : `${new Intl.NumberFormat("ko-KR").format(order.amountSats)} sats`;
  const meetup = order.items.some((item) => item.sku.startsWith("MEETUP-"));
  const titles = order.items.map((item) => `${item.titleKo} ${item.quantity}개`).join("\n");
  await postOrderNotification([`**${meetup ? "밋업 예약" : "상품 주문"} · ${event}**`, titles, `${openString(order.customerName)} · ${amount}`, orderId].join("\n"));
}
