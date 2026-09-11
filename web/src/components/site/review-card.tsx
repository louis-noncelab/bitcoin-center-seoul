import Image from "next/image";
import { ArrowRight, ArrowUpRight, Play } from "lucide-react";
import type { VisitReview } from "@/content/visit-reviews";
import { reviewCopy } from "@/content/review-copy";
import type { Locale } from "@/i18n/routing";

export function ReviewCard({ review, locale, compact = false }: { readonly review: VisitReview; readonly locale: Locale; readonly compact?: boolean }) {
  const t = reviewCopy[locale];
  return (
    <article className={`review-card${compact ? " review-card-compact" : ""}`} data-review-id={review.id}>
      <a className="review-card-link" href={review.slug ? `/${locale}/reviews/${review.slug}` : review.url} target={review.slug ? undefined : "_blank"} rel={review.slug ? undefined : "noopener noreferrer"}>
        {(review.image || !compact) && (
          review.image ? <div className="review-card-image">
            <Image src={review.image} alt={`${review.author}${t.photo}`} fill unoptimized sizes={compact ? "(max-width: 1023px) 100vw, 33vw" : "(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"} />
            {review.kind === "video" && <span className="review-play" aria-hidden="true"><Play className="icon" /></span>}
          </div> : <div className="review-card-paper"><h3>{review.title[locale]}</h3></div>
        )}
        <div className="review-card-content">
          {(review.image || compact) && <h3>{review.title[locale]}</h3>}
          <p className="review-card-summary">{review.summary[locale]}</p>
          <div className="review-card-end"><span className="review-author"><span>{review.author}</span>{review.date && <time dateTime={review.date}>{review.date.replaceAll("-", ".")}</time>}</span><span className="review-read">{review.slug ? t.read : review.kind === "video" ? t.watch : t.source}{review.slug ? <ArrowRight className="icon" aria-hidden="true" /> : <ArrowUpRight className="icon" aria-hidden="true" />}</span></div>
          {!review.slug && <span className="sr-only"> ({t.window})</span>}
        </div>
      </a>
    </article>
  );
}
