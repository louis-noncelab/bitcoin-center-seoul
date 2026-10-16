import { connection } from "next/server";
import { publicReviews } from "@/server/reviews";
import { visitReview } from "@/content/visit-reviews";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { PageMotion } from "@/components/site/page-motion";
import { ReviewsCatalog, ReviewsFeature, reviewFilters } from "@/components/site/reviews-public";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { NewsHeader } from "@/components/site/news-content";
import { reviewCopy } from "@/content/review-copy";
import { pageMetadata } from "@/content/site";
import { routing } from "@/i18n/routing";
import "@/styles/site.css";
import "@/styles/reviews.css";

type Props = { readonly params: Promise<{ locale: string }>; readonly searchParams: Promise<{ type?: string | string[] }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = reviewCopy[locale];
  const base = pageMetadata(locale);
  const title = `${t.title} | Bitcoin Center Seoul`;
  return { ...base, title, description: t.description,
    alternates: { canonical: `/${locale}/reviews`, languages: { ko: "/ko/reviews", en: "/en/reviews", "x-default": "/ko/reviews" } },
    openGraph: { ...base.openGraph, title, description: t.description, url: `/${locale}/reviews` },
    twitter: { ...base.twitter, title, description: t.description },
  };
}

export default async function ReviewsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  await connection();
  const { records, featured } = await publicReviews();
  const reviews = records.map(visitReview);
  const { type } = await searchParams;
  const filter = reviewFilters.find((kind) => kind === type) ?? "all";
  return <><SiteHeader locale={locale} section="news" /><main id="main" tabIndex={-1} className="container news-page reviews-page">
    <NewsHeader locale={locale} current="reviews" />
    <ReviewsFeature locale={locale} review={featured ? visitReview(featured) : null} /><ReviewsCatalog locale={locale} filter={filter} reviews={reviews} />
    <PageMotion pageKey={`${locale}-reviews`} />
  </main><SiteFooter locale={locale} /></>;
}
