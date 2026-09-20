import { ArrowRight, Mail, Phone } from "lucide-react";
import { MediaFrame } from "@/components/ui/primitives";
import { centerContent } from "@/content/center";
import type { PublicSection } from "@/content/site";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { EventRecord, HighlightRecord } from "@/lib/events-contract";
import { CenterPhoto } from "./center-photo";
import { PhotoSlideshow } from "./photo-slideshow";
import { EventsCatalog, HighlightsCatalog } from "./events-public";
import { JournalPagination } from "./journal-pagination";
import { SpaceTour } from "./space-tour";
import "@/styles/reviews.css";

export function ProgramsContent({ locale, highlights, nextEvent }: { readonly locale: Locale; readonly highlights: readonly HighlightRecord[]; readonly nextEvent: EventRecord | null }) {
  const content = centerContent[locale].programs;
  const photographs = [25, 5, 38].flatMap(id => {
    const record = highlights.find(item => item.id === id);
    const src = record?.images[0] || record?.image;
    return record && src ? [{ src, alt: locale === "en" ? record.titleEn || record.title : record.title }] : [];
  });
  return (
    <div className="program-explorer" data-upcoming={!!nextEvent}>
      <PhotoSlideshow locale={locale} photos={["education", "community", ...photographs]} />
      <div className="program-description">
        <p>{content.description}</p>
        {nextEvent && <Link href={`/programs/${nextEvent.slug || nextEvent.id}`} locale={locale} className="program-next">
          <span className="caption muted">{locale === "ko" ? "다가오는 행사" : "Coming up"}</span>
          <time dateTime={nextEvent.date.trim().replaceAll(".", "-")}>{nextEvent.date.trim().replaceAll("-", ".")}{nextEvent.time ? ` · ${nextEvent.time}` : ""}</time>
          <h3>{locale === "en" ? nextEvent.titleEn || nextEvent.title : nextEvent.title}</h3>
          <span className="section-link">{locale === "ko" ? "행사 자세히 보기" : "Event details"}<ArrowRight className="icon" aria-hidden="true" /></span>
        </Link>}
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
  const cards = {
    exhibition: { link: { label: locale === "ko" ? "도서·작품 둘러보기" : "Explore books & art", href: "/collection" }, photo: "exhibition" as const },
    boardgame: { link: content.boardGameLink, photo: "boardgame" as const },
    wallet: { link: content.walletExperienceLink, photo: "experience" as const },
  };
  return (
    <div className="experience-gallery">
      {content.areas.map((area) => {
        const card = cards[area.id];
        return (
          <div key={area.id} className={area.id === "wallet" ? "experience-object" : undefined} data-reveal-part>
            <MediaFrame ratio="landscape" caption={<><strong>{area.title}</strong><span>{area.description}</span></>}>
              <CenterPhoto name={card.photo} locale={locale} sizes="(max-width: 767px) 134vw, (max-width: 1023px) 67vw, 45vw" />
            </MediaFrame>
            <Link href={card.link.href} locale={locale} className="section-link collection-entry">{card.link.label}<ArrowRight className="icon" aria-hidden="true" /></Link>
          </div>
        );
      })}
    </div>
  );
}

export function VisitDetails({ locale }: { readonly locale: Locale }) {
  const { visit } = centerContent[locale];
  return (
    <div className="visit-layout">
      <section className="visit-first" aria-labelledby="visit-first-title">
        <h2 id="visit-first-title">{locale === "ko" ? "처음 방문하시나요?" : "Your first visit"}</h2>
        <dl>{visit.firstVisit.map(item => <div key={item.question}><dt>{item.question}</dt><dd>{item.answer}</dd></div>)}</dl>
      </section>
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
