import { ArrowRight } from "lucide-react";
import { reviewCopy } from "@/content/review-copy";
import { visitReview } from "@/content/visit-reviews";
import { publicReviews } from "@/server/reviews";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { ReviewCard } from "./review-card";
import "@/styles/reviews.css";

export async function ReviewsPreview({ locale }: { readonly locale: Locale }) {
  const t = reviewCopy[locale];
  const reviews = (await publicReviews()).home.map(visitReview);
  if (!reviews.length) return null;
  return <section className="section-frame reviews-preview" aria-labelledby="reviews-preview-title" id="reviews">
    <div className="section-heading" data-reveal-part><div><h2 id="reviews-preview-title">{t.homeTitle}</h2><p className="muted">{t.homeIntro}</p></div><Link href="/reviews" locale={locale} className="section-link">{t.explore}<ArrowRight className="icon" aria-hidden="true" /></Link></div>
    <div className="review-grid" data-reveal-part>{reviews.map((review) => <ReviewCard key={review.id} review={review} locale={locale} compact />)}</div>
  </section>;
}
