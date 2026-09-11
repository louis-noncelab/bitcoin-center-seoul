import Image from "next/image";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { notFound, permanentRedirect } from "next/navigation";
import { connection } from "next/server";
import { hasLocale } from "next-intl";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { MarkdownContent } from "@/components/site/markdown-content";
import { ReviewCard } from "@/components/site/review-card";
import { reviewCopy } from "@/content/review-copy";
import { reviewMetadata, reviewStructuredData } from "@/content/review-metadata";
import { visitReview } from "@/content/visit-reviews";
import { reviewBySlug, listReviews } from "@/server/reviews";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import "@/styles/site.css";
import "@/styles/events-public.css";
import "@/styles/reviews.css";
import "@/styles/markdown.css";

type Props = { readonly params: Promise<{ readonly locale: string; readonly slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  await connection();
  const record = reviewBySlug(slug);
  if (!record) notFound();
  return reviewMetadata(record, locale);
}
export default async function ReviewPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  await connection();
  const record = reviewBySlug(slug);
  if (!record) notFound();
  if (record.slug !== slug) permanentRedirect(`/${locale}/reviews/${record.slug}`);
  const review = visitReview(record);
  const t = reviewCopy[locale];
  const related = listReviews().filter((item) => item.id !== record.id).sort((a, b) => Number(b.kind === record.kind) - Number(a.kind === record.kind)).slice(0, 3);
  return <><SiteHeader locale={locale} /><main id="main" tabIndex={-1} className="container detail-page event-page reviews-page">
    <Link href="/reviews" prefetch={false} locale={locale} className="button event-back" data-variant="secondary"><ArrowLeft className="icon" aria-hidden="true" />{locale === "ko" ? "방문 후기로" : "Back to visitor stories"}</Link>
    <article className="review-story">
      <header className="review-story-heading">
        <p className="review-eyebrow">{locale === "ko" ? `${review.author}님의 방문 후기` : `A visitor story from ${review.author}`}</p>
        <h1>{review.title[locale]}</h1>
        <p className="review-story-summary">{review.summary[locale]}</p>
        {review.date && <p className="caption muted"><time dateTime={review.date}>{review.date.replaceAll("-", ".")}</time></p>}
      </header>
      {review.image && <figure className="review-story-cover"><Image src={review.image} alt={`${review.author}${t.photo}`} width={1200} height={800} sizes="(max-width: 767px) 100vw, 760px" unoptimized loading="eager" fetchPriority="high" /></figure>}
      <MarkdownContent lang={locale === "en" && record.descriptionEn ? "en" : "ko"}>{locale === "en" ? record.descriptionEn || record.description : record.description}</MarkdownContent>
      <footer className="review-story-source">
        <a href={review.url} target="_blank" rel="noopener noreferrer" className="source-link">{locale === "ko" ? "원문 보기" : "Read the original"}<ArrowUpRight className="icon" aria-hidden="true" /><span className="sr-only"> ({t.window})</span></a>
      </footer>
    </article>
    {!!related.length && <section className="review-related section-frame" aria-labelledby="related-reviews"><h2 id="related-reviews">{locale === "ko" ? "다른 방문 이야기" : "More visitor stories"}</h2><div className="review-grid">{related.map((item) => <ReviewCard key={item.id} review={visitReview(item)} locale={locale} />)}</div></section>}
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewStructuredData(record, locale)).replace(/</g, "\\u003c") }} />
  </main><SiteFooter locale={locale} /></>;
}
