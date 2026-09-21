"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { Link } from "@/i18n/navigation";
import { ActionLink, Button } from "@/components/ui/primitives";
import { FormNotice } from "@/components/ui/form-field";
import { apiRequest } from "@/lib/api-client";
import type { Locale } from "@/i18n/routing";
import { applyCartCatalog, resolveCartLines } from "./cart";
import { CartItemRows } from "./cart-items";
import { clearCart, getCartItems, removeCartItem, updateCartQuantity, useCartHydrated, useCartItems } from "./cart-store";
import { productSchema, type Product } from "./contracts";
import { quantityLabel } from "./format";
import { RequestError } from "./request-error";

export function CartPageClient({ locale }: { readonly locale: Locale }) {
  const ko = locale === "ko";
  const hydrated = useCartHydrated();
  const items = useCartItems();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [revision, setRevision] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const [syncNotice, setSyncNotice] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    apiRequest("/api/products", z.array(productSchema), { signal: controller.signal })
      .then((value) => {
        if (controller.signal.aborted) return;
        const resolved = applyCartCatalog(getCartItems(), value, { remove: removeCartItem, update: updateCartQuantity });
        if (resolved.missing.length || resolved.clamped.length) setSyncNotice(true);
        setProducts(value);
      })
      .catch((failure: unknown) => { if (!controller.signal.aborted) setError(failure); });
    return () => controller.abort();
  }, [revision]);
  if (!hydrated) return <div className="commerce-loading" role="status">{ko ? "장바구니를 불러오는 중…" : "Loading your cart…"}</div>;
  if (error) return <div className="form-stack"><RequestError error={error} locale={locale} returnTo={`/${locale}/cart`} /><Button onClick={() => { setError(null); setRevision((value) => value + 1); }}>{ko ? "다시 불러오기" : "Try again"}</Button></div>;
  if (!items.length) return <div className="form-stack"><FormNotice kind="info">{ko ? "담긴 상품이 없습니다. 굿즈 목록에서 옵션을 담아 주세요." : "Your cart is empty. Add an option from the goods pages."}</FormNotice><ActionLink href={`/${locale}/goods`}>{ko ? "상품 보기" : "Browse goods"}</ActionLink></div>;
  if (!products) return <div className="commerce-loading" role="status">{ko ? "상품 정보를 확인하는 중…" : "Checking item details…"}</div>;
  const resolved = resolveCartLines(items, products);
  const ready = resolved.lines.filter((line) => line.available);
  const blocked = resolved.lines.some((line) => !line.available) || ready.length === 0;
  return <div className="commerce-checkout">
    <div className="form-stack">
      {syncNotice && <FormNotice kind="info">{ko ? "판매가 끝난 옵션을 빼거나 수량을 재고에 맞게 조정했습니다. 결제 금액은 주문 화면의 견적을 따릅니다." : "Unavailable options were removed or quantities were limited to stock. Checkout will confirm the Bitcoin total."}</FormNotice>}
      <CartItemRows locale={locale} lines={resolved.lines} />
      {confirmClear
        ? <p className="commerce-cart-clear">{ko ? "장바구니를 비울까요?" : "Empty the cart?"} <Button variant="quiet" onClick={() => { clearCart(); setConfirmClear(false); }}>{ko ? "비우기" : "Empty"}</Button> <Button variant="quiet" onClick={() => setConfirmClear(false)}>{ko ? "취소" : "Cancel"}</Button></p>
        : <Button variant="quiet" onClick={() => setConfirmClear(true)}>{ko ? "장바구니 비우기" : "Empty cart"}</Button>}
    </div>
    <aside className="commerce-panel commerce-summary" aria-labelledby="cart-summary-title">
      <h2 id="cart-summary-title">{ko ? "주문 미리보기" : "Cart summary"}</h2>
      <p>{ko ? `상품 ${resolved.lines.length}종 · ${quantityLabel(ready.reduce((sum, line) => sum + line.quantity, 0), locale)}` : `${resolved.lines.length} options · ${quantityLabel(ready.reduce((sum, line) => sum + line.quantity, 0), locale)}`}</p>
      <p className="caption muted">{ko ? "표시 가격은 참고용입니다. 배송비와 비트코인 결제 총액은 주문 화면에서 서버 견적으로 확정합니다." : "Catalog prices are a preview. Shipping and the Bitcoin total are confirmed by the server quote at checkout."}</p>
      {blocked && <FormNotice>{ko ? "품절된 옵션을 삭제해야 주문할 수 있습니다." : "Remove sold-out options before checkout."}</FormNotice>}
      <div className="form-actions">
        {blocked || !ready.length
          ? <Button disabled>{ko ? "주문하기" : "Checkout"}</Button>
          : <Link href="/checkout" locale={locale} className="button" data-variant="primary">{ko ? "주문하기" : "Checkout"}</Link>}
        <ActionLink href={`/${locale}/goods`} variant="secondary">{ko ? "계속 둘러보기" : "Continue browsing"}</ActionLink>
      </div>
    </aside>
  </div>;
}
