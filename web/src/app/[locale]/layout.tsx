import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LocaleDocument } from "@/components/locale-document";
import { routing } from "@/i18n/routing";
import { publicIndexingEnabled } from "@/lib/public-indexing";

export function generateMetadata(): Metadata {
  const enabled = publicIndexingEnabled();
  return { robots: { index: enabled, follow: enabled } };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default function LocaleLayout({ children }: { children: ReactNode }) {
  return <LocaleDocument analyticsEnabled>{children}</LocaleDocument>;
}
