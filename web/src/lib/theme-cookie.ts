export const themeCookieName = "bcs-theme";
export type SiteTheme = "light" | "dark";

export function parseSiteTheme(value: string | undefined): SiteTheme {
  return value === "dark" ? "dark" : "light";
}

export function persistSiteTheme(theme: SiteTheme) {
  document.cookie = `${themeCookieName}=${theme}; path=/; max-age=31536000; samesite=lax`;
  window.localStorage.setItem(themeCookieName, theme);
}
