import { ArrowUpRight, Mail, Phone } from "lucide-react";
import { SelectionTabs } from "@/components/controls/selection-tabs";
import { ActionLink, MediaFrame } from "@/components/ui/primitives";
import { centerContent } from "@/content/center";
import type { PublicSection } from "@/content/site";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { EventRecord, HighlightRecord } from "@/lib/events-contract";
import { CenterPhoto } from "./center-photo";
import { EventsCatalog, HighlightsCatalog } from "./events-public";
import { JournalPagination } from "./journal-pagination";

export function ProgramsContent({
  locale,
  heading: Heading = "h3",
}: {
  readonly locale: Locale;
  readonly heading?: "h2" | "h3";
}) {
  const content = centerContent[locale];
  const [meetups, education] = content.programs.categories;
  return (
    <div className="program-explorer">
      <SelectionTabs
        label={content.nav[2].label}
        orientation="horizontal"
        keyboardHint={
          locale === "ko"
            ? "좌우 방향키로 프로그램을 선택하세요."
            : "Use the left and right arrow keys to select a program."
        }
        items={[
          {
            id: education.id,
            label: education.title,
            content: (
              <>
                <CenterPhoto name="education" locale={locale} />
                <div className="program-description">
                  <Heading>{locale === "ko" ? "비트코인 강의" : "Bitcoin classes"}</Heading>
                  <p>{education.description}</p>
                  <ActionLink href={`/${locale}/programs#events`} variant="secondary">
                    {locale === "ko" ? "행사 일정 확인" : "Event schedule"}
                    <ArrowUpRight className="icon" aria-hidden="true" />
                  </ActionLink>
                </div>
              </>
            ),
          },
          {
            id: meetups.id,
            label: meetups.title,
            content: (
              <>
                <CenterPhoto name="community" locale={locale} sizes="(max-width: 767px) 100vw, 60vw" />
                <div className="program-description">
                  <Heading>{locale === "ko" ? "비트코인 밋업" : "Meetups at the center"}</Heading>
                  <p>{meetups.description}</p>
                  <ActionLink href={`/${locale}/programs#events`} variant="secondary">
                    {locale === "ko" ? "행사 일정 확인" : "Event schedule"}
                    <ArrowUpRight className="icon" aria-hidden="true" />
                  </ActionLink>
                </div>
              </>
            ),
          },
        ]}
      />
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
        <Link className="button" data-variant="secondary" locale={locale} href={content.walletExperienceLink.href}>
          {content.walletExperienceLink.label}
          <ArrowUpRight className="icon" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

export function VisitDetails({ locale }: { readonly locale: Locale }) {
  const { visit } = centerContent[locale];
  return (
    <dl className="visit-details">
      <div className="visit-address">
        <dt>{visit.address.label}</dt>
        <dd>
          <p className="visit-street">{visit.address.value}</p>
          <p className="muted">{visit.address.note}</p>
          <div className="visit-map"><iframe src={visit.mapEmbedSrc} title={locale === "ko" ? "비트코인 센터 서울 위치 지도" : "Bitcoin Center Seoul location map"} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div>
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
          <CenterPhoto name="lounge" locale={locale} hero sizes="(max-width: 767px) 125vw, 100vw" />
          <div className="about-notes">
            {content.about.details.map((detail) => (
              <p key={detail}>{detail}</p>
            ))}
          </div>
          <MediaFrame
            ratio="landscape"
            caption={
              locale === "ko"
                ? "센터에 전시된 비트코인 작품"
                : "Bitcoin artwork on display"
            }
          >
            <CenterPhoto name="gallery" locale={locale} sizes="(max-width: 767px) 134vw, 100vw" />
          </MediaFrame>
        </div>
      );
    case "programs":
      return <><ProgramsContent locale={locale} heading="h2" /><EventsCatalog events={events} locale={locale} today={today} /></>;
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
