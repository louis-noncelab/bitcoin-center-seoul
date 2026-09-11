import type { Metadata } from "next";
import { cookies } from "next/headers";
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
      </body>
    </html>
  );
}
