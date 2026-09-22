import { ContentLink } from "@/components/controls/content-link";
import { PageMotion } from "@/components/site/page-motion";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import type { Locale } from "@/i18n/routing";
import "@/styles/site.css";
import "@/styles/events-public.css";

export function NotFoundPage({ locale }: { readonly locale: Locale }) {
  const ko = locale === "ko";
  return <>
    <SiteHeader locale={locale} />
    <main id="main" tabIndex={-1} className="container detail-page event-page">
      <div className="detail-heading">
        <p className="muted">404</p>
        <h1>{ko ? "이 주소에는 페이지가 없습니다" : "This page is not here"}</h1>
      </div>
      <div className="event-detail">
        <p className="event-description">{ko ? "주소가 바뀌었거나, 없는 페이지입니다." : "The address may have changed, or there is no page here."}</p>
        <ContentLink href="/" locale={locale} className="button" data-variant="primary">{ko ? "홈으로" : "Back home"}</ContentLink>
      </div>
      <PageMotion pageKey={`${locale}-not-found`} />
    </main>
    <SiteFooter locale={locale} />
  </>;
}
