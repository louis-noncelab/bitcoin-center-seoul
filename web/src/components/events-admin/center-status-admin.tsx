"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/primitives";
import { centerStatusInputSchema, centerStatusLabels, centerStatusSchema, type CenterStatus } from "@/lib/center-status";
import { adminRequest, AdminRequestError, errorText, jsonBody } from "./request";

export function CenterStatusAdmin({ disabled, onBusy, onExpired }: {
  readonly disabled: boolean;
  readonly onBusy: (busy: boolean) => void;
  readonly onExpired: () => void;
}) {
  const [status, setStatus] = useState<CenterStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const busy = useRef(false);
  useEffect(() => {
    const abort = new AbortController();
    adminRequest("/api/center-status", centerStatusInputSchema, { signal: abort.signal })
      .then((data) => { if (!abort.signal.aborted) setStatus(data.status); })
      .catch((caught: unknown) => { if (!abort.signal.aborted) setError(errorText(caught, "ko")); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, []);
  async function save(next: CenterStatus | null) {
    if (busy.current || disabled) return;
    busy.current = true; onBusy(true); setPending(true); setError(""); setMessage("");
    try {
      const data = await adminRequest("/api/admin/center-status", centerStatusInputSchema, jsonBody({ status: next }, "PUT"));
      setStatus(data.status); setMessage("운영 상태를 저장했습니다.");
    } catch (caught) { setError(errorText(caught, "ko")); if (caught instanceof AdminRequestError && caught.status === 401) onExpired(); }
    finally { busy.current = false; onBusy(false); setPending(false); }
  }
  return <section className="center-status-admin" aria-labelledby="center-status-title">
    <h2 id="center-status-title">오늘의 운영 상태</h2>
    <p className="muted">한국 시간 자정까지 표시됩니다. 미지정 시 ‘운영 안내’로 표시합니다.</p>
    <div className="button-row" role="group" aria-label="운영 상태 선택">
      {centerStatusSchema.options.map((value) => <Button key={value} variant="secondary" aria-pressed={status === value} disabled={loading || pending || disabled} onClick={() => void save(value)}>{centerStatusLabels.ko[value]}</Button>)}
      <Button variant="quiet" aria-pressed={status === null} disabled={loading || pending || disabled} onClick={() => void save(null)}>표시 해제</Button>
    </div>
    <p role="status">{loading ? "운영 상태를 확인하는 중…" : message}</p>
    {error && <p className="events-error" role="alert">{error}</p>}
  </section>;
}
