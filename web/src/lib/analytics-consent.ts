export const analyticsConsentCookieName = "bcs-analytics-consent";
export const analyticsSettingsEventName = "bcs-analytics-settings";
export type AnalyticsConsent = "granted" | "denied";

export function parseAnalyticsConsent(value: string | undefined): AnalyticsConsent | null {
  return value === "granted" || value === "denied" ? value : null;
}

export function analyticsConsentSettings(choice: AnalyticsConsent) {
  return { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: choice };
}

export function readAnalyticsConsent(): AnalyticsConsent | null {
  try {
    return parseAnalyticsConsent(document.cookie.split("; ").find((cookie) => cookie.startsWith(`${analyticsConsentCookieName}=`))?.split("=")[1]);
  } catch { return null; }
}

export function applyAnalyticsConsent(choice: AnalyticsConsent): void {
  try {
    const target = window as unknown as { dataLayer?: unknown[] };
    target.dataLayer ??= [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, prefer-rest-params -- Google reads gtag commands as Arguments objects.
    function gtag(..._args: unknown[]) { target.dataLayer!.push(arguments); }
    gtag("consent", "update", analyticsConsentSettings(choice));
  } catch {}
  if (choice === "denied") {
    try {
      const domains = window.location.hostname.split(".");
      for (const cookie of document.cookie.split("; ")) {
        const name = cookie.split("=")[0] ?? "";
        if (name !== "_ga" && !name.startsWith("_ga_")) continue;
        const expired = `${name}=; path=/; max-age=0; samesite=lax`;
        document.cookie = expired;
        for (let i = 0; i < domains.length - 1; i++) document.cookie = `${expired}; domain=${domains.slice(i).join(".")}`;
      }
    } catch {}
  }
}

export function saveAnalyticsConsent(choice: AnalyticsConsent): void {
  applyAnalyticsConsent(choice);
  try {
    document.cookie = `${analyticsConsentCookieName}=${choice}; path=/; max-age=15552000; samesite=lax${window.location.protocol === "https:" ? "; secure" : ""}`;
  } catch {}
  // The cookie is authoritative; local storage only notifies other open tabs.
  try { window.localStorage.setItem(analyticsConsentCookieName, choice); } catch {}
}
