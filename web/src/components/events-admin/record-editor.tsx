"use client";

import { useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/primitives";
import type { Locale } from "@/i18n/routing";
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
  const ko = locale === "ko";
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || uploading) return;
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "");
    const common = { slug: text("slug"), title: text("title"), titleEn: text("titleEn"), description: text("description"), descriptionEn: text("descriptionEn"), date: text("date"), image: images[0] ?? "", images, link: text("link") };
    const body = kind === "events"
      ? { ...common, time: text("time"), location: text("location"), locationEn: text("locationEn") }
      : { ...common, meta: text("meta"), metaEn: text("metaEn"), category: text("category"), categoryEn: text("categoryEn"), host: text("host"), hostEn: text("hostEn"), startDate: text("startDate"), endDate: text("endDate"), sort_order: Number(text("sort_order")), is_active: form.has("is_active") ? 1 : 0, icon: text("icon") };
    busy.current = true; setPending(true); onBusy(true); setError("");
    try {
      await adminRequest(`/api/admin/${kind}${record ? `/${record.id}` : ""}`, z.unknown(), jsonBody(body, record ? "PUT" : "POST"));
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
        <EditorFields locale={locale} kind={kind} record={record} />
        <GalleryField locale={locale} images={images} onExpired={onExpired} onChange={(next) => { setImages(next); onDirty(); }} onPending={(value) => { setUploading(value); onBusy(value); }} />
      </fieldset>
      {error && <p role="alert" className="events-error">{error}</p>}
      <div className="button-row">
        <Button type="submit" disabled={pending || uploading}>{pending ? (ko ? "저장 중…" : "Saving…") : (ko ? "저장" : "Save")}</Button>
        <Button variant="secondary" disabled={pending || uploading} onClick={onCancel}>{ko ? "취소" : "Cancel"}</Button>
      </div>
    </form>
  );
}
