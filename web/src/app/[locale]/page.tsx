import { notFound } from "next/navigation";
import { connection } from "next/server";
import { hasLocale } from "next-intl";
import { OrganizationJsonLd } from "@/components/seo/organization-json-ld";
import { Home } from "@/components/site/home";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { pageMetadata } from "@/content/site";
import { routing } from "@/i18n/routing";
import { listEvents, listHighlights } from "@/server/events";
import { meetupPaymentHrefs } from "@/server/events/tickets";
import { homeEvents, upcomingHomeEvents } from "@/lib/home-events";
import { buildNewsFeed } from "@/lib/news";
import { listNotices } from "@/server/notices";
import { listCollection } from "@/server/collection";
import "@/styles/events-public.css";
import "@/styles/site.css";
import "@/styles/site-sections.css";
import "@/styles/home-expanded.css";

type Props = { readonly params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return pageMetadata(locale);
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  await connection();
  const highlights = await listHighlights();
  const news = buildNewsFeed(listNotices(), highlights);
  const today = new Date().toLocaleDateString("sv-SE", {
    timeZone: "Asia/Seoul",
  });
  const records = listEvents();
  const paymentHrefs = await meetupPaymentHrefs(records.map((event) => event.id));
  const events = homeEvents(records).map((event) => ({ ...event, paymentHref: paymentHrefs[event.id] }));
  const upcoming = upcomingHomeEvents(events, today);
  return (
    <div className="home-expanded">
      <SiteHeader locale={locale} home />
      <Home
        locale={locale}
        highlights={highlights}
        news={news}
        events={events}
        upcoming={upcoming}
        today={today}
        collection={listCollection(false)}
      />
      <SiteFooter locale={locale} />
      <OrganizationJsonLd locale={locale} />
    </div>
  );
}
