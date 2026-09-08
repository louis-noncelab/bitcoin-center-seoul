import { ArrowUpRight, Mail, Phone } from "lucide-react";
import { SelectionTabs } from "@/components/controls/selection-tabs";
import { ActionLink, MediaFrame } from "@/components/ui/primitives";
import { centerContent } from "@/content/center";
import type { PublicSection } from "@/content/site";
import type { Locale } from "@/i18n/routing";
import { CenterPhoto } from "./center-photo";

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
                  <ActionLink href={`${content.visit.website.href}/#events`} variant="secondary">
                    {locale === "ko" ? "행사 일정 확인" : "Event notices"}
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
                  <ActionLink href={`${content.visit.website.href}/#events`} variant="secondary">
                    {locale === "ko" ? "행사 일정 확인" : "Event notices"}
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
        <ActionLink variant="secondary" href={content.walletExperienceLink.href}>
          {content.walletExperienceLink.label}
          <ArrowUpRight className="icon" aria-hidden="true" />
        </ActionLink>
      </div>
    </div>
  );
}

export function JournalContent({ locale }: { readonly locale: Locale }) {
  const content = centerContent[locale];
  return (
    <div className="journal-layout">
      <div className="journal-photo">
        <CenterPhoto name="education" locale={locale} />
      </div>
      <div className="journal-entries">
        {content.journal.entries.map((entry) => (
          <article key={entry.id} id={entry.id}>
            <p className="caption muted">{entry.category}</p>
            <h2>{entry.title}</h2>
            <p className="body-copy muted">{entry.summary}</p>
          </article>
        ))}
        <ActionLink variant="secondary" href={content.visit.website.href}>
          {locale === "ko"
            ? "활동 사진 더 보기"
            : "More photos from the center"}
          <ArrowUpRight className="icon" aria-hidden="true" />
        </ActionLink>
      </div>
    </div>
  );
}

export function VisitDetails({ locale }: { readonly locale: Locale }) {
  const { visit } = centerContent[locale];
  return (
    <div className="visit-details">
      <div className="visit-address">
        <p className="caption muted">{visit.address.label}</p>
        <p className="visit-street">{visit.address.value}</p>
        <p className="body-copy muted">{visit.address.note}</p>
        {visit.mapLinks.map((link) => (
          <ActionLink key={link.href} href={link.href}>
            {link.label}
            <ArrowUpRight className="icon" aria-hidden="true" />
          </ActionLink>
        ))}
      </div>
      <dl className="visit-facts">
        <div>
          <dt>{visit.hours.label}</dt>
          <dd>
            {visit.hours.lines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </dd>
        </div>
        <div>
          <dt>{visit.contact.label}</dt>
          <dd>
            <ActionLink href={visit.contact.email.href} variant="secondary">
              <Mail className="icon" aria-hidden="true" />{visit.contact.email.label}
            </ActionLink>
            <ActionLink href={visit.contact.phone.href} variant="secondary">
              <Phone className="icon" aria-hidden="true" />{visit.contact.phone.label}
            </ActionLink>
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function SectionContent({
  locale,
  section,
}: {
  readonly locale: Locale;
  readonly section: PublicSection;
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
      return <ProgramsContent locale={locale} heading="h2" />;
    case "experience":
      return <ExperienceContent locale={locale} />;
    case "journal":
      return <JournalContent locale={locale} />;
    case "goods":
      return (
        <div className="goods-detail">
          <CenterPhoto name="retail" locale={locale} hero sizes="(max-width: 767px) 125vw, 100vw" />
          <ActionLink href={content.visit.contact.email.href} variant="secondary" className="section-more">
            <Mail className="icon" aria-hidden="true" />
            {locale === "ko" ? "상품 문의" : "Product inquiries"}
          </ActionLink>
        </div>
      );
    case "visit":
      return <VisitDetails locale={locale} />;
    default:
      return section satisfies never;
  }
}
