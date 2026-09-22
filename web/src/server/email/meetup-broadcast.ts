import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/server/db";
import { getServerConfig } from "@/server/config";
import { HttpError } from "@/server/http";
import { openString } from "@/server/privacy";
import { getEvent, paidOnlineSessions } from "@/server/events";
import { enqueue } from "@/server/email";
import { scheduleEmailDelivery } from "@/server/email/queue";

export type MeetupAudience = {
  readonly id: number;
  readonly title: string;
  readonly date: string;
  readonly online: boolean;
  readonly recipients: number;
};

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

function eventIdFrom(sku: string): number | null {
  const match = /^MEETUP-(\d+)$/.exec(sku);
  return match ? Number(match[1]) : null;
}

export async function meetupAudiences(): Promise<readonly MeetupAudience[]> {
  const orders = await prisma.order.findMany({
    where: { status: "PAID", items: { some: { sku: { startsWith: "MEETUP-" } } } },
    select: { customerEmail: true, items: { where: { sku: { startsWith: "MEETUP-" } }, select: { sku: true, titleKo: true } } },
  });
  const groups = new Map<number, { title: string; emails: Set<string> }>();
  for (const order of orders) {
    const email = openString(order.customerEmail).trim().toLowerCase();
    for (const item of order.items) {
      const id = eventIdFrom(item.sku);
      if (!id || !email) continue;
      const group = groups.get(id) ?? { title: item.titleKo, emails: new Set<string>() };
      group.emails.add(email);
      groups.set(id, group);
    }
  }
  return (await Promise.all([...groups.entries()].map(async ([id, group]) => {
    const event = await getEvent(id);
    return {
      id,
      title: event?.title || group.title,
      date: event?.date ?? "",
      online: Boolean(event?.isOnline && event.onlineUrl),
      recipients: group.emails.size,
    };
  }))).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

function letter(input: {
  readonly locale: "ko" | "en";
  readonly subject: string;
  readonly message: string;
  readonly title: string;
  readonly confirmUrl: string | null;
  readonly joinUrl: string | null;
  readonly joinNote: string;
}): { subject: string; text: string; html: string } {
  const ko = input.locale === "ko";
  const origin = getServerConfig().appOrigin;
  const paragraphs = input.message.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const text = [
    input.title,
    input.subject,
    input.message.trim(),
    ...(input.joinUrl ? [`${ko ? "온라인 참여" : "Join online"}: ${input.joinUrl}`, input.joinNote] : []),
    ...(input.confirmUrl ? [`${ko ? "예약 확인" : "Reservation"}: ${input.confirmUrl}`] : []),
  ].filter(Boolean).join("\n\n");
  const font = "'Pretendard Variable','Apple SD Gothic Neo','Malgun Gothic',sans-serif";
  const html = `<!DOCTYPE html><html lang="${input.locale}"><body style="margin:0;background:#fafaf8;color:#20211f;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf8;"><tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
<tr><td style="padding:0 0 28px;border-top:4px solid #20211f;font-family:${font};">
<img src="${escapeHtml(origin)}/brand/bcs-horizontal-color.png" width="168" height="48" alt="${ko ? "비트코인 센터 서울" : "Bitcoin Center Seoul"}" style="display:block;width:168px;height:auto;border:0;">
</td></tr>
<tr><td style="font-family:${font};">
<p style="margin:0;font-size:15px;line-height:1.5;color:#62675f;">${escapeHtml(input.title)}</p>
<h1 style="margin:8px 0 0;font-size:32px;line-height:1.25;font-weight:600;letter-spacing:-0.035em;">${escapeHtml(input.subject)}</h1>
${paragraphs.map((paragraph) => `<p style="margin:16px 0 0;max-width:38em;font-size:17px;line-height:1.75;color:#20211f;">${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`).join("")}
</td></tr>
${input.joinUrl ? `<tr><td style="padding:28px 0 0;font-family:${font};"><a href="${escapeHtml(input.joinUrl)}" style="display:inline-block;background:#20211f;color:#fafaf8;text-decoration:none;border-radius:8px;padding:14px 22px;font-size:16px;line-height:1.5;font-weight:500;">${ko ? "온라인 참여" : "Join online"}</a>${input.joinNote ? `<p style="margin:8px 0 0;font-size:15px;line-height:1.6;color:#62675f;">${escapeHtml(input.joinNote)}</p>` : ""}</td></tr>` : ""}
${input.confirmUrl ? `<tr><td style="padding:28px 0 0;font-family:${font};"><a href="${escapeHtml(input.confirmUrl)}" style="color:#32699f;text-decoration:underline;font-size:15px;line-height:1.6;">${ko ? "예약 확인" : "View reservation"}</a></td></tr>` : ""}
<tr><td style="padding:28px 0 0;font-family:${font};"><p style="margin:0;font-size:14px;line-height:1.6;color:#62675f;">${ko ? "비트코인 센터 서울 · 서울 마포구" : "Bitcoin Center Seoul · Mapo, Seoul"}</p></td></tr>
</table></td></tr></table></body></html>`;
  return { subject: input.subject, text, html };
}

export async function sendMeetupBroadcast(input: { readonly eventId: number; readonly subject: string; readonly message: string }, actorId: string): Promise<{ recipients: number; queued: number; skipped: number }> {
  const event = await getEvent(input.eventId);
  const orders = await prisma.order.findMany({
    where: { status: "PAID", items: { some: { sku: `MEETUP-${input.eventId}` } } },
    select: { customerEmail: true, locale: true, confirmationCode: true, items: { where: { sku: `MEETUP-${input.eventId}` }, select: { titleKo: true, titleEn: true } } },
  });
  const join = (await paidOnlineSessions([`MEETUP-${input.eventId}`]))[0] ?? null;
  const people = new Map<string, { email: string; locale: "ko" | "en"; code: string | null; title: string }>();
  for (const order of orders) {
    const email = openString(order.customerEmail).trim();
    const key = email.toLowerCase();
    if (!email.includes("@") || people.has(key)) continue;
    const item = order.items[0];
    const locale = order.locale === "en" ? "en" : "ko";
    people.set(key, {
      email,
      locale,
      code: order.confirmationCode,
      title: locale === "en" ? (event?.titleEn || item?.titleEn || event?.title || item?.titleKo || "Meetup") : (event?.title || item?.titleKo || "밋업"),
    });
  }
  if (people.size === 0) throw new HttpError(404, "NO_RECIPIENTS", "결제 완료된 예약이 없습니다.");
  const origin = getServerConfig().appOrigin;
  const contentHash = digest(`${input.subject}\n${input.message}\n${join?.url ?? ""}`);
  let queued = 0;
  await prisma.$transaction(async (tx) => {
    for (const person of people.values()) {
      const locale = person.locale;
      const note = locale === "en" ? (join?.noteEn || join?.note || "") : (join?.note || "");
      const built = letter({
        locale,
        subject: input.subject,
        message: input.message,
        title: person.title,
        confirmUrl: person.code ? `${origin}/${locale}/orders/confirm/${person.code}` : null,
        joinUrl: join?.url || null,
        joinNote: note,
      });
      queued += await enqueue(tx, `meetup:${input.eventId}:broadcast:${contentHash}:${digest(person.email.toLowerCase())}`, person.email, locale, "meetup.notice", built);
    }
    await tx.auditLog.create({
      data: { actorId, action: "meetup.broadcast", targetType: "Event", targetId: String(input.eventId), summary: { recipients: people.size, queued } },
    });
  });
  scheduleEmailDelivery();
  return { recipients: people.size, queued, skipped: people.size - queued };
}
