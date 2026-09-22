"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/primitives";
import { adminRequest, errorText, jsonBody } from "./request";
import { CommerceAdminNav } from "./commerce-admin-nav";
import { CheckinScanner } from "./checkin-scanner";

const itemSchema = z.object({
  id: z.string(),
  status: z.string(),
  confirmationCode: z.string().nullable(),
  checkedInAt: z.string().nullable(),
  customerName: z.string(),
  quantity: z.number(),
  title: z.string(),
  meetup: z.boolean(),
});
const listSchema = z.object({ items: z.array(itemSchema) });
const resultSchema = z.object({ status: z.enum(["checked_in", "already_checked_in", "cleared"]), booking: itemSchema });

export function MeetupCheckinAdmin() {
  const [items, setItems] = useState<z.infer<typeof itemSchema>[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function load() {
    setItems((await adminRequest("/api/admin/meetups/checkin", listSchema)).items);
  }

  useEffect(() => {
    const abort = new AbortController();
    adminRequest("/api/admin/meetups/checkin", listSchema, { signal: abort.signal })
      .then((result) => { if (!abort.signal.aborted) setItems(result.items); })
      .catch((caught: unknown) => { if (!abort.signal.aborted) setError(errorText(caught, "ko")); });
    return () => abort.abort();
  }, []);

  async function checkin(body: { code?: string; orderId?: string; undo?: boolean }) {
    if (pending) return;
    setPending(true); setError(""); setMessage("");
    try {
      const result = await adminRequest("/api/admin/meetups/checkin", resultSchema, jsonBody(body));
      const when = result.booking.checkedInAt ? new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" }).format(new Date(result.booking.checkedInAt)) : "";
      setMessage(result.status === "already_checked_in" ? `${result.booking.customerName}님은 이미 체크인했습니다. ${when}` : result.status === "cleared" ? `${result.booking.customerName}님 체크인을 해제했습니다.` : `${result.booking.customerName}님 ${result.booking.quantity}명 체크인했습니다.`);
      await load();
    } catch (caught) { setError(errorText(caught, "ko")); }
    finally { setPending(false); }
  }

  return <div className="events-admin-workspace">
    <CommerceAdminNav current="/admin/meetups/checkin" disabled={pending} />
    <p className="muted">결제된 밋업 예약의 확인 QR을 카메라로 읽거나, 확인 코드와 주문 번호로 직접 체크인합니다.</p>
    {error && <p className="events-error" role="alert">{error}</p>}
    <p role="status">{message}</p>
    <CheckinScanner disabled={pending} onCode={(value) => void checkin({ code: value })} />
    <h2>결제된 예약</h2>
    <ul className="events-admin-list">
      {items.map((item) => <li key={item.id}>
        <div>
          <h3>{item.customerName}<span className="muted"> · {item.quantity}명</span></h3>
          <p className="muted">{item.title}{item.checkedInAt ? ` · 체크인 ${new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit" }).format(new Date(item.checkedInAt))}` : " · 미체크인"}</p>
          {item.confirmationCode && <p><a href={`/ko/orders/confirm/${item.confirmationCode}`} target="_blank" rel="noopener noreferrer">예약 확인 페이지</a></p>}
        </div>
        <div className="button-row">
          <Button variant="secondary" disabled={pending} onClick={() => void checkin(item.checkedInAt ? { orderId: item.id, undo: true } : { orderId: item.id })}>{item.checkedInAt ? "체크인 해제" : "수동 체크인"}</Button>
        </div>
      </li>)}
      {!items.length && <li>결제된 밋업 예약이 없습니다.</li>}
    </ul>
  </div>;
}
