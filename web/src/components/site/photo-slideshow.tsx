"use client";

import Image from "next/image";
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
  const [slide, setSlide] = useState<{ active: number; previous: number | null }>({ active: 0, previous: null });
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const current = reduced ? 0 : slide.active;

  useEffect(() => {
    const synchronize = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", synchronize);
    return () => document.removeEventListener("visibilitychange", synchronize);
  }, []);

  useEffect(() => {
    if (photos.length < 2 || !visible || reduced !== false || paused || hidden) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      setSlide(previous => {
        const next = (previous.active + 1) % photos.length;
        const image = frame.current?.querySelectorAll("img")[next];
        return image?.complete && image.naturalWidth > 0 ? { active: next, previous: previous.active } : previous;
      });
    }, hero ? 6000 : 5000);
    return () => window.clearInterval(timer);
  }, [visible, reduced, paused, hidden, photos.length, hero]);

  return <div ref={frame} className={`photo-slideshow${hero ? " hero-photo" : ""}`} data-transition={hero ? "fade" : "slide"} data-started={slide.previous !== null} data-paused={paused || !visible || hidden}>
    {photos.map((photo, index) => <div className="photo-slide" key={typeof photo === "string" ? photo : photo.src} data-active={index === current} data-previous={!reduced && index === slide.previous} aria-hidden={index !== current}>
      {typeof photo === "string" ? <CenterPhoto name={photo} locale={locale} hero={hero && index === 0} sizes={hero ? "(max-width: 767px) 134vw, (min-width: 1280px) 800px, (min-width: 1024px) 66vw, 100vw" : "(max-width: 767px) 100vw, 60vw"} /> : <Image src={photo.src} alt={photo.alt} width={1600} height={1067} sizes="(max-width: 767px) 100vw, 60vw" unoptimized className="center-photo" style={{ objectPosition: "center" }} />}
    </div>)}
    {!reduced && photos.length > 1 && <button type="button" className="photo-slideshow-toggle" onClick={() => setPaused(value => !value)} aria-label={locale === "ko" ? paused ? "사진 자동 전환 재생" : "사진 자동 전환 일시정지" : paused ? "Play photo slideshow" : "Pause photo slideshow"}>
      {locale === "ko" ? paused ? "사진 자동 전환 재생" : "사진 자동 전환 일시정지" : paused ? "Play photo slideshow" : "Pause photo slideshow"}
    </button>}
  </div>;
}
