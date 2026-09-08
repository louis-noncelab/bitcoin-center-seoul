import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { SectionContent } from "@/components/site/section-content";
import { PageMotion } from "@/components/site/page-motion";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { centerContent } from "@/content/center";
import { pageMetadata, publicSections } from "@/content/site";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import "@/styles/site.css";
import "@/styles/site-sections.css";

type Props = { readonly params: Promise<{ locale: string; section: string }> };

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    publicSections.map((section) => ({ locale, section })),
  );
}

export async function generateMetadata({ params }: Props) {
  const { locale, section: value } = await params;
  const section = publicSections.find((item) => item === value);
  if (!hasLocale(routing.locales, locale) || !section) notFound();
  return pageMetadata(locale, section);
}

export default async function SectionPage({ params }: Props) {
  const { locale, section: value } = await params;
  const section = publicSections.find((item) => item === value);
  if (!hasLocale(routing.locales, locale) || !section) notFound();
  const content = centerContent[locale][section];
  return (
    <>
      <SiteHeader locale={locale} section={section} />
      <main
        id="main"
        className={`container detail-page detail-${section}`}
        tabIndex={-1}
      >
        <div className="detail-heading">
          <Link href="/" locale={locale} className="button" data-variant="secondary">
            <ArrowLeft className="icon" aria-hidden="true" />
            {locale === "ko" ? "홈으로" : "Back to home"}
          </Link>
          <h1>{content.title}</h1>
          <p className="body-copy muted">{content.introduction}</p>
        </div>
        <SectionContent locale={locale} section={section} />
        {section !== "visit" && (
          <div className="detail-visit">
            <Link
              href="/visit"
              locale={locale}
              className="button"
              data-variant="primary"
            >
              {centerContent[locale].hero.primaryLink.label}
            </Link>
          </div>
        )}
        <PageMotion pageKey={`${locale}-${section}`} />
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
