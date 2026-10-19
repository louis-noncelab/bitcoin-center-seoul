import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { ContentLink } from "@/components/controls/content-link";
import { PageMotion } from "@/components/site/page-motion";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { NewsHeader } from "@/components/site/news-content";
import { pageMetadata } from "@/content/site";
import type { Locale } from "@/i18n/routing";
import type { NoticeRecord } from "@/lib/notices-contract";
import { markdownExcerpt } from "@/lib/markdown";
import { withoutWordJoiners } from "@/lib/text";
import "@/styles/events-public.css";
import "@/styles/site.css";
import "@/styles/notices.css";

export function noticeText(locale: Locale, notice: NoticeRecord) {
  return { title: locale === "en" ? notice.titleEn || notice.title : notice.title, description: locale === "en" ? notice.descriptionEn || notice.description : notice.description };
}
export function noticesMetadata(locale: Locale, notice?: NoticeRecord): Metadata {
  const title = withoutWordJoiners(notice ? noticeText(locale, notice).title : locale === "ko" ? "공지사항" : "Notices");
  const description = notice ? markdownExcerpt(noticeText(locale, notice).description) : locale === "ko" ? "비트코인 센터 서울의 운영 소식과 안내입니다" : "News and updates from Bitcoin Center Seoul";
  const path = `/notices${notice ? `/${notice.slug}` : ""}`;
  const base = pageMetadata(locale);
  return { ...base, title: `${title} | Bitcoin Center Seoul`, description,
    alternates: { canonical: `/${locale}${path}`, languages: { ko: `/ko${path}`, en: `/en${path}`, "x-default": `/ko${path}` } },
    openGraph: { ...base.openGraph, title, description, url: `/${locale}${path}` },
    twitter: { ...base.twitter, title, description },
  };
}
export function NoticesFrame({ locale, title, detail = false, children }: { readonly locale: Locale; readonly title: string; readonly detail?: boolean; readonly children: ReactNode }) {
  return <><SiteHeader locale={locale} section="news" /><main id="main" className={detail ? "container detail-page event-page" : "container news-page"} tabIndex={-1}>
    {detail ? <>
      <ContentLink href="/notices" locale={locale} className="button event-back" data-variant="secondary"><ArrowLeft className="icon" aria-hidden="true" />{locale === "ko" ? "공지사항으로" : "Back to notices"}</ContentLink>
      <div className="detail-heading"><h1>{title}</h1></div>
    </> : <NewsHeader locale={locale} current="notices" />}
    {children}<PageMotion pageKey={`${locale}-notices-${title}`} />
  </main><SiteFooter locale={locale} /></>;
}
