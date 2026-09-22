import "server-only";
import { prisma } from "@/server/db";
import { HttpError } from "@/server/http";
import { openString } from "@/server/privacy";

const codePattern = /(?:orders\/confirm\/)?([a-f0-9]{24})\b/i;

export function confirmationCodeFrom(value: string): string | null {
  const captured = value.trim().match(codePattern)?.[1];
  return captured ? captured.toLowerCase() : null;
}

function view(order: { id: string; status: string; confirmationCode: string | null; checkedInAt: Date | null; customerName: string; items: { sku: string; titleKo: string; quantity: number }[] }) {
  return {
    id: order.id,
    status: order.status,
    confirmationCode: order.confirmationCode,
    checkedInAt: order.checkedInAt?.toISOString() ?? null,
    customerName: openString(order.customerName),
    quantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
    title: order.items.map((item) => item.titleKo).join(", "),
    meetup: order.items.some((item) => item.sku.startsWith("MEETUP-")),
  };
}

export async function listMeetupCheckins() {
  const rows = await prisma.order.findMany({
    where: { status: "PAID", items: { some: { sku: { startsWith: "MEETUP-" } } } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { items: { select: { sku: true, titleKo: true, quantity: true } } },
  });
  return { items: rows.map(view) };
}

export async function setMeetupCheckin(input: { code?: string | undefined; orderId?: string | undefined; undo?: boolean | undefined }, actorId: string) {
  const code = input.code ? confirmationCodeFrom(input.code) : null;
  const orderId = input.orderId ?? (input.code && !code ? input.code.trim() : "");
  if (!code && !orderId) throw new HttpError(400, "INVALID_INPUT", "확인 코드 또는 주문 번호가 필요합니다.");
  const order = await prisma.order.findFirst({
    where: code ? { confirmationCode: code } : { id: orderId },
    include: { items: { select: { sku: true, titleKo: true, quantity: true } } },
  });
  if (!order) throw new HttpError(404, "NOT_FOUND", "예약을 찾을 수 없습니다.");
  if (!order.items.some((item) => item.sku.startsWith("MEETUP-"))) throw new HttpError(400, "NOT_MEETUP", "밋업 예약이 아닙니다.");
  if (order.status !== "PAID") throw new HttpError(400, "NOT_PAID", "결제가 확인된 예약만 체크인할 수 있습니다.");
  if (order.checkedInAt && !input.undo) return { status: "already_checked_in" as const, booking: view(order) };
  const checkedInAt = input.undo ? null : new Date();
  const updated = await prisma.order.update({ where: { id: order.id }, data: { checkedInAt }, include: { items: { select: { sku: true, titleKo: true, quantity: true } } } });
  await prisma.auditLog.create({ data: { actorId, action: input.undo ? "meetup.checkin_cleared" : "meetup.checked_in", targetType: "Order", targetId: order.id, summary: { quantity: updated.items.reduce((sum, item) => sum + item.quantity, 0) } } });
  return { status: input.undo ? "cleared" as const : "checked_in" as const, booking: view(updated) };
}
