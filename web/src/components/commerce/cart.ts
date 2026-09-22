import type { Fulfillment, Product } from "./contracts";
import { CART_MAX_QUANTITY, type CartLine } from "./cart-store";

export type ResolvedCartLine = {
  readonly variantId: string;
  readonly quantity: number;
  readonly product: Product;
  readonly variant: Product["variants"][number];
  readonly available: boolean;
};

export function quoteRequestBody(
  items: readonly { readonly variantId: string; readonly quantity: number }[],
  fulfillment: Fulfillment,
  countryCode: string,
  couponCode = "",
) {
  const body = {
    items: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
    fulfillment,
    ...(couponCode.trim() ? { couponCode: couponCode.trim() } : {}),
  };
  return fulfillment === "PICKUP" ? body : { ...body, countryCode };
}

export function sharedFulfillments(products: readonly Product[]): Fulfillment[] {
  const options: Fulfillment[] = ["PICKUP", "DOMESTIC", "INTERNATIONAL"];
  return options.filter((value) => products.every((product) => product.allowedFulfillments.includes(value)));
}

export function resolveCartLines(items: readonly CartLine[], products: readonly Product[]) {
  const missing: string[] = [];
  const lines: ResolvedCartLine[] = [];
  for (const item of items) {
    const product = products.find((entry) => entry.variants.some((variant) => variant.id === item.variantId));
    const variant = product?.variants.find((entry) => entry.id === item.variantId);
    if (!product || !variant) {
      missing.push(item.variantId);
      continue;
    }
    const quantity = item.quantity;
    const available = !product.memberOnly && quantity <= variant.availableStock && quantity <= CART_MAX_QUANTITY;
    lines.push({ variantId: item.variantId, quantity, product, variant, available });
  }
  return { missing, lines };
}
