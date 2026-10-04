"use client";

import type { ComponentPropsWithRef } from "react";
import type { Locale } from "@/i18n/routing";
import { trackEvent } from "@/lib/analytics";

// External event booking pages (SatB or another site) that predate on-site meetup checkout.
export function LegacyMeetupLink({ locale, onClick, ...props }: ComponentPropsWithRef<"a"> & { readonly locale: Locale }) {
  return <a {...props} onClick={(event) => {
    trackEvent("outbound_legacy_meetup", { locale });
    onClick?.(event);
  }} />;
}
