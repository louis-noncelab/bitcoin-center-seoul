"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/primitives";
import type { Locale } from "@/i18n/routing";
import { adminRequest, AdminRequestError, errorText } from "./request";

export function GalleryField({ locale, images, onChange, onPending, onExpired }: {
  readonly locale: Locale; readonly images: readonly string[];
  readonly onChange: (images: string[]) => void; readonly onPending: (pending: boolean) => void; readonly onExpired: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const ko = locale === "ko";
  async function upload(input: HTMLInputElement) {
    const files = Array.from(input.files ?? []);
    input.value = "";
    if (!files.length || busy.current) return;
    if (images.length + files.length > 12 || files.some((file) => file.size > 10 * 1024 ** 2) || files.reduce((sum, file) => sum + file.size, 0) > 30 * 1024 ** 2) {
      setError(ko ? "사진은 최대 12장, 각 10MB, 한 번에 총 30MB까지 올릴 수 있습니다." : "Use up to 12 images, 10MB each and 30MB per upload."); return;
    }
    busy.current = true; setPending(true); onPending(true); setError("");
    const body = new FormData(); files.forEach((file) => body.append("files", file));
    try {
      const result = await adminRequest("/api/admin/images", z.object({ images: z.array(z.string()) }), { method: "POST", body });
      onChange([...images, ...result.images]);
    } catch (caught) { setError(errorText(caught, locale)); if (caught instanceof AdminRequestError && caught.status === 401) onExpired(); }
    finally { busy.current = false; setPending(false); onPending(false); }
  }
  function move(index: number, direction: number) {
    const next = [...images]; const [item] = next.splice(index, 1);
    if (item !== undefined) { next.splice(index + direction, 0, item); onChange(next); }
  }
  return (
    <fieldset className="events-gallery-field" disabled={pending}>
      <legend>{ko ? "사진" : "Images"}</legend>
      <p className="muted">{ko ? "첫 번째 사진이 대표 이미지입니다. 최대 12장 · 각 10MB · 한 번에 30MB" : "The first image is the cover. Up to 12 images · 10MB each · 30MB per upload"}</p>
      <label className="events-upload">{ko ? "사진 여러 장 선택" : "Choose images"}<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => void upload(event.currentTarget)} disabled={pending || images.length >= 12} /></label>
      <p role="status">{pending ? (ko ? "사진 업로드 중…" : "Uploading images…") : (ko ? `${images.length}장 선택됨` : `${images.length} images selected`)}</p>
      {error && <p className="events-error" role="alert">{error}</p>}
      <ol className="events-gallery-editor">
        {images.map((url, index) => (
          <li key={`${url}-${index}`}>
            <Image src={url} alt={ko ? `사진 ${index + 1}` : `Image ${index + 1}`} width={320} height={240} unoptimized />
            <div className="events-image-actions">
              <Button variant="secondary" disabled={index === 0} onClick={() => move(index, -1)} aria-label={ko ? `사진 ${index + 1} 앞으로` : `Move image ${index + 1} earlier`}>↑</Button>
              <Button variant="secondary" disabled={index === images.length - 1} onClick={() => move(index, 1)} aria-label={ko ? `사진 ${index + 1} 뒤로` : `Move image ${index + 1} later`}>↓</Button>
              <Button variant="quiet" onClick={() => onChange(images.filter((_, position) => position !== index))}>{ko ? "제거" : "Remove"}</Button>
            </div>
          </li>
        ))}
      </ol>
    </fieldset>
  );
}
