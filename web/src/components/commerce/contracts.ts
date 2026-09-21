import { z } from "zod";

export const fulfillmentSchema = z.enum(["PICKUP", "DOMESTIC", "INTERNATIONAL"]);
export type Fulfillment = z.infer<typeof fulfillmentSchema>;
const amount = z.string().regex(/^\d+$/);
export const productSchema = z.object({
  id: z.string(), slug: z.string(), titleKo: z.string(), titleEn: z.string(),
  descriptionKo: z.string(), descriptionEn: z.string(), imageUrl: z.string(),
  images: z.array(z.string()).optional(), createdAt: z.string().optional(),
  contentFormat: z.enum(["PLAIN", "MARKDOWN"]),
  priceKind: z.enum(["FREE", "KRW_FIXED", "BTC_FIXED"]), priceAmount: amount,
  listPriceAmount: amount.nullable().optional(),
  allowedFulfillments: z.array(fulfillmentSchema), memberOnly: z.boolean(),
  variants: z.array(z.object({ id: z.string(), sku: z.string(), optionLabelKo: z.string(), optionLabelEn: z.string(), availableStock: z.number().int() })),
});
export type Product = z.infer<typeof productSchema>;
export const countriesSchema = z.array(z.object({ code: z.string(), requiresPostalCode: z.boolean(), zone: z.object({ nameKo: z.string(), nameEn: z.string() }) }));
export type Countries = z.infer<typeof countriesSchema>;
export const itemSchema = z.object({ titleKo: z.string(), titleEn: z.string(), optionLabelKo: z.string(), optionLabelEn: z.string(), quantity: z.number().int(), amountSats: amount });
export const quoteSchema = z.object({
  id: z.string(), amountSats: amount, amountKrw: amount.nullable().optional(), expiresAt: z.string(),
  snapshot: z.object({ items: z.array(itemSchema), shippingAmountSats: amount, amountSats: amount, amountKrw: amount.nullable().optional(),
    shipping: z.object({ countryCode: z.string().nullable(), requiresPostalCode: z.boolean() }),
    coupon: z.object({ code: z.string(), nameKo: z.string(), nameEn: z.string(), discountSats: amount }).nullable().optional(),
    rate: z.object({ krwPerBtc: z.string(), source: z.string(), timestamp: z.string() }).nullable().optional(),
  }),
});
export type Quote = z.infer<typeof quoteSchema>;
export const paymentSchema = z.object({
  id: z.string(), provider: z.enum(["LNURL", "ZAPRITE"]), mode: z.enum(["REVIEW", "SANDBOX", "LIVE"]),
  status: z.enum(["NEW", "CREATING", "PENDING", "PROCESSING", "PAID", "EXPIRED", "FAILED", "REVIEW"]),
  amountSats: amount, currency: z.literal("BTC"), expiresAt: z.string(), checkoutUrl: z.string().nullable(),
  paymentRequest: z.string().nullable(), review: z.boolean(), creationUnknown: z.boolean(), reviewReason: z.string().nullable(),
});
export type Payment = z.infer<typeof paymentSchema>;
const paymentSummary = paymentSchema.pick({ id: true, status: true, mode: true, expiresAt: true });
const resourceFields = {
  id: z.string(), amountSats: amount, amountKrw: amount.nullable().optional(), customerName: z.string(), customerEmail: z.string(), customerPhone: z.string(),
  holdExpiresAt: z.string().nullable(), createdAt: z.string(), payments: z.array(paymentSummary),
};
export const addressSchema = z.object({ countryCode: z.string(), postalCode: z.string(), region: z.string(), city: z.string(), line1: z.string(), line2: z.string() });
export const orderSchema = z.object({ ...resourceFields,
  status: z.enum(["PENDING_PAYMENT", "PAID", "EXPIRED", "CANCELLED", "REVIEW"]),
  fulfillment: fulfillmentSchema, fulfillmentStatus: z.enum(["UNFULFILLED", "READY", "SHIPPED", "DELIVERED", "COLLECTED"]),
  address: addressSchema.nullable(), shippingAmountSats: amount, carrier: z.string().nullable(), trackingNumber: z.string().nullable(), items: z.array(itemSchema),
  customerNotes: z.string().optional(),
});
export type Order = z.infer<typeof orderSchema>;
export const createdSchema = z.object({ id: z.string() });
export function adminListSchema<Item extends z.ZodType>(item: Item) {
  return z.object({
    items: z.array(item),
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
  });
}
