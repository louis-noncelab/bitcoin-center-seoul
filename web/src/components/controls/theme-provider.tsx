"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { persistSiteTheme, type SiteTheme } from "@/lib/theme-cookie";

const ThemeContext = createContext<{ readonly resolvedTheme: SiteTheme; readonly setTheme: (theme: SiteTheme) => void } | null>(null);

export function ThemeProvider({ children, defaultTheme }: { readonly children: ReactNode; readonly defaultTheme: SiteTheme }) {
  const [theme, setThemeState] = useState<SiteTheme>(defaultTheme);
  const setTheme = useCallback((next: SiteTheme) => {
    setThemeState(next);
    document.documentElement.setAttribute("data-theme", next);
    persistSiteTheme(next);
  }, []);
  return <ThemeContext.Provider value={{ resolvedTheme: theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider");
  return value;
}
