import { z } from "zod";
import { identifier } from "@/server/orders/validation";

export const productSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  titleKo: z.string().trim().min(1).max(200), titleEn: z.string().trim().min(1).max(200),
  descriptionKo: z.string().min(1).max(100_000), descriptionEn: z.string().min(1).max(100_000),
  contentFormat: z.enum(["PLAIN", "MARKDOWN"]).optional(),
  imageUrl: z.string().max(500).regex(/^(?:\/media\/[A-Za-z0-9_./-]+|\/images\/[A-Za-z0-9_./-]+)?$/).refine((value) => !value.includes("..")),
  images: z.array(z.string().max(500).regex(/^\/(?:media|images)\/[A-Za-z0-9_./-]+$/).refine((value) => !value.includes(".."))).max(12).optional(),
  categoryId: z.union([z.literal(""), identifier]).nullable().optional(),
  published: z.boolean(), memberOnly: z.boolean(),
  priceKind: z.enum(["KRW_FIXED", "BTC_FIXED"]), priceAmount: z.string().regex(/^[1-9]\d{0,14}$/),
  listPriceAmount: z.union([z.literal(""), z.string().regex(/^[1-9]\d{0,14}$/)]).optional(),
  allowedFulfillments: z.array(z.enum(["PICKUP", "DOMESTIC", "INTERNATIONAL"])).min(1).max(3),
  variants: z.array(z.object({
    id: identifier.optional(), sku: z.string().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/),
    optionLabelKo: z.string().trim().max(200), optionLabelEn: z.string().trim().max(200),
    stockOnHand: z.number().int().min(0).max(1000000), billableWeightG: z.number().int().min(0).max(1000000), active: z.boolean(),
  }).strict()).min(1).max(100),
}).strict().superRefine((value, ctx) => {
  if (new Set(value.allowedFulfillments).size !== value.allowedFulfillments.length) ctx.addIssue({ code: "custom", message: "Duplicate fulfillment modes.", path: ["allowedFulfillments"] });
  if (new Set(value.variants.map((item) => item.sku)).size !== value.variants.length) ctx.addIssue({ code: "custom", message: "Duplicate SKU.", path: ["variants"] });
  const ids = value.variants.flatMap((variant) => variant.id ? [variant.id] : []);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", message: "Duplicate variant.", path: ["variants"] });
  if (value.allowedFulfillments.some((mode) => mode !== "PICKUP") && value.variants.some((variant) => variant.active && variant.billableWeightG <= 0)) ctx.addIssue({ code: "custom", message: "Shipping variants need a positive packed weight.", path: ["variants"] });
  if (value.listPriceAmount && BigInt(value.listPriceAmount) <= BigInt(value.priceAmount)) {
    ctx.addIssue({ code: "custom", message: "Compare-at price must be higher than the selling price.", path: ["listPriceAmount"] });
  }
});
export type ProductInput = z.infer<typeof productSchema>;

export const productCategorySchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  nameKo: z.string().trim().min(1).max(80),
  nameEn: z.string().trim().min(1).max(80),
  sortOrder: z.number().int().min(-1_000_000).max(1_000_000),
  active: z.boolean(),
}).strict();
export type ProductCategoryInput = z.infer<typeof productCategorySchema>;
