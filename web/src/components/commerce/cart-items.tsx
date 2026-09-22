"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/primitives";
import type { Locale } from "@/i18n/routing";
import { CART_MAX_QUANTITY, removeCartItem, updateCartQuantity } from "./cart-store";
import type { ResolvedCartLine } from "./cart";
import { useDisplayRate, useDisplayUnit } from "./display-unit";
import { price, quantityLabel } from "./format";

export function CartItemRows({ locale, lines, missing = [], compact = false }: {
  readonly locale: Locale;
  readonly lines: readonly ResolvedCartLine[];
  readonly missing?: readonly string[];
  readonly compact?: boolean;
}) {
  const ko = locale === "ko";
  const unit = useDisplayUnit();
  const rate = useDisplayRate();
  return <ul className={compact ? "commerce-cart-lines commerce-cart-lines--compact" : "commerce-cart-lines"}>
    {missing.map((variantId) => <li key={variantId} className="commerce-cart-line">
      <div className="commerce-cart-line-copy"><strong>{ko ? "판매하지 않는 옵션" : "Unavailable option"}</strong><p className="commerce-cart-unavailable">{ko ? "이 옵션은 더 이상 주문할 수 없습니다. 삭제한 뒤 주문해 주세요." : "This option is no longer available. Remove it before checkout."}</p></div>
      <Button variant="quiet" onClick={() => removeCartItem(variantId)}>{ko ? "삭제" : "Remove"}</Button>
    </li>)}
    {lines.map((line) => {
      const title = ko ? line.product.titleKo : line.product.titleEn;
      const option = ko ? line.variant.optionLabelKo : line.variant.optionLabelEn;
      const max = Math.min(CART_MAX_QUANTITY, Math.max(1, line.variant.availableStock));
      return <li key={line.variantId} className="commerce-cart-line">
        {line.product.imageUrl ? <Link href={`/shop/${line.product.slug}`} locale={locale} className="commerce-cart-thumb"><Image src={line.product.imageUrl} alt="" width={96} height={96} unoptimized /></Link> : null}
        <div className="commerce-cart-line-copy">
          <Link href={`/shop/${line.product.slug}`} locale={locale}><strong>{title}</strong></Link>
          <p className="muted caption">{option} · {quantityLabel(line.quantity, locale)}</p>
          <p className="caption">{price(line.product, locale, unit, rate)} / {ko ? "1개" : "item"}</p>
          {!line.available && <p className="commerce-cart-unavailable">{ko ? "주문할 수 없는 옵션이거나 재고보다 수량이 많습니다. 수량을 줄이거나 삭제해 주세요." : "This option is unavailable or exceeds stock. Reduce its quantity or remove it."}</p>}
          {line.available && line.quantity >= line.variant.availableStock && <p className="caption muted">{ko ? "주문 가능한 최대 수량입니다." : "Maximum available quantity."}</p>}
        </div>
        <div className="commerce-cart-line-actions">
          <div className="commerce-qty">
            <Button variant="quiet" aria-label={ko ? "수량 줄이기" : "Decrease quantity"} onClick={() => { if (line.quantity <= 1) removeCartItem(line.variantId); else updateCartQuantity(line.variantId, line.quantity - 1); }}>−</Button>
            <input aria-label={ko ? "수량" : "Quantity"} type="number" inputMode="numeric" min={1} max={max} step={1} value={line.quantity} disabled={line.variant.availableStock < 1 || line.product.memberOnly} onChange={(event) => {
              const next = Number(event.target.value);
              if (!Number.isInteger(next)) return;
              updateCartQuantity(line.variantId, Math.min(max, next));
            }} />
            <Button variant="quiet" aria-label={ko ? "수량 늘리기" : "Increase quantity"} disabled={!line.available || line.quantity >= max} onClick={() => updateCartQuantity(line.variantId, line.quantity + 1)}>+</Button>
          </div>
          <Button variant="quiet" onClick={() => removeCartItem(line.variantId)}>{ko ? "삭제" : "Remove"}</Button>
        </div>
      </li>;
    })}
  </ul>;
}
