import { GoogleTagManager } from "@next/third-parties/google";
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
import { parseSiteTheme, themeCookieName } from "@/lib/theme-cookie";
import { isPrivateAnalyticsPath } from "@/lib/analytics-path";
import "@/app/globals.css";

export async function LocaleDocument({
  children,
  analyticsEnabled,
}: {
  children: ReactNode;
  analyticsEnabled: boolean;
}) {
  const locale = await getRootLocale();
  if (!hasLocale(routing.locales, locale)) notFound();
  const cookieStore = await cookies();
  const theme = parseSiteTheme(cookieStore.get(themeCookieName)?.value);
  const requestHeaders = await headers();
  const pathname = requestHeaders.get("x-bcs-pathname") ?? "";
  const excluded = !analyticsEnabled || isPrivateAnalyticsPath(pathname);
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
        {gtmId ? <>
          <script id="bcs-analytics-consent" nonce={nonce ?? undefined} dangerouslySetInnerHTML={{ __html: `
            window.dataLayer=window.dataLayer||[];
            (function(){function gtag(){window.dataLayer.push(arguments);}
              gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'granted'});
              gtag('set','ads_data_redaction',true);
            })();
          ` }} />
          <GoogleTagManager gtmId={gtmId} {...(nonce ? { nonce } : {})} />
        </> : null}
      </body>
    </html>
  );
}
