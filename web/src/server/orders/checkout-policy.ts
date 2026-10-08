import "server-only";
import { createHash } from "node:crypto";
import { purchaseDisclosure, purchaseRefunds, purchaseTerms } from "@/content/meetup-policy";
import { businessInformation } from "@/content/legal-business";
import type { Locale } from "@/i18n/routing";
import type { CheckoutPolicyKind } from "@/lib/commerce-kind";
import { HttpError } from "@/server/http";

function policy(locale: Locale, kind: CheckoutPolicyKind) {
  return { locale, kind, disclosure: purchaseDisclosure(locale, kind), terms: purchaseTerms(locale, kind), refunds: purchaseRefunds(locale, kind), business: businessInformation[locale] };
}

export function checkoutPolicyVersion(locale: Locale, kind: CheckoutPolicyKind = "goods"): string {
  return createHash("sha256").update(JSON.stringify(policy(locale, kind))).digest("hex");
}

export function checkoutPolicyEvidence(locale: Locale, version: string, acceptedAt = new Date(), kind: CheckoutPolicyKind = "goods") {
  const current = checkoutPolicyVersion(locale, kind);
  if (version !== current) throw new HttpError(409, "POLICY_STALE", "Checkout terms changed. Reload and review them before ordering.");
  return { ...policy(locale, kind), version: current, acceptedAt: acceptedAt.toISOString() };
}
