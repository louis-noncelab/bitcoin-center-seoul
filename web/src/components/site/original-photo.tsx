"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

export function OriginalPhoto({ src, alt, crop = false, poster = false }: { readonly src: string; readonly alt: string; readonly crop?: boolean; readonly poster?: boolean }) {
  const photo = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const image = photo.current;
    if (!image) return;
    const frame = image.parentElement;
    function fitOriginal() {
      if (image && image.naturalWidth > 0) {
        if (poster) {
          frame?.style.setProperty("max-inline-size", `${Math.min(image.naturalWidth, image.naturalHeight * 3 / 4) / window.devicePixelRatio}px`);
        } else {
          image.style.maxInlineSize = `min(100%, ${image.naturalWidth / window.devicePixelRatio}px)`;
          if (crop) image.style.maxBlockSize = `min(100%, ${image.naturalHeight / window.devicePixelRatio}px)`;
        }
      }
    }
    fitOriginal();
    image.addEventListener("load", fitOriginal);
    window.addEventListener("resize", fitOriginal);
    return () => {
      image.removeEventListener("load", fitOriginal);
      window.removeEventListener("resize", fitOriginal);
      if (poster) frame?.style.removeProperty("max-inline-size");
    };
  }, [src, crop, poster]);

  return poster
    ? <Image ref={photo} src={src} alt={alt} fill sizes="(max-width: 767px) 100vw, 52.5svh" unoptimized />
    : <Image ref={photo} src={src} alt={alt} width={1600} height={1200} unoptimized />;
}
