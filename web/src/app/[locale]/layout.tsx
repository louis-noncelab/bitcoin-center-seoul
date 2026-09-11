import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { locale as getRootLocale } from "next/root-params";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { CursorFollower } from "@/components/controls/cursor-follower";
import { ReadingProgress } from "@/components/controls/reading-progress";
import { ThemeProvider } from "@/components/controls/theme-provider";
import { DevelopmentTools } from "@/components/development-tools";
import { routing } from "@/i18n/routing";
import { publicIndexingEnabled } from "@/lib/public-indexing";
import "../globals.css";

export function generateMetadata(): Metadata {
  const enabled = publicIndexingEnabled();
  return { robots: { index: enabled, follow: enabled } };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await getRootLocale();
  if (!hasLocale(routing.locales, locale)) notFound();
  const nonce = (await headers()).get("x-nonce") ?? "";

  return (
    <html lang={locale} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <NextIntlClientProvider locale={locale} messages={null}>
          <ThemeProvider nonce={nonce}>
            <ReadingProgress />
            {children}
            <CursorFollower />
          </ThemeProvider>
        </NextIntlClientProvider>
        <DevelopmentTools />
      </body>
    </html>
  );
}
