export const analyticsConsentCookieName = "bcs-analytics-consent";
export type AnalyticsConsent = "granted" | "denied";

export function parseAnalyticsConsent(value: string | undefined): AnalyticsConsent | null {
  return value === "granted" || value === "denied" ? value : null;
}

export function analyticsConsentSettings(choice: AnalyticsConsent) {
  return { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: choice };
}
