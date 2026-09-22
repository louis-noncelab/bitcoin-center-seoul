"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "@/i18n/navigation";
import { FormField, FormNotice } from "@/components/ui/form-field";
import { MenuSelect } from "@/components/ui/menu-select";
import { Button } from "@/components/ui/primitives";
import type { Locale } from "@/i18n/routing";
import { addCartItem, openCartDrawer } from "./cart-store";
import type { Product } from "./contracts";
import { useDisplayRate, useDisplayUnit } from "./display-unit";
import { fulfillmentLabels, price } from "./format";

export function ProductPurchase({ product, locale, title, children }: {
  readonly product: Product;
  readonly locale: Locale;
  readonly title: string;
  readonly children?: ReactNode;
}) {
  const router = useRouter();
  const [variantId, setVariantId] = useState(product.variants.find((variant) => variant.availableStock > 0)?.id ?? product.variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [cartMessage, setCartMessage] = useState<"full" | "invalid" | "added" | null>(null);
  const variant = product.variants.find((item) => item.id === variantId);
  const ko = locale === "ko";
  const unit = useDisplayUnit();
  const rate = useDisplayRate();
  const maxQty = Math.min(100, variant?.availableStock ?? 1);
  const canBuy = Boolean(!product.memberOnly && variant && variant.availableStock > 0 && quantity > 0 && quantity <= maxQty);
  const listPriceAmount = product.listPriceAmount;
  const showCompare = typeof listPriceAmount === "string" && listPriceAmount.length > 0 && BigInt(listPriceAmount) > BigInt(product.priceAmount);
  const unitPrice = price(product, locale, unit, rate);
  function shiftQty(delta: number) {
    setQuantity((current) => Math.min(maxQty, Math.max(1, current + delta)));
    setCartMessage(null);
  }
  return <form className="commerce-product-buy" onSubmit={(event) => {
    event.preventDefault();
    if (canBuy && variant) router.push(`/checkout?variant=${encodeURIComponent(variant.id)}&quantity=${quantity}`);
  }}>
    {children}
    <div className="commerce-price">
      {showCompare && listPriceAmount ? <span className="commerce-price-was">{price({ priceKind: product.priceKind, priceAmount: listPriceAmount }, locale, unit, rate)}</span> : null}
      <strong>{unitPrice}</strong>
    </div>
    {product.priceKind === "KRW_FIXED" && <p className="muted">{ko ? "결제 금액은 이 가격으로 주문 화면에서 확정됩니다." : "Checkout charges this price."}</p>}
    {product.variants.length > 0 ? <FormField id="product-option" label={ko ? "옵션" : "Option"}>
      <MenuSelect id="product-option" value={variantId} required onChange={(event) => { setVariantId(event.target.value); setQuantity(1); setCartMessage(null); }}>
        {!variantId ? <option value="">{ko ? "선택 가능한 옵션이 없습니다" : "No options available"}</option> : null}
        {product.variants.map((item) => <option key={item.id} value={item.id} disabled={item.availableStock <= 0}>{(ko ? item.optionLabelKo : item.optionLabelEn) || item.sku}{item.availableStock <= 0 ? (ko ? " (품절)" : " (sold out)") : ""}</option>)}
      </MenuSelect>
    </FormField> : null}
    <div className="commerce-qty" role="group" aria-labelledby="product-quantity-label">
      <p id="product-quantity-label" className="caption">{ko ? "수량" : "Quantity"}</p>
      <div className="commerce-qty-controls">
        <Button type="button" variant="secondary" className="commerce-qty-btn" aria-label={ko ? "수량 줄이기" : "Decrease quantity"} disabled={quantity <= 1} onClick={() => shiftQty(-1)}>−</Button>
        <span className="commerce-qty-value">{quantity}</span>
        <Button type="button" variant="secondary" className="commerce-qty-btn" aria-label={ko ? "수량 늘리기" : "Increase quantity"} disabled={quantity >= maxQty} onClick={() => shiftQty(1)}>+</Button>
      </div>
    </div>
    <div className="commerce-product-summary">
      <p className="caption">{ko ? "주문 요약" : "Order summary"}</p>
      <p className="commerce-product-summary-row"><span>{title}</span><span>{unitPrice}</span></p>
      <p className="commerce-product-summary-row muted"><span>{ko ? "수량" : "Qty"}</span><span>{quantity}</span></p>
      <p className="commerce-product-summary-row muted"><span>{ko ? "수령" : "Fulfillment"}</span><span>{product.allowedFulfillments.map((value) => fulfillmentLabels[locale][value]).join(" · ")}</span></p>
    </div>
    {product.memberOnly && <FormNotice kind="info">{ko ? "회원 전용 상품이라 현재 주문할 수 없습니다." : "This item is members-only and cannot be ordered here."}</FormNotice>}
    {cartMessage === "added" && <FormNotice kind="success">{ko ? "장바구니에 담았습니다." : "Added to cart."}</FormNotice>}
    {cartMessage === "full" && <FormNotice>{ko ? "장바구니는 상품 옵션 30개까지 담을 수 있습니다." : "The cart can hold up to 30 product options."}</FormNotice>}
    {cartMessage === "invalid" && <FormNotice>{ko ? "옵션과 수량을 다시 선택해 주세요." : "Choose a valid option and quantity."}</FormNotice>}
    {variant && variant.availableStock > 0 ? <div className="commerce-product-actions">
      <Button type="button" variant="secondary" disabled={!canBuy} onClick={() => {
        if (!canBuy || !variant) { setCartMessage("invalid"); return; }
        const result = addCartItem(variant.id, quantity);
        if (result === "ok") { setCartMessage("added"); openCartDrawer(); }
        else setCartMessage(result);
      }}>{ko ? "장바구니에 담기" : "Add to cart"}</Button>
      <Button type="submit" disabled={!canBuy}>{ko ? "바로 구매" : "Buy now"}</Button>
    </div> : <FormNotice kind="info">{ko ? "현재 주문 가능한 재고가 없습니다." : "This item is currently out of stock."}</FormNotice>}
  </form>;
}
