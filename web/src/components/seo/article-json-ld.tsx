import { centerContent } from "@/content/center";
import { defaultShareImage, shareCardPath, type ShareKind } from "@/content/share";
import { siteOrigin } from "@/content/site";
import type { Locale } from "@/i18n/routing";
import { markdownExcerpt } from "@/lib/markdown";

export function articleStructuredData(input: {
  readonly locale: Locale;
  readonly section: "journal" | "reviews";
  readonly id: string | number;
  readonly title: string;
  readonly description: string;
  readonly date?: string;
  readonly image?: string;
}) {
  const path = input.section === "journal" ? `/journal/${input.id}` : `/reviews/${input.id}`;
  const url = `${siteOrigin}/${input.locale}${path}`;
  const kind: ShareKind = input.section === "journal" ? "journal" : "reviews";
  const image = `${siteOrigin}${input.image ? shareCardPath(kind, input.id) : defaultShareImage}`;
  const published = input.date?.trim().replaceAll(".", "-");
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: markdownExcerpt(input.description),
    image: [image],
    inLanguage: input.locale,
    mainEntityOfPage: url,
    ...(published ? { datePublished: published } : {}),
    author: { "@type": "Organization", name: centerContent[input.locale].hero.title, url: siteOrigin },
    publisher: { "@type": "Organization", name: centerContent[input.locale].hero.title, url: siteOrigin, logo: { "@type": "ImageObject", url: `${siteOrigin}/brand/bcs-horizontal-color.png` } },
  };
}

export function ArticleJsonLd({ data }: { readonly data: ReturnType<typeof articleStructuredData> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
