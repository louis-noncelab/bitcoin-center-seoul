"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/primitives";
import { Link, usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { analyticsConsentCookieName, analyticsSettingsEventName, applyAnalyticsConsent, readAnalyticsConsent, saveAnalyticsConsent, type AnalyticsConsent } from "@/lib/analytics-consent";
import { isPrivateAnalyticsPath } from "@/lib/analytics-path";
import "@/styles/analytics-consent.css";

const copy = {
  ko: {
    title: "분석 쿠키를 허용할까요?",
    description: "어떤 페이지가 도움이 되는지 살펴보고 사이트를 개선하는 데 사용합니다. 허용하면 Google Analytics가 방문과 재방문을 측정하는 쿠키를 저장합니다. 거부해도 쿠키 없는 이용 정보는 Google에 전송됩니다. 광고에는 사용하지 않습니다.",
    allow: "분석 쿠키 허용", deny: "분석 쿠키 거부", policy: "개인정보 처리방침", settings: "쿠키 설정",
  },
  en: {
    title: "Allow analytics cookies?",
    description: "We use analytics to understand which pages help visitors and improve the site. Allowing cookies lets Google Analytics measure visits and return visits. If you decline, cookieless usage information is still sent to Google. We do not use it for advertising.",
    allow: "Allow analytics cookies", deny: "Decline analytics cookies", policy: "Privacy policy", settings: "Cookie settings",
  },
};

export function AnalyticsConsentBanner({ locale, initialConsent }: { readonly locale: Locale; readonly initialConsent: AnalyticsConsent | null }) {
  const [open, setOpen] = useState(initialConsent === null);
  const title = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const text = copy[locale];
  useEffect(() => {
    const refresh = () => {
      const choice = readAnalyticsConsent();
      applyAnalyticsConsent(choice ?? "denied");
      setOpen(choice === null);
    };
    const storage = (event: StorageEvent) => { if (event.key === analyticsConsentCookieName || event.key === null) refresh(); };
    const show = () => {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setOpen(true);
      requestAnimationFrame(() => title.current?.focus());
    };
    window.addEventListener("storage", storage);
    window.addEventListener("pageshow", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener(analyticsSettingsEventName, show);
    return () => {
      window.removeEventListener("storage", storage);
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener(analyticsSettingsEventName, show);
    };
  }, []);

  if (!open) return null;
  const choose = (choice: AnalyticsConsent) => {
    saveAnalyticsConsent(choice);
    setOpen(false);
    (returnFocus.current ?? document.getElementById("main"))?.focus({ preventScroll: true });
  };
  return (
    <section className="analytics-consent" aria-labelledby="analytics-consent-title">
      <div className="analytics-consent-copy">
        <h2 id="analytics-consent-title" ref={title} tabIndex={-1}>{text.title}</h2>
        <p>{text.description} <Link href="/privacy-policy" locale={locale}>{text.policy}</Link></p>
      </div>
      <div className="analytics-consent-actions">
        <Button variant="secondary" onClick={() => choose("denied")}>{text.deny}</Button>
        <Button variant="secondary" onClick={() => choose("granted")}>{text.allow}</Button>
      </div>
    </section>
  );
}

export function AnalyticsSettingsButton({ locale }: { readonly locale: Locale }) {
  const pathname = usePathname();
  if (process.env.NEXT_PUBLIC_ANALYTICS_APPROVED !== "true" || !process.env.NEXT_PUBLIC_GTM_ID?.trim() || isPrivateAnalyticsPath(pathname)) return null;
  return <Button variant="quiet" className="analytics-settings" onClick={() => window.dispatchEvent(new Event(analyticsSettingsEventName))}>{copy[locale].settings}</Button>;
}
