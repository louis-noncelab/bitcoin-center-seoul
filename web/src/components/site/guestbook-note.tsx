"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Dialog } from "@/components/ui/confirmation-dialog";
import { guestbookCopy } from "@/content/guestbook";
import type { Locale } from "@/i18n/routing";

export function GuestbookNote({ id, name, reference, locale, photoCount, children }: {
  readonly id: number; readonly name: string; readonly locale: Locale;
  readonly reference: string; readonly photoCount: number; readonly children: ReactNode;
}) {
  const summary = useRef<HTMLElement>(null);
  const details = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  const t = guestbookCopy[locale];
  useEffect(() => {
    const wasExpanded = details.current?.open;
    if (details.current) details.current.open = false;
    function revealLinkedNote() {
      const linked = window.location.hash === `#entry-${id}`;
      if (linked) {
        summary.current?.closest("article")?.scrollIntoView({ block: "start" });
        summary.current?.focus({ preventScroll: true });
      }
      setOpen(linked);
    }
    if (window.location.hash === `#entry-${id}`) revealLinkedNote();
    else if (wasExpanded) {
      summary.current?.focus({ preventScroll: true });
      setOpen(true);
    }
    window.addEventListener("hashchange", revealLinkedNote);
    return () => window.removeEventListener("hashchange", revealLinkedNote);
  }, [id]);
  return <><details ref={details} className="guestbook-note">
    <summary ref={summary} onClick={(event) => { event.preventDefault(); if (details.current) details.current.open = false; summary.current?.focus({ preventScroll: true }); setOpen(true); }}>
      <span>{t.read}</span>
      <span className="sr-only">: {name}</span>
      {photoCount > 0 && <span className="guestbook-photo-count">{t.photos} {photoCount}</span>}
      <ChevronDown className="icon" aria-hidden="true" />
    </summary>
    {!open && <div className="guestbook-note-body">{children}</div>}
  </details>
    <Dialog open={open} onClose={() => setOpen(false)} title={name} description={reference} className="guestbook-reader">
      <button type="button" className="button guestbook-reader-close" data-variant="quiet" onClick={() => setOpen(false)}>{t.close}</button>
      {open && <div className="guestbook-reader-content" tabIndex={0}>{children}</div>}
    </Dialog>
  </>;
}
