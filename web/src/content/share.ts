import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";

export const shareCardSize = { width: 1200, height: 630 } as const;
export const defaultShareImage = "/brand/share-default.jpg";

export const shareKinds = ["programs", "journal", "shop", "collection", "goods", "boardgame", "reviews"] as const;
export type ShareKind = (typeof shareKinds)[number];

export function shareCardPath(kind: ShareKind, id: string | number): string {
  return `/og/${kind}/${id}`;
}

export function shareImages(url: string, alt: string): NonNullable<Metadata["openGraph"]>["images"] {
  return [{ url, width: shareCardSize.width, height: shareCardSize.height, alt }];
}

export function defaultShareAlt(locale: Locale): string {
  return locale === "ko"
    ? "비트코인 도서·작품, 갈색 소파, 창가 좌석이 있는 센터 라운지"
    : "Center lounge with Bitcoin books and art, a brown sofa and window seating";
}
