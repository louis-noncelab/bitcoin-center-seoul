import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { ContentLink } from "@/components/controls/content-link";
import { PageMotion } from "@/components/site/page-motion";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import type { Locale } from "@/i18n/routing";
import "@/styles/commerce.css";

// Commerce pages sit under the goods section, so they reuse the site shell rather than carrying
// their own header and footer.
export function CommercePage({ locale, title, introduction, backTo = "/goods", children }: {
  readonly locale: Locale;
  readonly title: string;
  readonly introduction?: string;
  readonly backTo?: string;
  readonly children: ReactNode;
}) {
  return <><SiteHeader locale={locale} section="about" /><main id="main" className="container detail-page commerce-page" tabIndex={-1}>
    <ContentLink href={backTo} locale={locale} className="button event-back" data-variant="secondary">
      <ArrowLeft className="icon" aria-hidden="true" />{locale === "ko" ? "굿즈로" : "Back to goods"}
    </ContentLink>
    <div className="detail-heading">
      <h1>{title}</h1>
      {introduction && <p className="muted">{introduction}</p>}
    </div>
    {children}
    <PageMotion pageKey={`${locale}-commerce-${title}`} />
  </main><SiteFooter locale={locale} /></>;
}
