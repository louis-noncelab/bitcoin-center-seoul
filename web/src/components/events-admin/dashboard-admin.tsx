"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/primitives";
import { adminRequest, errorText } from "./request";
import { CommerceAdminNav } from "./commerce-admin-nav";

const schema = z.object({
  products: z.number(),
  listedProducts: z.number(),
  categories: z.number(),
  orders: z.object({ pending: z.number(), paid: z.number(), review: z.number() }),
  events: z.number(),
  sessions: z.number(),
  outbox: z.record(z.string(), z.number()),
  emailMode: z.enum(["capture", "smtp"]),
  audits: z.array(z.object({ id: z.string(), action: z.string(), targetType: z.string(), createdAt: z.string() })),
});

export function DashboardAdmin() {
  const [data, setData] = useState<z.infer<typeof schema> | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(true);

  async function load() {
    setPending(true);
    setError("");
    try {
      setData(await adminRequest("/api/admin/dashboard", schema));
    } catch (caught) {
      setError(errorText(caught, "ko"));
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    const abort = new AbortController();
    adminRequest("/api/admin/dashboard", schema, { signal: abort.signal })
      .then((result) => {
        if (abort.signal.aborted) return;
        setData(result);
        setError("");
      })
      .catch((caught: unknown) => {
        if (abort.signal.aborted) return;
        setError(errorText(caught, "ko"));
      })
      .finally(() => { if (!abort.signal.aborted) setPending(false); });
    return () => abort.abort();
  }, []);

  const captured = data?.outbox.CAPTURED ?? 0;
  const waiting = (data?.outbox.PENDING ?? 0) + (data?.outbox.PROCESSING ?? 0);
  const sent = data?.outbox.SENT ?? 0;
  const failed = data?.outbox.FAILED ?? 0;

  return <div className="events-admin-workspace">
    <CommerceAdminNav current="/admin/dashboard" disabled={pending} />
    {error && <p className="events-error" role="alert">{error}</p>}
    {!data && !error && <p role="status">불러오는 중…</p>}
    {data && <>
      <ul className="events-admin-list">
        <li><Link className="admin-stat-link" href="/admin/products" locale="ko"><h3>상품</h3><p className="muted">공개 {data.listedProducts}개 · 전체 {data.products}개 · 분류 {data.categories}개</p></Link></li>
        <li><Link className="admin-stat-link" href="/admin/orders" locale="ko"><h3>주문</h3><p className="muted">결제 대기 {data.orders.pending} · 결제 완료 {data.orders.paid} · 검토 {data.orders.review}</p></Link></li>
        <li><Link className="admin-stat-link" href="/admin" locale="ko"><h3>행사</h3><p className="muted">등록 {data.events}개</p></Link></li>
        <li><div><h3>세션</h3><p className="muted">유효한 관리자 세션 {data.sessions}개</p></div></li>
        <li><Link className="admin-stat-link" href="/admin/mail" locale="ko"><h3>메일 발송</h3><p className="muted">서버 접수 {sent} · 실패 {failed} · 대기 {waiting} · 기록 {captured}. {data.emailMode === "smtp" ? "메일 서버가 접수한 건을 발송으로 셉니다." : "지금은 기록 모드라 고객에게 나가지 않습니다."}</p></Link></li>
      </ul>
      <h2>최근 기록</h2>
      <ul className="events-admin-list">
        {data.audits.map((row) => <li key={row.id}><div><h3>{row.action}</h3><p className="muted">{row.targetType} · {new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" }).format(new Date(row.createdAt))}</p></div></li>)}
        {!data.audits.length && <li>기록이 없습니다.</li>}
      </ul>
      <Button variant="secondary" disabled={pending} onClick={() => void load()}>다시 불러오기</Button>
    </>}
  </div>;
}
