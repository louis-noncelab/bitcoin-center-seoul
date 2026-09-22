import { ArrowLeft } from "lucide-react";
import { notFound, permanentRedirect } from "next/navigation";
import { connection } from "next/server";
import { hasLocale } from "next-intl";
import { EventDetail } from "@/components/site/events-public";
import { PageMotion } from "@/components/site/page-motion";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { recordMetadata } from "@/content/site";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { seoulDate } from "@/lib/center-status";
import { getEventByPath } from "@/server/events";
import { meetupPaymentHrefs } from "@/server/events/tickets";
import "@/styles/events-public.css";
import "@/styles/event-booking.css";
import "@/styles/reviews.css";
import "@/styles/site.css";

type Props = { readonly params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale, id: value } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  await connection();
  const event = await getEventByPath(value);
  if (!event) notFound();
  return recordMetadata(locale, "programs", event.slug || event.id, locale === "ko" ? event.title : event.titleEn || event.title, locale === "ko" ? event.description : event.descriptionEn || event.description);
}

export default async function EventPage({ params }: Props) {
  const { locale, id: value } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  await connection();
  const event = await getEventByPath(value);
  if (!event) notFound();
  const canonical = String(event.slug || event.id);
  if (value !== canonical) permanentRedirect(`/${locale}/programs/${canonical}`);
  const title = locale === "ko" ? event.title : event.titleEn || event.title;
  return (
    <>
      <SiteHeader locale={locale} section="programs" />
      <main id="main" className="container detail-page event-page" tabIndex={-1}>
        <Link href="/programs" locale={locale} className="button event-back" data-variant="secondary"><ArrowLeft className="icon" aria-hidden="true" />{locale === "ko" ? "프로그램으로" : "Back to programs"}</Link>
        <div className="detail-heading">
          <h1>{title}</h1>
        </div>
        <EventDetail event={event} locale={locale} today={seoulDate()} paymentHref={(await meetupPaymentHrefs([event.id]))[event.id]} />
        <PageMotion pageKey={`${locale}-program-${event.id}`} />
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
