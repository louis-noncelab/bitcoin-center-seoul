import "server-only";
import { z } from "zod";
import type { Tx } from "@/server/db";
import { prisma } from "@/server/db";
import { getServerConfig } from "@/server/config";
import { HttpError } from "@/server/http";
import { getExchangeRate, priceToSats, krwToSats, satsToKrw } from "@/server/money";
import { quoteShipping } from "@/server/shipping";
import { quoteCouponDiscount } from "@/server/commerce/coupons";
import { hashToken, newAccessToken, requirePurchasePolicy, type CustomerAccount } from "./access";
import type { Cart } from "./validation";

const itemSnapshot = z.object({
  variantId: z.string(), productId: z.string(), sku: z.string(), quantity: z.number().int().positive(),
  titleKo: z.string(), titleEn: z.string(), optionLabelKo: z.string(), optionLabelEn: z.string(),
  priceKind: z.enum(["FREE", "KRW_FIXED", "BTC_FIXED"]), unitPriceAmount: z.string().regex(/^\d+$/),
  amountSats: z.string().regex(/^\d+$/), productVersion: z.string(), variantVersion: z.string(), billableWeightG: z.number().int(),
});
export const quoteSnapshot = z.object({
  items: z.array(itemSnapshot).min(1),
  fulfillment: z.enum(["PICKUP", "DOMESTIC", "INTERNATIONAL"]),
  shipping: z.object({ fulfillment: z.enum(["PICKUP", "DOMESTIC", "INTERNATIONAL"]), countryCode: z.string().nullable(), requiresPostalCode: z.boolean(), weightG: z.number().int(), zoneId: z.string().nullable(), zoneNameKo: z.string().nullable(), zoneNameEn: z.string().nullable(), rateId: z.string().nullable(), maxWeightG: z.number().nullable(), amountKrw: z.string().regex(/^\d+$/) }),
  shippingAmountSats: z.string().regex(/^\d+$/), amountSats: z.string().regex(/^\d+$/),
  coupon: z.object({ id: z.string(), code: z.string(), nameKo: z.string(), nameEn: z.string(), discountSats: z.string().regex(/^\d+$/) }).nullable(),
  rate: z.object({ krwPerBtc: z.string(), source: z.string(), timestamp: z.string() }).nullable(),
  amountKrw: z.string().regex(/^\d+$/).nullish(),
  rounding: z.literal("CEILING_TO_SAT"),
});

export async function cartProducts(tx: Tx, cart: Cart, account: CustomerAccount) {
  const settings = await tx.siteSetting.findUnique({ where: { id: "site" } });
  if (settings?.maintenanceMode) throw new HttpError(503, "COMMERCE_MAINTENANCE", "상점 점검 중입니다. 잠시 후 다시 시도해 주세요. / The shop is under maintenance. Please try again later.");
  requirePurchasePolicy(account, settings?.guestPurchaseAllowed === false);
  const variants = await tx.productVariant.findMany({ where: { id: { in: cart.items.map((item) => item.variantId) } }, include: { product: true } });
  if (variants.length !== cart.items.length) throw new HttpError(409, "PRODUCT_UNAVAILABLE", "A selected product is unavailable.");
  for (const variant of variants) {
    if (!variant.active || !variant.product.published || !variant.product.allowedFulfillments.includes(cart.fulfillment)) throw new HttpError(409, "PRODUCT_UNAVAILABLE", "A product does not support this fulfillment.");
    requirePurchasePolicy(account, variant.product.memberOnly);
  }
  return variants;
}

export async function makeQuote(cart: Cart, account: CustomerAccount) {
  const variants = await cartProducts(prisma, cart, account);
  const weights = cart.items.map((item) => {
    const variant = variants.find((value) => value.id === item.variantId);
    if (!variant) throw new HttpError(409, "PRODUCT_UNAVAILABLE", "Product unavailable.");
    if (cart.fulfillment !== "PICKUP" && variant.billableWeightG <= 0) throw new HttpError(409, "WEIGHT_UNSET", "Shipping weight is not configured.");
    return variant.billableWeightG * item.quantity;
  });
  const shipping = await prisma.$transaction((tx) => quoteShipping(tx, { fulfillment: cart.fulfillment, ...(cart.countryCode ? { countryCode: cart.countryCode } : {}), weightG: weights.reduce((sum, weight) => sum + weight, 0) }));
  const rate = await getExchangeRate();
  let krwTotal = 0n;
  const items = cart.items.map((item) => {
    const variant = variants.find((value) => value.id === item.variantId);
    if (!variant) throw new HttpError(409, "PRODUCT_UNAVAILABLE", "Product unavailable.");
    const lineAmount = variant.product.priceAmount * BigInt(item.quantity);
    const priorKrwSats = krwTotal === 0n ? 0n : krwToSats(krwTotal, rate.krwPerBtc);
    if (variant.product.priceKind === "KRW_FIXED") krwTotal += lineAmount;
    const lineSats = variant.product.priceKind === "KRW_FIXED" ? krwToSats(krwTotal, rate.krwPerBtc) - priorKrwSats : priceToSats(variant.product.priceKind, lineAmount, null);
    return { variantId: variant.id, productId: variant.productId, sku: variant.sku, quantity: item.quantity, titleKo: variant.product.titleKo, titleEn: variant.product.titleEn, optionLabelKo: variant.optionLabelKo, optionLabelEn: variant.optionLabelEn, priceKind: variant.product.priceKind, unitPriceAmount: variant.product.priceAmount.toString(), amountSats: lineSats.toString(), productVersion: variant.product.updatedAt.toISOString(), variantVersion: variant.updatedAt.toISOString(), billableWeightG: variant.billableWeightG };
  });
  // Allocate cumulative rounded KRW differences so the complete KRW total is rounded once.
  const shippingSats = BigInt(shipping.amountKrw) === 0n ? 0n : krwToSats(krwTotal + BigInt(shipping.amountKrw), rate.krwPerBtc) - (krwTotal === 0n ? 0n : krwToSats(krwTotal, rate.krwPerBtc));
  const goodsSats = items.reduce((sum, item) => sum + BigInt(item.amountSats), 0n);
  const coupon = cart.couponCode
    ? await prisma.$transaction((tx) => quoteCouponDiscount(tx, {
      code: cart.couponCode ?? "",
      goodsSats,
      accountId: account?.id ?? null,
      rateKrwPerBtc: rate.krwPerBtc,
    }))
    : null;
  const amountSats = goodsSats + shippingSats - (coupon ? BigInt(coupon.discountSats) : 0n);
  if (amountSats <= 0n || amountSats > 2100000000000000n) throw new HttpError(400, "INVALID_AMOUNT", "Order amount is outside the supported range.");
  const amountKrw = satsToKrw(amountSats, rate.krwPerBtc);
  const snapshot = { items, fulfillment: cart.fulfillment, shipping, shippingAmountSats: shippingSats.toString(), amountSats: amountSats.toString(), coupon, rate: { ...rate, timestamp: rate.timestamp.toISOString() }, amountKrw: amountKrw.toString(), rounding: "CEILING_TO_SAT" as const };
  const token = newAccessToken();
  const quote = await prisma.quote.create({ data: { accountId: account?.id ?? null, ownerHash: account ? null : hashToken(token), input: cart, snapshot, amountSats, amountKrw, rateKrwPerBtc: rate.krwPerBtc, rateSource: rate.source, rateTimestamp: rate.timestamp, expiresAt: new Date(Date.now() + getServerConfig().quoteTtlMinutes * 60000) } });
  return { quote: { id: quote.id, snapshot, amountSats: quote.amountSats.toString(), amountKrw: amountKrw.toString(), expiresAt: quote.expiresAt }, token: account ? null : token };
}
