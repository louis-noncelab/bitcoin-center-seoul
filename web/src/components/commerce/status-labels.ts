import type { Locale } from "@/i18n/routing";
import type { Order, Payment } from "./contracts";

type Status = Order["status"] | Payment["status"] | Order["fulfillmentStatus"];
export const statusLabels: Record<Locale, Record<Status, string>> = {
  ko: { NEW: "결제 준비", CREATING: "결제 요청 생성 중", PENDING: "결제 대기", PROCESSING: "전송 감지·확인 중", PAID: "결제 완료", EXPIRED: "기한 만료", FAILED: "결제 요청 실패", REVIEW: "운영자 확인 중", PENDING_PAYMENT: "결제 대기", CANCELLED: "취소됨", UNFULFILLED: "준비 중", READY: "수령 가능", SHIPPED: "발송됨", DELIVERED: "배송 완료", COLLECTED: "수령 완료" },
  en: { NEW: "Ready to create payment", CREATING: "Creating payment request", PENDING: "Awaiting payment", PROCESSING: "Payment detected · confirming", PAID: "Payment received", EXPIRED: "Expired", FAILED: "Payment request failed", REVIEW: "Under review", PENDING_PAYMENT: "Awaiting payment", CANCELLED: "Cancelled", UNFULFILLED: "Preparing", READY: "Ready for pickup", SHIPPED: "Shipped", DELIVERED: "Delivered", COLLECTED: "Collected" },
};
