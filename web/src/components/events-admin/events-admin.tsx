"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/primitives";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { eventRecordSchema, highlightRecordSchema } from "@/lib/events-contract";
import type { ContentKind, ContentRecord } from "./editor-fields";
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
  function canLeave() { return !editorBusy && (!dirty || window.confirm(ko ? "저장하지 않은 변경사항을 버릴까요?" : "Discard unsaved changes?")); }
  function refresh() { setLoading(true); setError(""); setRevision((value) => value + 1); }
  function pick(next: ContentKind) {
    if (!canLeave()) return;
    setDirty(false); setEditing(false); setSelected(null); setKind(next); setRecords([]); setNotice(""); refresh();
  }
  async function remove(record: ContentRecord) {
    if (busy.current || !window.confirm(ko ? `“${record.title}” 항목을 삭제할까요?` : `Delete “${record.titleEn}”?`)) return;
    busy.current = true; setPending(true); setError("");
    try { await adminRequest(`/api/admin/${kind}/${record.id}`, z.unknown(), { method: "DELETE" }); setNotice(ko ? "삭제했습니다." : "Deleted."); refresh(); }
    catch (caught) { setError(errorText(caught, locale)); if (caught instanceof AdminRequestError && caught.status === 401) setExpired(true); }
    finally { busy.current = false; setPending(false); }
  }
  async function logout() {
    if (busy.current || !canLeave()) return;
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
      <div className="events-admin-toolbar">
        <nav aria-label={ko ? "콘텐츠 관리" : "Content management"} className="button-row">
          <Button variant="secondary" aria-pressed={kind === "events"} disabled={pending || editorBusy} onClick={() => pick("events")}>{ko ? "행사" : "Events"}</Button>
          <Button variant="secondary" aria-pressed={kind === "highlights"} disabled={pending || editorBusy} onClick={() => pick("highlights")}>{ko ? "하이라이트" : "Highlights"}</Button>
          <Link href="/admin/notices" locale="ko" className="button" data-variant="secondary" onClick={(event) => { if (pending || !canLeave()) event.preventDefault(); }}>공지사항</Link>
        </nav>
        <Button variant="quiet" disabled={pending || editorBusy} onClick={() => void logout()}>{ko ? "로그아웃" : "Sign out"}</Button>
      </div>
      {expired && <aside className="events-reauth"><p role="alert">{ko ? "세션이 만료되었습니다. 작성한 내용은 유지됩니다. 다시 로그인한 뒤 저장해 주세요." : "Your session expired. Your draft is preserved. Sign in again to save."}</p><LoginForm locale={locale} onLogin={() => { setExpired(false); setError(""); refresh(); }} /></aside>}
      {error && <p className="events-error" role="alert">{error}</p>}
      <p role="status">{notice}</p>
      {editing ? <RecordEditor key={`${kind}-${selected?.id ?? "new"}`} locale={locale} kind={kind} record={selected}
        onDirty={() => setDirty(true)} onExpired={() => setExpired(true)} onBusy={setEditorBusy}
        onCancel={() => { if (canLeave()) { setEditing(false); setDirty(false); } }}
        onSaved={() => { setEditing(false); setDirty(false); setNotice(ko ? "저장했습니다." : "Saved."); refresh(); }} /> : (
        <>
          <div className="events-admin-toolbar">
            <h2>{kind === "events" ? (ko ? "행사 목록" : "Events") : (ko ? "하이라이트 목록" : "Highlights")}</h2>
            <div className="button-row"><Button variant="secondary" disabled={loading || pending} onClick={refresh}>{ko ? "새로고침" : "Refresh"}</Button><Button disabled={pending || expired} onClick={() => { setSelected(null); setEditing(true); setNotice(""); }}>{ko ? "새 항목 등록" : "Add content"}</Button></div>
          </div>
          {loading ? <p role="status">{ko ? "목록을 불러오는 중…" : "Loading content…"}</p> : <ul className="events-admin-list">
            {records.map((record) => <li key={record.id}>
              <div><h3>{ko ? record.title : record.titleEn}</h3><p className="muted">{record.date || ("startDate" in record ? `${record.startDate} – ${record.endDate}` : "")}{"is_active" in record && !record.is_active ? (ko ? " · 비공개" : " · Unpublished") : ""}</p></div>
              <div className="button-row"><Link href={`/${kind === "events" ? "programs" : "journal"}/${record.slug || record.id}`} locale={locale} className="button" data-variant="quiet">{ko ? "보기" : "View"}</Link><Button variant="secondary" disabled={pending || expired} onClick={() => { setSelected(record); setEditing(true); setNotice(""); }}>{ko ? "수정" : "Edit"}</Button><Button variant="quiet" disabled={pending || expired} onClick={() => void remove(record)}>{ko ? "삭제" : "Delete"}</Button></div>
            </li>)}
            {!records.length && <li>{ko ? "등록된 항목이 없습니다." : "No content yet."}</li>}
          </ul>}
        </>
      )}
    </div>
  );
}
