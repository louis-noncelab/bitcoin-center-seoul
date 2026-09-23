import { HttpError } from "@/server/http";

type TicketIdentity = { readonly slug: string; readonly variants: readonly { readonly sku: string }[] };

export function isEventProduct(product: TicketIdentity): boolean {
  return /^meetup-\d+$/.test(product.slug) || product.variants.some((variant) => /^MEETUP-\d+$/.test(variant.sku));
}

export function requireOrdinaryProduct(product: TicketIdentity): void {
  if (isEventProduct(product)) throw new HttpError(409, "EVENT_TICKET_MANAGED", "밋업 참가권은 행사 관리에서 수정해주세요. / Manage event tickets through the event editor.");
}
