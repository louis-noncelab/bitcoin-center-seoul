import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { hasLocale } from "next-intl";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { pageMetadata } from "@/content/site";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { anniversaryHighlights, anniversaryYears, CENTER_OPENED_ON } from "@/lib/anniversary";
import { seoulDate } from "@/lib/center-status";
import { homeEvents, upcomingHomeEvents } from "@/lib/home-events";
import { listEvents, listHighlights } from "@/server/events";
import "@/styles/site.css";
import "@/styles/anniversary.css";

type Props = { readonly params: Promise<{ locale: string; year: string }> };

async function archiveParams(params: Props["params"]): Promise<{ locale: Locale; year: number; today: string }> {
  const { locale, year: value } = await params;
  if (!hasLocale(routing.locales, locale) || !/^\d{4}$/.test(value)) notFound();
  await connection();
  const today = seoulDate();
  const year = Number(value);
  if (!anniversaryYears(today).includes(year)) notFound();
  return { locale, year, today };
}

export async function generateMetadata({ params }: Props) {
  const { locale, year } = await archiveParams(params);
  const count = year - 2025;
  const title = locale === "ko" ? `센터 개관 ${count}주년` : `${count} ${count === 1 ? "year" : "years"} since opening`;
  const description = locale === "ko"
    ? "비트코인 센터 서울에서 공개한 현장 사진과 다음 모임을 살펴보세요."
    : "See published photos from Bitcoin Center Seoul and find the next event.";
  const path = `/anniversary/${year}`;
  const base = pageMetadata(locale);
  return {
    ...base,
    title: `${title} | Bitcoin Center Seoul`,
    description,
    alternates: { canonical: `/${locale}${path}`, languages: { ko: `/ko${path}`, en: `/en${path}`, "x-default": `/ko${path}` } },
    openGraph: { ...base.openGraph, title, description, url: `/${locale}${path}` },
    twitter: { ...base.twitter, title, description },
  };
}

export default async function AnniversaryPage({ params }: Props) {
  const { locale, year, today } = await archiveParams(params);
  const [highlights, records] = await Promise.all([listHighlights(), listEvents()]);
  const photos = anniversaryHighlights(highlights, year, today);
  const years = anniversaryYears(today);
  const next = upcomingHomeEvents(homeEvents(records), today)[0];
  const count = year - 2025;
  const before = today < `${year}-10-21`;
  const ko = locale === "ko";
  const first = year === 2026 ? CENTER_OPENED_ON : `${year - 1}-10-22`;
  const last = before ? today : `${year}-10-21`;
  const displayDate = (value: string) => ko ? value.replaceAll("-", ".") : value;

  return <>
    <SiteHeader locale={locale} section="news" />
    <main id="main" tabIndex={-1} className="container anniversary-page">
      <header className="anniversary-heading">
        <Link href="/news" locale={locale} className="anniversary-back"><ArrowLeft aria-hidden="true" />{ko ? "소식으로" : "Back to news"}</Link>
        <p className="anniversary-eyebrow">{ko ? `개관 ${count}주년` : `${count} ${count === 1 ? "year" : "years"} since opening`}</p>
        <h1>{before
          ? ko ? `10월 21일, 센터가 문을 연 지 ${count}년이 됩니다.` : `On October 21, it will be ${count} ${count === 1 ? "year" : "years"} since we opened.`
          : ko ? `센터가 문을 연 지 ${count}년이 됐습니다.` : `${count} ${count === 1 ? "year" : "years"} since we opened.`}</h1>
        <p className="anniversary-intro">{ko
          ? "지난 1년간 센터에서 공개한 사진을 모았습니다. 다음 일정과 방문 안내도 아래에서 볼 수 있습니다."
          : "Photos published over the past year. You can also find current events and visiting information below."}</p>
        <p className="anniversary-period"><time dateTime={first}>{displayDate(first)}</time><span aria-hidden="true">~</span><time dateTime={last}>{displayDate(last)}</time></p>
      </header>

      <section className="anniversary-gallery" aria-labelledby="anniversary-gallery-title">
        <div className="anniversary-section-heading"><h2 id="anniversary-gallery-title">{ko ? "지난 1년의 사진" : "Photos from the past year"}</h2><span>{year}</span></div>
        {photos.length > 0 ? <div className="anniversary-grid">{photos.map((record) => {
          const title = ko ? record.title : record.titleEn || record.title;
          const date = (record.date || record.startDate).trim().replaceAll(".", "-");
          return <article className="anniversary-photo" key={record.id}>
            <Link href={`/journal/${record.slug || record.id}`} locale={locale} className="anniversary-photo-link">
              <span className="anniversary-photo-frame"><Image src={record.images[0] || record.image} alt="" fill unoptimized sizes="(max-width: 767px) 100vw, (max-width: 1199px) 50vw, 640px" /></span>
              <span className="anniversary-photo-caption"><time dateTime={date}>{displayDate(date)}</time><strong lang={!ko && !record.titleEn ? "ko" : locale}>{title}</strong><ArrowRight aria-hidden="true" /></span>
            </Link>
          </article>;
        })}</div> : <p className="anniversary-empty">{ko ? "이 기간에 공개된 사진 기록은 아직 없습니다." : "No photos have been published for this period yet."}</p>}
        <Link href="/journal" locale={locale} className="anniversary-all-link">{ko ? "전체 현장 스케치 보기" : "See all highlights"}<ArrowRight aria-hidden="true" /></Link>
        {years.length > 1 && <nav className="anniversary-years" aria-label={ko ? "개관 기념 기록" : "Anniversary archives"}>
          {years.map((archiveYear) => <Link key={archiveYear} href={`/anniversary/${archiveYear}`} locale={locale} aria-current={archiveYear === year ? "page" : undefined}>{archiveYear}</Link>)}
        </nav>}
      </section>

      <section className="anniversary-next" aria-labelledby="anniversary-next-title">
        <div><p className="anniversary-eyebrow">{ko ? "센터 일정" : "CENTER EVENTS"}</p><h2 id="anniversary-next-title">{next ? ko ? "다음 모임" : "Next event" : ko ? "센터 방문하기" : "Visit the center"}</h2></div>
        <div className="anniversary-next-details">
          {next ? <><time dateTime={next.date}>{displayDate(next.date)}{next.time && ` ${next.time}`}</time><Link href={`/programs/${next.slug || next.id}`} locale={locale}>{ko ? next.title : next.titleEn || next.title}<ArrowRight aria-hidden="true" /></Link></> : <Link href="/programs" locale={locale}>{ko ? "다가오는 일정 확인하기" : "See upcoming events"}<ArrowRight aria-hidden="true" /></Link>}
          <Link href="/visit" locale={locale} className="anniversary-visit-link">{ko ? "센터 방문 안내" : "Plan a visit"}<ArrowRight aria-hidden="true" /></Link>
        </div>
      </section>
    </main>
    <SiteFooter locale={locale} />
  </>;
}
