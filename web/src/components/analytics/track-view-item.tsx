"use client";

import { useEffect, useRef } from "react";
import type { Locale } from "@/i18n/routing";
import { trackEvent } from "@/lib/analytics";

export function TrackViewItem({ kind, itemId, itemName, locale }: {
  readonly kind: string;
  readonly itemId: string;
  readonly itemName: string;
  readonly locale: Locale;
}) {
  const sent = useRef("");
  useEffect(() => {
    const key = `${kind}:${itemId}:${locale}`;
    if (sent.current === key) return;
    sent.current = key;
    trackEvent("view_item", { kind, item_id: itemId, item_name: itemName, locale });
  }, [kind, itemId, itemName, locale]);
  return null;
}
