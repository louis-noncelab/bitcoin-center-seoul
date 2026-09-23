import "server-only";
import type { Tx } from "@/server/db";
import { getServerConfig } from "@/server/config";
import { paidOnlineSessions } from "@/server/events";
import { getCommerceSettings } from "@/server/commerce/settings";
import { enqueue } from "@/server/email";
import { acceptedContractCopy } from "./contract-copy";

type Locale = "ko" | "en";
type Unit = "KRW" | "SATS" | "BTC";
type Kind = "order.created" | "order.paid" | "order.expired" | "order.cancelled" | "order.review";

type Item = { readonly titleKo: string; readonly titleEn: string; readonly quantity: number; readonly sku?: string };
type OrderMail = {
  readonly contractAcceptance?: unknown;
  readonly id: string;
  readonly status: string;
  readonly amountSats: bigint;
  readonly amountKrw: bigint | null;
  readonly confirmationCode: string | null;
  readonly fulfillment: "PICKUP" | "DOMESTIC" | "INTERNATIONAL";
  readonly items: readonly Item[];
};

const copy = {
  "order.created": {
    subject: ["주문이 접수되었습니다", "Your order was received"],
    lead: ["결제를 마치면 주문이 확정됩니다.", "The order is confirmed once payment arrives."],
    action: ["주문 확인", "View your order"],
  },
  "order.paid": {
    subject: ["결제가 확인되었습니다", "Your payment is confirmed"],
    lead: ["결제한 금액과 내역입니다.", "Here are your payment and order details."],
    action: ["결제 확인 열기", "Open confirmation"],
  },
  "order.expired": {
    subject: ["결제 기한이 지났습니다", "The payment window has closed"],
    lead: ["기한 안에 결제가 확인되지 않아 주문이 만료되었습니다.", "The order expired because payment was not confirmed in time."],
    action: ["주문 상태 보기", "View order status"],
  },
  "order.cancelled": {
    subject: ["주문이 취소되었습니다", "Your order was cancelled"],
    lead: ["이 주문은 취소되었습니다. 이미 결제한 금액이 있다면 센터에 문의해 주세요.", "This order was cancelled. Contact the center if a payment was already sent."],
    action: ["주문 상태 보기", "View order status"],
  },
  "order.review": {
    subject: ["결제 내역을 확인 중입니다", "Your payment is being checked"],
    lead: ["운영자가 주문과 결제를 확인하고 있습니다. 확인이 끝날 때까지 수령과 배송은 보류됩니다.", "Staff are checking the order and payment. Pickup and shipping wait until that check is finished."],
    action: ["주문 상태 보기", "View order status"],
  },
} as const;

const fulfillment = {
  ko: { PICKUP: "센터 수령", DOMESTIC: "국내 배송", INTERNATIONAL: "해외 배송" },
  en: { PICKUP: "Pickup at the center", DOMESTIC: "Delivery in Korea", INTERNATIONAL: "International shipping" },
} as const;

const paidLead = {
  PICKUP: ["결제가 확인되었습니다. 수령 준비가 끝나면 안내해 드립니다. 아래 페이지에서 주문 상태를 확인해 주세요.", "Payment is confirmed. We will let you know when your order is ready for pickup. Check its status on the page below."],
  DOMESTIC: ["결제가 확인되었습니다. 국내 배송을 준비합니다. 아래 페이지에서 주문 상태를 확인해 주세요.", "Payment is confirmed. We will prepare delivery in Korea. Check your order status on the page below."],
  INTERNATIONAL: ["결제가 확인되었습니다. 해외 배송을 준비합니다. 아래 페이지에서 주문 상태를 확인해 주세요.", "Payment is confirmed. We will prepare international shipping. Check your order status on the page below."],
  MEETUP: ["예약 결제가 확인되어 자리가 확정되었습니다. 아래 페이지에서 행사 정보를 확인해 주세요.", "Your reservation payment is confirmed and your seat is secured. Check the event details on the page below."],
  ONLINE_MEETUP: ["예약 결제가 확인되어 자리가 확정되었습니다. 아래 온라인 참여 링크와 안내를 확인해 주세요.", "Your reservation payment is confirmed and your seat is secured. Use the online join link and instructions below."],
} as const;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

function formatAmount(unit: Unit, amountSats: bigint, amountKrw: bigint | null, locale: Locale): string {
  const language = locale === "ko" ? "ko-KR" : "en-GB";
  if (unit === "KRW" && amountKrw !== null) {
    return new Intl.NumberFormat(language, { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(amountKrw);
  }
  if (unit === "BTC") {
    const whole = amountSats / 100_000_000n;
    const fraction = (amountSats % 100_000_000n).toString().padStart(8, "0").replace(/0+$/, "");
    return `${fraction ? `${whole.toString()}.${fraction}` : whole.toString()} BTC`;
  }
  return `${new Intl.NumberFormat(language).format(amountSats)} sats`;
}

const accent = { "order.created": "#76adeb", "order.paid": "#ff7609", "order.expired": "#a32d2b", "order.cancelled": "#848a7f", "order.review": "#32699f" } as const;

type OnlineJoin = { readonly url: string; readonly note: string; readonly noteEn: string };

export function buildPaymentLetter(locale: Locale, kind: Kind, order: OrderMail, url: string, unit: Unit, origin: string, joins: readonly OnlineJoin[] = []) {
  const ko = locale === "ko";
  const index = ko ? 0 : 1;
  const meetup = order.items.some((item) => item.sku?.startsWith("MEETUP-"));
  const meetupOnly = meetup && order.items.every((item) => item.sku?.startsWith("MEETUP-"));
  const text = meetupOnly ? {
    "order.created": { subject: ["예약이 접수되었습니다", "Your reservation was received"], lead: ["결제를 마치면 자리가 확정됩니다.", "The seat is confirmed once payment arrives."], action: ["예약 확인", "View your reservation"] },
    "order.paid": { subject: ["예약 결제가 확인되었습니다", "Your reservation payment is confirmed"], lead: paidLead.MEETUP, action: ["예약 확인 열기", "Open confirmation"] },
    "order.expired": { subject: ["예약 결제 기한이 지났습니다", "The reservation payment window has closed"], lead: ["기한 안에 결제가 확인되지 않아 예약이 만료되었습니다.", "The reservation expired because payment was not confirmed in time."], action: ["예약 상태 보기", "View reservation status"] },
    "order.cancelled": { subject: ["예약이 취소되었습니다", "Your reservation was cancelled"], lead: ["이 예약은 취소되었습니다. 이미 결제한 금액이 있다면 센터에 문의해 주세요.", "This reservation was cancelled. Contact the center if a payment was already sent."], action: ["예약 상태 보기", "View reservation status"] },
    "order.review": { subject: ["예약 결제를 확인 중입니다", "Your reservation payment is being checked"], lead: ["운영자가 예약과 결제를 확인하고 있습니다. 확인이 끝날 때까지 자리는 보류됩니다.", "Staff are checking the reservation and payment. The seat stays on hold until that check is finished."], action: ["예약 상태 보기", "View reservation status"] },
  }[kind] : copy[kind];
  const subject = text.subject[index];
  const lead = kind === "order.paid"
    ? meetupOnly ? paidLead[joins.length ? "ONLINE_MEETUP" : "MEETUP"][index]
      : [paidLead[order.fulfillment][index], ...(meetup ? [paidLead[joins.length ? "ONLINE_MEETUP" : "MEETUP"][index]] : [])].join(" ")
    : text.lead[index];
  const amount = formatAmount(unit, order.amountSats, order.amountKrw, locale);
  const place = meetupOnly ? (joins.length ? (ko ? "온라인 밋업" : "Online meetup") : (ko ? "밋업 참여" : "Meetup attendance")) : fulfillment[locale][order.fulfillment];
  const rows = order.items.map((item) => {
    const title = ko ? item.titleKo || item.titleEn : item.titleEn || item.titleKo;
    const quantity = ko ? `${item.quantity}${item.sku?.startsWith("MEETUP-") ? "명" : "개"}` : item.quantity === 1 ? "1" : String(item.quantity);
    return { title, quantity };
  });
  const contractCopy = kind === "order.created" ? acceptedContractCopy(order.contractAcceptance) : "";
  const plain = [
    ko ? "비트코인 센터 서울" : "Bitcoin Center Seoul",
    subject,
    lead,
    `${ko ? "금액" : "Amount"}: ${amount}`,
    `${meetupOnly ? (ko ? "참여" : "Attendance") : (ko ? "수령·배송" : "Fulfillment")}: ${place}`,
    ...rows.map((row) => `${row.title} · ${row.quantity}`),
    `${ko ? "주문 번호" : "Order"}: ${order.id}`,
    url,
    ...joins.flatMap((join) => [`${ko ? "온라인 참여" : "Join online"}: ${join.url}`, ko ? join.note : join.noteEn || join.note].filter(Boolean)),
    ...(contractCopy ? [contractCopy] : []),
  ].join("\n\n");
  const font = "'Pretendard Variable','Apple SD Gothic Neo','Malgun Gothic',sans-serif";
  const itemRows = rows.map((row) => `<tr><td style="padding:14px 0;border-top:1px solid #d8dcd3;font-size:16px;line-height:1.5;color:#20211f;">${escapeHtml(row.title)}</td><td style="padding:14px 0;border-top:1px solid #d8dcd3;font-size:16px;line-height:1.5;color:#62675f;text-align:right;white-space:nowrap;">${escapeHtml(row.quantity)}</td></tr>`).join("");
  const html = `<!DOCTYPE html><html lang="${locale}"><body style="margin:0;background:#fafaf8;color:#20211f;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf8;"><tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
<tr><td style="padding:0 0 28px;border-top:4px solid ${accent[kind]};font-family:${font};">
<img src="${escapeHtml(origin)}/brand/bcs-horizontal-color.png" width="168" height="48" alt="${ko ? "비트코인 센터 서울" : "Bitcoin Center Seoul"}" style="display:block;width:168px;height:auto;border:0;">
</td></tr>
<tr><td style="font-family:${font};">
<p style="margin:0;font-size:15px;line-height:1.5;color:#62675f;">${ko ? "결제 안내" : "Payment"}</p>
<h1 style="margin:8px 0 0;font-size:32px;line-height:1.25;font-weight:600;letter-spacing:-0.035em;">${escapeHtml(subject)}</h1>
<p style="margin:16px 0 0;max-width:38em;font-size:17px;line-height:1.75;color:#20211f;">${escapeHtml(lead)}</p>
</td></tr>
<tr><td style="padding:28px 0 0;font-family:${font};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f1ec;border-radius:12px;"><tr><td style="padding:22px 24px;">
<p style="margin:0;font-size:15px;line-height:1.5;color:#62675f;">${ko ? "결제 금액" : "Amount"}</p>
<p style="margin:4px 0 0;font-size:36px;line-height:1.15;font-weight:600;letter-spacing:-0.035em;">${escapeHtml(amount)}</p>
<p style="margin:10px 0 0;font-size:16px;line-height:1.5;color:#20211f;">${escapeHtml(place)}</p>
</td></tr></table>
</td></tr>
<tr><td style="padding:8px 0 0;font-family:${font};"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemRows}</table></td></tr>
<tr><td style="padding:28px 0 0;font-family:${font};">
<a href="${escapeHtml(url)}" style="display:inline-block;background:#e2e6dc;color:#20211f;text-decoration:none;border-radius:8px;padding:14px 22px;font-size:16px;line-height:1.5;font-weight:500;">${escapeHtml(text.action[index])}</a>
${joins.map((join) => `<p style="margin:16px 0 0;"><a href="${escapeHtml(join.url)}" style="display:inline-block;background:#20211f;color:#fafaf8;text-decoration:none;border-radius:8px;padding:14px 22px;font-size:16px;line-height:1.5;font-weight:500;">${ko ? "온라인 참여" : "Join online"}</a></p>${(ko ? join.note : join.noteEn || join.note) ? `<p style="margin:8px 0 0;font-size:15px;line-height:1.6;color:#62675f;">${escapeHtml(ko ? join.note : join.noteEn || join.note)}</p>` : ""}`).join("")}
</td></tr>
<tr><td style="padding:28px 0 0;border-top:1px solid #d8dcd3;font-family:${font};">
<p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#62675f;">${ko ? "주문 번호" : "Order"} ${escapeHtml(order.id)}<br><a href="${escapeHtml(url)}" style="color:#32699f;text-decoration:underline;">${escapeHtml(url)}</a></p>
<p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#62675f;">${ko ? "비트코인 센터 서울 · 서울 마포구" : "Bitcoin Center Seoul · Mapo, Seoul"}</p>
</td></tr>
${contractCopy ? `<tr><td style="padding:24px 0;font-family:${font};"><pre style="margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font-family:inherit;font-size:14px;line-height:1.7;color:#20211f;">${escapeHtml(contractCopy)}</pre></td></tr>` : ""}
</table></td></tr></table></body></html>`;
  return { subject, text: plain, html };
}

type OperatorKind = "operator.created" | "operator.paid";
type OperatorContact = { readonly name: string; readonly email: string; readonly phone: string; readonly address: string };

const operatorCopy = {
  "operator.created": {
    subject: "새 주문이 들어왔습니다",
    lead: "결제가 끝나기 전입니다. 고객이 결제를 마치면 한 통 더 갑니다.",
    action: "주문 관리 열기",
  },
  "operator.paid": {
    subject: "주문 결제가 확인되었습니다",
    lead: "입금이 확인되었습니다. 수령이나 배송을 진행하면 됩니다.",
    action: "주문 관리 열기",
  },
} as const;

export function buildOperatorLetter(order: OrderMail, contact: OperatorContact, url: string, unit: Unit, origin: string, kind: OperatorKind) {
  const meetup = order.items.some((item) => item.sku?.startsWith("MEETUP-"));
  const base = operatorCopy[kind];
  const text = meetup && kind === "operator.created"
    ? { ...base, subject: "새 밋업 예약이 들어왔습니다" }
    : meetup && kind === "operator.paid"
      ? { ...base, subject: "밋업 예약 결제가 확인되었습니다", lead: "입금이 확인되었습니다. 참석 인원을 확인하면 됩니다." }
      : base;
  const amount = formatAmount(unit, order.amountSats, order.amountKrw, "ko");
  const place = fulfillment.ko[order.fulfillment as keyof typeof fulfillment.ko] ?? order.fulfillment;
  const rows = order.items.map((item) => ({ title: item.titleKo || item.titleEn, quantity: `${item.quantity}${meetup ? "명" : "개"}` }));
  const contacts = [
    ["이름", contact.name],
    ["이메일", contact.email],
    ["전화", contact.phone],
    ...(contact.address ? [["주소", contact.address] as const] : []),
  ];
  const plain = [
    "비트코인 센터 서울",
    text.subject,
    text.lead,
    `금액: ${amount}`,
    `수령: ${place}`,
    ...contacts.map(([label, value]) => `${label}: ${value}`),
    ...rows.map((row) => `${row.title} · ${row.quantity}`),
    `주문 번호: ${order.id}`,
    url,
  ].join("\n\n");
  const font = "'Pretendard Variable','Apple SD Gothic Neo','Malgun Gothic',sans-serif";
  const contactRows = contacts.map(([label, value]) => `<tr><td style="padding:6px 0;font-size:15px;line-height:1.5;color:#62675f;width:72px;">${escapeHtml(label)}</td><td style="padding:6px 0;font-size:15px;line-height:1.5;color:#20211f;">${escapeHtml(value)}</td></tr>`).join("");
  const itemRows = rows.map((row) => `<tr><td style="padding:14px 0;border-top:1px solid #d8dcd3;font-size:16px;line-height:1.5;color:#20211f;">${escapeHtml(row.title)}</td><td style="padding:14px 0;border-top:1px solid #d8dcd3;font-size:16px;line-height:1.5;color:#62675f;text-align:right;white-space:nowrap;">${escapeHtml(row.quantity)}</td></tr>`).join("");
  const html = `<!DOCTYPE html><html lang="ko"><body style="margin:0;background:#fafaf8;color:#20211f;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf8;"><tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
<tr><td style="padding:0 0 28px;border-top:4px solid ${kind === "operator.paid" ? "#ff7609" : "#32699f"};font-family:${font};">
<img src="${escapeHtml(origin)}/brand/bcs-horizontal-color.png" width="168" height="48" alt="비트코인 센터 서울" style="display:block;width:168px;height:auto;border:0;">
</td></tr>
<tr><td style="font-family:${font};">
<p style="margin:0;font-size:15px;line-height:1.5;color:#62675f;">관리자 알림</p>
<h1 style="margin:8px 0 0;font-size:32px;line-height:1.25;font-weight:600;letter-spacing:-0.035em;">${escapeHtml(text.subject)}</h1>
<p style="margin:16px 0 0;max-width:38em;font-size:17px;line-height:1.75;">${escapeHtml(text.lead)}</p>
</td></tr>
<tr><td style="padding:28px 0 0;font-family:${font};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f1ec;border-radius:12px;"><tr><td style="padding:22px 24px;">
<p style="margin:0;font-size:15px;line-height:1.5;color:#62675f;">결제 금액</p>
<p style="margin:4px 0 0;font-size:36px;line-height:1.15;font-weight:600;letter-spacing:-0.035em;">${escapeHtml(amount)}</p>
<p style="margin:10px 0 0;font-size:16px;line-height:1.5;">${escapeHtml(place)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">${contactRows}</table>
</td></tr></table>
</td></tr>
<tr><td style="padding:8px 0 0;font-family:${font};"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemRows}</table></td></tr>
<tr><td style="padding:28px 0 0;font-family:${font};">
<a href="${escapeHtml(url)}" style="display:inline-block;background:#e2e6dc;color:#20211f;text-decoration:none;border-radius:8px;padding:14px 22px;font-size:16px;line-height:1.5;font-weight:500;">${escapeHtml(text.action)}</a>
</td></tr>
<tr><td style="padding:28px 0 0;border-top:1px solid #d8dcd3;font-family:${font};">
<p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#62675f;">주문 번호 ${escapeHtml(order.id)}<br><a href="${escapeHtml(url)}" style="color:#32699f;text-decoration:underline;">${escapeHtml(url)}</a></p>
<p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#62675f;">비트코인 센터 서울 · 관리자 알림</p>
</td></tr>
</table></td></tr></table></body></html>`;
  return { subject: text.subject, text: plain, html };
}

export async function enqueueOperatorLetter(tx: Tx, input: { readonly eventKey: string; readonly kind: OperatorKind; readonly order: OrderMail; readonly contact: OperatorContact }): Promise<void> {
  const settings = await getCommerceSettings(tx);
  const to = settings.notificationEmail.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return;
  const origin = getServerConfig().appOrigin;
  const url = `${origin}/ko/admin/orders`;
  const rendered = buildOperatorLetter(input.order, input.contact, url, settings.productDisplayUnit, origin, input.kind);
  await enqueue(tx, input.eventKey, to, "ko", input.kind, {
    id: input.order.id,
    status: input.order.status,
    url,
    amount: formatAmount(settings.productDisplayUnit, input.order.amountSats, input.order.amountKrw, "ko"),
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  });
}

export async function enqueuePaymentLetter(tx: Tx, input: { readonly eventKey: string; readonly to: string; readonly locale: string; readonly kind: Kind; readonly order: OrderMail; readonly url: string }): Promise<void> {
  const locale: Locale = input.locale === "en" ? "en" : "ko";
  const settings = await getCommerceSettings(tx);
  const origin = getServerConfig().appOrigin;
  const url = input.url.startsWith(`${origin}/`) ? input.url : `${origin}/${locale}/orders/confirm/${input.order.confirmationCode ?? ""}`;
  const joins = input.kind === "order.paid" ? await paidOnlineSessions(input.order.items.flatMap((item) => item.sku ? [item.sku] : [])) : [];
  const rendered = buildPaymentLetter(locale, input.kind, input.order, url, settings.productDisplayUnit, origin, joins);
  await enqueue(tx, input.eventKey, input.to, locale, input.kind, {
    id: input.order.id,
    status: input.order.status,
    url,
    amount: formatAmount(settings.productDisplayUnit, input.order.amountSats, input.order.amountKrw, locale),
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  });
}
