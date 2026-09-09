"use client";

import { useEffect, type ComponentProps } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

let navigationFrame = 0;

type Props = Omit<ComponentProps<typeof Link>, "href" | "locale" | "scroll" | "onNavigate"> & {
  readonly href: string;
  readonly locale: Locale;
};

export function ContentLink({ href, locale, ...props }: Props) {
  const router = useRouter();
  useEffect(() => () => cancelAnimationFrame(navigationFrame), []);

  return <Link {...props} href={href} locale={locale} scroll={false} prefetch={false} onNavigate={(event) => {
    event.preventDefault();
    cancelAnimationFrame(navigationFrame);
    const navigate = () => { navigationFrame = 0; router.push(href, { locale, scroll: false }); };
    const startY = window.scrollY;
    if (startY === 0 || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.scrollTo({ top: 0, behavior: "instant" });
      navigate();
      return;
    }
    const cssDuration = getComputedStyle(document.documentElement).getPropertyValue("--duration-page").trim();
    const duration = parseFloat(cssDuration) * (cssDuration.endsWith("ms") ? 1 : 1000);
    const started = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      window.scrollTo({ top: startY * (1 - progress) ** 3, behavior: "instant" });
      if (progress < 1) navigationFrame = requestAnimationFrame(step);
      else navigate();
    };
    navigationFrame = requestAnimationFrame(step);
  }} />;
}
