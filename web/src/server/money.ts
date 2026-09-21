import "server-only";
import { z } from "zod";
import type { PriceKind } from "@/generated/prisma/client";
import { getCommerceSettings } from "@/server/commerce/settings";
import { getServerConfig } from "@/server/config";
import { HttpError } from "@/server/http";

const maxInteger = 9_223_372_036_854_775_807n;
const maxSats = 2_100_000_000_000_000n;
const ratePattern = /^[1-9]\d{0,19}(\.\d{1,10})?$/;
const tickerSchema = z.array(z.object({
  market: z.literal("KRW-BTC"),
  trade_price: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  trade_timestamp: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  timestamp: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
})).length(1);
const bithumbSchema = z.object({
  status: z.literal("0000"),
  data: z.object({
    closing_price: z.string().regex(/^[1-9]\d{0,19}(\.\d{1,10})?$/),
    date: z.string().regex(/^\d{13}$/),
  }),
});

export type ExchangeRate = {
  readonly krwPerBtc: string;
  readonly source: string;
  readonly timestamp: Date;
};

export function krwToSats(krw: bigint, rate: string): bigint {
  if (krw < 0n || krw > maxInteger || !ratePattern.test(rate)) {
    throw new HttpError(422, "INVALID_MONEY", "금액 또는 환율이 올바르지 않습니다.");
  }
  const fraction = rate.split(".")[1] ?? "";
  const denominator = BigInt(rate.replace(".", ""));
  const numerator = krw * 100_000_000n * 10n ** BigInt(fraction.length);
  const sats = (numerator + denominator - 1n) / denominator;
  if (sats > maxSats) throw new HttpError(422, "AMOUNT_TOO_LARGE", "결제 금액이 허용 범위를 초과합니다.");
  return sats;
}

export function satsToKrw(sats: bigint, rate: string): bigint {
  if (sats < 0n || sats > maxSats || !ratePattern.test(rate)) {
    throw new HttpError(422, "INVALID_MONEY", "금액 또는 환율이 올바르지 않습니다.");
  }
  const fraction = rate.split(".")[1] ?? "";
  const scaled = BigInt(rate.replace(".", ""));
  const krw = (sats * scaled) / (100_000_000n * 10n ** BigInt(fraction.length));
  if (krw > maxInteger) throw new HttpError(422, "AMOUNT_TOO_LARGE", "결제 금액이 허용 범위를 초과합니다.");
  return krw;
}

export function priceToSats(kind: PriceKind, amount: bigint, rate: string | null): bigint {
  if (amount < 0n || amount > maxInteger) throw new HttpError(422, "INVALID_MONEY", "금액이 올바르지 않습니다.");
  switch (kind) {
    case "FREE":
      if (amount !== 0n) throw new HttpError(422, "INVALID_MONEY", "무료 가격은 0이어야 합니다.");
      return 0n;
    case "BTC_FIXED":
      if (amount > maxSats) throw new HttpError(422, "AMOUNT_TOO_LARGE", "결제 금액이 허용 범위를 초과합니다.");
      return amount;
    case "KRW_FIXED":
      if (rate === null) throw new HttpError(503, "RATE_UNAVAILABLE", "환율을 확인한 뒤 다시 시도해 주세요.");
      return krwToSats(amount, rate);
    default: {
      const exhaustive: never = kind;
      throw new HttpError(422, "INVALID_PRICE_KIND", `Invalid price kind: ${exhaustive}`);
    }
  }
}

function fresh(time: number, now: number) {
  return now - time <= 60_000 && time - now <= 5_000;
}

// Upbit contract: https://docs.upbit.com/kr/reference/list-tickers
export function parseUpbitRate(payload: unknown, now = Date.now()): ExchangeRate {
  const parsed = tickerSchema.safeParse(payload);
  const tick = parsed.success ? parsed.data[0] : undefined;
  if (!tick || !fresh(tick.trade_timestamp, now) || !fresh(tick.timestamp, now)) {
    throw new HttpError(503, "RATE_UNAVAILABLE", "최신 환율을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.");
  }
  return { krwPerBtc: String(tick.trade_price), source: "upbit:KRW-BTC", timestamp: new Date(tick.trade_timestamp) };
}

// Bithumb public ticker: https://api.bithumb.com/public/ticker/BTC_KRW
export function parseBithumbRate(payload: unknown, now = Date.now()): ExchangeRate {
  const parsed = bithumbSchema.safeParse(payload);
  if (!parsed.success) throw new HttpError(503, "RATE_UNAVAILABLE", "최신 환율을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.");
  const time = Number(parsed.data.data.date);
  if (!Number.isSafeInteger(time) || !fresh(time, now)) {
    throw new HttpError(503, "RATE_UNAVAILABLE", "최신 환율을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.");
  }
  const krwPerBtc = parsed.data.data.closing_price.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  if (!ratePattern.test(krwPerBtc)) throw new HttpError(503, "RATE_UNAVAILABLE", "최신 환율을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.");
  return { krwPerBtc, source: "bithumb:BTC_KRW", timestamp: new Date(time) };
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(5000), redirect: "error", cache: "no-store", headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new HttpError(503, "RATE_UNAVAILABLE", "환율 제공자에 연결할 수 없습니다.");
  return response.json();
}

async function fetchUpbitRate(): Promise<ExchangeRate> {
  return parseUpbitRate(await fetchJson("https://api.upbit.com/v1/ticker?markets=KRW-BTC"));
}

async function fetchBithumbRate(): Promise<ExchangeRate> {
  return parseBithumbRate(await fetchJson("https://api.bithumb.com/public/ticker/BTC_KRW"));
}

async function liveExchangeRate(): Promise<ExchangeRate> {
  const settings = await getCommerceSettings();
  if (settings.btcPriceSource === "FIXED") {
    if (!settings.fixedKrwPerBtc || !ratePattern.test(settings.fixedKrwPerBtc)) {
      throw new HttpError(503, "RATE_UNAVAILABLE", "고정 환율이 설정되어 있지 않습니다. / A fixed bitcoin rate is not configured.");
    }
    return { krwPerBtc: settings.fixedKrwPerBtc, source: "fixed", timestamp: new Date() };
  }
  const primary = settings.btcPriceSource === "BITHUMB" ? fetchBithumbRate : fetchUpbitRate;
  const secondary = settings.btcPriceSource === "BITHUMB" ? fetchUpbitRate : fetchBithumbRate;
  try {
    return await primary();
  } catch (error) {
    if (!(error instanceof HttpError || error instanceof TypeError || error instanceof SyntaxError || error instanceof DOMException)) throw error;
    try {
      return await secondary();
    } catch (fallback) {
      if (fallback instanceof HttpError) throw fallback;
      if (fallback instanceof TypeError || fallback instanceof SyntaxError || fallback instanceof DOMException) {
        throw new HttpError(503, "RATE_UNAVAILABLE", "환율 제공자에 연결할 수 없습니다.");
      }
      throw fallback;
    }
  }
}

export async function getExchangeRate(): Promise<ExchangeRate> {
  const config = getServerConfig();
  if (config.paymentMode === "review") {
    if (!config.reviewKrwPerBtc || !ratePattern.test(config.reviewKrwPerBtc)) {
      throw new HttpError(503, "REVIEW_RATE_REQUIRED", "검토용 환율이 설정되지 않았습니다.");
    }
    return { krwPerBtc: config.reviewKrwPerBtc, source: "review:fixture", timestamp: new Date() };
  }
  try {
    return await liveExchangeRate();
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (error instanceof TypeError || error instanceof SyntaxError || error instanceof DOMException) {
      throw new HttpError(503, "RATE_UNAVAILABLE", "환율 제공자에 연결할 수 없습니다.");
    }
    throw error;
  }
}
