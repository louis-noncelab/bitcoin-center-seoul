"use client";

import { useEffect, useState } from "react";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "만료됨";
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (days > 0) return `${days}일 ${hours}시간`;
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  return `${minutes}분`;
}

function SessionRemainder() {
  const [label, setLabel] = useState("");
  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        const response = await fetch("/api/admin/sessions", { credentials: "same-origin", cache: "no-store" });
        if (!response.ok) return;
        const body = await response.json() as { data?: unknown };
        const data = body.data;
        const sessions = Array.isArray(data) ? data : (data && typeof data === "object" && "sessions" in data && Array.isArray(data.sessions) ? data.sessions : []);
        const current = sessions.find((item) => item && typeof item === "object" && "current" in item && item.current === true) as { expiresAt?: unknown; remainingMs?: unknown } | undefined;
        if (!current || stopped) return;
        const expiresAt = typeof current.expiresAt === "number" ? current.expiresAt : typeof current.expiresAt === "string" ? Date.parse(current.expiresAt) : NaN;
        const remaining = Number.isFinite(expiresAt) ? expiresAt - Date.now() : typeof current.remainingMs === "number" ? current.remainingMs : NaN;
        if (Number.isFinite(remaining)) setLabel(formatRemaining(remaining));
      } catch {
        // The sessions page may not be deployed yet. The toolbar still works without the countdown.
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, []);
  if (!label) return null;
  return <p className="muted caption">세션 만료까지 {label}</p>;
}

export function CommerceAdminNav({ dirty = false }: {
  readonly current: string;
  readonly disabled?: boolean;
  readonly dirty?: boolean;
  readonly onLeave?: () => Promise<boolean>;
}) {
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);

  return <SessionRemainder />;
}
