"use client";

import { useSearchParams } from "next/navigation";
import { useSyncExternalStore } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener("popstate", onChange);
  };
}

function documentAnchor() {
  return /^#[a-zA-Z][a-zA-Z0-9_-]*$/.test(window.location.hash) ? window.location.hash : "";
}

export function LocaleLink({ locale, label }: { readonly locale: Locale; readonly label: string }) {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const hash = useSyncExternalStore(subscribeHash, documentAnchor, () => "");
  return <Link href={`${pathname}${query ? `?${query}` : ""}${hash}`} locale={locale} hrefLang={locale} lang={locale} aria-label={label} className="button header-control language-control" data-variant="quiet">{locale === "en" ? "EN" : "KO"}</Link>;
}
