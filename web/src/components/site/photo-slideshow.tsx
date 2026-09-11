"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useInView } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CenterMediaKey } from "@/content/media";
import type { Locale } from "@/i18n/routing";
import { CenterPhoto } from "./center-photo";

function subscribeMotionPreference(onChange: () => void) {
  const query = matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const motionPreference = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const serverMotionPreference = () => true;

export function PhotoSlideshow({ locale, photos, hero = false }: { readonly locale: Locale; readonly photos: readonly (CenterMediaKey | { readonly src: string; readonly alt: string })[]; readonly hero?: boolean }) {
  const frame = useRef<HTMLDivElement>(null);
  const visible = useInView(frame, { amount: 0.25 });
  const reduced = useSyncExternalStore(subscribeMotionPreference, motionPreference, serverMotionPreference);
  const [slide, setSlide] = useState<{ active: number; previous: number | null; direction: number }>({ active: 0, previous: null, direction: 1 });
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [focused, setFocused] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const current = slide.active;
  const navigate = (direction: number) => {
    if (photos.length < 2) return;
    setSlide(previous => ({ active: (previous.active + direction + photos.length) % photos.length, previous: previous.active, direction }));
  };

  useEffect(() => {
    const synchronize = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", synchronize);
    return () => document.removeEventListener("visibilitychange", synchronize);
  }, []);

  useEffect(() => {
    if (photos.length < 2 || !visible || reduced !== false || paused || focused || hidden) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      setSlide(previous => {
        const next = (previous.active + 1) % photos.length;
        const image = frame.current?.querySelectorAll("img")[next];
        return image?.complete && image.naturalWidth > 0 ? { active: next, previous: previous.active, direction: 1 } : previous;
      });
    }, hero ? 6000 : 5000);
    return () => window.clearInterval(timer);
  }, [visible, reduced, paused, focused, hidden, photos.length, hero, slide.active]);

  return <div ref={frame} className={`photo-slideshow${hero ? " hero-photo" : ""}`} data-transition={hero ? "fade" : "slide"} data-started={slide.previous !== null} data-paused={paused || focused || !visible || hidden} data-direction={slide.direction} role="group" aria-label={locale === "ko" ? hero ? "센터 공간 사진" : "강의와 밋업 사진" : hero ? "Center photos" : "Classes and meetups photos"}
    onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
    onKeyDown={event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); navigate(event.key === "ArrowLeft" ? -1 : 1); }
    }}
    onPointerDown={event => {
      if (event.pointerType === "touch" && event.isPrimary && !(event.target instanceof Element && event.target.closest("button"))) touchStart.current = { x: event.clientX, y: event.clientY };
    }}
    onPointerCancel={() => { touchStart.current = null; }}
    onPointerUp={event => {
      const start = touchStart.current;
      touchStart.current = null;
      if (!start) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) navigate(dx < 0 ? 1 : -1);
    }}>
    {photos.map((photo, index) => <div className="photo-slide" key={typeof photo === "string" ? photo : photo.src} data-active={index === current} data-previous={!reduced && index === slide.previous} aria-hidden={index !== current}>
      {typeof photo === "string" ? <CenterPhoto name={photo} locale={locale} hero={hero && index === 0} sizes={hero ? "(max-width: 767px) 134vw, (min-width: 1280px) 800px, (min-width: 1024px) 66vw, 100vw" : "(max-width: 767px) 100vw, 60vw"} /> : <Image src={photo.src} alt={photo.alt} width={1600} height={1067} sizes="(max-width: 767px) 100vw, 60vw" unoptimized className="center-photo" style={{ objectPosition: "center" }} />}
    </div>)}
    {photos.length > 1 && <div className="photo-controls">
      <span className="sr-only" aria-label={locale === "ko" ? `${photos.length}장 중 ${current + 1}번째 사진` : `Photo ${current + 1} of ${photos.length}`}>{current + 1} / {photos.length}</span>
      <button type="button" onClick={() => navigate(-1)} aria-label={locale === "ko" ? "이전 사진" : "Previous photo"}><ChevronLeft className="icon" aria-hidden="true" /></button>
      <button type="button" onClick={() => navigate(1)} aria-label={locale === "ko" ? "다음 사진" : "Next photo"}><ChevronRight className="icon" aria-hidden="true" /></button>
    </div>}
    {!reduced && photos.length > 1 && <button type="button" className="photo-slideshow-toggle" onClick={() => setPaused(value => !value)} aria-label={locale === "ko" ? paused ? "사진 자동 전환 재생" : "사진 자동 전환 일시정지" : paused ? "Play photo slideshow" : "Pause photo slideshow"}>
      {locale === "ko" ? paused ? "사진 자동 전환 재생" : "사진 자동 전환 일시정지" : paused ? "Play photo slideshow" : "Pause photo slideshow"}
    </button>}
  </div>;
}
