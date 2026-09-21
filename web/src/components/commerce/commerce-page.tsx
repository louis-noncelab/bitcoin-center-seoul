import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { ContentLink } from "@/components/controls/content-link";
import { PageMotion } from "@/components/site/page-motion";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import type { Locale } from "@/i18n/routing";
// The shell reuses this branch's detail-page layout, back link and arrival motion, so their
// stylesheets have to travel with it rather than arriving by accident from a sibling import.
import "@/styles/site.css";
import "@/styles/events-public.css";
import "@/styles/commerce.css";

// Mirrors CollectionFrame and NoticesFrame: list pages use the journal layout, detail pages the
// event layout, so the shop sits inside the same page shell as the rest of the site.
export function CommercePage({ locale, title, introduction, backTo = "/shop", backLabel, detail = false, children }: {
  readonly locale: Locale;
  readonly title: string;
  readonly introduction?: string;
  readonly backTo?: string;
  readonly backLabel?: string;
  readonly detail?: boolean;
  readonly children: ReactNode;
}) {
  return <><SiteHeader locale={locale} section="goods" /><main
    id="main"
    tabIndex={-1}
    className={`container detail-page ${detail ? "event-page" : "detail-journal"}`}
  >
    <ContentLink href={backTo} locale={locale} className="button event-back" data-variant="secondary">
      <ArrowLeft className="icon" aria-hidden="true" />
      {backLabel ?? (locale === "ko" ? "상점으로" : "Back to the shop")}
    </ContentLink>
    <div className="detail-heading">
      <h1>{title}</h1>
      {introduction && <p className="body-copy muted">{introduction}</p>}
    </div>
    {detail ? children : <div className="journal-results">{children}</div>}
    <PageMotion pageKey={`${locale}-commerce-${title}`} />
  </main><SiteFooter locale={locale} /></>;
}
