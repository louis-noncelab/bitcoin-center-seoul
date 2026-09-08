"use client";

import { Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "../ui/primitives";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

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
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      <Moon className="icon" aria-hidden="true" />
      <span className="control-label">{label}</span>
    </Button>
  );
}
