import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { z } from "zod";
import type { Tx } from "@/server/db";
import { getServerConfig } from "@/server/config";
import { HttpError } from "@/server/http";

const payloadSchema = z.record(z.string(), z.string());
export type EmailPayload = z.infer<typeof payloadSchema>;

export function encryptPayload(payload: EmailPayload): string {
  const key = Buffer.from(getServerConfig().tokenEncryptionKey, "base64");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payloadSchema.parse(payload)), "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptPayload(encoded: string | null): EmailPayload {
  const parts = encoded?.split(".");
  if (!parts || parts.length !== 4 || parts[0] !== "v1" || !parts[1] || !parts[2] || !parts[3]) {
    throw new HttpError(503, "EMAIL_PAYLOAD_UNAVAILABLE", "이메일 내용을 확인할 수 없습니다.");
  }
  const decipher = createDecipheriv("aes-256-gcm", Buffer.from(getServerConfig().tokenEncryptionKey, "base64"), Buffer.from(parts[1], "base64url"));
  decipher.setAuthTag(Buffer.from(parts[2], "base64url"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(parts[3], "base64url")), decipher.final()]).toString("utf8");
  return payloadSchema.parse(JSON.parse(plaintext));
}

export async function enqueue(
  tx: Tx, eventKey: string, to: string, locale: "ko" | "en", kind: string, payload: EmailPayload,
): Promise<number> {
  const config = getServerConfig();
  const status = config.emailMode === "capture" ? "CAPTURED" : "PENDING";
  const created = await tx.emailOutbox.createMany({
    data: [{ eventKey, to: encryptPayload({ v: to }), locale, kind, payload: {}, encryptedPayload: encryptPayload(payload), status }],
    skipDuplicates: true,
  });
  return created.count;
}

export function renderEmail(kind: string, locale: string, payload: EmailPayload) {
  const ko = locale === "ko";
  const labels: Readonly<Record<string, readonly [string, string]>> = {
    VERIFY_EMAIL: ["이메일을 확인해 주세요", "Verify your email"],
    INVITE: ["비트코인센터 서울 관리자 초대", "Bitcoin Center Seoul admin invitation"],
    RESET_PASSWORD: ["비밀번호 재설정", "Reset your password"],
    BOOKING_CONFIRMED: ["신청이 확인되었습니다", "Your booking is confirmed"],
    BOOKING_REQUESTED: ["신청이 접수되었습니다", "Your booking request was received"],
    PAYMENT_PAID: ["비트코인 결제가 확인되었습니다", "Your Bitcoin payment is confirmed"],
    "order.created": ["주문이 접수되었습니다", "Your order was received"],
    "order.paid": ["주문 결제가 확인되었습니다", "Your order payment is confirmed"],
    "order.expired": ["주문 결제 기한이 지났습니다", "Your order payment has expired"],
    "order.cancelled": ["주문이 취소되었습니다", "Your order was cancelled"],
    "order.review": ["주문과 결제 내역을 확인 중입니다", "Your order and payment are under review"],
    "order.fulfillment": ["주문 수령·배송 상태가 변경되었습니다", "Your order fulfillment status changed"],
    "booking.created": ["신청이 접수되었습니다", "Your booking was received"],
    "booking.confirmed": ["신청이 확정되었습니다", "Your booking is confirmed"],
    "booking.approve": ["신청이 승인되었습니다", "Your booking was approved"],
    "booking.reject": ["신청 결과 안내", "Your booking request was declined"],
    "booking.expired": ["신청 결제 기한이 지났습니다", "Your booking payment has expired"],
    "booking.cancelled": ["신청이 취소되었습니다", "Your booking was cancelled"],
    "event.sold_out": ["행사 정원이 마감되었습니다", "An event has sold out"],
    "booking.review": ["신청 내역을 확인 중입니다", "Your booking needs review"],
    "change.requested": ["변경 요청이 접수되었습니다", "Your change request was received"],
    "change.reviewed": ["요청 검토 결과 안내", "Your request review result"],
    INQUIRY: ["센터 문의가 도착했습니다", "A center inquiry was received"],
    "product.restock": ["상품이 다시 입고되었습니다", "A product is back in stock"],
    "product.question": ["문의에 답변이 등록되었습니다", "Your product question was answered"],
  };
  const fields: Readonly<Record<string, readonly [string, string]>> = {
    id: ["신청·주문 번호", "Booking / order reference"], status: ["상태", "Status"],
    decision: ["처리 결과", "Decision"], changeId: ["요청 번호", "Request reference"],
    kind: ["요청 유형", "Request type"], expiresAt: ["유효 기한", "Valid until"],
    resolution: ["운영자 안내", "Staff response"],
    name: ["이름", "Name"], email: ["이메일", "Email"], company: ["소속·단체", "Organization"],
    type: ["문의 유형", "Inquiry type"], phone: ["전화", "Phone"], website: ["웹사이트", "Website"],
    timeline: ["희망 일정", "Timeline"],
    capacity: ["정원", "Capacity"], occupied: ["점유 인원", "Occupied places"], remaining: ["잔여", "Remaining"],
    titleEn: ["영문 제목", "English title"],
    product: ["상품", "Product"], option: ["옵션", "Option"],
    question: ["문의", "Question"], answer: ["답변", "Answer"],
    cancelUrl: ["알림 취소", "Cancel alert"],
  };
  const states: Readonly<Record<string, readonly [string, string]>> = {
    REQUESTED: ["승인 대기", "Awaiting approval"], PENDING_PAYMENT: ["결제 대기", "Awaiting payment"],
    CONFIRMED: ["신청 확정", "Confirmed"], PAID: ["결제 확인", "Payment confirmed"],
    EXPIRED: ["기한 만료", "Expired"], REVIEW: ["운영자 확인 중", "Under review"],
    CANCELLED: ["취소", "Cancelled"], REJECTED: ["승인되지 않음", "Declined"],
    ACCEPTED: ["승인 후 처리 대기", "Accepted, awaiting follow-up"], RESOLVED: ["검토 종료", "Review closed"],
    READY: ["수령·배송 준비", "Ready for fulfillment"], SHIPPED: ["발송 완료", "Shipped"],
    DELIVERED: ["배송 완료", "Delivered"], COLLECTED: ["현장 수령 완료", "Collected"],
    approve: ["승인", "Approved"], reject: ["승인되지 않음", "Declined"],
    event: ["행사·밋업", "Event or meetup"], education: ["교육", "Education"], venue: ["대관", "Venue hire"],
    content: ["콘텐츠", "Content"], community: ["커뮤니티·협업", "Community"], other: ["기타", "Other"],
  };
  const reviewMessages: Readonly<Record<string, readonly [string, string]>> = {
    ACCEPTED: ["요청이 승인되어 후속 처리를 기다리고 있습니다. 아래 운영자 안내를 확인해 주세요.", "Your request was accepted and is awaiting follow-up. Read the staff response below."],
    REJECTED: ["요청이 승인되지 않았습니다. 사유와 다음 단계는 아래 운영자 안내를 확인해 주세요.", "Your request was declined. Read the staff response below for the reason and next steps."],
    RESOLVED: ["운영자가 요청 검토를 마쳤습니다. 실제 처리 내용은 아래 운영자 안내를 확인해 주세요.", "Staff have closed the review of your request. Read the response below for the actions taken."],
  };
  const introduction = kind === "order.review"
    ? (ko ? "운영자가 주문과 결제 상태를 확인하고 있습니다. 확인이 끝날 때까지 주문 처리와 상품 수령·배송은 보류됩니다. 문의할 때 아래 주문 번호를 알려 주세요." : "Staff are checking your order and payment. Order fulfillment, pickup and shipping are on hold while the review is open. Include the order reference below when contacting the center.")
    : kind === "change.reviewed" ? reviewMessages[payload.status ?? ""]?.[ko ? 0 : 1] : undefined;
  if (payload.subject && payload.text && payload.html) return { subject: payload.subject, text: payload.text, html: payload.html };
  const subject = payload.title ?? labels[kind]?.[ko ? 0 : 1] ?? (ko ? "비트코인센터 서울 알림" : "Bitcoin Center Seoul notification");
  const details = Object.entries(payload).filter(([key]) => !["title", "subject", "text", "html"].includes(key))
    .map(([key, value]) => ["message", "url"].includes(key) ? value : `${fields[key]?.[ko ? 0 : 1] ?? key}: ${["status", "decision", "type"].includes(key) ? states[value]?.[ko ? 0 : 1] ?? value : value}`).join("\n\n");
  const text = [introduction, details].filter(Boolean).join("\n\n");
  return { subject, text, html: "" };
}
