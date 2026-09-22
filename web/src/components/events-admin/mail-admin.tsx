"use client";

import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button, FormControl } from "@/components/ui/primitives";
import { MenuSelect } from "@/components/ui/menu-select";
import { useConfirmation } from "@/components/ui/confirmation-dialog";
import { CommerceAdminNav } from "./commerce-admin-nav";
import { adminRequest, AdminRequestError, errorText, jsonBody } from "./request";

const letterSchema = z.object({
  id: z.string(),
  eventKey: z.string(),
  kind: z.string(),
  orderId: z.string().nullable(),
  recipient: z.string().nullable(),
  subject: z.string().nullable(),
  status: z.enum(["CAPTURED", "PENDING", "PROCESSING", "SENT", "FAILED"]),
  attempts: z.number(),
  stale: z.boolean(),
  createdAt: z.string(),
  sentAt: z.string().nullable(),
  nextAttemptAt: z.string(),
  lastError: z.string().nullable(),
  readable: z.boolean(),
});

const reportSchema = z.object({
  mode: z.enum(["capture", "smtp"]),
  summary: z.string(),
  counts: z.object({
    CAPTURED: z.number(), PENDING: z.number(), PROCESSING: z.number(), SENT: z.number(), FAILED: z.number(),
  }),
  staleProcessing: z.number(),
  overduePending: z.number(),
  truncated: z.boolean(),
  letters: z.array(letterSchema),
  failures: z.array(letterSchema),
});

const meetupSchema = z.object({
  meetups: z.array(z.object({
    id: z.number(),
    title: z.string(),
    date: z.string(),
    online: z.boolean(),
    recipients: z.number(),
  })),
});
const broadcastSchema = z.object({ recipients: z.number(), queued: z.number(), skipped: z.number() });

type Report = z.infer<typeof reportSchema>;
type Letter = z.infer<typeof letterSchema>;
type Meetup = z.infer<typeof meetupSchema>["meetups"][number];

const kindLabel: Readonly<Record<string, string>> = {
  "order.created": "주문 접수",
  "order.paid": "결제 확인",
  "order.expired": "결제 기한 만료",
  "order.cancelled": "주문 취소",
  "order.review": "결제 검토",
  "order.fulfillment": "수령·배송",
  "meetup.notice": "밋업 안내",
  "operator.created": "관리자 알림 · 접수",
  "operator.paid": "관리자 알림 · 결제",
};

const statusLabel: Readonly<Record<Letter["status"], string>> = {
  CAPTURED: "기록만 됨",
  PENDING: "발송 대기",
  PROCESSING: "보내는 중",
  SENT: "서버 접수",
  FAILED: "실패",
};

function when(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function mailError(error: unknown): string {
  if (error instanceof AdminRequestError) {
    if (error.code === "EMAIL_CAPTURE_MODE") return "지금은 기록 모드라 메일을 보내지 않습니다. 서버에서 EMAIL_MODE=smtp 와 메일 비밀번호를 넣은 뒤 다시 시작해야 합니다.";
    if (error.code === "EMAIL_NOT_FAILED") return "실패한 메일만 다시 보낼 수 있습니다. 목록을 다시 확인해 주세요.";
    if (error.code === "NO_RECIPIENTS") return "결제 완료된 예약이 없습니다.";
  }
  return errorText(error, "ko");
}

export function MailAdmin() {
  const [report, setReport] = useState<Report | null>(null);
  const [meetups, setMeetups] = useState<readonly Meetup[]>([]);
  const [eventId, setEventId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [broadcastNote, setBroadcastNote] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(true);
  const { confirm, dialog } = useConfirmation();

  async function load(signal?: AbortSignal) {
    setPending(true);
    setError("");
    try {
      const next = await adminRequest("/api/admin/email", reportSchema, signal ? { signal } : {});
      if (signal?.aborted) return;
      setReport(next);
    } catch (caught) {
      if (signal?.aborted) return;
      setError(mailError(caught));
    } finally {
      if (!signal?.aborted) setPending(false);
    }
  }

  useEffect(() => {
    const abort = new AbortController();
    adminRequest("/api/admin/email", reportSchema, { signal: abort.signal })
      .then((next) => {
        if (abort.signal.aborted) return;
        setReport(next);
        setError("");
      })
      .catch((caught: unknown) => {
        if (abort.signal.aborted) return;
        setError(mailError(caught));
      })
      .finally(() => { if (!abort.signal.aborted) setPending(false); });
    adminRequest("/api/admin/email/meetups", meetupSchema, { signal: abort.signal })
      .then((next) => { if (!abort.signal.aborted) setMeetups(next.meetups); })
      .catch(() => { if (!abort.signal.aborted) setMeetups([]); });
    return () => abort.abort();
  }, []);

  async function act(body: { readonly action: "drain" | "release" } | { readonly action: "retry"; readonly id: string }) {
    setPending(true);
    setError("");
    try {
      setReport(await adminRequest("/api/admin/email", reportSchema, jsonBody(body)));
    } catch (caught) {
      setError(mailError(caught));
    } finally {
      setPending(false);
    }
  }

  async function broadcast(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const meetup = meetups.find((item) => String(item.id) === eventId);
    if (!meetup) return;
    const accepted = await confirm({
      title: "밋업 안내 메일을 보낼까요?",
      description: smtp
        ? `결제한 ${meetup.recipients}명에게 보냅니다. 같은 내용은 한 번만 나갑니다.${meetup.online ? " 온라인 참여 링크가 메일 아래에 붙습니다." : ""}`
        : `지금은 기록 모드입니다. ${meetup.recipients}명의 메일이 발송함에만 남고 손님에게 나가지 않습니다.`,
      confirmLabel: "보내기",
    });
    if (!accepted) return;
    setPending(true);
    setError("");
    setBroadcastNote("");
    try {
      const result = await adminRequest("/api/admin/email/meetups", broadcastSchema, jsonBody({ eventId: meetup.id, subject, message }));
      setBroadcastNote(result.queued > 0 ? `${result.queued}명에게 넣었습니다. 같은 내용으로 이미 보낸 ${result.skipped}명은 건너뛰었습니다.` : "같은 내용으로 이미 보낸 주소만 있어 새로 넣지 않았습니다.");
      setReport(await adminRequest("/api/admin/email", reportSchema, {}));
    } catch (caught) {
      setError(mailError(caught));
    } finally {
      setPending(false);
    }
  }

  async function release() {
    const accepted = await confirm({
      title: "기록된 메일을 보낼까요?",
      description: "지금까지 기록만 해 둔 메일을 발송 대기로 옮기고, 메일 서버로 보냅니다. 고객과 관리자에게 나갑니다.",
      confirmLabel: "보내기",
    });
    if (!accepted) return;
    await act({ action: "release" });
  }

  const smtp = report?.mode === "smtp";
  const seen = new Set<string>();
  const rows = [...(report?.failures ?? []), ...(report?.letters ?? [])].filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });

  return <div className="events-admin-workspace">
    {dialog}
    <CommerceAdminNav current="/admin/mail" disabled={pending} />
    <p className="muted">주문·밋업 메일과 관리자 알림이 메일 서버에 접수됐는지 확인합니다. 서버 접수는 우리 메일 서버가 메시지를 받았다는 뜻입니다. 상대 받은편지함까지의 전달은 그 서버가 이어서 처리합니다.</p>
    <form className="events-form" onSubmit={(event) => void broadcast(event)}>
      <h2>밋업 안내 메일</h2>
      <p className="muted">결제를 마친 예약만 받습니다. 같은 주소가 여러 장이면 한 통만 갑니다. 온라인 밋업이면 참여 링크가 본문 아래에 붙습니다.</p>
      <label>밋업<FormControl><MenuSelect aria-label="밋업" value={eventId} onChange={(event) => setEventId(event.target.value)} required disabled={pending || meetups.length === 0}>
        <option value="">밋업 선택</option>
        {meetups.map((meetup) => <option key={meetup.id} value={String(meetup.id)}>{[meetup.date, meetup.title].filter(Boolean).join(" ")} · {meetup.recipients}명{meetup.online ? " · 온라인" : ""}</option>)}
      </MenuSelect></FormControl></label>
      <label>제목<FormControl><input value={subject} onChange={(event) => setSubject(event.target.value)} required maxLength={120} disabled={pending} /></FormControl></label>
      <label>내용<FormControl><textarea value={message} onChange={(event) => setMessage(event.target.value)} required rows={6} maxLength={4000} disabled={pending} /></FormControl></label>
      <div className="button-row"><Button disabled={pending || !eventId}>안내 메일 보내기</Button></div>
      {broadcastNote && <p role="status">{broadcastNote}</p>}
      {!meetups.length && report && <p className="muted">결제 완료된 밋업 예약이 없습니다.</p>}
    </form>
    {error && <p className="events-error" role="alert">{error}</p>}
    {!report && !error && <p role="status">불러오는 중…</p>}
    {report && <>
      <p role="status">{report.summary}</p>
      <p className="muted">전체 {report.counts.SENT + report.counts.FAILED + report.counts.PENDING + report.counts.PROCESSING + report.counts.CAPTURED}통 · 서버 접수 {report.counts.SENT} · 실패 {report.counts.FAILED} · 대기 {report.counts.PENDING} · 보내는 중 {report.counts.PROCESSING} · 기록 {report.counts.CAPTURED}{report.overduePending > 0 ? ` · 지금 보낼 차례 ${report.overduePending}` : ""}</p>
      <div className="button-row">
        <Button variant="secondary" disabled={pending} onClick={() => void load()}>상태 다시 확인</Button>
        <Button disabled={pending || !smtp || (report.overduePending === 0 && report.staleProcessing === 0)} onClick={() => void act({ action: "drain" })}>대기 메일 지금 보내기</Button>
        {smtp && report.counts.CAPTURED > 0 && <Button variant="secondary" disabled={pending} onClick={() => void release()}>기록된 메일 보내기</Button>}
      </div>
      <ul className="events-admin-list">
        {rows.map((row) => <li key={row.id}>
          <div>
            <h3>{row.subject ?? kindLabel[row.kind] ?? row.kind}</h3>
            <p className="muted">{kindLabel[row.kind] ?? row.kind} · {statusLabel[row.status]}{row.stale ? " · 멈춤" : ""} · {row.recipient ?? "받는 사람을 열 수 없음"} · {row.sentAt ? `접수 ${when(row.sentAt)}` : when(row.createdAt)}{row.attempts > 0 ? ` · 시도 ${row.attempts}회` : ""}{row.orderId ? ` · 주문 ${row.orderId}` : ""}</p>
            {row.lastError && <p className="muted">{row.lastError}</p>}
            {!row.readable && <p className="muted">이 메일의 내용이나 받는 사람을 열 수 없습니다.</p>}
          </div>
          {row.status === "FAILED" && <div className="button-row">
            <Button variant="secondary" disabled={pending || !smtp} onClick={() => void act({ action: "retry", id: row.id })}>다시 보내기</Button>
          </div>}
        </li>)}
        {!rows.length && <li>{pending ? "불러오는 중…" : "메일이 없습니다."}</li>}
      </ul>
      {report.truncated && <p className="muted">최근 100통과 실패 100통을 보여 줍니다. 위의 숫자는 전체입니다.</p>}
    </>}
  </div>;
}
