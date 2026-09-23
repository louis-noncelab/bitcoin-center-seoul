import { z } from "zod";
import { callingCodes } from "@/lib/phone-countries";

const dialPrefixes = [...new Set(Object.values(callingCodes))].sort((a, b) => b.length - a.length);

export const identifier = z.string().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/);
export const localeSchema = z.enum(["ko", "en"]);
export const customerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().max(254).transform((value) => value.toLowerCase()),
  phone: z.string().trim().max(40).regex(/^\+?[0-9() .-]*$/).refine((value) => {
    if (!value) return true;
    const digits = value.replace(/\D/g, "");
    if (!value.startsWith("+")) return digits.length >= 6;
    const prefix = dialPrefixes.find((item) => digits.startsWith(item));
    return prefix !== undefined && digits.length - prefix.length >= 6;
  }, "Enter a phone number with at least six national digits.").default(""),
}).strict();
export const cartSchema = z.object({
  items: z.array(z.object({ variantId: identifier, quantity: z.number().int().min(1).max(100) }).strict()).min(1).max(30),
  fulfillment: z.enum(["PICKUP", "DOMESTIC", "INTERNATIONAL"]),
  countryCode: z.string().regex(/^[A-Z]{2}$/).optional(),
  couponCode: z.string().trim().max(40).optional(),
}).strict().superRefine((value, ctx) => {
  if (new Set(value.items.map((item) => item.variantId)).size !== value.items.length) ctx.addIssue({ code: "custom", message: "Duplicate variants are not allowed.", path: ["items"] });
  if (value.fulfillment === "PICKUP" && value.countryCode) ctx.addIssue({ code: "custom", message: "Pickup does not require a country.", path: ["countryCode"] });
  if (value.fulfillment !== "PICKUP" && !value.countryCode) ctx.addIssue({ code: "custom", message: "Choose a shipping country.", path: ["countryCode"] });
});
export const addressSchema = z.object({
  countryCode: z.string().regex(/^[A-Z]{2}$/),
  postalCode: z.string().trim().max(20).default(""),
  region: z.string().trim().max(100).default(""),
  city: z.string().trim().min(1).max(100),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).default(""),
}).strict();
export const createOrderSchema = z.object({
  quoteId: identifier,
  customer: customerSchema,
  locale: localeSchema,
  address: addressSchema.optional(),
  notes: z.string().trim().max(500).optional(),
}).strict();
export function orderAddressFromSaved(saved: {
  readonly countryCode: string;
  readonly postalCode: string;
  readonly region: string;
  readonly city: string;
  readonly line1: string;
  readonly line2: string;
}) {
  return addressSchema.parse({
    countryCode: saved.countryCode,
    postalCode: saved.postalCode,
    region: saved.region,
    city: saved.city,
    line1: saved.line1,
    line2: saved.line2,
  });
}
export const changeSchema = z.object({ kind: z.enum(["CANCEL", "REFUND", "FULFILLMENT_CHANGE"]), reason: z.string().trim().min(1).max(2000) }).strict();
export const decisionSchema = z.object({ requestId: identifier, status: z.enum(["ACCEPTED", "REJECTED", "RESOLVED"]), resolution: z.string().trim().min(1).max(2000) }).strict();
export type Cart = z.infer<typeof cartSchema>;
export type CreateOrder = z.infer<typeof createOrderSchema>;
