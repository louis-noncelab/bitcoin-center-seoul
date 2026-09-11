"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import { useState } from "react";
import { centerVideos } from "@/content/center-videos";
import type { Locale } from "@/i18n/routing";
import "@/styles/center-videos.css";

export function CenterVideos({ locale }: { readonly locale: Locale }) {
  const [selected, setSelected] = useState<(typeof centerVideos)[number]>(centerVideos[0]);
  const [playing, setPlaying] = useState(false);
  const title = selected.title[locale];
  const channel = locale === "ko" ? "오머니(오리지널 머니)" : "Original Money · Korean audio";
  const watchUrl = `https://www.youtube.com/watch?v=${selected.id}`;

  return (
    <div className="center-videos" data-reveal-part>
      <div className="center-videos-feature">
        <div className="center-videos-player" id="center-video-player">
          {playing ? (
            <iframe
              key={selected.id}
              src={`https://www.youtube-nocookie.com/embed/${selected.id}?autoplay=1&playsinline=1&rel=0&hl=${locale}`}
              title={title}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              ref={(node) => { node?.focus(); }}
            />
          ) : (
            <a className="center-videos-poster" href={watchUrl}
              aria-label={`${locale === "ko" ? "영상 재생" : "Play video"}: ${title}`}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault(); setPlaying(true);
              }}>
              <Image key={selected.id} className="center-videos-image" src={selected.thumbnail} alt="" fill sizes="(min-width: 1024px) 60vw, 100vw" />
              <span className="center-videos-play"><Play aria-hidden="true" /></span>
            </a>
          )}
        </div>
      </div>
      <ul className="center-videos-list" aria-label={locale === "ko" ? "영상 목록" : "Video selection"}>
        {centerVideos.map((video) => (
          <li key={video.id}>
            <a className="center-videos-item" href={`https://www.youtube.com/watch?v=${video.id}`}
              aria-current={selected.id === video.id ? "true" : undefined}
              aria-controls="center-video-player"
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                if (selected.id !== video.id) { setSelected(video); setPlaying(false); }
              }}>
              <span className="center-videos-thumbnail">
                <Image src={video.thumbnail} alt="" fill sizes="(max-width: 767px) 112px, 160px" />
              </span>
              <span className="center-videos-copy">
                <span className="center-videos-title">{video.title[locale]}</span>
                <span className="center-videos-channel">{channel}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
