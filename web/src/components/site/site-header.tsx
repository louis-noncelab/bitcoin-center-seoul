import { Suspense } from "react";
import { LocaleLink } from "@/components/controls/locale-link";
import { NavigationDisclosure } from "@/components/controls/navigation-disclosure";
import { NavigationFeedback } from "@/components/controls/navigation-feedback";
import { ThemeToggle } from "@/components/controls/theme-toggle";
import { BrandWordmark } from "@/components/site/brand-wordmark";
import { ActionLink } from "@/components/ui/primitives";
import { centerContent } from "@/content/center";
import type { PublicSection } from "@/content/site";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import "@/styles/navigation.css";

const labels = {
  ko: {
    skip: "본문으로 건너뛰기",
    navigation: "주 메뉴",
    open: "메뉴",
    close: "메뉴 닫기",
    theme: "다크 모드",
    language: "EN · Switch to English",
  },
  en: {
    skip: "Skip to content",
    navigation: "Main navigation",
    open: "Menu",
    close: "Close menu",
    theme: "Dark mode",
    language: "KO · 한국어로 전환",
  },
} as const;

export function SiteHeader({
  locale,
  section,
  home = false,
}: {
  readonly locale: Locale;
  readonly section?: PublicSection;
  readonly home?: boolean;
}) {
  const t = labels[locale];
  const otherLocale = locale === "ko" ? "en" : "ko";
  const navigation = centerContent[locale].nav.filter(
    (item) => item.id !== "home",
  );

  return (
    <>
      <ActionLink href="#main" className="skip-link">
        {t.skip}
      </ActionLink>
      <header className="site-header container" id="top">
        <Link
          href="/"
          locale={locale}
          className="site-wordmark"
          lang="en"
          aria-label="Bitcoin Center Seoul"
          aria-current={home ? "page" : undefined}
        >
          <BrandWordmark />
        </Link>
        <nav className="desktop-navigation" aria-label={t.navigation}>
          {navigation.map((item) => (
            <Link
              key={item.id}
              href={`/${item.id}`}
              prefetch={item.id === "journal" ? false : undefined}
              locale={locale}
              aria-current={section === item.id ? "page" : undefined}
              className="navigation-link"
            >
              <NavigationFeedback label={item.label} />
            </Link>
          ))}
        </nav>
        <div className="header-controls">
          <Suspense fallback={<Link href={section ? `/${section}` : "/"} locale={otherLocale} hrefLang={otherLocale} lang={otherLocale} aria-label={t.language} className="button header-control language-control" data-variant="quiet">{otherLocale === "en" ? "EN" : "KO"}</Link>}>
            <LocaleLink locale={otherLocale} label={t.language} />
          </Suspense>
          <ThemeToggle label={t.theme} />
          <div className="mobile-navigation">
            <NavigationDisclosure
              openLabel={t.open}
              closeLabel={t.close}
              navigationLabel={t.navigation}
              locale={locale}
              items={navigation.map((item) => ({
                href: `/${item.id}`,
                label: item.label,
                current: section === item.id,
              }))}
            />
          </div>
        </div>
      </header>
    </>
  );
}
