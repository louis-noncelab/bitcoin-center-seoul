"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { Button, ActionLink } from "@/components/ui/primitives";
import { FormNotice } from "@/components/ui/form-field";
import { apiRequest } from "@/lib/api-client";
import type { Locale } from "@/i18n/routing";
import { countriesSchema, productSchema, type Countries, type Product } from "./contracts";
import { resolveCartLines } from "./cart";
import { CheckoutForm } from "./checkout-form";
import { RequestError } from "./request-error";
import { useCartHydrated, useCartItems } from "./cart-store";

export function Checkout({ locale, selection }: {
  readonly locale: Locale;
  readonly selection: { readonly variantId: string; readonly quantity: number } | null;
}) {
  const hydrated = useCartHydrated();
  const cartItems = useCartItems();
  const source = selection ? [selection] : cartItems;
  const [data, setData] = useState<{ readonly products: Product[]; readonly countries: Countries } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [revision, setRevision] = useState(0);
  const ko = locale === "ko";
  const variantId = selection?.variantId ?? "";
  useEffect(() => {
    const controller = new AbortController();
    const productsPath = variantId ? `/api/products?variant=${encodeURIComponent(variantId)}` : "/api/products";
    Promise.all([apiRequest(productsPath, z.array(productSchema), { signal: controller.signal }), apiRequest("/api/shipping/countries", countriesSchema, { signal: controller.signal })])
      .then(([products, countries]) => { if (!controller.signal.aborted) setData({ products, countries }); })
      .catch((failure: unknown) => { if (!controller.signal.aborted) setError(failure); });
    return () => controller.abort();
  }, [revision, variantId]);
  if (!selection && !hydrated) return <div className="commerce-loading" role="status">{ko ? "장바구니를 불러오는 중…" : "Loading your cart…"}</div>;
  if (!source.length) return <div className="form-stack"><FormNotice kind="info">{ko ? "상품의 옵션과 수량을 먼저 선택해 주세요." : "Choose an item, option and quantity first."}</FormNotice><ActionLink href={`/${locale}/shop`}>{ko ? "상품 보기" : "Browse goods"}</ActionLink><ActionLink href={`/${locale}/cart`} variant="secondary">{ko ? "장바구니" : "Cart"}</ActionLink></div>;
  if (error) return <div className="form-stack"><RequestError error={error} locale={locale} returnTo={`/${locale}/checkout`} /><Button onClick={() => { setError(null); setRevision((value) => value + 1); }}>{ko ? "다시 불러오기" : "Try again"}</Button></div>;
  if (!data) return <div className="commerce-loading" role="status">{ko ? "상품과 배송 정보를 불러오는 중…" : "Loading item and shipping details…"}</div>;
  const resolved = resolveCartLines(source, data.products);
  if (resolved.missing.length || resolved.lines.some((line) => !line.available)) return <div className="form-stack"><FormNotice>{ko ? "선택한 상품 중 주문할 수 없거나 재고보다 수량이 많은 옵션이 있습니다. 장바구니에서 확인해 주세요." : "Some selected items are unavailable or exceed stock. Review your cart before checkout."}</FormNotice><ActionLink href={`/${locale}/${selection ? "shop" : "cart"}`}>{ko ? "선택 다시 확인" : "Review selection"}</ActionLink></div>;
  const items = resolved.lines;
  return <CheckoutForm locale={locale} items={items} countries={data.countries} fromCart={!selection} />;
}
