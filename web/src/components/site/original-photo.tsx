"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

export function OriginalPhoto({ src, alt, crop = false }: { readonly src: string; readonly alt: string; readonly crop?: boolean }) {
  const photo = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const image = photo.current;
    if (!image) return;
    function fitOriginal() {
      if (image && image.naturalWidth > 0) {
        image.style.maxInlineSize = `min(100%, ${image.naturalWidth / window.devicePixelRatio}px)`;
        if (crop) image.style.maxBlockSize = `min(100%, ${image.naturalHeight / window.devicePixelRatio}px)`;
      }
    }
    fitOriginal();
    image.addEventListener("load", fitOriginal);
    window.addEventListener("resize", fitOriginal);
    return () => {
      image.removeEventListener("load", fitOriginal);
      window.removeEventListener("resize", fitOriginal);
    };
  }, [src, crop]);

  return <Image ref={photo} src={src} alt={alt} width={1600} height={1200} unoptimized />;
}
