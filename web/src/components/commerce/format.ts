import type { Locale } from "@/i18n/routing";
import type { Fulfillment } from "./contracts";

export type DisplayUnit = "SATS" | "BTC";

export function sats(amount: string, locale: Locale): string {
  return `${new Intl.NumberFormat(locale).format(BigInt(amount))} sats`;
}
export function bitcoin(amountSats: string, locale: Locale, unit: DisplayUnit = "SATS"): string {
  if (unit !== "BTC") return sats(amountSats, locale);
  const value = BigInt(amountSats);
  const whole = value / 100_000_000n;
  const fraction = (value % 100_000_000n).toString().padStart(8, "0").replace(/0+$/, "");
  return `${fraction ? `${whole.toString()}.${fraction}` : whole.toString()} BTC`;
}
export function krw(amount: string, locale: Locale): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(BigInt(amount));
}
export function price(value: { readonly priceKind: "FREE" | "KRW_FIXED" | "BTC_FIXED"; readonly priceAmount: string }, locale: Locale, unit: DisplayUnit = "SATS") {
  if (value.priceKind === "FREE") return locale === "ko" ? "무료" : "Free";
  if (value.priceKind === "BTC_FIXED") return bitcoin(value.priceAmount, locale, unit);
  return krw(value.priceAmount, locale);
}
export function dateTime(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(value));
}
export const fulfillmentLabels: Record<Locale, Record<Fulfillment, string>> = {
  ko: { PICKUP: "현장 수령", DOMESTIC: "국내 택배", INTERNATIONAL: "해외 배송" },
  en: { PICKUP: "Center pickup", DOMESTIC: "Korea delivery", INTERNATIONAL: "International shipping" },
};
export function quantityLabel(quantity: number, locale: Locale) {
  return locale === "ko" ? `${quantity}개` : quantity === 1 ? "1 item" : `${quantity} items`;
}

export function submissionHeaders() {
  const secret = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  return { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID(), "x-request-secret": secret };
}
