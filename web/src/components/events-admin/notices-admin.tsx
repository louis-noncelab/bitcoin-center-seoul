"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/primitives";
import { Link } from "@/i18n/navigation";
import { noticeInputSchema, noticeRecordSchema, type NoticeRecord } from "@/lib/notices-contract";
import { LoginForm } from "./login-form";
import { adminRequest, AdminRequestError, errorText, jsonBody } from "./request";

export function NoticesAdmin() {
  const [records, setRecords] = useState<NoticeRecord[]>([]);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [expired, setExpired] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<NoticeRecord | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const busy = useRef(false);
  useEffect(() => {
    const abort = new AbortController();
    adminRequest("/api/admin/notices", z.array(noticeRecordSchema), { signal: abort.signal })
      .then((items) => { if (!abort.signal.aborted) { setRecords(items); setAuthenticated(true); } })
      .catch((caught: unknown) => {
        if (abort.signal.aborted) return;
        if (caught instanceof AdminRequestError && caught.status === 401) setAuthenticated(false);
        else { setError(errorText(caught, "ko")); setAuthenticated(false); }
      });
    return () => abort.abort();
  }, [revision]);
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
  function leave() { return !pending && (!dirty || window.confirm("저장하지 않은 변경사항을 버릴까요?")); }
  function handleError(caught: unknown) {
    setError(caught instanceof AdminRequestError && caught.status === 409 ? "이미 사용 중인 URL 슬러그입니다. 다른 주소를 입력해 주세요." : errorText(caught, "ko"));
    if (caught instanceof AdminRequestError && caught.status === 401) setExpired(true);
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || expired) return;
    const form = new FormData(event.currentTarget);
    const input = noticeInputSchema.safeParse({ ...Object.fromEntries(form), is_active: form.has("is_active") ? 1 : 0 });
    if (!input.success) { setError("제목, 본문과 URL 슬러그를 확인해 주세요."); return; }
    busy.current = true; setPending(true); setError("");
    try {
      await adminRequest(`/api/admin/notices${selected ? `/${selected.id}` : ""}`, noticeRecordSchema, jsonBody(input.data, selected ? "PUT" : "POST"));
      setEditing(false); setDirty(false); setMessage("저장했습니다."); setRevision((value) => value + 1);
    } catch (caught) { handleError(caught); }
    finally { busy.current = false; setPending(false); }
  }
  async function remove(record: NoticeRecord) {
    if (busy.current || !window.confirm(`“${record.title}” 공지를 삭제할까요?`)) return;
    busy.current = true; setPending(true); setError("");
    try {
      await adminRequest(`/api/admin/notices/${record.id}`, z.unknown(), { method: "DELETE" });
      setMessage("삭제했습니다."); setRevision((value) => value + 1);
    } catch (caught) { handleError(caught); }
    finally { busy.current = false; setPending(false); }
  }
  async function logout() {
    if (busy.current || !leave()) return;
    busy.current = true; setPending(true);
    try { await adminRequest("/api/admin/logout", z.unknown(), jsonBody({})); setAuthenticated(false); setEditing(false); setDirty(false); setRecords([]); }
    catch (caught) { handleError(caught); }
    finally { busy.current = false; setPending(false); }
  }
  if (authenticated === null) return <p role="status">로그인 확인 중…</p>;
  if (!authenticated) return <><p className="events-error" role="alert">{error}</p><LoginForm locale="ko" onLogin={() => { setError(""); setRevision((value) => value + 1); }} /></>;
  return <div className="events-admin-workspace">
    <div className="events-admin-toolbar"><Link href="/admin" locale="ko" className="button" data-variant="secondary" onClick={(event) => { if (!leave()) event.preventDefault(); }}>행사·하이라이트 관리</Link><Button variant="quiet" disabled={pending} onClick={() => void logout()}>로그아웃</Button></div>
    {expired && <aside className="events-reauth"><p role="alert">세션이 만료되었습니다. 작성한 내용은 유지됩니다. 다시 로그인한 뒤 저장해 주세요.</p><LoginForm locale="ko" onLogin={() => { setExpired(false); setError(""); }} /></aside>}
    {error && <p className="events-error" role="alert">{error}</p>}<p role="status">{message}</p>
    {editing ? <form className="events-form" key={selected?.id ?? "new"} onSubmit={(event) => void save(event)} onChange={() => setDirty(true)}>
      <h2>{selected ? "공지 수정" : "공지 등록"}</h2>
      <fieldset className="events-editor-fields" disabled={pending}>
        <label>제목<input name="title" defaultValue={selected?.title ?? ""} required maxLength={200} /></label>
        <label>URL 슬러그<input name="slug" defaultValue={selected?.slug ?? ""} required maxLength={100} pattern="(?=.*[a-z])[a-z0-9]+(-[a-z0-9]+)*" autoCapitalize="none" spellCheck={false} aria-describedby="notice-slug-help" /></label>
        <p id="notice-slug-help" className="muted">/ko/notices/ 뒤에 붙는 주소입니다. 영문 소문자·숫자·하이픈을 사용하세요. 이전 주소도 새 주소로 연결됩니다.</p>
        <label>본문<textarea name="description" defaultValue={selected?.description ?? ""} required rows={10} maxLength={20000} /></label>
        <div className="events-field-grid"><label>영어 제목 (선택)<input name="titleEn" defaultValue={selected?.titleEn ?? ""} maxLength={200} /></label><label>영어 본문 (선택)<textarea name="descriptionEn" defaultValue={selected?.descriptionEn ?? ""} rows={5} maxLength={20000} /></label></div>
        <p className="muted">영어를 입력하지 않으면 영어 페이지에도 한국어 내용이 표시됩니다.</p>
        <label className="events-checkbox"><input name="is_active" type="checkbox" defaultChecked={Boolean(selected?.is_active)} />공개</label>
      </fieldset>
      <div className="button-row"><Button type="submit" disabled={pending || expired}>{pending ? "저장 중…" : "저장"}</Button><Button variant="secondary" disabled={pending} onClick={() => { if (leave()) { setEditing(false); setDirty(false); } }}>취소</Button></div>
    </form> : <>
      <div className="events-admin-toolbar"><h2>공지 목록</h2><Button disabled={pending || expired} onClick={() => { setSelected(null); setEditing(true); setMessage(""); setError(""); }}>공지 등록</Button></div>
      <ul className="events-admin-list">{records.map((record) => <li key={record.id}><div><h3>{record.title}</h3><p className="muted">{record.created_at.slice(0, 10)} · {record.is_active ? "공개" : "비공개"}</p></div><div className="button-row">{Boolean(record.is_active) && <Link href={`/notices/${record.slug}`} locale="ko" className="button" data-variant="quiet">보기</Link>}<Button variant="secondary" disabled={pending || expired} onClick={() => { setSelected(record); setEditing(true); setMessage(""); setError(""); }}>수정</Button><Button variant="quiet" disabled={pending || expired} onClick={() => void remove(record)}>삭제</Button></div></li>)}{!records.length && <li>등록된 공지가 없습니다.</li>}</ul>
    </>}
  </div>;
}
