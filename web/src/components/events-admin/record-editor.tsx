"use client";

import { useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/primitives";
import type { Locale } from "@/i18n/routing";
import { contentTagsSchema, splitContentTags } from "@/lib/content-tags";
import { EditorFields, type ContentKind, type ContentRecord } from "./editor-fields";
import { GalleryField } from "./gallery-field";
import { adminRequest, AdminRequestError, errorText, jsonBody } from "./request";

export function RecordEditor({ locale, kind, record, onSaved, onCancel, onDirty, onExpired, onBusy }: {
  readonly locale: Locale; readonly kind: ContentKind; readonly record: ContentRecord | null;
  readonly onSaved: () => void; readonly onCancel: () => void;
  readonly onDirty: () => void; readonly onExpired: () => void;
  readonly onBusy: (busy: boolean) => void;
}) {
  const [images, setImages] = useState<string[]>(record?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const uploads = useRef(0);
  const ko = locale === "ko";
  function uploadPending(value: boolean) {
    uploads.current += value ? 1 : -1;
    setUploading(uploads.current > 0); onBusy(busy.current || uploads.current > 0);
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || uploads.current > 0) return;
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "");
    const tags = contentTagsSchema.safeParse(splitContentTags(text("tags")));
    if (!tags.success) { setError(tags.error.issues[0]?.message ?? "해시태그를 확인해 주세요."); return; }
    const common = { slug: text("slug"), tags: tags.data, title: text("title"), titleEn: text("titleEn"), description: text("description"), descriptionEn: text("descriptionEn"), date: text("date"), image: images[0] ?? "", images, link: text("link") };
    const body = kind === "events"
      ? { ...common, registrationClosed: form.has("registrationClosed"), time: text("time"), venueType: text("venueType"), location: text("location"), locationEn: text("locationEn") }
      : { ...common, meta: text("meta"), metaEn: text("metaEn"), category: text("category"), categoryEn: text("categoryEn"), host: text("host"), hostEn: text("hostEn"), startDate: text("startDate"), endDate: text("endDate"), sort_order: Number(text("sort_order")), is_active: form.has("is_active") ? 1 : 0, icon: text("icon") };
    busy.current = true; setPending(true); onBusy(true); setError("");
    try {
      await adminRequest(`/api/admin/${kind}${record ? `/${record.id}` : ""}`, z.unknown(), jsonBody(body, record ? "PUT" : "POST", record?.revision));
      onSaved();
    } catch (caught) {
      setError(errorText(caught, locale));
      if (caught instanceof AdminRequestError && caught.status === 401) onExpired();
    } finally { busy.current = false; setPending(false); onBusy(false); }
  }
  return (
    <form className="events-form events-editor" onSubmit={(event) => void submit(event)} onChange={onDirty}>
      <h2>{record ? (ko ? "내용 수정" : "Edit content") : (ko ? "새 항목 등록" : "Add content")}</h2>
      <fieldset disabled={pending} className="events-editor-fields">
        <EditorFields locale={locale} kind={kind} record={record} onPending={uploadPending} onDirty={onDirty} onExpired={onExpired} />
        <GalleryField locale={locale} images={images} onExpired={onExpired} onChange={(next) => { setImages(next); onDirty(); }} onPending={uploadPending} />
      </fieldset>
      {error && <p role="alert" className="events-error">{error}</p>}
      <div className="button-row">
        <Button type="submit" disabled={pending || uploading}>{pending ? (ko ? "저장 중…" : "Saving…") : (ko ? "저장" : "Save")}</Button>
        <Button variant="secondary" disabled={pending || uploading} onClick={onCancel}>{ko ? "취소" : "Cancel"}</Button>
      </div>
    </form>
  );
}
