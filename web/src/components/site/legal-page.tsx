import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { legalDocuments } from "@/content/legal";
import type { LegalKind } from "@/content/legal-types";
import { pageMetadata } from "@/content/site";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import "@/styles/legal.css";

export function legalMetadata(locale: Locale, kind: LegalKind): Metadata {
  const base = pageMetadata(locale);
  const document = legalDocuments[kind][locale];
  const path = `/${kind}`;
  const title = `${document.title} | Bitcoin Center Seoul`;
  return {
    ...base,
    title,
    description: document.description,
    alternates: {
      canonical: `/${locale}${path}`,
      languages: {
        ko: `/ko${path}`,
        en: `/en${path}`,
        "x-default": `/ko${path}`,
      },
    },
    openGraph: {
      ...base.openGraph,
      title,
      description: document.description,
      url: `/${locale}${path}`,
    },
    twitter: { ...base.twitter, title, description: document.description },
  };
}

export function LegalPage({ locale, kind }: { readonly locale: Locale; readonly kind: LegalKind }) {
  const document = legalDocuments[kind][locale];
  return <>
    <SiteHeader locale={locale} />
    <main id="main" className="container legal-page" tabIndex={-1}>
      <Link href="/" locale={locale} className="legal-back">
        <ArrowLeft className="icon" aria-hidden="true" />
        {locale === "ko" ? "홈으로" : "Back to home"}
      </Link>
      <article className="legal-document">
        <header className="legal-heading">
          <p className="legal-eyebrow" lang="en">BITCOIN CENTER SEOUL / LEGAL</p>
          <h1>{document.title}</h1>
          <p className="legal-introduction">{document.description}</p>
          {document.effectiveDate && <p className="legal-date">{document.effectiveDate}</p>}
        </header>
        {document.introduction && <p className="legal-lead">{document.introduction}</p>}
        {document.details && <dl className="legal-details">
          {document.details.map(({ label, value, href }) => <div key={label} className="legal-detail-row">
            <dt>{label}</dt><dd>{href ? <a href={href}>{value}</a> : value}</dd>
          </div>)}
        </dl>}
        {document.sections?.map((section, index) => <section key={section.heading} className="legal-section" aria-labelledby={`legal-section-${index}`}>
          <h2 id={`legal-section-${index}`}>{section.heading}</h2>
          {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          {section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
        </section>)}
      </article>
    </main>
    <SiteFooter locale={locale} />
  </>;
}
