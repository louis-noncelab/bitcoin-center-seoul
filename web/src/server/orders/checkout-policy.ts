import "server-only";
import { createHash } from "node:crypto";
import { checkoutDisclosure } from "@/content/checkout-disclosure";
import { businessInformation } from "@/content/legal-business";
import { termsOfService } from "@/content/legal-terms";
import { refundPolicy } from "@/content/legal-refunds";
import type { Locale } from "@/i18n/routing";
import { HttpError } from "@/server/http";

function policy(locale: Locale) {
  return { locale, disclosure: checkoutDisclosure[locale], terms: termsOfService[locale], refunds: refundPolicy[locale], business: businessInformation[locale] };
}

export function checkoutPolicyVersion(locale: Locale): string {
  return createHash("sha256").update(JSON.stringify(policy(locale))).digest("hex");
}

export function checkoutPolicyEvidence(locale: Locale, version: string, acceptedAt = new Date()) {
  const current = checkoutPolicyVersion(locale);
  if (version !== current) throw new HttpError(409, "POLICY_STALE", "Checkout terms changed. Reload and review them before ordering.");
  return { ...policy(locale), version: current, acceptedAt: acceptedAt.toISOString() };
}
