"use client";

import { ImagePlus } from "lucide-react";
import { useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Button, FormControl } from "@/components/ui/primitives";
import { AdminRequestError } from "./request";
import { imageUploadAccept, imageUploadErrorText, uploadImages } from "./image-upload";
import { attachmentMarkdown, moveInsertion, type TextSnapshot } from "./markdown-insertion";

type AttachmentBatch = {
  readonly files: readonly File[];
  images: readonly string[] | null;
  position: number;
};

export function MarkdownEditor({ name, label, defaultValue, rows = 8, required = false, helpId, onPending, onDirty, onExpired }: {
  readonly name: string; readonly label: string; readonly defaultValue: string; readonly rows?: number;
  readonly required?: boolean; readonly helpId: string; readonly onPending: (pending: boolean) => void;
  readonly onDirty: () => void; readonly onExpired: () => void;
}) {
  const id = useId();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const previous = useRef<TextSnapshot>({ value: defaultValue, selectionStart: 0 });
  const batch = useRef<AttachmentBatch | null>(null);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [retry, setRetry] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    mounted.current = true;
    const field = textarea.current;
    const capture = () => { if (field) previous.current = { value: field.value, selectionStart: field.selectionStart }; };
    field?.addEventListener("beforeinput", capture);
    return () => { mounted.current = false; controller.current?.abort(); field?.removeEventListener("beforeinput", capture); };
  }, []);

  function change(event: ChangeEvent<HTMLTextAreaElement>) {
    const next = { value: event.currentTarget.value, selectionStart: event.currentTarget.selectionStart };
    if (batch.current) batch.current.position = moveInsertion(previous.current, next, batch.current.position);
    previous.current = next;
  }

  async function attach(selection: AttachmentBatch) {
    if (busy.current) return;
    const abort = new AbortController();
    controller.current = abort;
    busy.current = true; setPending(true); onPending(true); onDirty();
    setError(""); setMessage(""); setRetry(false);
    try {
      selection.images ??= await uploadImages(selection.files, abort.signal);
      const field = textarea.current;
      if (abort.signal.aborted || !mounted.current || !field) return;
      const insertion = `\n\n${attachmentMarkdown(selection.files, selection.images)}\n\n`;
      if (field.value.length + insertion.length > field.maxLength) {
        setError("사진을 넣으면 본문 20,000자를 초과합니다. 글을 줄인 뒤 다시 시도해 주세요. 올린 사진은 유지됩니다.");
        setRetry(true); return;
      }
      const position = Math.min(selection.position, field.value.length);
      const atInsertion = field.selectionStart === position && field.selectionEnd === position;
      field.setRangeText(insertion, position, position, atInsertion ? "end" : "preserve");
      previous.current = { value: field.value, selectionStart: field.selectionStart };
      batch.current = null; onDirty();
      setMessage(`${selection.images.length}장 첨부했습니다. [사진 설명]을 수정할 수 있습니다.`);
      if (document.activeElement === trigger.current) field.focus({ preventScroll: true });
    } catch (caught) {
      if (abort.signal.aborted || !mounted.current) return;
      setError(imageUploadErrorText(caught, "ko")); setRetry(true);
      if (caught instanceof AdminRequestError && caught.status === 401) onExpired();
    } finally {
      busy.current = false; controller.current = null; onPending(false);
      if (mounted.current) setPending(false);
    }
  }

  function select(files: readonly File[]) {
    const field = textarea.current;
    if (!files.length || busy.current || !field || field.matches(":disabled")) return;
    const selection = { files, images: null, position: field.selectionStart };
    batch.current = selection;
    previous.current = { value: field.value, selectionStart: field.selectionStart };
    void attach(selection);
  }

  function dragOver(event: DragEvent<HTMLTextAreaElement>) {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = busy.current ? "none" : "copy";
    setDragging(!busy.current);
  }

  function drop(event: DragEvent<HTMLTextAreaElement>) {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault(); setDragging(false);
    select(Array.from(event.dataTransfer.files));
  }

  return (
    <div className="markdown-editor" data-dragging={dragging || undefined}>
      <label htmlFor={id}>{label}</label>
      <div className="markdown-editor-toolbar" role="group" aria-label={`${label} 편집 도구`}>
        <Button ref={trigger} variant="secondary" disabled={pending} aria-label={`${label} 사진 첨부`} onClick={() => picker.current?.click()}><ImagePlus className="icon" aria-hidden="true" />사진 첨부</Button>
        <input ref={picker} type="file" hidden multiple accept={imageUploadAccept} aria-label={`${label} 사진 파일 선택`} onChange={(event) => { const files = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = ""; select(files); }} />
        <span className="muted caption">사진을 본문에 끌어놓아도 됩니다.</span>
      </div>
      <FormControl><textarea ref={textarea} id={id} name={name} defaultValue={defaultValue} rows={rows} required={required} maxLength={20000} aria-describedby={helpId} onChange={change} onDragOver={dragOver} onDragLeave={() => setDragging(false)} onDrop={drop} /></FormControl>
      <p className="markdown-editor-status muted" role="status">{pending ? "사진 업로드 중… 글을 계속 작성할 수 있습니다." : message}</p>
      {error && <p className="events-error" role="alert">{error}</p>}
      {retry && <Button className="markdown-editor-retry" variant="secondary" disabled={pending} onClick={() => { if (batch.current) void attach(batch.current); }}>사진 첨부 다시 시도</Button>}
    </div>
  );
}
