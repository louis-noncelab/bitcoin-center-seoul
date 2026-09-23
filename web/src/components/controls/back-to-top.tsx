"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { ActionLink } from "@/components/ui/primitives";
import type { Locale } from "@/i18n/routing";
import { usePathname } from "@/i18n/navigation";

export function BackToTop({ locale }: { readonly locale: Locale }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const update = () => setVisible(window.scrollY > 0);
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("pageshow", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("pageshow", update);
    };
  }, []);

  if (pathname === "/checkout") return null;

  return (
    <ActionLink href="#top" variant="quiet" className="back-to-top" data-visible={visible}
      aria-label={locale === "ko" ? "맨 위로" : "Back to top"} aria-hidden={!visible} tabIndex={visible ? 0 : -1}
      onClick={(event) => {
        event.preventDefault();
        document.getElementById("main")?.focus({ preventScroll: true });
        window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
      }}>
      <ArrowUp className="icon" aria-hidden="true" />
    </ActionLink>
  );
}
