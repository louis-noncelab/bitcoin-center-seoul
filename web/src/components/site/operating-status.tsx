"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { centerStatusInputSchema, centerStatusLabels, type CenterStatus } from "@/lib/center-status";

export function OperatingStatus({ locale }: { readonly locale: Locale }) {
  const [status, setStatus] = useState<CenterStatus | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    let busy = false;
    async function refresh() {
      if (document.hidden || busy) return;
      busy = true;
      try {
        const response = await fetch("/api/center-status", { cache: "no-store", signal: AbortSignal.any([abort.signal, AbortSignal.timeout(10_000)]) });
        if (!response.ok) throw new Error("Status unavailable");
        const { data } = z.object({ data: centerStatusInputSchema }).parse(await response.json());
        if (!abort.signal.aborted) setStatus(data.status);
      } catch {
        if (!abort.signal.aborted) setStatus(null);
      } finally { busy = false; }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { abort.abort(); window.clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  const key = status ?? "unknown";
  const label = centerStatusLabels[locale][key];
  return <Link href="/visit" locale={locale} className="operating-status" data-status={key} aria-label={`${label} · ${locale === "ko" ? "방문 안내" : "Visit information"}`}>
    <span key={key} className="operating-status-content"><span className="operating-status-dot" aria-hidden="true" /><span>{label}</span></span>
  </Link>;
}
