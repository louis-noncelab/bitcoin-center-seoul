import { ArrowLeft } from "lucide-react";
import { notFound, permanentRedirect } from "next/navigation";
import { connection } from "next/server";
import { hasLocale } from "next-intl";
import { HighlightDetail } from "@/components/site/events-public";
import { PageMotion } from "@/components/site/page-motion";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { recordMetadata } from "@/content/site";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getHighlightByPath } from "@/server/events";
import "@/styles/events-public.css";
import "@/styles/reviews.css";
import "@/styles/site.css";

type Props = { readonly params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale, id: value } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  await connection();
  const highlight = await getHighlightByPath(value);
  if (!highlight) notFound();
  return recordMetadata(locale, "journal", highlight.slug || highlight.id, locale === "ko" ? highlight.title : highlight.titleEn || highlight.title, locale === "ko" ? highlight.description : highlight.descriptionEn || highlight.description);
}

export default async function HighlightPage({ params }: Props) {
  const { locale, id: value } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  await connection();
  const highlight = await getHighlightByPath(value);
  if (!highlight) notFound();
  const canonical = String(highlight.slug || highlight.id);
  if (value !== canonical) permanentRedirect(`/${locale}/journal/${canonical}`);
  const title = locale === "ko" ? highlight.title : highlight.titleEn || highlight.title;
  return (
    <>
      <SiteHeader locale={locale} section="journal" />
      <main id="main" className="container detail-page event-page" tabIndex={-1}>
        <Link href="/journal" prefetch={false} locale={locale} className="button event-back" data-variant="secondary"><ArrowLeft className="icon" aria-hidden="true" />{locale === "ko" ? "현장 스케치로" : "Back to highlights"}</Link>
        <div className="detail-heading">
          <h1>{title}</h1>
        </div>
        <HighlightDetail highlight={highlight} locale={locale} />
        <PageMotion pageKey={`${locale}-journal-${highlight.id}`} />
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
