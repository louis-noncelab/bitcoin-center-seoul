import { z } from "zod";

export const paymentStatusLabels = {
  NEW: "결제 시작 전", CREATING: "결제 생성 중", PENDING: "결제 대기", PROCESSING: "입금 확인 중",
  PAID: "결제 완료", EXPIRED: "기한 만료", FAILED: "미결제 종료", REVIEW: "운영자 확인 필요",
} as const;
export const refundMethodLabels = { LIGHTNING: "라이트닝", ONCHAIN: "온체인", BANK: "계좌 이체", OTHER: "기타" } as const;
export const paymentActionLabels: Readonly<Record<string, string>> = {
  "order.payment.manual": "결제 수동 처리", "order.paid.cancelled": "결제 후 주문 취소",
  "order.refund.recorded": "외부 환불 완료 기록", "order.cancelled": "미결제 주문 취소",
  "order.fulfillment": "수령·배송 처리", "order.tracking": "송장 수정",
};
export const orderPaymentHistory = z.array(z.object({
  id: z.string(), action: z.string(), actorId: z.string().nullable(), createdAt: z.string(),
  summary: z.object({
    reason: z.string().optional(), decision: z.string().optional(),
    fromOrderStatus: z.string().optional(), toOrderStatus: z.enum(["PENDING_PAYMENT", "PAID", "EXPIRED", "CANCELLED", "REVIEW"]).optional(),
    method: z.enum(["LIGHTNING", "ONCHAIN", "BANK", "OTHER"]).optional(),
    proof: z.string().optional(), restock: z.boolean().optional(), inventoryConsumed: z.boolean().optional(),
  }),
}));

export const paymentOperationErrors: Readonly<Record<string, string>> = {
  PAYMENT_STALE: "결제 상태가 변경되었습니다. 최신 주문을 불러온 뒤 다시 확인해 주세요.",
  PAYMENT_IN_FLIGHT: "결제 생성 결과를 확인 중입니다. 제공자에서 상태를 확인한 뒤 결제 상태 다시 확인을 눌러 주세요.",
  PAYMENT_RECEIVED: "입금되었거나 입금 확인 중입니다. 미입금 취소 대신 결제 후 취소를 이용해 주세요.",
  FULFILLMENT_STARTED: "수령·배송 처리가 시작되었습니다. 최신 주문 상태를 확인해 주세요.",
  INVENTORY_CONFLICT: "예약 재고가 주문과 맞지 않습니다. 상품 재고를 확인해 주세요.",
  OUT_OF_STOCK: "다른 주문에 예약된 수량을 제외한 재고가 부족합니다. 재고를 확인해 주세요.",
  COUPON_CAPACITY: "쿠폰 한도가 다른 주문에 배정되었습니다. 쿠폰 한도를 확인해 주세요.",
  PAYMENT_CONFLICT: "결제 내역이 현재 주문 상태와 맞지 않습니다. 최신 주문을 확인해 주세요.",
  REFUND_REQUIRED: "결제된 주문은 먼저 환불 대기로 취소해 주세요.",
  REFUND_NOT_PENDING: "환불 대기 중인 주문만 환불 완료를 기록할 수 있습니다.",
  RESTOCK_NOT_ALLOWED: "판매 재고가 차감되지 않은 주문이므로 재고를 복구할 수 없습니다.",
  RESTOCK_NOT_APPLICABLE: "판매 재고가 차감되지 않은 주문이므로 재고를 복구할 수 없습니다.",
  PAYMENT_UNCONFIRMED: "입금 확인이 끝나지 않았습니다. 결제 상태를 먼저 확인해 주세요.",
  CANCELLATION_AUDIT_MISSING: "취소 당시 재고 기록을 찾을 수 없습니다. 환불 완료를 저장하지 않았습니다.",
  REFUND_IN_PROGRESS: "이미 취소 후 환불 처리 중인 주문입니다. 결제 완료로 되돌릴 수 없습니다.",
  INVALID_STATE: "현재 주문 상태에서는 이 작업을 처리할 수 없습니다. 최신 주문을 불러와 주세요.",
};
