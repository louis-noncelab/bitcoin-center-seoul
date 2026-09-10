"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/primitives";
import { centerStatusSnapshotSchema, centerStatusLabels, type CenterStatusSnapshot, type OpeningOverride } from "@/lib/center-status";
import { adminRequest, AdminRequestError, errorText, jsonBody } from "./request";

export function CenterStatusAdmin({ disabled, onBusy, onExpired }: {
  readonly disabled: boolean;
  readonly onBusy: (busy: boolean) => void;
  readonly onExpired: () => void;
}) {
  const [snapshot, setSnapshot] = useState<CenterStatusSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const busy = useRef(false);
  const revision = useRef(0);
  useEffect(() => {
    const abort = new AbortController();
    let refreshing = false;
    async function refresh() {
      if (busy.current || refreshing || document.hidden) return;
      refreshing = true;
      const version = revision.current;
      try {
        const data = await adminRequest("/api/center-status", centerStatusSnapshotSchema, { signal: AbortSignal.any([abort.signal, AbortSignal.timeout(10_000)]) });
        if (!abort.signal.aborted && version === revision.current) { setSnapshot(data); setError(""); }
      } catch (caught) { if (!abort.signal.aborted && version === revision.current) setError(errorText(caught, "ko")); }
      finally { refreshing = false; if (!abort.signal.aborted) setLoading(false); }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { abort.abort(); window.clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  async function save(next: OpeningOverride | null) {
    if (busy.current || disabled) return;
    revision.current += 1;
    busy.current = true; onBusy(true); setPending(true); setError(""); setMessage("");
    try {
      const data = await adminRequest("/api/admin/center-status", centerStatusSnapshotSchema, jsonBody({ override: next }, "PUT"));
      setSnapshot(data); setMessage("오늘의 운영 설정을 저장했습니다.");
    } catch (caught) { setError(errorText(caught, "ko")); if (caught instanceof AdminRequestError && caught.status === 401) onExpired(); }
    finally { busy.current = false; onBusy(false); setPending(false); }
  }
  return <section className="center-status-admin" aria-labelledby="center-status-title">
    <h2 id="center-status-title">오늘의 운영 상태</h2>
    <p>{snapshot ? `${snapshot.date} · ${centerStatusLabels.ko[snapshot.status ?? "unknown"]}${snapshot.holiday ? ` · ${snapshot.holiday}` : ""}` : "운영 상태를 확인하는 중…"}</p>
    <p className="muted">매일 한국 시간 12:00~20:00 운영합니다. 법정공휴일은 쉬며, 등록된 밋업은 운영시간 이후에도 종료 시각까지 반영합니다.</p>
    <div className="button-row" role="group" aria-label="오늘의 운영 예외">
      {([{ value: null, label: "자동" }, { value: "open", label: "정상 운영" }, { value: "closed", label: "임시 휴무" }] as const).map(({ value, label }) => <Button key={label} variant="secondary" aria-pressed={snapshot?.override === value} disabled={loading || pending || disabled} onClick={() => void save(value)}>{label}</Button>)}
    </div>
    <p className="muted">예외 설정은 오늘 하루에만 적용됩니다. ‘정상 운영’은 공휴일에도 평소 운영시간과 밋업 일정을 적용하고, ‘임시 휴무’는 밋업이 있어도 휴무로 표시합니다.</p>
    {snapshot?.status === null && <p className="events-error">공휴일 정보를 확인할 수 없습니다. 오늘의 운영 여부를 직접 지정해 주세요.</p>}
    <p role="status">{loading ? "운영 상태를 확인하는 중…" : message}</p>
    {error && <p className="events-error" role="alert">{error}</p>}
  </section>;
}
