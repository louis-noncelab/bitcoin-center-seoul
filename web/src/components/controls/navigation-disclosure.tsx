"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { Button } from "../ui/primitives";
import { NavigationFeedback } from "./navigation-feedback";
import "@/styles/navigation.css";

type NavigationItem = {
  readonly href: string;
  readonly label: string;
  readonly current?: boolean;
};

export function NavigationDisclosure({
  openLabel,
  closeLabel,
  navigationLabel,
  locale,
  items,
}: {
  readonly openLabel: string;
  readonly closeLabel: string;
  readonly navigationLabel: string;
  readonly locale?: Locale;
  readonly items: readonly NavigationItem[];
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const disclosure = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function dismissOutside(event: PointerEvent) {
      if (event.target instanceof Node && !disclosure.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", dismissOutside);
    return () => document.removeEventListener("pointerdown", dismissOutside);
  }, [open]);

  return (
    <div
      ref={disclosure}
      className="navigation-disclosure"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          setOpen(false);
          trigger.current?.focus({ preventScroll: true });
        }
      }}
    >
      <Button
        ref={trigger}
        variant="quiet"
        className="header-control navigation-trigger"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="control-label">{open ? closeLabel : openLabel}</span>
        <span className="sr-only mobile-control-label">
          {open ? closeLabel : openLabel}
        </span>
        <span className="navigation-menu-icon" aria-hidden="true">
          <Menu className="icon navigation-menu-open" />
          <X className="icon navigation-menu-close" />
        </span>
      </Button>
      <nav
        id={id}
        aria-label={navigationLabel}
        data-open={open}
        aria-hidden={!open}
        inert={!open}
        className="disclosure-panel"
      >
        <ul>
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                prefetch={item.href === "/journal" ? false : undefined}
                locale={locale}
                className="navigation-link"
                aria-current={item.current ? "page" : undefined}
                onNavigate={() => {
                  setOpen(false);
                  trigger.current?.focus({ preventScroll: true });
                }}
              >
                <NavigationFeedback label={item.label} />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
