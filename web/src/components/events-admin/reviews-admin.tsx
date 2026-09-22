"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/primitives";
import { useConfirmation } from "@/components/ui/confirmation-dialog";
import { reviewAdminSchema, reviewInputSchema, reviewRecordSchema, reviewSelectionInputSchema, reviewSelectionSchema, type ReviewRecord, type ReviewSelection } from "@/lib/reviews-contract";
import { LoginForm } from "./login-form";
import { ReviewsEditor, reviewKindLabels } from "./reviews-editor";
import { ReviewsSelection } from "./reviews-selection";
import { adminRequest, AdminRequestError, errorText, jsonBody, revisionHeaders } from "./request";

export function ReviewsAdmin() {
  const [records, setRecords] = useState<ReviewRecord[]>([]);
  const [selection, setSelection] = useState<ReviewSelection | null>(null);
  const [savedSelection, setSavedSelection] = useState<ReviewSelection | null>(null);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [expired, setExpired] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<ReviewRecord | null>(null);
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
  const selectionDirty = selection !== null && JSON.stringify(selection) !== JSON.stringify(savedSelection);
  const unsaved = dirty || selectionDirty;

  useEffect(() => {
    const abort = new AbortController();
    adminRequest("/api/admin/reviews", reviewAdminSchema, { signal: abort.signal })
      .then((data) => {
        if (abort.signal.aborted) return;
        setRecords(data.records); setSelection((current) => current ?? data.selection);
        setSavedSelection(data.selection); setAuthenticated(true);
      }).catch((caught: unknown) => {
        if (abort.signal.aborted) return;
        setError(errorText(caught, "ko"));
        if (caught instanceof AdminRequestError && caught.status === 401) setAuthenticated(false);
      });
    return () => abort.abort();
  }, [revision]);
  useEffect(() => {
    if (!unsaved && !uploading) return;
    const prevent = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [unsaved, uploading]);

  function handleError(caught: unknown) {
    const duplicateSlug = caught instanceof AdminRequestError && caught.code === "SLUG_CONFLICT";
    const stale = caught instanceof AdminRequestError && !duplicateSlug && (caught.status === 409 || caught.status === 404);
    setConflict(stale);
    setError(stale ? "다른 사람이 수정하거나 삭제했습니다. 입력한 내용은 유지됩니다. 필요한 내용을 복사한 뒤 최신 내용을 불러와 주세요." : errorText(caught, "ko"));
    if (caught instanceof AdminRequestError) {
      if (duplicateSlug) setError("이미 사용 중인 URL 슬러그입니다. 다른 주소를 입력해 주세요. 작성한 내용은 유지됩니다.");
      if (caught.status === 401) setExpired(true);
      if (caught.code === "REVIEW_UNAVAILABLE") setError("선택한 후기가 비공개이거나 삭제되었습니다. 최신 목록에서 공개 후기를 다시 선택해 주세요. 입력한 내용은 유지됩니다.");
      if (caught.code === "COVER_REQUIRED") setError("대표 후기에 사진이 없습니다. 사진을 등록하거나 사진이 있는 공개 후기를 선택해 주세요. 입력한 내용은 유지됩니다.");
    }
  }
  async function leave(onlyEditor = false) {
    if (busy.current || uploads.current) return false;
    const accepted = !(onlyEditor ? dirty : unsaved) || await confirm({ title: "변경사항을 버릴까요?", description: "저장하지 않은 변경사항은 사라집니다.", confirmLabel: "버리기" });
    return accepted && !busy.current && !uploads.current;
  }
  function edit(record: ReviewRecord | null) { setSelected(record); setEditing(true); setDirty(false); setError(""); setMessage(""); setConflict(false); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || expired || uploads.current) return;
    const form = new FormData(event.currentTarget);
    const input = reviewInputSchema.safeParse({ ...Object.fromEntries(form), sort_order: Number(form.get("sort_order")), is_active: form.has("is_active") ? 1 : 0 });
    if (!input.success) { setError(input.error.issues[0]?.message ?? "입력 내용을 확인해 주세요."); return; }
    busy.current = true; setPending(true); setError(""); setMessage("");
    try {
      const record = await adminRequest(`/api/admin/reviews${selected ? `/${selected.id}` : ""}`, reviewRecordSchema, jsonBody(input.data, selected ? "PUT" : "POST", selected?.revision));
      setRecords((current) => [...current.filter((item) => item.id !== record.id), record]);
      setEditing(false); setDirty(false); setConflict(false); setMessage("저장했습니다.");
    } catch (caught) { handleError(caught); }
    finally { busy.current = false; setPending(false); }
  }
  async function saveSelection() {
    if (busy.current || expired || !selection) return;
    const input = reviewSelectionInputSchema.safeParse({ featured_id: selection.featured_id, home_ids: selection.home_ids });
    if (!input.success) { setError(input.error.issues[0]?.message ?? "선택을 확인해 주세요."); return; }
    busy.current = true; setPending(true); setError(""); setMessage("");
    try {
      const next = await adminRequest("/api/admin/reviews/selection", reviewSelectionSchema, jsonBody(input.data, "PUT", selection.revision));
      setSelection(next); setSavedSelection(next); setConflict(false); setMessage("후기 선택을 저장했습니다.");
    } catch (caught) { handleError(caught); }
    finally { busy.current = false; setPending(false); }
  }
  async function remove(record: ReviewRecord) {
    if (busy.current || expired) return;
    if (!await confirm({ title: "방문 후기 삭제", description: `“${record.title}” 후기를 삭제할까요? 삭제한 내용은 복구할 수 없습니다.`, confirmLabel: "삭제" }) || busy.current || expired) return;
    busy.current = true; setPending(true); setError(""); setMessage("");
    try {
      await adminRequest(`/api/admin/reviews/${record.id}`, z.unknown(), { method: "DELETE", headers: revisionHeaders(record.revision) });
      setRecords((current) => current.filter((item) => item.id !== record.id)); setMessage("삭제했습니다. 대표·홈 선택에 남은 항목도 확인해 주세요.");
    } catch (caught) { handleError(caught); }
    finally { busy.current = false; setPending(false); }
  }
  async function reload() {
    if (!await leave()) return;
    busy.current = true; setPending(true);
    try {
      const data = await adminRequest("/api/admin/reviews", reviewAdminSchema);
      setRecords(data.records); setSelection(data.selection); setSavedSelection(data.selection);
      setSelected(selected ? data.records.find((item) => item.id === selected.id) ?? null : null);
      setEditing(false); setDirty(false); setError(""); setConflict(false); setMessage("최신 내용을 불러왔습니다.");
    } catch (caught) { handleError(caught); }
    finally { busy.current = false; setPending(false); }
  }
  async function cancelEditor() {
    if (!await leave(true)) return;
    busy.current = true; setPending(true);
    try {
      const data = await adminRequest("/api/admin/reviews", reviewAdminSchema);
      setRecords(data.records); setEditing(false); setDirty(false); setError(""); setConflict(false);
    } catch (caught) { handleError(caught); }
    finally { busy.current = false; setPending(false); }
  }
  if (authenticated === null) return error ? <><p className="events-error" role="alert">{error}</p><Button onClick={() => { setError(""); setRevision((value) => value + 1); }}>다시 시도</Button></> : <p role="status">로그인 확인 중…</p>;
  if (!authenticated) return <LoginForm locale="ko" onLogin={() => { setError(""); setRevision((value) => value + 1); }} />;
  return <div className="events-admin-workspace">
    {dialog}
    {expired && <aside className="events-reauth"><p role="alert">세션이 만료되었습니다. 작성한 내용은 유지됩니다. 다시 로그인한 뒤 저장해 주세요.</p><LoginForm locale="ko" onLogin={() => { setExpired(false); setError(""); }} /></aside>}
    {error && <p className="events-error" role="alert">{error}</p>}{conflict && <div><Button variant="secondary" disabled={pending || uploading || expired} onClick={() => void reload()}>최신 내용 불러오기</Button></div>}<p role="status">{pending ? "처리 중…" : message}</p>
    {editing ? <ReviewsEditor key={selected ? `${selected.id}-${selected.revision}` : "new"} record={selected} disabled={pending || expired} uploading={uploading} onUpload={(value) => { uploads.current = value; setUploading(value); }} onExpired={() => setExpired(true)} onDirty={() => setDirty(true)} onSave={(event) => void save(event)} onCancel={() => void cancelEditor()} /> : <>
      {selection && <ReviewsSelection records={records} value={selection} disabled={pending || expired} dirty={selectionDirty} onChange={setSelection} onSave={() => void saveSelection()} />}
      <div className="events-admin-toolbar"><h2>방문 후기 목록</h2><div className="button-row"><Button variant="secondary" disabled={pending || expired} onClick={() => void reload()}>목록 새로고침</Button><Button disabled={pending || expired} onClick={() => edit(null)}>방문 후기 등록</Button></div></div>
      <ul className="events-admin-list">{[...records].sort((a, b) => a.sort_order - b.sort_order || b.id - a.id).map((record) => <li key={record.id}><div><h3>{record.title}</h3><p className="muted">{reviewKindLabels[record.kind]} · {record.author} · {record.is_active ? "공개" : "비공개"} · 순서 {record.sort_order}</p></div><div className="button-row"><a href={record.url} target="_blank" rel="noopener noreferrer" className="button" data-variant="quiet" aria-label={`${record.title} 원문 (새 탭)`}>원문 보기</a><Button variant="secondary" disabled={pending || expired} onClick={() => edit(record)}>수정</Button><Button variant="quiet" disabled={pending || expired} onClick={() => void remove(record)}>삭제</Button></div></li>)}{!records.length && <li>등록된 방문 후기가 없습니다.</li>}</ul>
    </>}
  </div>;
}
