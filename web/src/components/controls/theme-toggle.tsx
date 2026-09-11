"use client";

import { Moon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useTheme } from "@/components/controls/theme-provider";
import { Button } from "../ui/primitives";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

let themeTransitionTimer = 0;

function beginThemeTransition() {
  const root = document.documentElement;
  window.clearTimeout(themeTransitionTimer);
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.classList.remove("theme-changing");
    return;
  }
  root.classList.add("theme-changing");
  const raw = getComputedStyle(root).getPropertyValue("--duration-theme").trim();
  const milliseconds = raw.endsWith("ms") ? Number.parseFloat(raw) : Number.parseFloat(raw) * 1000;
  themeTransitionTimer = window.setTimeout(() => root.classList.remove("theme-changing"), (Number.isFinite(milliseconds) ? milliseconds : 350) + 50);
}

export function ThemeToggle({ label }: { label: string }) {
  const mounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
  const { resolvedTheme, setTheme } = useTheme();
  const dark = mounted && resolvedTheme === "dark";

  return (
    <Button
      variant="quiet"
      className="header-control theme-toggle"
      aria-label={label}
      aria-pressed={dark}
      disabled={!mounted}
      onClick={() => {
        beginThemeTransition();
        setTheme(dark ? "light" : "dark");
      }}
    >
      <Moon className="icon" aria-hidden="true" />
      <span className="control-label">{label}</span>
    </Button>
  );
}
