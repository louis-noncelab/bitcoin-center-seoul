"use client";

import type { Locale } from "@/i18n/routing";
import type { Product, Quote } from "./contracts";
import { useDisplayRate, useDisplayUnit } from "./display-unit";
import { bitcoin, catalogUnitSats, dateTime, krw, price, quantityLabel, type DisplayUnit } from "./format";
import type { Fulfillment } from "./contracts";

function money(amount: bigint, locale: Locale, unit: DisplayUnit, rate: string | null) {
  return bitcoin(amount.toString(), locale, unit, rate);
}

export function CheckoutSummary({ locale, items, quote, quoting, reservation, fulfillment = "PICKUP" }: {
  readonly locale: Locale;
  readonly items: readonly { readonly product: Product; readonly quantity: number; readonly option: string }[];
  readonly quote: Quote | null;
  readonly quoting: boolean;
  readonly reservation: boolean;
  readonly fulfillment?: Fulfillment;
}) {
  const ko = locale === "ko";
  const unit = useDisplayUnit();
  const rate = useDisplayRate();
  const previewGoods = items.reduce<bigint | null>((sum, item) => {
    const unitSats = catalogUnitSats(item.product, rate);
    if (sum === null || unitSats === null) return null;
    return sum + unitSats * BigInt(item.quantity);
  }, 0n);
  const quotedGoods = quote ? quote.snapshot.items.reduce((sum, item) => sum + BigInt(item.amountSats), 0n) : null;
  const goods = quotedGoods !== null ? money(quotedGoods, locale, unit, rate) : previewGoods !== null ? money(previewGoods, locale, unit, rate) : (ko ? "금액 확인 중" : "Checking the amount");
  const shippingAmount = quote ? BigInt(quote.snapshot.shippingAmountSats) : fulfillment === "PICKUP" || reservation ? 0n : null;
  const shipping = shippingAmount === null ? (ko ? "배송비 확인 중" : "Checking shipping") : shippingAmount === 0n ? (ko ? "무료" : "Free") : money(shippingAmount, locale, unit, rate);
  const total = quote ? money(BigInt(quote.amountSats), locale, unit, rate) : previewGoods !== null && shippingAmount !== null ? money(previewGoods + shippingAmount, locale, unit, rate) : goods;
  return <aside className="commerce-panel commerce-summary" aria-labelledby="summary-title">
    <h2 id="summary-title">{reservation ? (ko ? "예약 내용" : "Reservation") : (ko ? "주문 내용" : "Order summary")}</h2>
    {items.map((item, index) => {
      const quoted = quote?.snapshot.items[index];
      return <div className="commerce-summary-item" key={`${item.option}-${index}`}><strong>{ko ? item.product.titleKo : item.product.titleEn}</strong><span className="muted">{reservation ? quantityLabel(item.quantity, locale) : `${item.option} · ${quantityLabel(item.quantity, locale)}`}</span><span>{quoted ? bitcoin(quoted.amountSats, locale, unit, rate) : `${price(item.product, locale, unit, rate)} / ${ko ? "1개" : "item"}`}</span></div>;
    })}
    <dl className="commerce-facts">
      <div><dt>{reservation ? (ko ? "참가비" : "Ticket") : (ko ? "상품 금액" : "Items")}</dt><dd>{goods}</dd></div>
      {reservation ? null : <div><dt>{ko ? "배송비" : "Shipping"}</dt><dd>{shipping}</dd></div>}
      {quote?.snapshot.coupon ? <div><dt>{ko ? `쿠폰 ${quote.snapshot.coupon.code}` : `Coupon ${quote.snapshot.coupon.code}`}</dt><dd>{ko ? `${bitcoin(quote.snapshot.coupon.discountSats, locale, unit, rate)} 할인` : `${bitcoin(quote.snapshot.coupon.discountSats, locale, unit, rate)} off`}</dd></div> : null}
      <div className="commerce-total"><dt>{ko ? "결제 금액" : "Total"}</dt><dd>{total}</dd></div>
      {quote?.amountKrw ? <div><dt>{ko ? "결제 시점 원화" : "KRW at quote"}</dt><dd>{krw(quote.amountKrw, locale)}</dd></div> : null}
    </dl>
    <p className="caption">{quote ? `${ko ? "이 금액은" : "This total is valid until"} ${dateTime(quote.expiresAt, locale)}${ko ? "까지 유효합니다." : "."}` : (quoting ? (ko ? "서버 견적을 맞추는 중입니다." : "Checking this total with the server.") : (ko ? "표시 금액으로 결제합니다." : "You pay the amount shown."))}</p>
    <p className="caption">{ko ? "비트코인으로 결제합니다." : "Payment is in Bitcoin."}</p>
    {quote?.snapshot.rate?.source.startsWith("cache:") ? <p className="caption">{ko ? "거래소에 연결하지 못해, 마지막으로 받은 시세로 계산했습니다." : "The exchanges were unreachable, so this quote uses the last rate we received."}</p> : null}
  </aside>;
}
