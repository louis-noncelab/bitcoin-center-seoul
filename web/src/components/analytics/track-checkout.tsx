"use client";

import { useEffect, useRef } from "react";
import type { Locale } from "@/i18n/routing";
import type { Product } from "@/components/commerce/contracts";
import { orderKind, trackEvent, type GaEventParams } from "@/lib/analytics";

export function TrackBeginCheckout({ items, locale }: {
  readonly items: readonly { readonly variantId: string; readonly quantity: number; readonly product: Product }[];
  readonly locale: Locale;
}) {
  const sent = useRef("");
  useEffect(() => {
    const key = `${items.map((item) => `${item.variantId}:${item.quantity}`).join(",")}:${locale}`;
    if (sent.current === key) return;
    sent.current = key;
    const params: GaEventParams = {
      kind: orderKind(items.map((item) => item.product.variants.find((variant) => variant.id === item.variantId)?.sku)),
      locale,
      quantity: items.reduce((sum, item) => sum + item.quantity, 0),
      items: items.map((item) => ({ item_id: item.variantId, item_name: item.product.titleKo, quantity: item.quantity })),
    };
    if (items.length === 1 && items[0]) params.item_id = items[0].variantId;
    trackEvent("begin_checkout", params);
  }, [items, locale]);
  return null;
}
