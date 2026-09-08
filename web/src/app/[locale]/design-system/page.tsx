import type { Metadata } from "next";
import Image from "next/image";
import { ArrowDownRight, ArrowUpRight, CalendarDays, MapPin, Menu } from "lucide-react";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { NavigationDisclosure } from "@/components/controls/navigation-disclosure";
import { SelectionTabs } from "@/components/controls/selection-tabs";
import { ThemeToggle } from "@/components/controls/theme-toggle";
import { ActionLink, Button, MediaFrame, SectionFrame } from "@/components/ui/primitives";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { centerMedia } from "@/content/media";
import { TypeComparison } from "@/components/design-system/type-comparison";
import "./specimen.css";

type SpecimenProps = { params: Promise<{ locale: string }> };

const iconSamples = [
  { Icon: ArrowUpRight, label: "외부 링크 / External link" },
  { Icon: CalendarDays, label: "프로그램 일정 / Programme date" },
  { Icon: MapPin, label: "방문 안내 / Visit" },
  { Icon: Menu, label: "탐색 메뉴 / Navigation" },
];

export async function generateMetadata({ params }: SpecimenProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "specimen" });

  return {
    title: t("metadataTitle"),
    description: t("metadataDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function DesignSystemPage({ params }: SpecimenProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "specimen" });
  const otherLocale = locale === "ko" ? "en" : "ko";
  const navigation = [
    { href: "#typography", label: t("typography.title") },
    { href: "#controls", label: t("controls.title") },
    { href: "#media", label: t("media.title") },
  ];
  const palette = [
    { token: "canvas", label: t("typography.canvas") },
    { token: "surface", label: t("typography.surface") },
    { token: "orange", label: t("typography.orange") },
    { token: "blue", label: t("typography.blue") },
  ];

  return (
    <>
      <ActionLink href="#main" className="skip-link">
        {t("skip")}
      </ActionLink>
      <header className="specimen-header container" id="top">
        <p className="wordmark" lang="en">Bitcoin Center Seoul</p>
        <div className="header-controls">
          <Link
            href="/design-system"
            locale={otherLocale}
            hrefLang={otherLocale}
            lang={otherLocale}
            aria-label={t("language")}
            className="button header-control language-control"
            data-variant="quiet"
          >
            {otherLocale === "en" ? "EN" : "한국어"}
          </Link>
          <ThemeToggle label={t("darkMode")} />
          <NavigationDisclosure
            openLabel={t("openMenu")}
            closeLabel={t("closeMenu")}
            navigationLabel={t("navigation")}
            items={navigation}
          />
        </div>
      </header>

      <main id="main" className="container" tabIndex={-1}>
        <section className="specimen-intro" aria-labelledby="specimen-title">
          <p className="specimen-eyebrow">{t("eyebrow")}</p>
          <h1 id="specimen-title">{t("name")}</h1>
          <p className="body-copy muted">{t("introduction")}</p>
          <a href="#typography" className="text-link">
            {t("typography.title")}
            <ArrowDownRight className="icon" aria-hidden="true" />
          </a>
        </section>

        <SectionFrame id="typography" titleId="typography-title">
          <div className="section-heading">
            <h2 id="typography-title">{t("typography.title")}</h2>
            <p className="body-copy muted">{t("typography.description")}</p>
          </div>
          <div className="type-color-layout">
            <div className="type-study">
              <div className="type-pair">
                <h3 lang="ko">비트코인 센터 서울</h3>
                <p className="subheading" lang="en">Bitcoin Center Seoul</p>
              </div>
              <p className="body-copy">{t("typography.body")}</p>
              <div className="type-detail">
                <h4>{t("typography.detail")}</h4>
                <p className="caption muted">{t("typography.caption")}</p>
              </div>
            </div>
            <div className="palette-study">
              <h3 className="title">{t("typography.palette")}</h3>
              <ul className="palette">
                {palette.map((color) => (
                  <li key={color.token}>
                    <span className="color-swatch" data-color={color.token} aria-hidden="true" />
                    <span className="palette-label">{color.label}</span>
                    <span className="caption muted" lang="en">--{color.token}</span>
                  </li>
                ))}
              </ul>
              <p className="caption muted">{t("typography.paletteNote")}</p>
            </div>
          </div>
          <TypeComparison locale={locale} />
        </SectionFrame>

        <SectionFrame id="controls" titleId="controls-title">
          <div className="section-heading">
            <h2 id="controls-title">{t("controls.title")}</h2>
            <p className="body-copy muted">{t("controls.description")}</p>
          </div>
          <SelectionTabs
            label={t("controls.tablist")}
            keyboardHint={t("controls.keyboard")}
            items={[
              {
                id: "meetups",
                label: t("controls.meetupLabel"),
                content: <><h3>{t("controls.meetupTitle")}</h3><p className="body-copy muted">{t("controls.meetupBody")}</p></>,
              },
              {
                id: "exhibitions",
                label: t("controls.exhibitionLabel"),
                content: <><h3>{t("controls.exhibitionTitle")}</h3><p className="body-copy muted">{t("controls.exhibitionBody")}</p></>,
              },
              {
                id: "education",
                label: t("controls.educationLabel"),
                content: <><h3>{t("controls.educationTitle")}</h3><p className="body-copy muted">{t("controls.educationBody")}</p></>,
              },
              {
                id: "merchandise",
                label: t("controls.merchandiseLabel"),
                content: <><h3>{t("controls.merchandiseTitle")}</h3><p className="body-copy muted">{t("controls.merchandiseBody")}</p></>,
              },
            ]}
          />
          <p className="caption muted source-note">{t("controls.source")}</p>
          <div className="action-study">
            <h3 className="title">{t("controls.styles")}</h3>
            <div className="action-row">
              <ActionLink href="#media">
                {t("media.title")}
                <ArrowDownRight className="icon" aria-hidden="true" />
              </ActionLink>
              <ActionLink href="#typography" variant="secondary">
                {t("typography.title")}
              </ActionLink>
              <Button disabled>{t("controls.disabled")}</Button>
            </div>
          </div>
          <section className="icon-study" aria-labelledby="icon-study-title">
            <div>
              <h3 id="icon-study-title" className="title">SVG icon study</h3>
              <p className="caption muted">24px viewbox · 1.6 stroke · currentColor</p>
            </div>
            <ul className="icon-samples">
              {iconSamples.map(({ Icon, label }) => (
                <li key={label}>
                  <Icon className="icon" aria-hidden="true" />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </section>
        </SectionFrame>

        <SectionFrame id="media" titleId="media-title">
          <div className="section-heading">
            <h2 id="media-title">{t("media.title")}</h2>
            <p className="body-copy muted">{t("media.description")}</p>
          </div>
          <div className="media-studies">
            <MediaFrame
              ratio="landscape"
              caption={<><span className="frame-title">{t("media.landscape")}</span><span>{t("media.pending")}</span></>}
            >
              <Image src={centerMedia.lounge.image} alt={centerMedia.lounge.alt[locale]} sizes="(max-width: 767px) 100vw, 65vw" />
            </MediaFrame>
            <MediaFrame
              ratio="portrait"
              caption={<><span className="frame-title">{t("media.portrait")}</span><span>{t("media.pending")}</span></>}
            >
              <Image src={centerMedia.exhibition.image} alt={centerMedia.exhibition.alt[locale]} sizes="(max-width: 767px) 205vw, 75vw" style={{ objectPosition: centerMedia.exhibition.focalPosition.portrait }} />
            </MediaFrame>
          </div>
          <p className="caption muted spacing-note">{t("media.spacing")}</p>
        </SectionFrame>
      </main>
      <footer className="specimen-footer container">
        <p className="caption muted">{t("footer")}</p>
        <a href="#top" className="text-link">
          {t("backToTop")}
          <ArrowUpRight className="icon" aria-hidden="true" />
        </a>
      </footer>
    </>
  );
}
