"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/primitives";
import { adminRequest, errorText } from "./request";
import { CommerceAdminNav } from "./commerce-admin-nav";

const schema = z.object({
  logs: z.array(z.object({
    id: z.string(),
    actorId: z.string().nullable(),
    action: z.string(),
    targetType: z.string(),
    targetId: z.string(),
    createdAt: z.string(),
  })),
});

export function AuditAdmin() {
  const [logs, setLogs] = useState<z.infer<typeof schema>["logs"]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(true);

  async function load() {
    setPending(true);
    setError("");
    try {
      setLogs((await adminRequest("/api/admin/audit-logs", schema)).logs);
    } catch (caught) {
      setError(errorText(caught, "ko"));
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    const abort = new AbortController();
    adminRequest("/api/admin/audit-logs", schema, { signal: abort.signal })
      .then((result) => {
        if (abort.signal.aborted) return;
        setLogs(result.logs);
        setError("");
      })
      .catch((caught: unknown) => {
        if (abort.signal.aborted) return;
        setError(errorText(caught, "ko"));
      })
      .finally(() => { if (!abort.signal.aborted) setPending(false); });
    return () => abort.abort();
  }, []);

  return <div className="events-admin-workspace">
    <CommerceAdminNav current="/admin/logs" disabled={pending} />
    <p className="muted">상품, 주문, 설정, 개인정보 파기 같은 관리자 작업의 최근 100건입니다. 고객 연락처는 여기에 남기지 않습니다.</p>
    {error && <p className="events-error" role="alert">{error}</p>}
    <ul className="events-admin-list">
      {logs.map((row) => <li key={row.id}>
        <div>
          <h3>{row.action}</h3>
          <p className="muted">{row.targetType} {row.targetId} · {row.actorId ?? "시스템"} · {new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" }).format(new Date(row.createdAt))}</p>
        </div>
      </li>)}
      {!logs.length && !error && <li>{pending ? "불러오는 중…" : "기록이 없습니다."}</li>}
    </ul>
    <Button variant="secondary" disabled={pending} onClick={() => void load()}>다시 불러오기</Button>
  </div>;
}
