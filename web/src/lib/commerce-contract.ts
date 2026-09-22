import { z } from "zod";

const amount = z.string().regex(/^\d+$/);

export const commerceSettingsRecord = z.object({
  paymentProvider: z.enum(["LNURL", "ZAPRITE"]),
  btcPriceSource: z.enum(["UPBIT", "BITHUMB", "FIXED"]),
  fixedKrwPerBtc: z.string(),
  productDisplayUnit: z.enum(["KRW", "SATS", "BTC"]),
  guestPurchaseAllowed: z.boolean(),
  maintenanceMode: z.boolean(),
  lightningAddressId: z.string().nullable(),
  lightningAddresses: z.array(z.object({
    id: z.string(), label: z.string(), address: z.string(), allowedOrigins: z.string(),
  })),
  notificationChannel: z.enum(["DISCORD", "MATTERMOST", "GENERIC"]),
  notificationWebhookRegistered: z.boolean(),
  notificationEmail: z.string().email(),
  configured: z.record(z.string(), z.boolean()),
});
export type CommerceSettingsRecord = z.infer<typeof commerceSettingsRecord>;

export const adminVariantRecord = z.object({
  id: z.string(), sku: z.string(),
  optionLabelKo: z.string(), optionLabelEn: z.string(),
  stockOnHand: z.number().int(), reservedStock: z.number().int(),
  billableWeightG: z.number().int(), active: z.boolean(),
});
export type AdminVariantRecord = z.infer<typeof adminVariantRecord>;

export const adminProductRecord = z.object({
  id: z.string(), slug: z.string(), titleKo: z.string(), titleEn: z.string(),
  descriptionKo: z.string(), descriptionEn: z.string(), imageUrl: z.string(),
  images: z.array(z.string()).default([]),
  published: z.boolean(), memberOnly: z.boolean(),
  priceKind: z.enum(["KRW_FIXED", "BTC_FIXED"]), priceAmount: amount, listPriceAmount: z.string(),
  allowedFulfillments: z.array(z.enum(["PICKUP", "DOMESTIC", "INTERNATIONAL"])),
  categoryId: z.string().nullable(), categoryNameKo: z.string().nullable(),
  updatedAt: z.string(),
  variants: z.array(adminVariantRecord),
});
export type AdminProductRecord = z.infer<typeof adminProductRecord>;

export const adminCategoryRecord = z.object({
  id: z.string(), slug: z.string(), nameKo: z.string(), nameEn: z.string(),
  sortOrder: z.number().int(), active: z.boolean(), productCount: z.number().int(),
});
export type AdminCategoryRecord = z.infer<typeof adminCategoryRecord>;

export const adminOrderRecord = z.object({
  id: z.string(),
  refundStatus: z.enum(["NONE", "PENDING", "COMPLETED"]).default("NONE"),
  refundedAt: z.string().nullable().optional(),
  status: z.enum(["PENDING_PAYMENT", "PAID", "EXPIRED", "CANCELLED", "REVIEW"]),
  customerName: z.string(), customerEmail: z.string(), customerPhone: z.string(),
  customerNotes: z.string().optional(), locale: z.string(),
  amountSats: amount, amountKrw: amount.nullable().optional(),
  fulfillment: z.enum(["PICKUP", "DOMESTIC", "INTERNATIONAL"]),
  fulfillmentStatus: z.enum(["UNFULFILLED", "READY", "SHIPPED", "DELIVERED", "COLLECTED"]),
  address: z.object({
    countryCode: z.string(), postalCode: z.string(), region: z.string(),
    city: z.string(), line1: z.string(), line2: z.string(),
  }).nullable(),
  shippingAmountSats: amount,
  carrier: z.string().nullable(), trackingNumber: z.string().nullable(),
  fulfilledAt: z.string().nullable(), holdExpiresAt: z.string().nullable(), createdAt: z.string(),
  confirmationCode: z.string().nullable().optional(), checkedInAt: z.string().nullable().optional(),
  items: z.array(z.object({
    id: z.string(), sku: z.string(), quantity: z.number().int(),
    titleKo: z.string(), titleEn: z.string(),
    optionLabelKo: z.string(), optionLabelEn: z.string(), amountSats: amount,
  })),
  payments: z.array(z.object({
    id: z.string(),
    status: z.enum(["NEW", "CREATING", "PENDING", "PROCESSING", "PAID", "EXPIRED", "FAILED", "REVIEW"]),
    mode: z.enum(["REVIEW", "SANDBOX", "LIVE"]),
    expiresAt: z.string(),
    updatedAt: z.string(), paidAt: z.string().nullable(), creationUnknown: z.boolean(),
  })),
});
export type AdminOrderRecord = z.infer<typeof adminOrderRecord>;

export const adminOrderPage = z.object({
  items: z.array(adminOrderRecord),
  page: z.number().int(), pageSize: z.number().int(), total: z.number().int(),
});

export const adminZoneRecord = z.object({
  id: z.string(), nameKo: z.string(), nameEn: z.string(), active: z.boolean(),
  countries: z.array(z.object({ code: z.string(), zoneId: z.string(), requiresPostalCode: z.boolean() })),
  rates: z.array(z.object({ id: z.string(), zoneId: z.string(), maxWeightG: z.number().int(), amountKrw: amount })),
});
export type AdminZoneRecord = z.infer<typeof adminZoneRecord>;

export const orderStatusLabels = {
  PENDING_PAYMENT: "결제 대기", PAID: "결제 완료", EXPIRED: "기한 만료",
  CANCELLED: "취소됨", REVIEW: "운영자 확인 중",
} as const;
export const fulfillmentLabels = {
  PICKUP: "현장 수령", DOMESTIC: "국내 택배", INTERNATIONAL: "해외 배송",
} as const;
export const fulfillmentStatusLabels = {
  UNFULFILLED: "준비 중", READY: "수령 가능", SHIPPED: "발송됨",
  DELIVERED: "배송 완료", COLLECTED: "수령 완료",
} as const;

/** The next fulfillment step the server will accept, or null when nothing is pending. */
export function nextFulfillment(order: AdminOrderRecord): "READY" | "COLLECTED" | "SHIPPED" | "DELIVERED" | null {
  if (order.status !== "PAID") return null;
  if (order.fulfillment === "PICKUP") {
    if (order.fulfillmentStatus === "UNFULFILLED") return "READY";
    if (order.fulfillmentStatus === "READY") return "COLLECTED";
    return null;
  }
  if (order.fulfillmentStatus === "UNFULFILLED") return "SHIPPED";
  if (order.fulfillmentStatus === "SHIPPED") return "DELIVERED";
  return null;
}

export const reviewPaymentRecord = z.object({
  id: z.string(),
  provider: z.enum(["LNURL", "ZAPRITE"]),
  mode: z.enum(["REVIEW", "SANDBOX", "LIVE"]),
  status: z.enum(["NEW", "CREATING", "PENDING", "PROCESSING", "PAID", "EXPIRED", "FAILED", "REVIEW"]),
  amountSats: z.string(),
  expiresAt: z.string(),
  orderId: z.string().nullable(),
  bookingId: z.string().nullable(),
  creationUnknown: z.boolean(),
  reviewReason: z.string().nullable(),
});
export const reviewPaymentsPayload = z.object({
  enabled: z.boolean(),
  payments: z.array(reviewPaymentRecord),
});
export type ReviewPaymentRecord = z.infer<typeof reviewPaymentRecord>;

/** Provider outcomes the REVIEW fixtures can produce, in the order an operator would try them. */
export const reviewScenarioLabels = {
  pending: "결제 대기",
  processing: "입금 감지 (미확정)",
  paid: "결제 완료",
  late: "기한 뒤 늦은 입금",
  expired: "기한 만료",
  mismatch: "금액 불일치",
  timeout: "제공자 응답 지연",
  outage: "제공자 장애",
  bad_preimage: "잘못된 preimage",
  wrong_pr: "다른 인보이스 응답",
} as const;

export const adminCouponRecord = z.object({
  id: z.string(), code: z.string(), nameKo: z.string(), nameEn: z.string(),
  discountKind: z.enum(["PERCENT", "KRW", "SATS"]),
  discountValue: z.string(), minPurchaseAmount: z.string(),
  maxDiscountAmount: z.string().nullable(),
  usageLimit: z.number().int().nullable(), perUserLimit: z.number().int(),
  validFrom: z.string(), validUntil: z.string(),
  active: z.boolean(), usageCount: z.number().int(),
});
export type AdminCouponRecord = z.infer<typeof adminCouponRecord>;

export const couponKindLabels = {
  PERCENT: "퍼센트 할인", KRW: "원 할인", SATS: "사토시 할인",
} as const;
