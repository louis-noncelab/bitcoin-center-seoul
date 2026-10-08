import { paymentActionLabels } from "@/lib/order-payment-contract";

const actions: Readonly<Record<string, string>> = {
  ...paymentActionLabels,
  "settings.updated": "결제와 운영 설정 변경",
  "lightning-address.created": "라이트닝 주소 등록",
  "lightning-address.deleted": "라이트닝 주소 삭제",
  "product.archived": "상품 비공개",
  "category.deactivated": "상품 분류 중지",
  "coupon.deactivated": "쿠폰 중지",
  "zone.create": "배송 지역 등록",
  "zone.update": "배송 지역 수정",
  "zone.delete": "배송 지역 삭제",
  "country.create": "배송 국가 등록",
  "country.update": "배송 국가 수정",
  "country.delete": "배송 국가 삭제",
  "rate.create": "배송비 등록",
  "rate.update": "배송비 수정",
  "rate.delete": "배송비 삭제",
  "email.release": "기록된 메일 발송",
  "email.retry": "메일 다시 보내기",
  "meetup.broadcast": "밋업 안내 발송",
  "privacy.order.redacted": "주문 개인정보 파기",
  "payment.review.scenario": "검토 결제 상태 변경",
};

const targets: Readonly<Record<string, string>> = {
  SiteSetting: "운영 설정", LightningAddress: "라이트닝 주소",
  Product: "상품", Category: "상품 분류", Coupon: "쿠폰",
  ShippingZone: "배송 지역", ShippingCountry: "배송 국가", ShippingRate: "배송비",
  Order: "주문", Payment: "결제", EmailOutbox: "메일",
};

export const auditActionLabel = (action: string) => actions[action] ?? action;
export const auditTargetLabel = (target: string) => targets[target] ?? target;
