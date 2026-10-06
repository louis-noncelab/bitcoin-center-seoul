import { z } from "zod";

export function ticketEventId(sku: string | null | undefined): number | null {
  const match = /^MEETUP-([1-9]\d*)$/.exec(sku ?? "");
  const id = match ? Number(match[1]) : NaN;
  return Number.isSafeInteger(id) && id <= 2147483647 ? id : null;
}

export function purchaseKind(items: readonly { readonly sku?: string | null | undefined }[]): "goods" | "meetup" | "mixed" {
  const count = items.filter((item) => ticketEventId(item.sku) !== null).length;
  return count === 0 ? "goods" : count === items.length ? "meetup" : "mixed";
}

export type CheckoutPolicyKind = ReturnType<typeof purchaseKind> | "free_meetup";

export const meetupInfoSchema = z.object({
  id: z.number().int().positive(), date: z.string(), time: z.string(),
  venueType: z.enum(["center", "external"]), location: z.string(), locationEn: z.string(),
  isOnline: z.boolean(),
});
export type MeetupInfo = z.infer<typeof meetupInfoSchema>;
