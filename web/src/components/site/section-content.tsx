import { ArrowRight, Mail, Phone } from "lucide-react";
import { MediaFrame } from "@/components/ui/primitives";
import { centerContent } from "@/content/center";
import type { PublicSection } from "@/content/site";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { EventRecord, HighlightRecord } from "@/lib/events-contract";
import { CenterPhoto } from "./center-photo";
import { EventsCatalog, HighlightsCatalog } from "./events-public";
import { JournalPagination } from "./journal-pagination";
import { SpaceTour } from "./space-tour";
import "@/styles/reviews.css";

export function ProgramsContent({ locale }: { readonly locale: Locale }) {
  const content = centerContent[locale].programs;
  return (
    <div className="program-explorer">
      <CenterPhoto name="education" locale={locale} sizes="(max-width: 767px) 100vw, 60vw" />
      <div className="program-description">
        <p>{content.description}</p>
        <Link href="/programs#events" locale={locale} className="section-link">
          {locale === "ko" ? "행사 일정 보기" : "View event schedule"}
          <ArrowRight className="icon" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

export function ExperienceContent({ locale }: { readonly locale: Locale }) {
  const content = centerContent[locale].experience;
  return (
    <div className="experience-gallery">
      <div data-reveal-part>
        <MediaFrame
          ratio="landscape"
          caption={
            <>
              <strong>{content.areas[0].title}</strong>
              <span>{content.areas[0].description}</span>
            </>
          }
        >
          <CenterPhoto name="exhibition" locale={locale} sizes="(max-width: 767px) 134vw, 67vw" />
        </MediaFrame>
        <Link href="/collection" locale={locale} className="section-link collection-entry">{locale === "ko" ? "도서·작품 둘러보기" : "Explore books & art"}<ArrowRight className="icon" aria-hidden="true" /></Link>
      </div>
      <div className="experience-object" data-reveal-part>
        <MediaFrame
          ratio="landscape"
          caption={
            <>
              <strong>{content.areas[1].title}</strong>
              <span>{content.areas[1].description}</span>
            </>
          }
        >
          <CenterPhoto
            name="experience"
            locale={locale}
            sizes="(max-width: 767px) 100vw, 50vw"
          />
        </MediaFrame>
        <Link className="section-link collection-entry" locale={locale} href={content.walletExperienceLink.href}>
          {content.walletExperienceLink.label}
          <ArrowRight className="icon" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

export function VisitDetails({ locale }: { readonly locale: Locale }) {
  const { visit } = centerContent[locale];
  return (
    <div className="visit-layout">
      <div className="visit-map"><iframe src={visit.mapEmbedSrc} title={locale === "ko" ? "비트코인 센터 서울 위치 지도" : "Bitcoin Center Seoul location map"} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div>
      <dl className="visit-details">
      <div className="visit-address">
        <dt>{visit.address.label}</dt>
        <dd>
          <p className="visit-street">{visit.address.value}</p>
          <p className="muted">{visit.address.note}</p>
        </dd>
      </div>
      <div>
        <dt>{visit.hours.label}</dt>
        <dd>
          {visit.hours.lines.map((line, index) => (
            <span key={line} className={index === 0 ? "visit-time" : "muted"}>{line}</span>
          ))}
        </dd>
      </div>
      <div>
        <dt>{visit.contact.label}</dt>
        <dd>
          <a href={visit.contact.email.href} className="contact-link">
            <Mail className="icon" aria-hidden="true" />{visit.contact.email.label}
          </a>
          <a href={visit.contact.phone.href} className="contact-link">
            <Phone className="icon" aria-hidden="true" />{visit.contact.phone.label}
          </a>
        </dd>
      </div>
      </dl>
    </div>
  );
}

export function SectionContent({
  locale,
  section,
  events = [],
  highlights = [],
  today = "",
  pagination = { page: 1, totalPages: 1 },
}: {
  readonly locale: Locale;
  readonly section: PublicSection;
  readonly events?: readonly EventRecord[];
  readonly highlights?: readonly HighlightRecord[];
  readonly today?: string;
  readonly pagination?: { readonly page: number; readonly totalPages: number };
}) {
  const content = centerContent[locale];
  switch (section) {
    case "about":
      return (
        <div className="about-detail">
          <SpaceTour locale={locale} />
          <section className="about-gallery section-frame" aria-labelledby="about-gallery-title">
            <h2 id="about-gallery-title" data-reveal-part>{content.about.galleryTitle}</h2>
            <div className="about-gallery-grid">
              {content.about.spaces.map((space) => (
                <div key={space.photo} data-reveal-part>
                  <MediaFrame caption={<><h3>{space.title}</h3><p>{space.description}</p></>}>
                    <CenterPhoto name={space.photo} locale={locale} sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw" />
                  </MediaFrame>
                </div>
              ))}
            </div>
          </section>
          <div className="section-frame about-reviews-link">
            <p>{locale === "ko" ? "다녀간 사람들에게는 어떤 공간이었을까요?" : "What was it like for the people who visited?"}</p>
            <Link href="/reviews" locale={locale} className="section-link">{locale === "ko" ? "방문 후기 둘러보기" : "Explore visitor stories"}<ArrowRight className="icon" aria-hidden="true" /></Link>
          </div>
        </div>
      );
    case "programs":
      return <EventsCatalog events={events} locale={locale} today={today} />;
    case "experience":
      return <ExperienceContent locale={locale} />;
    case "journal":
      return <><div className="journal-results" key={pagination.page}><HighlightsCatalog highlights={highlights} locale={locale} /></div><JournalPagination locale={locale} pagination={pagination} /></>;
    case "visit":
      return <VisitDetails locale={locale} />;
    default:
      return section satisfies never;
  }
}
