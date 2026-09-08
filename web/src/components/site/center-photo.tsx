import Image from "next/image";
import type { CSSProperties } from "react";
import { centerMedia, type CenterMediaKey } from "@/content/media";
import type { Locale } from "@/i18n/routing";

type PhotoProps = {
  readonly name: CenterMediaKey;
  readonly locale: Locale;
  readonly sizes?: string;
  readonly hero?: boolean;
};

export function CenterPhoto({
  name,
  locale,
  sizes = "(max-width: 767px) 100vw, 60vw",
  hero = false,
}: PhotoProps) {
  const media = centerMedia[name];
  const positions: CSSProperties & {
    "--photo-position": string;
    "--photo-mobile": string;
  } = {
    "--photo-position": media.focalPosition.landscape,
    "--photo-mobile": media.focalPosition.portrait,
  };

  return (
    <Image
      src={media.image}
      alt={media.alt[locale]}
      sizes={sizes}
      preload={hero}
      className="center-photo"
      style={positions}
    />
  );
}
