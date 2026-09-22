"use client";

import { ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { SlideRegion } from "../ui/slide-region";
import { Button } from "../ui/primitives";
import { NavigationFeedback } from "./navigation-feedback";
import "@/styles/navigation.css";
import "@/styles/slide-region.css";

type NavigationItem = {
  readonly href: string;
  readonly label: string;
  readonly current?: boolean;
  readonly children?: readonly {
    readonly href: string;
    readonly label: string;
  }[];
};

export function NavigationDisclosure({
  openLabel,
  closeLabel,
  navigationLabel,
  locale,
  items,
  footer,
}: {
  readonly openLabel: string;
  readonly closeLabel: string;
  readonly navigationLabel: string;
  readonly locale?: Locale;
  readonly items: readonly NavigationItem[];
  readonly footer?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const disclosure = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function dismissOutside(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !disclosure.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }
    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        trigger.current?.focus({ preventScroll: true });
      }
    }
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [open]);

  return (
    <div
      ref={disclosure}
      className="navigation-disclosure"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
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
        <h2 className="navigation-panel-title">
          {locale === "ko" ? "전체 메뉴" : "Explore the center"}
        </h2>
        <ul className="navigation-groups">
          {items.map((item) => (
            <li key={item.href}>
              {item.children ? (
                <>
                  <button
                    type="button"
                    className="navigation-group-toggle"
                    aria-expanded={expanded === item.href}
                    aria-controls={`${id}-${item.href.slice(1)}`}
                    aria-current={item.current ? "true" : undefined}
                    data-current={item.current || undefined}
                    onClick={() =>
                      setExpanded(expanded === item.href ? null : item.href)
                    }
                  >
                    {item.label}
                    <ChevronDown className="icon" aria-hidden="true" />
                  </button>
                  <SlideRegion id={`${id}-${item.href.slice(1)}`} open={expanded === item.href}>
                  <div className="navigation-submenu">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        locale={locale}
                        prefetch={false}
                        onNavigate={() => {
                          setOpen(false);
                          trigger.current?.focus({ preventScroll: true });
                        }}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                  </SlideRegion>
                </>
              ) : (
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
              )}
            </li>
          ))}
        </ul>
        {footer && (
          <div
            className="navigation-utilities"
            onClick={(event) => {
              if (
                event.target instanceof Element &&
                event.target.closest("a")
              ) {
                setOpen(false);
                trigger.current?.focus({ preventScroll: true });
              }
            }}
          >
            {footer}
          </div>
        )}
      </nav>
    </div>
  );
}
