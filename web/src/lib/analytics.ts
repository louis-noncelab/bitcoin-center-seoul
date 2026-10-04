export type GaEventName =
  | "view_item"
  | "begin_checkout"
  | "purchase"
  | "collab_submit"
  | "outbound_click"
  | "outbound_legacy_meetup";

export type AnalyticsItem = { readonly item_id: string; readonly item_name: string; readonly quantity: number };
export type GaEventParams = Record<string, string | number | boolean | readonly AnalyticsItem[]>;

export function trackEvent(name: GaEventName, params?: GaEventParams): boolean {
  if (typeof window === "undefined") return false;
  try {
    const target = window as unknown as { dataLayer?: unknown[] };
    target.dataLayer = target.dataLayer ?? [];
    target.dataLayer.push({ event: name, ...params });
    return true;
  } catch {
    return false;
  }
}

export function orderKind(skus: readonly (string | undefined)[]): "meetup" | "goods" {
  return skus.some((sku) => sku?.startsWith("MEETUP-")) ? "meetup" : "goods";
}

export function orderValueKrw(amountKrw: string | null | undefined, amountSats: string): number | undefined {
  if (amountKrw && /^\d+$/.test(amountKrw)) {
    const value = Number(amountKrw);
    if (Number.isSafeInteger(value)) return value;
  }
  return amountSats === "0" ? 0 : undefined;
}

export type PurchaseDetails = {
  readonly orderId: string;
  readonly locale: string;
  readonly kind?: "meetup" | "goods" | undefined;
  readonly value?: number | undefined;
  readonly amountSats?: string | undefined;
  readonly itemName?: string | undefined;
};

const completed = new WeakMap<Window, Set<string>>();
const flows = new WeakMap<Window, Set<string>>();
const purchaseKey = (orderId: string) => `ga_purchase_${orderId}`;
const flowKey = (orderId: string) => `ga_purchase_flow_${orderId}`;

function memory(store: WeakMap<Window, Set<string>>): Set<string> {
  let values = store.get(window);
  if (!values) { values = new Set(); store.set(window, values); }
  return values;
}

export function beginPurchaseFlow(orderId: string): void {
  if (typeof window === "undefined") return;
  memory(flows).add(orderId);
  try { window.sessionStorage.setItem(flowKey(orderId), "1"); } catch {}
}

export function purchaseFlowActive(orderId: string): boolean {
  if (typeof window === "undefined") return false;
  if (memory(flows).has(orderId)) return true;
  try { return window.sessionStorage.getItem(flowKey(orderId)) === "1"; } catch { return false; }
}

export function endPurchaseFlow(orderId: string): void {
  if (typeof window === "undefined") return;
  memory(flows).delete(orderId);
  try { window.sessionStorage.removeItem(flowKey(orderId)); } catch {}
}

export function purchaseTracked(orderId: string): boolean {
  if (typeof window === "undefined") return false;
  if (memory(completed).has(orderId)) return true;
  try { if (window.localStorage.getItem(purchaseKey(orderId)) !== null) return true; } catch {}
  try { return window.sessionStorage.getItem(purchaseKey(orderId)) !== null; } catch { return false; }
}

export async function trackPurchaseOnce({ orderId, locale, kind, value, amountSats, itemName }: PurchaseDetails): Promise<void> {
  if (typeof window === "undefined") return;
  const send = async () => {
    if (purchaseTracked(orderId)) return;
    const params: GaEventParams = { order_id: orderId, transaction_id: orderId, locale };
    if (kind) params.kind = kind;
    if (itemName) params.item_name = itemName;
    if (amountSats !== undefined) params.amount_sats = amountSats;
    if (value !== undefined) { params.value = value; params.currency = "KRW"; }
    let finish: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const delivered = process.env.NEXT_PUBLIC_ANALYTICS_APPROVED === "true" && process.env.NEXT_PUBLIC_GTM_ID ? new Promise<void>((resolve) => {
      finish = resolve;
      timer = setTimeout(resolve, 1000);
    }) : Promise.resolve();
    let queued = false;
    try {
      const target = window as unknown as { dataLayer?: unknown[] };
      target.dataLayer = target.dataLayer ?? [];
      target.dataLayer.push({ event: "purchase", ...params, ...(finish ? { eventCallback: finish, eventTimeout: 1000 } : {}) });
      queued = true;
    } catch {
      finish?.();
    }
    if (queued) {
      memory(completed).add(orderId);
      try { window.localStorage.setItem(purchaseKey(orderId), "1"); } catch {}
      try { window.sessionStorage.setItem(purchaseKey(orderId), "1"); } catch {}
      endPurchaseFlow(orderId);
    }
    await delivered;
    clearTimeout(timer);
  };
  try {
    if (window.navigator?.locks) await window.navigator.locks.request(purchaseKey(orderId), send);
    else await send();
  } catch {}
}
