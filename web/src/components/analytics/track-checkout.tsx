"use client";

import { useEffect, useRef } from "react";
import type { Locale } from "@/i18n/routing";
import { trackEvent, type GaEventParams } from "@/lib/analytics";

export function TrackBeginCheckout({ kind, itemId, quantity, locale }: {
  readonly kind: "meetup" | "goods";
  readonly itemId?: string | undefined;
  readonly quantity?: number | undefined;
  readonly locale: Locale;
}) {
  const sent = useRef("");
  useEffect(() => {
    const key = `${kind}:${itemId ?? "cart"}:${quantity ?? ""}:${locale}`;
    if (sent.current === key) return;
    sent.current = key;
    const params: GaEventParams = { kind, locale };
    if (itemId) params.item_id = itemId;
    if (quantity !== undefined) params.quantity = quantity;
    trackEvent("begin_checkout", params);
  }, [kind, itemId, quantity, locale]);
  return null;
}
