"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/primitives";
import type { Locale } from "@/i18n/routing";

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
  const ko = locale === "ko";
  const source = `/images/space-tour/${name}.mp4`;

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
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    function synchronize() {
      if (!film) return;
      const active = film.closest('[role="tabpanel"]')?.getAttribute("aria-hidden") !== "true";
      if (!visible || !active || document.hidden || intent.current === "pause" || (preference.matches && intent.current !== "play")) film.pause();
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
    document.addEventListener("visibilitychange", synchronize);
    return () => {
      visibility.disconnect();
      selection.disconnect();
      preference.removeEventListener("change", preferenceChanged);
      document.removeEventListener("visibilitychange", synchronize);
      film.pause();
    };
  }, [play]);

  const action = error ? (ko ? "다시 재생" : "Try again") : playing ? (ko ? "일시정지" : "Pause") : (ko ? "재생" : "Play");
  const Icon = error ? RotateCcw : playing ? Pause : Play;

  return (
    <figure className="space-film" data-ready={ready} data-playing={playing}>
      <div className="space-film-viewport">
        <Image src={`/images/space-tour/${name}.webp`} alt={label} width={640} height={360} unoptimized className="space-film-poster" aria-hidden={ready || undefined} />
        <video
          ref={video} width={640} height={360} muted playsInline loop preload="none"
          poster={`/images/space-tour/${name}.webp`}
          aria-label={`${label} · ${ko ? "소리 없는 공간 영상" : "Silent film of the space"}`}
          aria-hidden={!ready}
          onPlaying={() => { setPlaying(true); setError(false); }}
          onPause={() => setPlaying(false)}
          onError={() => { intent.current = "pause"; setPlaying(false); setError(true); }}
        >{ko ? "이 브라우저는 영상 재생을 지원하지 않습니다." : "This browser does not support video playback."}</video>
        {error && <span className="space-film-error" role="status">{ko ? "영상을 불러오지 못했습니다." : "Video could not load."}</span>}
        <Button variant="quiet" className="space-film-toggle" disabled={!ready} aria-label={`${label} · ${action}`} onClick={() => {
          const film = video.current;
          if (!film) return;
          if (!film.paused) { intent.current = "pause"; film.pause(); }
          else {
            intent.current = "play";
            if (error) { setError(false); film.load(); }
            play();
          }
        }}><Icon className="icon" aria-hidden="true" /></Button>
      </div>
    </figure>
  );
}
