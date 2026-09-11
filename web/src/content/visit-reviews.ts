import type { ReviewRecord } from "@/lib/reviews-contract";

export type VisitReview = {
  readonly id: number;
  readonly kind: ReviewRecord["kind"];
  readonly url: string;
  readonly slug: string;
  readonly author: string;
  readonly date: string;
  readonly title: Readonly<Record<"ko" | "en", string>>;
  readonly summary: Readonly<Record<"ko" | "en", string>>;
  readonly featureTitle: Readonly<Record<"ko" | "en", string>>;
  readonly image: string;
};
export function visitReview(record: ReviewRecord): VisitReview {
  return { slug: record.description ? record.slug : "", id: record.id, kind: record.kind, url: record.url, author: record.author, date: record.date,
    title: { ko: record.title, en: record.titleEn || record.title },
    summary: { ko: record.summary, en: record.summaryEn || record.summary },
    featureTitle: { ko: record.feature_title || record.title, en: record.feature_titleEn || record.feature_title || record.titleEn || record.title },
    image: record.image };
}
