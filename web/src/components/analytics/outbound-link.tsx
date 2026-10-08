"use client";

import type { ComponentPropsWithRef } from "react";
import type { Locale } from "@/i18n/routing";
import { ActionLink } from "@/components/ui/primitives";
import { trackEvent } from "@/lib/analytics";

export function OutboundLink({ destination, locale, onClick, ...props }: ComponentPropsWithRef<typeof ActionLink> & {
  readonly destination: "youtube" | "x" | "instagram";
  readonly locale: Locale;
}) {
  return <ActionLink {...props} onClick={(event) => {
    trackEvent("outbound_click", { destination, locale });
    onClick?.(event);
  }} />;
}
