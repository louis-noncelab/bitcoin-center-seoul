import type { Locale } from "@/i18n/routing";
import type { Fulfillment } from "./contracts";

export type DisplayUnit = "KRW" | "SATS" | "BTC";

const ratePattern = /^[1-9]\d{0,19}(\.\d{1,10})?$/;

function krwToSatsDisplay(amount: bigint, rate: string): bigint | null {
  if (!ratePattern.test(rate)) return null;
  const fraction = rate.split(".")[1] ?? "";
  const denominator = BigInt(rate.replace(".", ""));
  const numerator = amount * 100_000_000n * 10n ** BigInt(fraction.length);
  return (numerator + denominator - 1n) / denominator;
}

function satsToKrwDisplay(amount: bigint, rate: string): bigint | null {
  if (!ratePattern.test(rate)) return null;
  const fraction = rate.split(".")[1] ?? "";
  const scaled = BigInt(rate.replace(".", ""));
  return (amount * scaled) / (100_000_000n * 10n ** BigInt(fraction.length));
}

export function sats(amount: string, locale: Locale): string {
  return `${new Intl.NumberFormat(locale).format(BigInt(amount))} sats`;
}
export function bitcoin(amountSats: string, locale: Locale, unit: DisplayUnit = "SATS", rate: string | null = null): string {
  if (unit === "KRW") {
    const won = rate ? satsToKrwDisplay(BigInt(amountSats), rate) : null;
    return won === null ? sats(amountSats, locale) : krw(won.toString(), locale);
  }
  if (unit !== "BTC") return sats(amountSats, locale);
  const value = BigInt(amountSats);
  const whole = value / 100_000_000n;
  const fraction = (value % 100_000_000n).toString().padStart(8, "0").replace(/0+$/, "");
  return `${fraction ? `${whole.toString()}.${fraction}` : whole.toString()} BTC`;
}
export function krw(amount: string, locale: Locale): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(BigInt(amount));
}
export function catalogUnitSats(value: { readonly priceKind: "FREE" | "KRW_FIXED" | "BTC_FIXED"; readonly priceAmount: string }, rate: string | null): bigint | null {
  if (value.priceKind === "FREE") return 0n;
  if (value.priceKind === "BTC_FIXED") return BigInt(value.priceAmount);
  if (!rate) return null;
  return krwToSatsDisplay(BigInt(value.priceAmount), rate);
}

export function price(value: { readonly priceKind: "FREE" | "KRW_FIXED" | "BTC_FIXED"; readonly priceAmount: string }, locale: Locale, unit: DisplayUnit = "SATS", rate: string | null = null) {
  if (value.priceKind === "FREE") return locale === "ko" ? "무료" : "Free";
  if (value.priceKind === "BTC_FIXED") return bitcoin(value.priceAmount, locale, unit, rate);
  if (unit === "KRW" || !rate) return krw(value.priceAmount, locale);
  const satsAmount = krwToSatsDisplay(BigInt(value.priceAmount), rate);
  return satsAmount === null ? krw(value.priceAmount, locale) : bitcoin(satsAmount.toString(), locale, unit, rate);
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
