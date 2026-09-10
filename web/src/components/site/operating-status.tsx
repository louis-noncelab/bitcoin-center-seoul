"use client";

import { useEffect, useState } from "react";
import { AudioLines, Clock3, DoorOpen, Moon } from "lucide-react";
import { z } from "zod";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { centerStatusSnapshotSchema, centerStatusLabels, type CenterStatus, type CenterStatusSnapshot } from "@/lib/center-status";

const statusIcons = { open: DoorOpen, event: AudioLines, closed: Moon, unknown: Clock3 } as const;

export function OperatingStatus({ locale, initialStatus }: { readonly locale: Locale; readonly initialStatus: CenterStatusSnapshot | null }) {
  const [status, setStatus] = useState<CenterStatus | null>(initialStatus?.status ?? null);
  useEffect(() => {
    const abort = new AbortController();
    let busy = false;
    let boundary: number | undefined;
    async function refresh() {
      if (document.hidden || busy) return;
      busy = true;
      try {
        const response = await fetch("/api/center-status", { cache: "no-store", signal: AbortSignal.any([abort.signal, AbortSignal.timeout(10_000)]) });
        if (!response.ok) throw new Error("Status unavailable");
        const { data } = z.object({ data: centerStatusSnapshotSchema }).parse(await response.json());
        if (!abort.signal.aborted) {
          setStatus(data.status);
          window.clearTimeout(boundary);
          boundary = window.setTimeout(() => void refresh(), Math.max(250, Date.parse(data.nextChangeAt) - Date.parse(data.checkedAt)));
        }
      } catch {
        if (!abort.signal.aborted) setStatus(null);
      } finally { busy = false; }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { abort.abort(); window.clearInterval(timer); window.clearTimeout(boundary); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  const key = status ?? "unknown";
  const label = centerStatusLabels[locale][key];
  const StatusIcon = statusIcons[key];
  return <Link href="/visit" locale={locale} className="operating-status" data-status={key} aria-label={`${label} · ${locale === "ko" ? "방문 안내" : "Visit information"}`}>
    <span key={key} className="operating-status-content"><StatusIcon className="icon operating-status-icon" aria-hidden="true" /><span>{label}</span></span>
  </Link>;
}
