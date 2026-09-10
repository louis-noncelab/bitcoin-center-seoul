import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { locale as getRootLocale } from "next/root-params";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { ReadingProgress } from "@/components/controls/reading-progress";
import { ThemeProvider } from "@/components/controls/theme-provider";
import { DevelopmentTools } from "@/components/development-tools";
import { routing } from "@/i18n/routing";
import "../globals.css";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

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
          </ThemeProvider>
        </NextIntlClientProvider>
        <DevelopmentTools />
      </body>
    </html>
  );
}
