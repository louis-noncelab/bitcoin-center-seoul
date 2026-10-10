"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button, ChoiceControl, FormControl } from "@/components/ui/primitives";
import { DateField } from "@/components/ui/date-field";
import { useConfirmation } from "@/components/ui/confirmation-dialog";
import { guestbookInputSchema, guestbookRecordSchema, type GuestbookRecord } from "@/lib/guestbook-contract";
import { GalleryField } from "./gallery-field";
import { LoginForm } from "./login-form";
import { useRegisterLeave } from "./leave-guard";
import { adminRequest, AdminRequestError, errorText, jsonBody, revisionHeaders } from "./request";
import "@/styles/guestbook-admin.css";

export function GuestbookAdmin() {
  const [records, setRecords] = useState<GuestbookRecord[]>([]);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [expired, setExpired] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<GuestbookRecord | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [conflict, setConflict] = useState(false);
  const [revision, setRevision] = useState(0);
  const busy = useRef(false);
  const uploads = useRef(false);
  const { confirm, dialog } = useConfirmation();

  useEffect(() => {
    const abort = new AbortController();
    adminRequest("/api/admin/guestbook", z.array(guestbookRecordSchema), { signal: abort.signal })
      .then((data) => { if (!abort.signal.aborted) { setRecords(data); setAuthenticated(true); } })
      .catch((caught: unknown) => {
        if (abort.signal.aborted) return;
        setError(errorText(caught, "ko"));
        if (caught instanceof AdminRequestError && caught.status === 401) setAuthenticated(false);
      });
    return () => abort.abort();
  }, [revision]);
  useEffect(() => {
    if (!dirty && !uploading) return;
    const prevent = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty, uploading]);

  async function leave() {
    if (busy.current || uploads.current) return false;
    const accepted = !dirty || await confirm({ title: "변경사항을 버릴까요?", description: "저장하지 않은 변경사항은 사라집니다.", confirmLabel: "버리기" });
    return accepted && !busy.current && !uploads.current;
  }
  useRegisterLeave(leave);
  function handleError(caught: unknown) {
    const stale = caught instanceof AdminRequestError && (caught.status === 409 || caught.status === 404);
    setConflict(stale);
    setError(stale ? "다른 사람이 수정하거나 삭제했습니다. 입력한 내용은 유지됩니다. 필요한 내용을 복사한 뒤 최신 내용을 불러와 주세요." : errorText(caught, "ko"));
    if (caught instanceof AdminRequestError && caught.status === 401) setExpired(true);
  }
  function edit(record: GuestbookRecord | null) {
    setSelected(record); setImages(record?.images ?? []); setEditing(true);
    setDirty(false); setError(""); setMessage(""); setConflict(false);
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || expired || uploads.current) return;
    const form = new FormData(event.currentTarget);
    const input = guestbookInputSchema.safeParse({ ...Object.fromEntries(form), images, is_active: Number(form.get("is_active")) });
    if (!input.success) { setError(input.error.issues[0]?.message ?? "입력 내용을 확인해 주세요."); return; }
    busy.current = true; setPending(true); setError(""); setMessage("");
    try {
      const record = await adminRequest(`/api/admin/guestbook${selected ? `/${selected.id}` : ""}`, guestbookRecordSchema, jsonBody(input.data, selected ? "PUT" : "POST", selected?.revision));
      setRecords((current) => [...current.filter((item) => item.id !== record.id), record]);
      setEditing(false); setDirty(false); setConflict(false);
      setMessage(record.is_active ? "저장했습니다. 사이트에 공개됩니다." : "비공개로 저장했습니다.");
    } catch (caught) { handleError(caught); }
    finally { busy.current = false; setPending(false); }
  }
  async function remove(record: GuestbookRecord) {
    if (busy.current || expired) return;
    if (!await confirm({ title: "방명록 삭제", description: `${record.visitDate} 방명록을 삭제할까요? 삭제한 내용은 복구할 수 없습니다.`, confirmLabel: "삭제" }) || busy.current || expired) return;
    busy.current = true; setPending(true); setError(""); setMessage("");
    try {
      await adminRequest(`/api/admin/guestbook/${record.id}`, z.unknown(), { method: "DELETE", headers: revisionHeaders(record.revision) });
      setRecords((current) => current.filter((item) => item.id !== record.id)); setMessage("삭제했습니다.");
    } catch (caught) { handleError(caught); }
    finally { busy.current = false; setPending(false); }
  }
  async function reload() {
    if (!await leave()) return;
    busy.current = true; setPending(true);
    try {
      setRecords(await adminRequest("/api/admin/guestbook", z.array(guestbookRecordSchema)));
      setEditing(false); setDirty(false); setConflict(false); setError(""); setMessage("");
    } catch (caught) { handleError(caught); }
    finally { busy.current = false; setPending(false); }
  }
  if (authenticated === null) return error ? <><p className="events-error" role="alert">{error}</p><Button onClick={() => { setError(""); setRevision((value) => value + 1); }}>다시 시도</Button></> : <p role="status">로그인 확인 중…</p>;
  if (!authenticated) return <LoginForm locale="ko" onLogin={() => { setError(""); setRevision((value) => value + 1); }} />;
  return <div className="events-admin-workspace">
    {dialog}
    <p className="muted">센터에서 받은 방명록을 옮겨 적어 주세요. 공개한 글은 방문 날짜가 최근인 순서로 표시되고, 홈에는 3개가 소개됩니다.</p>
    {expired && <aside className="events-reauth"><p role="alert">세션이 만료되었습니다. 작성한 내용은 유지됩니다. 다시 로그인한 뒤 저장해 주세요.</p><LoginForm locale="ko" onLogin={() => { setExpired(false); setError(""); }} /></aside>}
    {error && <p className="events-error" role="alert">{error}</p>}
    {conflict && <Button variant="secondary" disabled={pending || uploading || expired} onClick={() => void reload()}>최신 내용 불러오기</Button>}
    {editing ? <form className="events-form" key={selected ? `${selected.id}-${selected.revision}` : "new"} onSubmit={(event) => void save(event)} onChange={() => setDirty(true)}>
      <h2>{selected ? "방명록 수정" : "방명록 등록"}</h2>
      <fieldset className="events-editor-fields" disabled={pending || expired}>
        <div className="events-field-grid">
          <DateField name="visitDate" label="방문 날짜" required defaultValue={selected?.visitDate ?? new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" })} onDirty={() => setDirty(true)} />
          <label>방문자명 (선택)<FormControl><input name="visitorName" maxLength={100} defaultValue={selected?.visitorName ?? ""} aria-describedby="guestbook-name-help" /></FormControl></label>
        </div>
        <p id="guestbook-name-help" className="muted">닉네임도 괜찮습니다. 비워 두면 ‘방문자’로 표시됩니다.</p>
        <div><label htmlFor="guestbook-body">방명록 내용</label><FormControl><textarea id="guestbook-body" name="body" required rows={8} maxLength={4000} defaultValue={selected?.body ?? ""} /></FormControl></div>
        <GalleryField locale="ko" images={images} cover={false} onChange={(value) => { setImages(value); setDirty(true); }} onPending={(value) => { uploads.current = value; setUploading(value); }} onExpired={() => setExpired(true)} />
        <details><summary>영어 번역 (선택)</summary><label htmlFor="guestbook-body-en">영어 내용</label><FormControl><textarea id="guestbook-body-en" name="bodyEn" rows={5} maxLength={4000} defaultValue={selected?.bodyEn ?? ""} /></FormControl><p className="muted">비워 두면 영어 페이지에도 원문이 표시됩니다.</p></details>
        <fieldset className="collection-kind"><legend>공개 여부</legend><div className="button-row">
          <label className="events-checkbox"><ChoiceControl type="radio" name="is_active" value="0" defaultChecked={!selected?.is_active} />비공개</label>
          <label className="events-checkbox"><ChoiceControl type="radio" name="is_active" value="1" defaultChecked={Boolean(selected?.is_active)} />공개</label>
        </div></fieldset>
      </fieldset>
      <div className="button-row"><Button type="submit" disabled={pending || uploading || expired}>저장</Button><Button variant="secondary" disabled={pending || uploading} onClick={() => void reload()}>취소</Button></div>
    </form> : <>
      <div className="events-admin-toolbar"><h2>방명록 목록</h2><div className="button-row"><Button variant="secondary" disabled={pending || expired} onClick={() => void reload()}>목록 새로고침</Button><Button disabled={pending || expired} onClick={() => edit(null)}>방명록 등록</Button></div></div>
      <ul className="events-admin-list">{[...records].sort((a, b) => b.visitDate.localeCompare(a.visitDate) || b.id - a.id).map((record) => <li key={record.id}>
        <div><h3>{record.visitorName || "방문자"}</h3><p className="muted">{record.visitDate}, {record.is_active ? "공개" : "비공개"}</p><p>{record.body.slice(0, 100)}{record.body.length > 100 ? "…" : ""}</p></div>
        <div className="button-row"><Button variant="secondary" disabled={pending || expired} onClick={() => edit(record)}>수정</Button><Button variant="quiet" disabled={pending || expired} onClick={() => void remove(record)}>삭제</Button></div>
      </li>)}{!records.length && <li>아직 등록된 방명록이 없습니다. 첫 방명록을 등록해 주세요.</li>}</ul>
      <a href="/ko/guestbook" target="_blank" rel="noopener noreferrer" className="button" data-variant="quiet">공개 방명록 보기 (새 탭)</a>
    </>}
    <div className="guestbook-save-state" role="status" aria-atomic="true">
      <p>{uploading ? "사진을 업로드하고 WebP로 변환하고 있습니다." : pending ? (editing ? "방명록을 저장하고 있습니다." : "목록을 처리하고 있습니다.") : error ? "처리하지 못했습니다. 위의 안내를 확인해 주세요. 작성한 내용은 유지됩니다." : message || (dirty ? "아직 저장하지 않은 변경사항이 있습니다." : editing ? "내용을 입력한 뒤 저장해 주세요." : "공개 여부는 각 방명록에서 확인할 수 있습니다.")}</p>
      {(uploading || pending) && <progress aria-label={uploading ? "사진 업로드 및 변환 진행 중" : "방명록 처리 진행 중"} />}
    </div>
  </div>;
}
