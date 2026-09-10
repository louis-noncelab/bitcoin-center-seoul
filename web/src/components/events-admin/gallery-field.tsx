"use client";

import Image from "next/image";
import { ImagePlus } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/primitives";
import type { Locale } from "@/i18n/routing";
import { AdminRequestError } from "./request";
import { imageUploadAccept, imageUploadErrorText, uploadImages } from "./image-upload";

export function GalleryField({ locale, images, onChange, onPending, onExpired }: {
  readonly locale: Locale; readonly images: readonly string[];
  readonly onChange: (images: string[]) => void; readonly onPending: (pending: boolean) => void; readonly onExpired: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const picker = useRef<HTMLInputElement>(null);
  const ko = locale === "ko";
  async function upload(input: HTMLInputElement) {
    const files = Array.from(input.files ?? []);
    input.value = "";
    if (!files.length || busy.current) return;
    if (images.length + files.length > 12) {
      setError(ko ? "사진은 최대 12장, 각 10MB, 한 번에 총 30MB까지 올릴 수 있습니다." : "Use up to 12 images, 10MB each and 30MB per upload."); return;
    }
    busy.current = true; setPending(true); onPending(true); setError("");
    try {
      onChange([...images, ...await uploadImages(files)]);
    } catch (caught) { setError(imageUploadErrorText(caught, locale)); if (caught instanceof AdminRequestError && caught.status === 401) onExpired(); }
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
      <div className="events-upload">
        <Button variant="secondary" disabled={pending || images.length >= 12} onClick={() => picker.current?.click()}><ImagePlus className="icon" aria-hidden="true" />{ko ? "사진 여러 장 선택" : "Choose images"}</Button>
        <input ref={picker} hidden type="file" aria-label={ko ? "사진 여러 장 선택" : "Choose images"} accept={imageUploadAccept} multiple onChange={(event) => void upload(event.currentTarget)} disabled={pending || images.length >= 12} />
      </div>
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
