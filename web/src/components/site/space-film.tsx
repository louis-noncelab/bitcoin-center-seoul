"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/routing";
import loungePoster from "../../../public/images/space-tour/lounge-poster.webp";
import libraryPoster from "../../../public/images/space-tour/library-poster.webp";
import galleryPoster from "../../../public/images/space-tour/gallery-poster.webp";

const posters = { lounge: loungePoster, library: libraryPoster, gallery: galleryPoster } as const;

export function SpaceFilm({ name, label, locale }: {
  readonly name: "lounge" | "library" | "gallery";
  readonly label: string;
  readonly locale: Locale;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const intent = useRef<"auto" | "play" | "pause">("auto");
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);
  const [hasFrame, setHasFrame] = useState(false);
  const ko = locale === "ko";
  const source = `/images/space-tour/${name}.mp4`;
  const poster = posters[name];

  const play = useCallback(() => {
    const film = video.current;
    if (!film) return;
    if (!film.getAttribute("src")) film.src = source;
    void film.play().catch((cause: unknown) => {
      if (!film.isConnected || (cause instanceof DOMException && cause.name === "AbortError")) return;
      intent.current = "pause";
      setPlaying(false);
      if (!(cause instanceof DOMException && cause.name === "NotAllowedError")) setError(true);
    });
  }, [source]);

  useEffect(() => {
    const film = video.current;
    if (!film) return;
    const frame = film.closest<HTMLElement>(".space-film");
    const mobile = matchMedia("(max-width: 767px)");
    function fitOriginal() {
      if (frame) frame.style.maxInlineSize = `${(film?.videoWidth || 640) / (mobile.matches ? 1 : window.devicePixelRatio)}px`;
    }
    fitOriginal();
    film.addEventListener("loadedmetadata", fitOriginal);
    window.addEventListener("resize", fitOriginal);
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const connection = "connection" in navigator ? navigator.connection : null;
    let visible = false;
    function synchronize() {
      if (!film) return;
      const active = film.closest('[role="tabpanel"]')?.getAttribute("aria-hidden") !== "true";
      const saveData = connection && typeof connection === "object" && "saveData" in connection && connection.saveData === true;
      const slowNetwork = connection && typeof connection === "object" && "effectiveType" in connection
        && (connection.effectiveType === "slow-2g" || connection.effectiveType === "2g");
      const autoplayAllowed = !preference.matches && !mobile.matches && !saveData && !slowNetwork;
      if (!visible || !active || document.hidden || intent.current === "pause" || (intent.current !== "play" && !autoplayAllowed)) film.pause();
      else play();
    }
    function preferenceChanged() {
      if (preference.matches && intent.current === "play") intent.current = "auto";
      synchronize();
    }
    const visibility = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.25);
      setReady(true);
      synchronize();
    }, { threshold: [0, 0.25] });
    visibility.observe(film);
    const panel = film.closest('[role="tabpanel"]');
    const selection = new MutationObserver(synchronize);
    if (panel) selection.observe(panel, { attributes: true, attributeFilter: ["aria-hidden", "hidden"] });
    preference.addEventListener("change", preferenceChanged);
    mobile.addEventListener("change", synchronize);
    if (connection && typeof connection === "object" && "addEventListener" in connection && typeof connection.addEventListener === "function") {
      connection.addEventListener("change", synchronize);
    }
    document.addEventListener("visibilitychange", synchronize);
    return () => {
      film.removeEventListener("loadedmetadata", fitOriginal);
      window.removeEventListener("resize", fitOriginal);
      visibility.disconnect();
      selection.disconnect();
      preference.removeEventListener("change", preferenceChanged);
      mobile.removeEventListener("change", synchronize);
      if (connection && typeof connection === "object" && "removeEventListener" in connection && typeof connection.removeEventListener === "function") {
        connection.removeEventListener("change", synchronize);
      }
      document.removeEventListener("visibilitychange", synchronize);
      film.pause();
    };
  }, [play]);

  const action = error ? (ko ? "다시 재생" : "Try again") : playing ? (ko ? "일시정지" : "Pause") : (ko ? "재생" : "Play");

  return (
    <figure className="space-film" data-ready={ready} data-playing={playing} data-frame={hasFrame}>
      <div className="space-film-viewport">
        <Image src={poster} alt={label} sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1023px) 60vw, 640px" className="space-film-poster" aria-hidden={ready || undefined} />
        <video
          ref={video} width={640} height={360} muted playsInline loop preload="none"
          aria-label={`${label} · ${ko ? "소리 없는 공간 영상" : "Silent film of the space"}`}
          aria-hidden={!ready}
          onLoadedData={() => setHasFrame(true)}
          onEmptied={() => setHasFrame(false)}
          onPlaying={() => { setHasFrame(true); setPlaying(true); setError(false); }}
          onPause={() => setPlaying(false)}
          onError={() => { intent.current = "pause"; setHasFrame(false); setPlaying(false); setError(true); }}
        >{ko ? "이 브라우저는 영상 재생을 지원하지 않습니다." : "This browser does not support video playback."}</video>
        {error && <span className="space-film-error" role="status">{ko ? "영상을 불러오지 못했습니다. 화면을 눌러 다시 재생하세요." : "Video could not load. Select the film to try again."}</span>}
        <button type="button" className="space-film-toggle" disabled={!ready} aria-label={`${label} · ${action}`} onClick={() => {
          const film = video.current;
          if (!film) return;
          if (!film.paused) { intent.current = "pause"; film.pause(); }
          else {
            intent.current = "play";
            if (error) { setError(false); film.load(); }
            play();
          }
        }} />
      </div>
    </figure>
  );
}
