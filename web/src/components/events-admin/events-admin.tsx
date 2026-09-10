"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/primitives";
import { useConfirmation } from "@/components/ui/confirmation-dialog";
import { Link, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { eventRecordSchema, highlightRecordSchema } from "@/lib/events-contract";
import type { ContentKind, ContentRecord } from "./editor-fields";
import { CenterStatusAdmin } from "./center-status-admin";
import { LoginForm } from "./login-form";
import { RecordEditor } from "./record-editor";
import { adminRequest, AdminRequestError, errorText, jsonBody } from "./request";

const sessionSchema = z.object({ authenticated: z.boolean() });
const listSchema = z.array(z.union([eventRecordSchema, highlightRecordSchema]));

export function EventsAdmin({ locale }: { readonly locale: Locale }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [expired, setExpired] = useState(false);
  const [kind, setKind] = useState<ContentKind>("events");
  const [records, setRecords] = useState<ContentRecord[]>([]);
  const [selected, setSelected] = useState<ContentRecord | null>(null);
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [editorBusy, setEditorBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const busy = useRef(false);
  const editorBusyRef = useRef(false);
  const router = useRouter();
  const { confirm, dialog } = useConfirmation();
  const ko = locale === "ko";
  useEffect(() => {
    const abort = new AbortController();
    adminRequest("/api/admin/session", sessionSchema, { signal: abort.signal })
      .then((session) => { if (!abort.signal.aborted) setAuthenticated(session.authenticated); })
      .catch((caught: unknown) => { if (!abort.signal.aborted) { setError(errorText(caught, locale)); setAuthenticated(false); } });
    return () => abort.abort();
  }, [locale]);
  useEffect(() => {
    if (!authenticated) return;
    const abort = new AbortController();
    adminRequest(`/api/admin/${kind}`, listSchema, { signal: abort.signal })
      .then((items) => { if (!abort.signal.aborted) setRecords(items); })
      .catch((caught: unknown) => { if (!abort.signal.aborted) { setError(errorText(caught, locale)); if (caught instanceof AdminRequestError && caught.status === 401) setExpired(true); } })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [authenticated, kind, locale, revision]);
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
  async function canLeave() {
    if (busy.current || editorBusyRef.current) return false;
    const accepted = !dirty || await confirm({ title: ko ? "변경사항을 버릴까요?" : "Discard changes?", description: ko ? "저장하지 않은 변경사항은 사라집니다." : "Your unsaved changes will be lost.", confirmLabel: ko ? "버리기" : "Discard", cancelLabel: ko ? "취소" : "Cancel" });
    return accepted && !busy.current && !editorBusyRef.current;
  }
  function refresh() { setLoading(true); setError(""); setRevision((value) => value + 1); }
  async function pick(next: ContentKind) {
    if (!(await canLeave())) return;
    setDirty(false); setEditing(false); setSelected(null); setKind(next); setRecords([]); setNotice(""); refresh();
  }
  async function remove(record: ContentRecord) {
    if (busy.current || editorBusyRef.current) return;
    const accepted = await confirm({ title: ko ? "항목 삭제" : "Delete content", description: ko ? `“${record.title}” 항목을 삭제할까요? 삭제한 내용은 복구할 수 없습니다.` : `Delete “${record.titleEn}”? This cannot be undone.`, confirmLabel: ko ? "삭제" : "Delete", cancelLabel: ko ? "취소" : "Cancel" });
    if (!accepted || busy.current || editorBusyRef.current) return;
    busy.current = true; setPending(true); setError("");
    try { await adminRequest(`/api/admin/${kind}/${record.id}`, z.unknown(), { method: "DELETE" }); setNotice(ko ? "삭제했습니다." : "Deleted."); refresh(); }
    catch (caught) { setError(errorText(caught, locale)); if (caught instanceof AdminRequestError && caught.status === 401) setExpired(true); }
    finally { busy.current = false; setPending(false); }
  }
  async function logout() {
    if (!(await canLeave())) return;
    busy.current = true; setPending(true);
    try {
      await adminRequest("/api/admin/logout", z.unknown(), jsonBody({}));
      setAuthenticated(false); setExpired(false); setEditing(false); setDirty(false); setRecords([]); setNotice("");
    } catch (caught) { setError(errorText(caught, locale)); }
    finally { busy.current = false; setPending(false); }
  }
  if (authenticated === null) return <p role="status">{ko ? "로그인 확인 중…" : "Checking your session…"}</p>;
  if (!authenticated) return <><p className="events-error" role="alert">{error}</p><LoginForm locale={locale} onLogin={() => { setError(""); setLoading(true); setAuthenticated(true); }} /></>;
  return (
    <div className="events-admin-workspace">
      {dialog}
      <div className="events-admin-toolbar">
        <nav aria-label={ko ? "콘텐츠 관리" : "Content management"} className="button-row">
          <Button variant="secondary" aria-pressed={kind === "events"} disabled={pending || editorBusy} onClick={() => void pick("events")}>{ko ? "행사" : "Events"}</Button>
          <Button variant="secondary" aria-pressed={kind === "highlights"} disabled={pending || editorBusy} onClick={() => void pick("highlights")}>{ko ? "하이라이트" : "Highlights"}</Button>
          <Link href="/admin/notices" locale="ko" className="button" data-variant="secondary" onNavigate={(event) => { event.preventDefault(); void canLeave().then((accepted) => { if (accepted) router.push("/admin/notices", { locale: "ko" }); }); }}>공지사항</Link>
          <Link href="/admin/collection" locale="ko" className="button" data-variant="secondary" onNavigate={(event) => { event.preventDefault(); void canLeave().then((accepted) => { if (accepted) router.push("/admin/collection", { locale: "ko" }); }); }}>도서·작품</Link>
        </nav>
        <Button variant="quiet" disabled={pending || editorBusy} onClick={() => void logout()}>{ko ? "로그아웃" : "Sign out"}</Button>
      </div>
      {expired && <aside className="events-reauth"><p role="alert">{ko ? "세션이 만료되었습니다. 작성한 내용은 유지됩니다. 다시 로그인한 뒤 저장해 주세요." : "Your session expired. Your draft is preserved. Sign in again to save."}</p><LoginForm locale={locale} onLogin={() => { setExpired(false); setError(""); refresh(); }} /></aside>}
      {error && <p className="events-error" role="alert">{error}</p>}
      <p role="status">{notice}</p>
      {!editing && <CenterStatusAdmin disabled={pending || expired} onExpired={() => setExpired(true)} onBusy={(value) => { editorBusyRef.current = value; setEditorBusy(value); }} />}
      {editing ? <RecordEditor key={`${kind}-${selected?.id ?? "new"}`} locale={locale} kind={kind} record={selected}
        onDirty={() => setDirty(true)} onExpired={() => setExpired(true)} onBusy={(value) => { editorBusyRef.current = value; setEditorBusy(value); }}
        onCancel={() => { void canLeave().then((accepted) => { if (accepted) { setEditing(false); setDirty(false); } }); }}
        onSaved={() => { setEditing(false); setDirty(false); setNotice(ko ? "저장했습니다." : "Saved."); refresh(); }} /> : (
        <>
          <div className="events-admin-toolbar">
            <h2>{kind === "events" ? (ko ? "행사 목록" : "Events") : (ko ? "하이라이트 목록" : "Highlights")}</h2>
            <div className="button-row"><Button variant="secondary" disabled={loading || pending || editorBusy} onClick={refresh}>{ko ? "새로고침" : "Refresh"}</Button><Button disabled={pending || expired || editorBusy} onClick={() => { setSelected(null); setEditing(true); setNotice(""); }}>{ko ? "새 항목 등록" : "Add content"}</Button></div>
          </div>
          {loading ? <p role="status">{ko ? "목록을 불러오는 중…" : "Loading content…"}</p> : <ul className="events-admin-list">
            {records.map((record) => <li key={record.id}>
              <div><h3>{ko ? record.title : record.titleEn}</h3><p className="muted">{record.date || ("startDate" in record ? `${record.startDate} – ${record.endDate}` : "")}{"is_active" in record && !record.is_active ? (ko ? " · 비공개" : " · Unpublished") : ""}</p></div>
              <div className="button-row"><Link href={`/${kind === "events" ? "programs" : "journal"}/${record.slug || record.id}`} locale={locale} className="button" data-variant="quiet">{ko ? "보기" : "View"}</Link><Button variant="secondary" disabled={pending || expired || editorBusy} onClick={() => { setSelected(record); setEditing(true); setNotice(""); }}>{ko ? "수정" : "Edit"}</Button><Button variant="quiet" disabled={pending || expired || editorBusy} onClick={() => void remove(record)}>{ko ? "삭제" : "Delete"}</Button></div>
            </li>)}
            {!records.length && <li>{ko ? "등록된 항목이 없습니다." : "No content yet."}</li>}
          </ul>}
        </>
      )}
    </div>
  );
}
