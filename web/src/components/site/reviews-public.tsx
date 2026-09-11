import Image from "next/image";
import { ArrowRight, ArrowUpRight, Plus, Minus } from "lucide-react";
import { reviewCopy } from "@/content/review-copy";
import { type VisitReview } from "@/content/visit-reviews";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { ReviewCard } from "./review-card";

export const reviewFilters = ["all", "blog", "cafe", "video", "note"] as const;
export type ReviewFilter = (typeof reviewFilters)[number];

export function ReviewsFeature({ locale, review }: { readonly locale: Locale; readonly review: VisitReview | null }) {
  const t = reviewCopy[locale];
  if (!review?.image) return null;
  const featuredLink = locale === "ko" ? `${review.author}님의 방문기 읽기` : `Read ${review.author}’s story`;
  return <section className="review-feature section-frame" aria-labelledby="review-feature-title">
    <a className="review-feature-photo" href={review.slug ? `/${locale}/reviews/${review.slug}` : review.url} target={review.slug ? undefined : "_blank"} rel={review.slug ? undefined : "noopener noreferrer"} aria-label={`${featuredLink}${review.slug ? "" : ` (${t.window})`}`} data-reveal-part>
      <Image src={review.image} alt={`${review.author}${t.photo}`} fill unoptimized loading="eager" fetchPriority="high" sizes="(max-width: 767px) 100vw, 58vw" />
    </a>
    <div className="review-feature-copy" data-reveal-part>
      <p className="review-eyebrow">{t.featured}</p>
      <h2 id="review-feature-title">{review.featureTitle[locale]}</h2>
      <p className="review-feature-context">{review.summary[locale]}</p>
      <p className="review-feature-author">{review.author}{review.date && <span><time dateTime={review.date}>{review.date.replaceAll("-", ".")}</time></span>}</p>
      <a className="section-link" href={review.slug ? `/${locale}/reviews/${review.slug}` : review.url} target={review.slug ? undefined : "_blank"} rel={review.slug ? undefined : "noopener noreferrer"}>{featuredLink}{review.slug ? <ArrowRight className="icon" aria-hidden="true" /> : <ArrowUpRight className="icon" aria-hidden="true" />}{!review.slug && <span className="sr-only"> ({t.window})</span>}</a>
    </div>
  </section>;
}

function ReviewGrid({ records, locale }: { readonly records: readonly VisitReview[]; readonly locale: Locale }) {
  return <div className="review-grid">{records.map((review) => <ReviewCard key={review.id} review={review} locale={locale} />)}</div>;
}

export function ReviewsCatalog({ locale, filter, reviews }: { readonly locale: Locale; readonly filter: ReviewFilter; readonly reviews: readonly VisitReview[] }) {
  const t = reviewCopy[locale];
  const records = filter === "all" ? reviews : reviews.filter((review) => review.kind === filter);
  return <section className="review-archive section-frame" aria-labelledby="review-archive-title" id="review-list">
    <div className="review-archive-heading"><h2 id="review-archive-title">{t.archive}</h2><span className="review-count">{records.length}{t.count}</span></div>
    <nav className="review-filters" aria-label={locale === "ko" ? "후기 종류" : "Story format"}>
      {reviewFilters.map((kind) => <Link key={kind} locale={locale} href={`/reviews${kind === "all" ? "" : `?type=${kind}`}#review-list`} scroll={false} aria-current={filter === kind ? "true" : undefined} className="review-filter">
        {t[kind]}<span>{kind === "all" ? reviews.length : reviews.filter((review) => review.kind === kind).length}</span>
      </Link>)}
    </nav>
    <div className="review-results" key={filter}>
      {!records.length && <p className="catalog-empty muted">{locale === "ko" ? "아직 등록된 후기가 없습니다." : "No visitor stories yet."}</p>}
      <ReviewGrid records={records.slice(0, 12)} locale={locale} />
      {records.length > 12 && <details className="review-more">
        <summary><span className="review-more-closed">{t.more}<span>{records.length - 12}</span><Plus className="icon" aria-hidden="true" /></span><span className="review-more-open">{t.less}<Minus className="icon" aria-hidden="true" /></span></summary>
        <ReviewGrid records={records.slice(12)} locale={locale} />
      </details>}
    </div>
    <div className="review-visit"><div><h2>{t.visit}</h2><p>{t.visitCopy}</p></div><Link href="/visit" locale={locale} className="button" data-variant="secondary">{t.visitLink}<ArrowRight className="icon" aria-hidden="true" /></Link></div>
  </section>;
}
