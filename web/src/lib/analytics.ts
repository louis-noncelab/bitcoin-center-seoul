export type GaEventName =
  | "view_item"
  | "begin_checkout"
  | "purchase"
  | "collab_submit"
  | "outbound_click"
  | "outbound_legacy_meetup";

export type GaEventParams = Record<string, string | number | boolean>;

// GTM reads these pushes from window.dataLayer and forwards them to GA4. Without
// NEXT_PUBLIC_GTM_ID no container loads, so the queued objects stay inert in the page.
export function trackEvent(name: GaEventName, params?: GaEventParams): void {
  if (typeof window === "undefined") return;
  const target = window as unknown as { dataLayer?: unknown[] };
  target.dataLayer = target.dataLayer ?? [];
  target.dataLayer.push({ event: name, ...params });
}

// Meetup tickets use MEETUP-<id> SKUs (the admin order list relies on the same prefix).
export function orderKind(skus: readonly (string | undefined)[]): "meetup" | "goods" {
  return skus.some((sku) => sku?.startsWith("MEETUP-")) ? "meetup" : "goods";
}

// Orders store the KRW total converted at quote time; free registrations are 0 KRW.
export function orderValueKrw(amountKrw: string | null | undefined, amountSats: string): number | undefined {
  if (amountKrw && /^\d+$/.test(amountKrw)) return Number(amountKrw);
  return amountSats === "0" ? 0 : undefined;
}

export type PurchaseDetails = {
  readonly orderId: string;
  readonly locale: string;
  readonly kind?: "meetup" | "goods" | undefined;
  readonly value?: number | undefined;
  readonly itemName?: string | undefined;
};

const purchaseKey = (orderId: string) => `ga_purchase_${orderId}`;

export function purchaseTracked(orderId: string): boolean {
  try {
    return window.sessionStorage.getItem(purchaseKey(orderId)) !== null;
  } catch {
    return false;
  }
}

// Called only inside the checkout/payment flow at the moment an order becomes paid, never from
// pages that can be reopened later (order page, emailed confirmation link, QR or staff check-in).
export function trackPurchaseOnce({ orderId, locale, kind, value, itemName }: PurchaseDetails): void {
  if (typeof window === "undefined" || purchaseTracked(orderId)) return;
  try {
    window.sessionStorage.setItem(purchaseKey(orderId), "1");
  } catch {
    // Storage can be unavailable (private mode, blocked site data); still record the purchase.
  }
  const params: GaEventParams = { order_id: orderId, transaction_id: orderId, locale };
  if (kind) params.kind = kind;
  if (itemName) params.item_name = itemName;
  if (value !== undefined) {
    params.value = value;
    params.currency = "KRW";
  }
  trackEvent("purchase", params);
}
