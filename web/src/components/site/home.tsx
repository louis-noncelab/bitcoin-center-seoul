import { ArrowRight } from "lucide-react";
import type { CSSProperties } from "react";
import { SectionFrame } from "@/components/ui/primitives";
import { centerContent } from "@/content/center";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { EventRecord, HighlightRecord } from "@/lib/events-contract";
import { PhotoSlideshow } from "./photo-slideshow";
import { CenterVideos } from "./center-videos";
import { ReviewsPreview } from "./reviews-preview";
import { HighlightsCatalog } from "./events-public";
import { PageMotion } from "./page-motion";
import { ExperienceContent, ProgramsContent } from "./section-content";

function titleLetters(word: string, offset: number) {
  return Array.from(word, (letter, index) => (
    <span className="hero-letter" style={{ "--letter-index": offset + index } as CSSProperties} key={index}>
      {letter}
    </span>
  ));
}

export function Home({ locale, highlights, nextEvent }: { readonly locale: Locale; readonly highlights: readonly HighlightRecord[]; readonly nextEvent: EventRecord | null }) {
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
                <Link href="/programs" locale={locale} className="button" data-variant="secondary">
                  {content.hero.secondaryLink.label}
                </Link>
                <Link href="/about#space-tour" locale={locale} className="section-link">
                  {locale === "ko" ? "공간 둘러보기" : "Inside the center"}<ArrowRight className="icon" aria-hidden="true" />
                </Link>
              </div>
              <Link href="/visit" locale={locale} className="section-link hero-visit-link">
                <span>{content.visit.address.note}</span>
                <span>{locale === "ko" ? "운영시간" : "Regular hours"} {content.visit.hours.lines[0]}<ArrowRight className="icon" aria-hidden="true" /></span>
              </Link>
            </div>
          </div>
          <figure className="hero-figure">
            <PhotoSlideshow locale={locale} photos={["lounge", "community", "exhibition", "gallery"]} hero />
            <figcaption className="sr-only">{locale === "ko" ? "비트코인 센터 서울의 공간과 강의" : "Spaces and classes at Bitcoin Center Seoul"}</figcaption>
          </figure>
        </div>
      </section>
      <div className="container">
        <SectionFrame id="programs" titleId="programs-title">
          <div className="section-heading" data-reveal-part>
            <h2 id="programs-title">{content.programs.title}</h2>
          </div>
          <div data-reveal-part><ProgramsContent locale={locale} highlights={highlights} nextEvent={nextEvent} /></div>
        </SectionFrame>
        <ReviewsPreview locale={locale} />
        <SectionFrame id="journal" titleId="journal-title">
          <div className="journal-preview">
            <div className="journal-heading" data-reveal-part>
              <h2 id="journal-title">{content.journal.title}</h2>
              <p className="body-copy muted">{content.journal.introduction}</p>
              <Link href="/journal" prefetch={false} locale={locale} className="section-link">
                {locale === "ko" ? "현장 스케치 보기" : "View highlights"}<ArrowRight className="icon" aria-hidden="true" />
              </Link>
            </div>
            <HighlightsCatalog highlights={highlights} locale={locale} preview />
          </div>
        </SectionFrame>
        <SectionFrame id="videos" titleId="videos-title">
          <div className="section-heading" data-reveal-part>
            <h2 id="videos-title">{locale === "ko" ? "영상 속 센터" : "The center on film"}</h2>
          </div>
          <CenterVideos locale={locale} />
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
      </div>
      <PageMotion pageKey={`${locale}-home`} />
    </main>
  );
}
