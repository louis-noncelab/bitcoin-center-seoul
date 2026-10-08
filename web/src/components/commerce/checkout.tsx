"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Button, ActionLink } from "@/components/ui/primitives";
import { FormNotice } from "@/components/ui/form-field";
import { apiRequest } from "@/lib/api-client";
import { purchaseKind } from "@/lib/commerce-kind";
import type { Locale } from "@/i18n/routing";
import { countriesSchema, productSchema, type Countries, type Product } from "./contracts";
import { resolveCartLines } from "./cart";
import { CheckoutForm } from "./checkout-form";
import { RequestError } from "./request-error";
import { useCartHydrated, useCartItems } from "./cart-store";

export function Checkout({ locale, policyVersions, selection, meetupHint = false }: {
  readonly locale: Locale;
  readonly policyVersions: Readonly<Record<"goods" | "meetup" | "free_meetup", string>>;
  readonly meetupHint?: boolean;
  readonly selection: { readonly variantId: string; readonly quantity: number } | null;
}) {
  const hydrated = useCartHydrated();
  const cartItems = useCartItems();
  const source = useMemo(() => selection ? [selection] : cartItems, [selection, cartItems]);
  const [data, setData] = useState<{ readonly products: Product[]; readonly countries: Countries } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [revision, setRevision] = useState(0);
  const ko = locale === "ko";
  const variantId = selection?.variantId ?? "";
  useEffect(() => {
    const controller = new AbortController();
    const productsPath = variantId ? `/api/products?variant=${encodeURIComponent(variantId)}` : "/api/products";
    apiRequest(productsPath, z.array(productSchema), { signal: controller.signal })
      .then(async (products) => {
        const selected = resolveCartLines(source, products).lines.map((line) => line.product.variants.find((variant) => variant.id === line.variantId) ?? {});
        const countries = purchaseKind(selected) === "meetup" || (meetupHint && variantId && !products.length) ? [] : await apiRequest("/api/shipping/countries", countriesSchema, { signal: controller.signal });
        if (!controller.signal.aborted) setData({ products, countries });
      })
      .catch((failure: unknown) => { if (!controller.signal.aborted) setError(failure); });
    return () => controller.abort();
  }, [revision, variantId, source, meetupHint]);
  if (!selection && !hydrated) return <div className="commerce-loading" role="status">{ko ? "장바구니를 불러오는 중…" : "Loading your cart…"}</div>;
  if (!source.length) return <div className="form-stack"><FormNotice kind="info">{meetupHint ? (ko ? "행사와 신청 인원을 먼저 선택해 주세요." : "Choose an event and the number of attendees first.") : (ko ? "상품의 옵션과 수량을 먼저 선택해 주세요." : "Choose an item, option and quantity first.")}</FormNotice><ActionLink href={`/${locale}/${meetupHint ? "programs" : "shop"}`}>{meetupHint ? (ko ? "행사 보기" : "Browse events") : (ko ? "상품 보기" : "Browse goods")}</ActionLink></div>;
  if (error) return <div className="form-stack"><RequestError error={error} locale={locale} meetup={meetupHint} returnTo={`/${locale}/checkout`} /><Button onClick={() => { setError(null); setRevision((value) => value + 1); }}>{ko ? "다시 불러오기" : "Try again"}</Button></div>;
  if (!data) return <div className="commerce-loading" role="status">{meetupHint ? (ko ? "행사 신청 정보를 불러오는 중…" : "Loading event registration…") : (ko ? "주문 정보를 불러오는 중…" : "Loading checkout details…")}</div>;
  const resolved = resolveCartLines(source, data.products);
  const kind = purchaseKind(resolved.lines.map((line) => line.product.variants.find((variant) => variant.id === line.variantId) ?? {}));
  const meetup = kind === "meetup" || (resolved.missing.length > 0 && meetupHint);
  if (kind === "mixed") return <div className="form-stack"><FormNotice>{ko ? "밋업 신청과 상품 주문은 각각 진행해 주세요." : "Register for events and order goods separately."}</FormNotice><ActionLink href={`/${locale}/programs`}>{ko ? "행사 보기" : "Browse events"}</ActionLink><ActionLink href={`/${locale}/cart`}>{ko ? "장바구니 확인" : "Review cart"}</ActionLink></div>;
  if (resolved.missing.length || resolved.lines.some((line) => !line.available)) return <div className="form-stack"><FormNotice>{meetup ? (ko ? "지금 신청할 수 없거나 선택한 인원만큼 자리가 남아 있지 않습니다. 행사 일정과 인원을 다시 확인해 주세요." : "Registration is unavailable or there are not enough seats. Check the event schedule and attendee count.") : (ko ? "선택한 상품 중 주문할 수 없거나 재고보다 수량이 많은 옵션이 있습니다. 장바구니에서 확인해 주세요." : "Some selected items are unavailable or exceed stock. Review your cart before checkout.")}</FormNotice><ActionLink href={`/${locale}/${meetup ? "programs" : selection ? "shop" : "cart"}`}>{ko ? "선택 다시 확인" : "Review selection"}</ActionLink></div>;
  const items = resolved.lines;
  return <CheckoutForm locale={locale} policyVersions={policyVersions} items={items} countries={data.countries} fromCart={!selection} />;
}
