import type { Locale } from "@/i18n/routing";

export const checkoutDisclosure: Record<Locale, readonly string[]> = {
  ko: [
    "환불은 최초 결제한 사토시를 기준으로 비트코인으로 반환합니다. 원화 표시 상품도 환불일 환율로 다시 계산하지 않으며, 법정 소비자 권리는 유지됩니다.",
    "상품은 원칙적으로 계약 내용을 받은 날부터 7일 이내(상품을 나중에 받으면 상품 수령일부터) 청약철회할 수 있습니다. 하자·오배송·표시 내용과 다른 상품에 대한 법정 권리는 별도로 보장되며, 법정 철회 제한은 구매 전 고지된 경우에만 적용될 수 있습니다.",
    "유료 행사는 시작 7일 전까지 취소하면 전액 환불합니다. 이후에는 사전에 고지한 적법한 제한만 적용하며, 법정 청약철회 등 권리는 유지됩니다.",
    "미성년자가 법정대리인 동의가 필요한 계약을 체결하려면 그 동의를 받아야 합니다. 필요한 동의 없이 체결된 계약은 미성년자 또는 법정대리인이 법에 따라 취소할 수 있습니다.",
  ],
  en: [
    "Refunds return the original satoshi amount paid in Bitcoin. We do not recalculate KRW-priced orders at the refund-date rate; statutory consumer rights remain intact.",
    "For goods, you may generally withdraw within seven days of receiving the contract details (or the goods, if later). Statutory rights for defects, incorrect delivery, or goods differing from their description remain; statutory withdrawal restrictions require the applicable advance disclosure.",
    "Paid events cancelled at least seven days before they begin receive a full refund. Later restrictions apply only if lawful and disclosed before payment; statutory withdrawal and other rights remain.",
    "A minor must obtain a legal representative’s consent where the contract requires it. Without the required consent, the minor or representative may cancel the contract under applicable law.",
  ],
};
