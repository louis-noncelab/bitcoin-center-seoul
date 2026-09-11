"use client";

import Image from "next/image";
import { useRef, useState, type FormEvent } from "react";
import { Button, ChoiceControl, FormControl } from "@/components/ui/primitives";
import { reviewKinds, type ReviewRecord } from "@/lib/reviews-contract";
import { AdminRequestError } from "./request";
import { imageUploadAccept, imageUploadErrorText, uploadImages } from "./image-upload";
import { MarkdownEditor } from "./markdown-editor";
import { MarkdownHelp } from "./markdown-help";

export const reviewKindLabels = { blog: "블로그", cafe: "카페", video: "영상", note: "짧은 글" } as const;

export function ReviewsEditor({ record, disabled, uploading, onUpload, onExpired, onDirty, onSave, onCancel }: {
  readonly record: ReviewRecord | null; readonly disabled: boolean; readonly uploading: boolean;
  readonly onUpload: (value: boolean) => void; readonly onExpired: () => void; readonly onDirty: () => void;
  readonly onSave: (event: FormEvent<HTMLFormElement>) => void; readonly onCancel: () => void;
}) {
  const [image, setImage] = useState(record?.image ?? "");
  const [error, setError] = useState("");
  const [imagePending, setImagePending] = useState(false);
  const busy = useRef(false);
  const pendingUploads = useRef(new Set<"image" | "description" | "descriptionEn">());
  const picker = useRef<HTMLInputElement>(null);
  function uploadPending(source: "image" | "description" | "descriptionEn", pending: boolean) {
    if (pending) pendingUploads.current.add(source);
    else pendingUploads.current.delete(source);
    onUpload(pendingUploads.current.size > 0);
  }
  async function upload(input: HTMLInputElement) {
    const file = input.files?.[0]; input.value = "";
    if (!file || busy.current || disabled) return;
    busy.current = true; setImagePending(true); uploadPending("image", true); setError("");
    try { const images = await uploadImages([file]); setImage(images[0] ?? ""); onDirty(); }
    catch (caught) { setError(imageUploadErrorText(caught, "ko")); if (caught instanceof AdminRequestError && caught.status === 401) onExpired(); }
    finally { busy.current = false; setImagePending(false); uploadPending("image", false); }
  }
  return <form className="events-form" onSubmit={onSave} onChange={onDirty}>
    <h2>{record ? "방문 후기 수정" : "방문 후기 등록"}</h2>
    <fieldset className="events-editor-fields" disabled={disabled}>
      <div className="events-field-grid">
        <label>출처 분류<FormControl><select name="kind" defaultValue={record?.kind ?? "blog"}>{reviewKinds.map((kind) => <option key={kind} value={kind}>{reviewKindLabels[kind]}</option>)}</select></FormControl></label>
        <label>작성자<FormControl><input name="author" required maxLength={200} defaultValue={record?.author ?? ""} /></FormControl></label>
        <label>원문 링크<FormControl><input name="url" type="url" required maxLength={2048} defaultValue={record?.url ?? ""} placeholder="https://" /></FormControl></label>
        <label>작성일 (선택)<FormControl><input name="date" type="date" defaultValue={record?.date ?? ""} /></FormControl></label>
      </div>
      <label>제목<FormControl><input name="title" required maxLength={200} defaultValue={record?.title ?? ""} /></FormControl></label>
      <label>소개<FormControl><textarea name="summary" required maxLength={2000} rows={5} defaultValue={record?.summary ?? ""} /></FormControl></label>
      <fieldset className="events-gallery-field" disabled={imagePending}>
        <legend>썸네일 (선택)</legend><p className="muted">사진 1장 · 최대 10MB. 대표 후기에는 사진이 필요합니다.</p>
        <input type="hidden" name="image" value={image} />
        <div className="events-upload"><Button variant="secondary" onClick={() => picker.current?.click()}>{image ? "사진 교체" : "사진 선택"}</Button><input ref={picker} hidden type="file" aria-label="썸네일 사진 선택" accept={imageUploadAccept} onChange={(event) => void upload(event.currentTarget)} /></div>
        {imagePending && <p role="status">사진 업로드 중…</p>}{error && <p className="events-error" role="alert">{error}</p>}
        {image && <ol className="events-gallery-editor"><li><Image src={image} alt="후기 썸네일" width={320} height={180} unoptimized /><div className="events-image-actions"><Button variant="quiet" onClick={() => { setImage(""); onDirty(); }}>사진 제거</Button></div></li></ol>}
      </fieldset>
      <label>URL 슬러그 (본문 작성 시 필수)<FormControl><input name="slug" defaultValue={record?.slug ?? ""} maxLength={100} pattern="(?=.*[a-z])[a-z0-9]+(-[a-z0-9]+)*" autoCapitalize="none" spellCheck={false} aria-describedby="review-slug-help" /></FormControl></label>
      <p id="review-slug-help" className="muted">/ko/reviews/ 뒤에 붙는 주소입니다. 영어 두세 단어를 하이픈으로 이어 작성하세요. 예: coffee-and-reading.</p>
      <MarkdownEditor name="description" label="후기 본문 (선택)" defaultValue={record?.description ?? ""} rows={12} helpId="review-markdown-help" onPending={(pending) => uploadPending("description", pending)} onDirty={onDirty} onExpired={onExpired} />
      <p className="muted">본문을 작성하면 카드에서 후기 상세 페이지로 이동합니다. 본문을 비우면 기존처럼 원문으로 연결됩니다.</p>
      <MarkdownHelp id="review-markdown-help" />
      <div className="events-field-grid">
        <label>영어 제목 (선택)<FormControl><input name="titleEn" maxLength={200} defaultValue={record?.titleEn ?? ""} /></FormControl></label>
        <label>대표 후기 제목 (선택)<FormControl><input name="feature_title" maxLength={200} defaultValue={record?.feature_title ?? ""} /></FormControl></label>
      </div>
      <label>영어 소개 (선택)<FormControl><textarea name="summaryEn" maxLength={2000} rows={4} defaultValue={record?.summaryEn ?? ""} /></FormControl></label>
      <MarkdownEditor name="descriptionEn" label="영어 후기 본문 (선택)" defaultValue={record?.descriptionEn ?? ""} rows={8} helpId="review-markdown-help" onPending={(pending) => uploadPending("descriptionEn", pending)} onDirty={onDirty} onExpired={onExpired} />
      <label>영어 대표 후기 제목 (선택)<FormControl><input name="feature_titleEn" maxLength={200} defaultValue={record?.feature_titleEn ?? ""} /></FormControl></label>
      <p className="muted">영어를 비우면 한국어가 표시됩니다. 대표 후기 제목을 비우면 일반 제목이 표시됩니다.</p>
      <label>표시 순서<FormControl><input name="sort_order" type="number" required min={-100000} max={100000} step={1} defaultValue={record?.sort_order ?? 0} /></FormControl></label>
      <p className="muted">숫자가 작을수록 먼저 표시됩니다.</p>
      <label className="events-checkbox"><ChoiceControl type="checkbox" name="is_active" defaultChecked={record?.is_active === 1} />공개</label>
    </fieldset>
    <div className="button-row"><Button type="submit" disabled={disabled || uploading}>저장</Button><Button variant="secondary" disabled={disabled || uploading} onClick={onCancel}>취소</Button></div>
  </form>;
}
