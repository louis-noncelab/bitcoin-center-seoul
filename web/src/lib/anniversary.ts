import { imagePathSchema, type HighlightRecord } from "@/lib/events-contract";

export const CENTER_OPENED_ON = "2025-10-21";

export function anniversaryYears(today: string): number[] {
  const year = Number(today.slice(0, 4));
  const latest = today.slice(5) >= "10-14" ? year : year - 1;
  return Array.from({ length: Math.max(0, latest - 2025) }, (_, index) => latest - index);
}

export function anniversaryWindow(today: string): number | null {
  const year = Number(today.slice(0, 4));
  return year >= 2026 && today.slice(5) >= "10-14" && today.slice(5) <= "10-27" ? year : null;
}

export function anniversaryHighlights(highlights: readonly HighlightRecord[], year: number, today: string): HighlightRecord[] {
  const first = year === 2026 ? CENTER_OPENED_ON : `${year - 1}-10-21`;
  const last = today < `${year}-10-21` ? today : `${year}-10-21`;
  return highlights.filter((highlight) => {
    const date = (highlight.date || highlight.startDate).trim().replaceAll(".", "-");
    const cover = highlight.images[0] || highlight.image;
    return highlight.is_active === 1 && Boolean(cover) && imagePathSchema.safeParse(cover).success
      && date >= first && date <= last && (year === 2026 || date > first);
  }).sort((left, right) => {
    const leftDate = (left.date || left.startDate).trim().replaceAll(".", "-");
    const rightDate = (right.date || right.startDate).trim().replaceAll(".", "-");
    return leftDate.localeCompare(rightDate) || left.id - right.id;
  });
}
