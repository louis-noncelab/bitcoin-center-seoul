"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button, ChoiceControl, FormControl } from "@/components/ui/primitives";
import { useConfirmation } from "@/components/ui/confirmation-dialog";
import { Link, useRouter } from "@/i18n/navigation";
import { noticeInputSchema, noticeRecordSchema, type NoticeRecord } from "@/lib/notices-contract";
import { splitContentTags } from "@/lib/content-tags";
import { LoginForm } from "./login-form";
import { MarkdownHelp } from "./markdown-help";
import { MarkdownEditor } from "./markdown-editor";
import { TagsField } from "./tags-field";
import { adminRequest, AdminRequestError, errorText, jsonBody, revisionHeaders } from "./request";
import "@/styles/news.css";

export function NoticesAdmin() {
  const [records, setRecords] = useState<NoticeRecord[]>([]);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [expired, setExpired] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<NoticeRecord | null>(null);
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
  async function leave() {
    if (busy.current || uploads.current > 0) return false;
    const accepted = !dirty || await confirm({ title: "변경사항을 버릴까요?", description: "저장하지 않은 변경사항은 사라집니다.", confirmLabel: "버리기" });
    return accepted && !busy.current && uploads.current === 0;
  }
  function uploadPending(value: boolean) { uploads.current += value ? 1 : -1; setUploading(uploads.current > 0); }
  function handleError(caught: unknown) {
    setError(errorText(caught, "ko"));
    if (caught instanceof AdminRequestError && caught.status === 401) setExpired(true);
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || expired || uploads.current > 0) return;
    const form = new FormData(event.currentTarget);
    const input = noticeInputSchema.safeParse({ ...Object.fromEntries(form), tags: splitContentTags(String(form.get("tags") ?? "")), is_active: form.has("is_active") ? 1 : 0 });
    if (!input.success) { setError(input.error.issues.find((issue) => issue.path[0] === "tags")?.message ?? "제목, 본문과 URL 슬러그를 확인해 주세요."); return; }
    busy.current = true; setPending(true); setError("");
    try {
      await adminRequest(`/api/admin/notices${selected ? `/${selected.id}` : ""}`, noticeRecordSchema, jsonBody(input.data, selected ? "PUT" : "POST", selected?.revision));
      setEditing(false); setDirty(false); setMessage("저장했습니다."); setRevision((value) => value + 1);
    } catch (caught) { handleError(caught); }
    finally { busy.current = false; setPending(false); }
  }
  async function remove(record: NoticeRecord) {
    if (busy.current || uploads.current > 0) return;
    const accepted = await confirm({ title: "공지 삭제", description: `“${record.title}” 공지를 삭제할까요? 삭제한 내용은 복구할 수 없습니다.`, confirmLabel: "삭제" });
    if (!accepted || busy.current || uploads.current > 0) return;
    busy.current = true; setPending(true); setError("");
    try {
      await adminRequest(`/api/admin/notices/${record.id}`, z.unknown(), { method: "DELETE", headers: revisionHeaders(record.revision) });
      setMessage("삭제했습니다."); setRevision((value) => value + 1);
    } catch (caught) { handleError(caught); }
    finally { busy.current = false; setPending(false); }
  }
  async function logout() {
    if (!(await leave())) return;
    busy.current = true; setPending(true);
    try { await adminRequest("/api/admin/logout", z.unknown(), jsonBody({})); setAuthenticated(false); setEditing(false); setDirty(false); setRecords([]); }
    catch (caught) { handleError(caught); }
    finally { busy.current = false; setPending(false); }
  }
  if (authenticated === null) return <p role="status">로그인 확인 중…</p>;
  if (!authenticated) return <><p className="events-error" role="alert">{error}</p><LoginForm locale="ko" onLogin={() => { setError(""); setRevision((value) => value + 1); }} /></>;
  return <div className="events-admin-workspace">
    {dialog}
    <div className="events-admin-toolbar"><Link href="/admin" locale="ko" className="button" data-variant="secondary" onNavigate={(event) => { event.preventDefault(); void leave().then((accepted) => { if (accepted) router.push("/admin", { locale: "ko" }); }); }}>행사·하이라이트 관리</Link><Link href="/admin/collection" locale="ko" className="button" data-variant="secondary" onNavigate={(event) => { event.preventDefault(); void leave().then((accepted) => { if (accepted) router.push("/admin/collection", { locale: "ko" }); }); }}>도서·작품·보드게임</Link><Link href="/admin/reviews" locale="ko" className="button" data-variant="secondary" onNavigate={(event) => { event.preventDefault(); void leave().then((accepted) => { if (accepted) router.push("/admin/reviews", { locale: "ko" }); }); }}>방문 후기</Link><Button variant="quiet" disabled={pending || uploading} onClick={() => void logout()}>로그아웃</Button></div>
    <div className="news-admin-guide">
      <p>공개한 공지는 공지사항과 소식에 반영됩니다. 홈에는 공지와 현장 스케치를 합쳐 최근 2개 소식이 표시됩니다. 비공개 공지는 제외됩니다.</p>
      <Link href="/news" locale="ko" prefetch={false} onNavigate={(event) => { event.preventDefault(); void leave().then((accepted) => { if (accepted) router.push("/news", { locale: "ko" }); }); }}>공개 소식 보기</Link>
    </div>
    {expired && <aside className="events-reauth"><p role="alert">세션이 만료되었습니다. 작성한 내용은 유지됩니다. 다시 로그인한 뒤 저장해 주세요.</p><LoginForm locale="ko" onLogin={() => { setExpired(false); setError(""); setRevision((value) => value + 1); }} /></aside>}
    {error && <p className="events-error" role="alert">{error}</p>}<p role="status">{message}</p>
    {editing ? <form className="events-form" key={selected?.id ?? "new"} onSubmit={(event) => void save(event)} onChange={() => setDirty(true)}>
      <h2>{selected ? "공지 수정" : "공지 등록"}</h2>
      <fieldset className="events-editor-fields" disabled={pending}>
        <label>제목<FormControl><input name="title" defaultValue={selected?.title ?? ""} required maxLength={200} /></FormControl></label>
        <label>URL 슬러그<FormControl><input name="slug" defaultValue={selected?.slug ?? ""} required maxLength={100} pattern="(?=.*[a-z])[a-z0-9]+(-[a-z0-9]+)*" autoCapitalize="none" spellCheck={false} aria-describedby="notice-slug-help" /></FormControl></label>
        <p id="notice-slug-help" className="muted">/ko/notices/ 뒤에 붙는 주소입니다. 영문 소문자·숫자·하이픈을 사용하세요. 이전 주소도 새 주소로 연결됩니다.</p>
        <TagsField tags={selected?.tags ?? []} />
        <MarkdownEditor name="description" label="본문" defaultValue={selected?.description ?? ""} required rows={10} helpId="notice-markdown-help" onPending={uploadPending} onDirty={() => setDirty(true)} onExpired={() => setExpired(true)} />
        <div className="events-field-grid"><label>영어 제목 (선택)<FormControl><input name="titleEn" defaultValue={selected?.titleEn ?? ""} maxLength={200} /></FormControl></label><MarkdownEditor name="descriptionEn" label="영어 본문 (선택)" defaultValue={selected?.descriptionEn ?? ""} rows={5} helpId="notice-markdown-help" onPending={uploadPending} onDirty={() => setDirty(true)} onExpired={() => setExpired(true)} /></div>
        <MarkdownHelp id="notice-markdown-help" />
        <p className="muted">영어를 입력하지 않으면 영어 페이지에도 한국어 내용이 표시됩니다.</p>
        <label className="events-checkbox"><ChoiceControl name="is_active" type="checkbox" defaultChecked={Boolean(selected?.is_active)} />공개</label>
      </fieldset>
      <div className="button-row"><Button type="submit" disabled={pending || expired || uploading}>{pending ? "저장 중…" : "저장"}</Button><Button variant="secondary" disabled={pending || uploading} onClick={() => { void leave().then((accepted) => { if (accepted) { setEditing(false); setDirty(false); setRevision((value) => value + 1); } }); }}>취소</Button></div>
    </form> : <>
      <div className="events-admin-toolbar"><h2>공지 목록</h2><Button disabled={pending || expired} onClick={() => { setSelected(null); setEditing(true); setMessage(""); setError(""); }}>공지 등록</Button></div>
      <ul className="events-admin-list">{records.map((record) => <li key={record.id}><div><h3>{record.title}</h3><p className="muted">{record.created_at.slice(0, 10)} · {record.is_active ? "공개" : "비공개"}</p></div><div className="button-row">{Boolean(record.is_active) && <Link href={`/notices/${record.slug}`} locale="ko" className="button" data-variant="quiet">보기</Link>}<Button variant="secondary" disabled={pending || expired} onClick={() => { setSelected(record); setEditing(true); setMessage(""); setError(""); }}>수정</Button><Button variant="quiet" disabled={pending || expired} onClick={() => void remove(record)}>삭제</Button></div></li>)}{!records.length && <li>등록된 공지가 없습니다.</li>}</ul>
    </>}
  </div>;
}
