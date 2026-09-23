"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { Locale } from "@/i18n/routing";

const LENS = 180;
const ZOOM = 1.8;

export function ProductGallery({ images, name, locale }: { readonly images: readonly string[]; readonly name: string; readonly locale: Locale }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [lens, setLens] = useState<{ x: number; y: number; size: string; position: string } | null>(null);
  const frame = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const natural = useRef({ signature: "", width: 0, height: 0 });
  const signature = images.join("\0");
  const [seen, setSeen] = useState(signature);
  if (seen !== signature) {
    setSeen(signature);
    setIndex(0);
    setLens(null);
  }
  const current = images[index] ?? images[0];

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  function go(next: number) {
    if (images.length < 2) return;
    setLens(null);
    natural.current = { signature, width: 0, height: 0 };
    setIndex((next + images.length) % images.length);
  }

  function moveLens(event: MouseEvent<HTMLButtonElement>) {
    const box = frame.current?.getBoundingClientRect();
    if (!box || !current) return;
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    const side = box.width;
    const measured = natural.current.signature === signature ? natural.current : { width: 0, height: 0 };
    const nW = measured.width || side;
    const nH = measured.height || side;
    const scale = Math.min(side / nW, side / nH);
    const drawnW = nW * scale;
    const drawnH = nH * scale;
    const offsetX = (side - drawnW) / 2;
    const offsetY = (side - drawnH) / 2;
    if (x < offsetX || x > offsetX + drawnW || y < offsetY || y > offsetY + drawnH) { setLens(null); return; }
    setLens({
      x, y,
      size: `${drawnW * ZOOM}px ${drawnH * ZOOM}px`,
      position: `${LENS / 2 - (x - offsetX) * ZOOM}px ${LENS / 2 - (y - offsetY) * ZOOM}px`,
    });
  }

  if (!current) return null;

  return <div className="commerce-gallery">
    <button
      ref={frame}
      type="button"
      className="commerce-gallery-stage"
      onMouseMove={moveLens}
      onMouseLeave={() => setLens(null)}
      onClick={() => setOpen(true)}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") go(index + 1);
        if (event.key === "ArrowLeft") go(index - 1);
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setOpen(true); }
      }}
      aria-label={locale === "ko" ? `${name} 사진 확대` : `Enlarge photo of ${name}`}
    >
      <Image key={current} src={current} alt={`${name} ${index + 1}`} fill sizes="(max-width: 767px) 100vw, 50vw" unoptimized onLoad={(event) => { natural.current = { signature, width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight }; }} />
      {lens && current ? <span className="commerce-gallery-lens" style={{ left: lens.x - LENS / 2, top: lens.y - LENS / 2, backgroundImage: `url("${current}")`, backgroundSize: lens.size, backgroundPosition: lens.position }} /> : null}
      {images.length > 1 ? <span className="commerce-gallery-count">{index + 1} / {images.length}</span> : null}
    </button>
    {images.length > 1 ? <div className="commerce-gallery-thumbs">
      {images.map((image, item) => <button key={image} type="button" className={item === index ? "is-selected" : ""} aria-label={`${name} ${item + 1}`} aria-current={item === index} onClick={() => go(item)}>
        <Image src={image} alt="" fill sizes="72px" unoptimized />
      </button>)}
    </div> : null}
    <dialog ref={dialog} className="commerce-gallery-lightbox" aria-label={name} onCancel={() => setOpen(false)} onClose={() => { setOpen(false); if (frame.current?.isConnected) frame.current.focus(); }} onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <button type="button" className="commerce-gallery-close" autoFocus onClick={() => setOpen(false)}>{locale === "ko" ? "닫기" : "Close"}</button>
      {images.length > 1 ? <button type="button" className="commerce-gallery-nav is-prev" onClick={() => go(index - 1)}>{locale === "ko" ? "이전" : "Previous"}</button> : null}
      <div className="commerce-gallery-full">
        <Image src={current} alt={`${name} ${index + 1}`} fill sizes="90vw" unoptimized />
      </div>
      {images.length > 1 ? <button type="button" className="commerce-gallery-nav is-next" onClick={() => go(index + 1)}>{locale === "ko" ? "다음" : "Next"}</button> : null}
    </dialog>
  </div>;
}
