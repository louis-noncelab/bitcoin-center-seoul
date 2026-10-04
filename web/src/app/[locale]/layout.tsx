import { GoogleTagManager } from "@next/third-parties/google";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
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
import { parseSiteTheme, themeCookieName } from "@/lib/theme-cookie";
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
  const theme = parseSiteTheme((await cookies()).get(themeCookieName)?.value);
  const requestHeaders = await headers();
  // GTM loads only after configuration and privacy approval. It never loads on admin
  // screens or on /orders/confirm/<code>: that URL is a bearer link to the customer's name and
  // address and must not reach Google as page_location or page_referrer.
  const pathname = requestHeaders.get("x-bcs-pathname") ?? "";
  const excluded = /^\/(?:[^/]+\/)?(?:admin|orders\/confirm)(?:\/|$)/.test(pathname);
  const gtmId = excluded || process.env.NEXT_PUBLIC_ANALYTICS_APPROVED !== "true" ? undefined : process.env.NEXT_PUBLIC_GTM_ID?.trim();
  const nonce = requestHeaders.get("x-nonce");

  return (
    <html lang={locale} data-theme={theme} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <NextIntlClientProvider locale={locale} messages={null}>
          <ThemeProvider defaultTheme={theme}>
            <ReadingProgress />
            {children}
            <CursorFollower />
          </ThemeProvider>
        </NextIntlClientProvider>
        <DevelopmentTools />
        {gtmId ? <GoogleTagManager gtmId={gtmId} {...(nonce ? { nonce } : {})} /> : null}
      </body>
    </html>
  );
}
