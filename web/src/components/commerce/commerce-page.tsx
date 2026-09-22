import type { ReactNode } from "react";
import { DisplayUnitProvider } from "@/components/commerce/display-unit";
import { getCommerceSettings } from "@/server/commerce/settings";
import { getExchangeRate } from "@/server/money";
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
export async function CommercePage({ locale, title, introduction, backTo = "/shop", backLabel, detail = false, focus = false, section = "goods", children }: {
  readonly locale: Locale;
  readonly title: string;
  readonly introduction?: string;
  readonly backTo?: string;
  readonly backLabel?: string;
  readonly detail?: boolean;
  readonly focus?: false | "narrow" | "wide";
  readonly section?: "goods" | "programs";
  readonly children: ReactNode;
}) {
  const settings = await getCommerceSettings().catch(() => null);
  const rate = await getExchangeRate().then((value) => value.krwPerBtc).catch(() => null);
  return <DisplayUnitProvider unit={settings?.productDisplayUnit ?? "SATS"} rate={rate}><SiteHeader locale={locale} section={section} /><main
    id="main"
    tabIndex={-1}
    className={`container detail-page ${detail ? "event-page" : "detail-journal"}${focus ? ` commerce-focus${focus === "wide" ? " commerce-focus-wide" : ""}` : ""}`}
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
  </main><SiteFooter locale={locale} /></DisplayUnitProvider>;
}
