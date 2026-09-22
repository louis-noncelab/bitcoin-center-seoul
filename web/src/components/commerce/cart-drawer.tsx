"use client";

import { useEffect, useId, useRef, useState } from "react";
import { z } from "zod";
import { Link } from "@/i18n/navigation";
import { Button, ActionLink } from "@/components/ui/primitives";
import { FormNotice } from "@/components/ui/form-field";
import { ApiError, apiErrorMessage, apiRequest } from "@/lib/api-client";
import type { Locale } from "@/i18n/routing";
import { resolveCartLines } from "./cart";
import { CartItemRows } from "./cart-items";
import { closeCartDrawer, useCartDrawerOpen, useCartItems } from "./cart-store";
import { productSchema, type Product } from "./contracts";
import { quantityLabel } from "./format";

export function CartDrawer({ locale }: { readonly locale: Locale }) {
  const open = useCartDrawerOpen();
  const ko = locale === "ko";
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const items = useCartItems();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [previousOpen, setPreviousOpen] = useState(open);
  if (previousOpen !== open) {
    setPreviousOpen(open);
    if (open) {
      setProducts(null);
      setError(null);
    }
  }
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);
  useEffect(() => () => closeCartDrawer(), []);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    apiRequest("/api/products", z.array(productSchema), { signal: controller.signal })
      .then((value) => {
        if (controller.signal.aborted) return;
        setProducts(value);
      })
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return;
        setError(failure instanceof ApiError ? apiErrorMessage(failure, locale) : (ko ? "상품 정보를 불러오지 못했습니다. 다시 시도해 주세요." : "Item details could not be loaded. Please try again."));
      });
    return () => controller.abort();
  }, [open, revision, locale, ko]);
  const resolved = products ? resolveCartLines(items, products) : null;
  const ready = resolved?.lines.filter((line) => line.available) ?? [];
  const blocked = Boolean(resolved && (resolved.missing.length > 0 || resolved.lines.some((line) => !line.available) || ready.length === 0));
  return <dialog ref={dialog} className="commerce-cart-drawer" aria-labelledby={titleId} aria-modal="true" onCancel={closeCartDrawer} onClose={(event) => { if (!event.currentTarget.open) closeCartDrawer(); }} onClick={(event) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeCartDrawer();
  }}>
    <div className="commerce-cart-drawer-header">
      <h2 id={titleId}>{ko ? "장바구니" : "Cart"}</h2>
      <Button variant="quiet" onClick={closeCartDrawer}>{ko ? "닫기" : "Close"}</Button>
    </div>
    {!items.length ? <div className="commerce-cart-empty">
      <p className="muted">{ko ? "담긴 상품이 없습니다." : "Your cart is empty."}</p>
      <Button variant="secondary" onClick={closeCartDrawer}>{ko ? "계속 둘러보기" : "Continue browsing"}</Button>
    </div> : <>
      <div className="commerce-cart-drawer-body">
        {error ? <div className="form-stack"><FormNotice>{error}</FormNotice><Button variant="secondary" onClick={() => { setError(null); setRevision((value) => value + 1); }}>{ko ? "다시 불러오기" : "Try again"}</Button></div> : resolved ? <CartItemRows locale={locale} lines={resolved.lines} missing={resolved.missing} compact /> : <p className="commerce-loading" role="status">{ko ? "상품 정보를 확인하는 중…" : "Checking item details…"}</p>}
      </div>
      <div className="commerce-cart-drawer-footer">
        <p className="caption muted">{ko ? `${quantityLabel(ready.reduce((sum, line) => sum + line.quantity, 0), locale)} · 결제 금액은 주문 시 견적으로 확정합니다.` : `${quantityLabel(ready.reduce((sum, line) => sum + line.quantity, 0), locale)} · Bitcoin totals are confirmed in the checkout quote.`}</p>
        {blocked && <p className="commerce-cart-unavailable">{ko ? "주문할 수 없는 상품을 삭제하거나 수량을 조정해 주세요." : "Remove unavailable items or adjust their quantities before checkout."}</p>}
        <Link href="/checkout" locale={locale} className="button" data-variant="primary" aria-disabled={blocked || !ready.length || undefined} onClick={(event) => { if (blocked || !ready.length) event.preventDefault(); else closeCartDrawer(); }}>{ko ? "주문하기" : "Checkout"}</Link>
        <ActionLink href={`/${locale}/cart`} variant="secondary" onClick={closeCartDrawer}>{ko ? "장바구니 보기" : "View cart"}</ActionLink>
      </div>
    </>}
  </dialog>;
}
