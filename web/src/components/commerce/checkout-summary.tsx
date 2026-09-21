"use client";

import type { Locale } from "@/i18n/routing";
import type { Product, Quote } from "./contracts";
import { useDisplayUnit } from "./display-unit";
import { bitcoin, dateTime, krw, price, quantityLabel } from "./format";

export function CheckoutSummary({ locale, items, quote }: {
  readonly locale: Locale;
  readonly items: readonly { readonly product: Product; readonly quantity: number; readonly option: string }[];
  readonly quote: Quote | null;
}) {
  const ko = locale === "ko";
  const unit = useDisplayUnit();
  return <aside className="commerce-panel commerce-summary" aria-labelledby="summary-title">
    <h2 id="summary-title">{ko ? "주문 내용" : "Order summary"}</h2>
    {items.map((item, index) => {
      const quoted = quote?.snapshot.items[index];
      return <div className="commerce-summary-item" key={`${item.option}-${index}`}><strong>{ko ? item.product.titleKo : item.product.titleEn}</strong><span className="muted">{item.option} · {quantityLabel(item.quantity, locale)}</span><span>{quoted ? bitcoin(quoted.amountSats, locale, unit) : `${price(item.product, locale, unit)} / ${ko ? "1개" : "item"}`}</span></div>;
    })}
    <dl className="commerce-facts">
      <div><dt>{ko ? "상품 금액" : "Items"}</dt><dd>{quote ? bitcoin((BigInt(quote.amountSats) - BigInt(quote.snapshot.shippingAmountSats)).toString(), locale, unit) : "—"}</dd></div>
      <div><dt>{ko ? "배송비" : "Shipping"}</dt><dd>{quote ? bitcoin(quote.snapshot.shippingAmountSats, locale, unit) : (ko ? "견적에서 확인" : "Calculated in quote")}</dd></div>
      {quote?.snapshot.coupon ? <div><dt>{ko ? `쿠폰 ${quote.snapshot.coupon.code}` : `Coupon ${quote.snapshot.coupon.code}`}</dt><dd>−{bitcoin(quote.snapshot.coupon.discountSats, locale, unit)}</dd></div> : null}
      <div className="commerce-total"><dt>{ko ? "결제 총액" : "Total"}</dt><dd>{quote ? bitcoin(quote.amountSats, locale, unit) : "—"}</dd></div>
      {quote?.amountKrw ? <div><dt>{ko ? "결제 시점 원화" : "KRW at quote"}</dt><dd>{krw(quote.amountKrw, locale)}</dd></div> : null}
    </dl>
    <p className="caption">{quote ? `${ko ? "견적 유효 기한" : "Quote valid until"}: ${dateTime(quote.expiresAt, locale)}` : (ko ? "수령 방법을 선택한 후 배송비·총액을 확인해 주세요." : "Choose a delivery method, then calculate your Bitcoin total.")}</p>
    <p className="caption">{ko ? "비트코인으로 결제합니다. 표시된 상품 가격은 참고용이며, 결제 총액은 서버 견적을 따릅니다." : "Payment is in Bitcoin. Catalog prices are a preview; the payable total comes from the server quote."}</p>
  </aside>;
}
