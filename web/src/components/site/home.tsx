import { ArrowRight, Clock3, MapPin } from "lucide-react";
import type { CSSProperties } from "react";
import { ActionLink, SectionFrame } from "@/components/ui/primitives";
import { centerContent } from "@/content/center";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { CenterPhoto } from "./center-photo";
import { PageMotion } from "./page-motion";
import { ExperienceContent, ProgramsContent } from "./section-content";

function titleLetters(word: string, offset: number) {
  return Array.from(word, (letter, index) => (
    <span className="hero-letter" style={{ "--letter-index": offset + index } as CSSProperties} key={index}>
      {letter}
    </span>
  ));
}

export function Home({ locale }: { readonly locale: Locale }) {
  const content = centerContent[locale];
  const words: readonly [string, string, string] = locale === "ko" ? ["비트코인", "센터", "서울"] : ["Bitcoin", "Center", "Seoul"];
  return (
    <main id="main" tabIndex={-1} className="site-main">
      <section className="home-hero container" aria-labelledby="hero-title" id="home">
        <div className="hero-heading">
          <div className="hero-copy" id="about">
            <div className="hero-title">
              <h1 id="hero-title" aria-label={words.join(" ")}>
                <span className="hero-name" aria-hidden="true">
                  <span className="hero-word">{titleLetters(words[0], 0)}</span>{" "}
                  <span className="hero-word">{titleLetters(words[1], words[0].length)}</span>
                </span>{" "}
                <span className="hero-city" aria-hidden="true">{titleLetters(words[2], words[0].length + words[1].length)}</span>
              </h1>
            </div>
            <div className="hero-introduction">
              <p className="body-copy muted">{content.hero.introduction}</p>
              <div className="button-row">
                <Link href="/visit" locale={locale} className="button" data-variant="primary">
                  {content.hero.primaryLink.label}<ArrowRight className="icon" aria-hidden="true" />
                </Link>
                <Link href="/programs" locale={locale} className="button" data-variant="secondary">
                  {content.hero.secondaryLink.label}
                </Link>
              </div>
            </div>
          </div>
          <figure className="hero-figure">
            <div className="hero-photo">
              <CenterPhoto name="lounge" locale={locale} hero sizes="(max-width: 767px) 134vw, (min-width: 1280px) 800px, (min-width: 1024px) 66vw, 100vw" />
            </div>
            <figcaption className="sr-only">{locale === "ko" ? "비트코인 센터 서울 라운지" : "The lounge at Bitcoin Center Seoul"}</figcaption>
          </figure>
        </div>
        <div className="hero-caption">
          <ActionLink href={content.visit.mapLinks[0].href} variant="secondary" className="hero-directions">
            <MapPin className="icon" aria-hidden="true" />{content.visit.address.note}
          </ActionLink>
          <span><Clock3 className="icon" aria-hidden="true" />{content.visit.hours.lines[0]}<span className="muted">{locale === "ko" ? "매일 운영 · 공휴일 휴무" : "Daily · Closed on public holidays"}</span></span>
          <Link href="/about" locale={locale} className="section-link">
            {locale === "ko" ? "센터 소개" : "About the center"}<ArrowRight className="icon" aria-hidden="true" />
          </Link>
        </div>
      </section>
      <div className="container">
        <SectionFrame id="programs" titleId="programs-title">
          <div className="section-heading" data-reveal-part>
            <h2 id="programs-title">{content.programs.title}</h2>
            <Link href="/programs" locale={locale} className="section-link">
              {locale === "ko" ? "프로그램 안내" : "Program details"}<ArrowRight className="icon" aria-hidden="true" />
            </Link>
          </div>
          <div data-reveal-part><ProgramsContent locale={locale} /></div>
        </SectionFrame>
        <SectionFrame id="experience" titleId="experience-title">
          <div className="section-heading" data-reveal-part>
            <h2 id="experience-title">{content.experience.title}</h2>
            <Link href="/experience" locale={locale} className="section-link">
              {locale === "ko" ? "전시·체험 안내" : "Exhibition details"}<ArrowRight className="icon" aria-hidden="true" />
            </Link>
          </div>
          <ExperienceContent locale={locale} />
        </SectionFrame>
        <SectionFrame id="journal" titleId="journal-title">
          <div className="journal-preview">
            <div className="journal-heading" data-reveal-part>
              <h2 id="journal-title">{content.journal.title}</h2>
              <p className="body-copy muted">{content.journal.introduction}</p>
              <Link href="/journal" locale={locale} className="section-link">
                {locale === "ko" ? "활동 기록 보기" : "View journal"}<ArrowRight className="icon" aria-hidden="true" />
              </Link>
            </div>
            <div className="record-list">
              {content.journal.entries.map((entry) => (
                <Link href={`/journal#${entry.id}`} locale={locale} key={entry.id} data-reveal-part>
                  <span className="caption muted">{entry.category}</span>
                  <span className="record-content"><strong>{entry.title}</strong><span className="record-summary">{entry.summary}</span></span>
                  <ArrowRight className="icon" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        </SectionFrame>
        <SectionFrame id="goods" titleId="goods-title">
          <div className="goods-preview">
            <div className="goods-copy" data-reveal-part>
              <h2 id="goods-title">{content.goods.title}</h2>
              <div className="goods-information">
                <p className="body-copy muted">{content.goods.introduction}</p>
                <Link href="/goods" locale={locale} className="section-link">
                  {locale === "ko" ? "굿즈 안내" : "Goods details"}<ArrowRight className="icon" aria-hidden="true" />
                </Link>
              </div>
            </div>
            <div className="goods-photographs">
              <div className="goods-photo goods-detail-photo" data-reveal-part>
                <CenterPhoto name="retailDetail" locale={locale} sizes="(max-width: 767px) 280vw, (min-width: 1280px) 1613px, 140vw" />
              </div>
              <div className="goods-photo" data-reveal-part>
                <CenterPhoto name="retail" locale={locale} sizes="(max-width: 767px) 134vw, (min-width: 1280px) 768px, 67vw" />
              </div>
            </div>
          </div>
        </SectionFrame>
      </div>
      <PageMotion pageKey={`${locale}-home`} />
    </main>
  );
}
