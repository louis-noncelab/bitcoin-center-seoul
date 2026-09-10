"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button, ChoiceControl, FormControl } from "@/components/ui/primitives";
import { useConfirmation } from "@/components/ui/confirmation-dialog";
import { Link, useRouter } from "@/i18n/navigation";
import { collectionInputSchema, collectionRecordSchema, type CollectionRecord } from "@/lib/collection-contract";
import { LoginForm } from "./login-form";
import { GalleryField } from "./gallery-field";
import { MarkdownEditor } from "./markdown-editor";
import { MarkdownHelp } from "./markdown-help";
import { adminRequest, AdminRequestError, errorText, jsonBody } from "./request";

export function CollectionAdmin() {
  const [records, setRecords] = useState<CollectionRecord[]>([]);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [expired, setExpired] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<CollectionRecord | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const busy = useRef(false);
  const uploads = useRef(0);
  const router = useRouter();
  const { confirm, dialog } = useConfirmation();

  useEffect(() => {
    const abort = new AbortController();
    adminRequest("/api/admin/collection", z.array(collectionRecordSchema), { signal: abort.signal })
      .then((items) => { if (!abort.signal.aborted) { setRecords(items); setAuthenticated(true); } })
      .catch((caught: unknown) => {
        if (abort.signal.aborted) return;
        setError(errorText(caught, "ko"));
        if (caught instanceof AdminRequestError && caught.status === 401) setAuthenticated(false);
      });
    return () => abort.abort();
  }, [revision]);
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);

  function handleError(caught: unknown) {
    setError(errorText(caught, "ko"));
    if (caught instanceof AdminRequestError && caught.status === 401) setExpired(true);
  }
  function uploadPending(value: boolean) { uploads.current += value ? 1 : -1; setUploading(uploads.current > 0); }
  async function leave() {
    if (busy.current || uploads.current > 0) return false;
    const accepted = !dirty || await confirm({ title: "변경사항을 버릴까요?", description: "저장하지 않은 변경사항은 사라집니다.", confirmLabel: "버리기" });
    return accepted && !busy.current && uploads.current === 0;
  }
  function edit(record: CollectionRecord | null) {
    setSelected(record); setImages(record?.images ?? []); setEditing(true); setDirty(false); setError(""); setMessage("");
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || expired || uploads.current > 0) return;
    const form = new FormData(event.currentTarget);
    const input = collectionInputSchema.safeParse({ ...Object.fromEntries(form), images, sort_order: Number(form.get("sort_order")), is_active: form.has("is_active") ? 1 : 0 });
    if (!input.success) { setError(input.error.issues[0]?.message ?? "입력 내용을 확인해 주세요."); return; }
    busy.current = true; setPending(true); setError("");
    try {
      await adminRequest(`/api/admin/collection${selected ? `/${selected.id}` : ""}`, collectionRecordSchema, jsonBody(input.data, selected ? "PUT" : "POST"));
      setEditing(false); setDirty(false); setMessage("저장했습니다."); setRevision((value) => value + 1);
    } catch (caught) { handleError(caught); }
    finally { busy.current = false; setPending(false); }
  }
  async function remove(record: CollectionRecord) {
    if (busy.current || uploads.current > 0) return;
    const accepted = await confirm({ title: "도서·작품 삭제", description: `“${record.title}” 항목을 삭제할까요? 삭제한 내용은 복구할 수 없습니다.`, confirmLabel: "삭제" });
    if (!accepted || busy.current || uploads.current > 0) return;
    busy.current = true; setPending(true); setError("");
    try {
      await adminRequest(`/api/admin/collection/${record.id}`, z.object({ deleted: z.literal(true) }), { method: "DELETE" });
      setMessage("삭제했습니다."); setRevision((value) => value + 1);
    } catch (caught) { handleError(caught); }
    finally { busy.current = false; setPending(false); }
  }
  async function logout() {
    if (!(await leave())) return;
    busy.current = true; setPending(true);
    try { await adminRequest("/api/admin/logout", z.unknown(), jsonBody({})); setAuthenticated(false); setEditing(false); setDirty(false); setExpired(false); setRecords([]); }
    catch (caught) { handleError(caught); }
    finally { busy.current = false; setPending(false); }
  }
  if (authenticated === null) return error ? <><p className="events-error" role="alert">{error}</p><Button onClick={() => { setError(""); setRevision((value) => value + 1); }}>다시 시도</Button></> : <p role="status">로그인 확인 중…</p>;
  if (!authenticated) return <><LoginForm locale="ko" onLogin={() => { setError(""); setRevision((value) => value + 1); }} /></>;
  return <div className="events-admin-workspace">
    {dialog}
    <div className="events-admin-toolbar"><nav aria-label="콘텐츠 관리" className="button-row">
      {[{ href: "/admin", label: "행사·하이라이트" }, { href: "/admin/notices", label: "공지사항" }].map(({ href, label }) => <Link key={href} href={href} locale="ko" className="button" data-variant="secondary" onNavigate={(event) => { event.preventDefault(); void leave().then((accepted) => { if (accepted) router.push(href, { locale: "ko" }); }); }}>{label}</Link>)}
    </nav><Button variant="quiet" disabled={pending || uploading} onClick={() => void logout()}>로그아웃</Button></div>
    {expired && <aside className="events-reauth"><p role="alert">세션이 만료되었습니다. 작성한 내용은 유지됩니다. 다시 로그인한 뒤 저장해 주세요.</p><LoginForm locale="ko" onLogin={() => { setExpired(false); setError(""); }} /></aside>}
    {error && <p className="events-error" role="alert">{error}</p>}<p role="status">{message}</p>
    {editing ? <form className="events-form" key={selected?.id ?? "new"} onSubmit={(event) => void save(event)} onChange={() => setDirty(true)}>
      <h2>{selected ? "도서·작품 수정" : "도서·작품 등록"}</h2>
      <fieldset className="events-editor-fields" disabled={pending}>
        <fieldset className="collection-kind"><legend>분류</legend><div className="button-row"><label className="events-checkbox"><ChoiceControl type="radio" name="kind" value="book" defaultChecked={!selected || selected.kind === "book"} />도서</label><label className="events-checkbox"><ChoiceControl type="radio" name="kind" value="artwork" defaultChecked={selected?.kind === "artwork"} />작품</label></div></fieldset>
        <div className="events-field-grid">
          <label>제목<FormControl><input name="title" required maxLength={200} defaultValue={selected?.title ?? ""} /></FormControl></label>
          <label>저자·작가 (선택)<FormControl><input name="creator" maxLength={200} defaultValue={selected?.creator ?? ""} /></FormControl></label>
        </div>
        <GalleryField locale="ko" images={images} onChange={(next) => { setImages(next); setDirty(true); }} onPending={uploadPending} onExpired={() => setExpired(true)} />
        <MarkdownEditor name="description" label="소개 (선택)" defaultValue={selected?.description ?? ""} rows={6} helpId="collection-markdown-help" onPending={uploadPending} onDirty={() => setDirty(true)} onExpired={() => setExpired(true)} />
        <div className="events-field-grid">
          <label>영어 제목 (선택)<FormControl><input name="titleEn" maxLength={200} defaultValue={selected?.titleEn ?? ""} /></FormControl></label>
          <label>영어 저자·작가 (선택)<FormControl><input name="creatorEn" maxLength={200} defaultValue={selected?.creatorEn ?? ""} /></FormControl></label>
        </div>
        <MarkdownEditor name="descriptionEn" label="영어 소개 (선택)" defaultValue={selected?.descriptionEn ?? ""} rows={4} helpId="collection-markdown-help" onPending={uploadPending} onDirty={() => setDirty(true)} onExpired={() => setExpired(true)} />
        <MarkdownHelp id="collection-markdown-help" />
        <p className="muted">영어를 입력하지 않으면 한국어 내용이 표시됩니다. 공개하려면 대표 이미지를 등록해 주세요.</p>
        <label>표시 순서<FormControl><input name="sort_order" type="number" required min={-100000} max={100000} step={1} defaultValue={selected?.sort_order ?? 0} aria-describedby="collection-order-help" /></FormControl></label>
        <p id="collection-order-help" className="muted">숫자가 작을수록 먼저 표시됩니다. 같은 순서에서는 최근 등록한 항목이 먼저 표시됩니다.</p>
        <label className="events-checkbox"><ChoiceControl type="checkbox" name="is_active" defaultChecked={Boolean(selected?.is_active)} />공개</label>
      </fieldset>
      <div className="button-row"><Button type="submit" disabled={pending || uploading || expired}>{pending ? "저장 중…" : "저장"}</Button><Button variant="secondary" disabled={pending || uploading} onClick={() => { void leave().then((accepted) => { if (accepted) { setEditing(false); setDirty(false); } }); }}>취소</Button></div>
    </form> : <>
      <div className="events-admin-toolbar"><h2>도서·작품 목록</h2><Button disabled={pending || expired} onClick={() => edit(null)}>도서·작품 등록</Button></div>
      <ul className="events-admin-list">{records.map((record) => <li key={record.id}><div><h3>{record.title}</h3><p className="muted">{record.kind === "book" ? "도서" : "작품"}{record.creator ? ` · ${record.creator}` : ""} · {record.is_active ? "공개" : "비공개"} · 순서 {record.sort_order}</p></div><div className="button-row">{Boolean(record.is_active) && <Link href={`/collection/${record.id}`} locale="ko" className="button" data-variant="quiet">보기</Link>}<Button variant="secondary" disabled={pending || expired} onClick={() => edit(record)}>수정</Button><Button variant="quiet" disabled={pending || expired} onClick={() => void remove(record)}>삭제</Button></div></li>)}{!records.length && <li>등록된 도서·작품이 없습니다.</li>}</ul>
    </>}
  </div>;
}
