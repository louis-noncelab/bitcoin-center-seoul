import type { Metadata } from "next";
import { headers } from "next/headers";
import type { Locale } from "@/i18n/routing";
import "@/app/globals.css";
import "@/styles/site.css";
import "@/styles/events-public.css";

export const metadata: Metadata = {
  title: "페이지를 찾을 수 없습니다 | Bitcoin Center Seoul",
  robots: { index: false, follow: false },
};

function localeFromPath(pathname: string | null): Locale {
  return pathname === "/en" || pathname?.startsWith("/en/") ? "en" : "ko";
}

export default async function GlobalNotFound() {
  const locale = localeFromPath((await headers()).get("x-bcs-pathname"));
  const ko = locale === "ko";
  return <html lang={locale} data-theme="light">
    <body>
      <main id="main" tabIndex={-1} className="container detail-page event-page">
        <div className="detail-heading">
          <p className="muted">404</p>
          <h1>{ko ? "이 주소에는 페이지가 없습니다" : "This page is not here"}</h1>
        </div>
        <div className="event-detail">
          <p className="event-description">{ko ? "주소가 바뀌었거나, 없는 페이지입니다." : "The address may have changed, or there is no page here."}</p>
          <a className="button" data-variant="primary" href={`/${locale}`}>{ko ? "홈으로" : "Back home"}</a>
        </div>
      </main>
    </body>
  </html>;
}
