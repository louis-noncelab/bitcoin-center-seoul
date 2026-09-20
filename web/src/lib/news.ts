import { seoulDate } from "@/lib/center-status";
import { imagePathSchema, isCalendarDate, type HighlightRecord } from "@/lib/events-contract";
import type { NoticeRecord } from "@/lib/notices-contract";

export type NewsItem = {
  key: string;
  kind: "notice" | "journal";
  href: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  date: string;
};

function noticeDate(value: string): string {
  const trimmed = value.trim();
  if (isCalendarDate(trimmed)) return trimmed.replaceAll(".", "-");
  const timestamp = trimmed.replace(" ", "T");
  // SQLite CURRENT_TIMESTAMP is UTC, even though its value has no zone suffix.
  const date = new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(timestamp) ? timestamp : `${timestamp}Z`);
  return Number.isNaN(date.getTime()) ? "" : seoulDate(date);
}

export function buildNewsFeed(notices: readonly NoticeRecord[], highlights: readonly HighlightRecord[]): NewsItem[] {
  const items: NewsItem[] = [
    ...notices.filter((notice) => notice.is_active === 1).map((notice): NewsItem => ({
      key: `notice-${notice.id}`,
      kind: "notice",
      href: `/notices/${notice.slug}`,
      title: notice.title,
      titleEn: notice.titleEn,
      description: notice.description,
      descriptionEn: notice.descriptionEn,
      date: noticeDate(notice.created_at),
    })),
    ...highlights.filter((highlight) => highlight.is_active === 1).map((highlight): NewsItem => ({
      key: `journal-${highlight.id}`,
      kind: "journal",
      href: `/journal/${highlight.slug || highlight.id}`,
      title: highlight.title,
      titleEn: highlight.titleEn,
      description: highlight.description,
      descriptionEn: highlight.descriptionEn,
      date: (highlight.endDate || highlight.date || highlight.startDate).trim().replaceAll(".", "-"),
    })),
  ];
  return items.sort((left, right) => right.date.localeCompare(left.date) || left.key.localeCompare(right.key));
}

export function mediaHighlights(highlights: readonly HighlightRecord[], limit?: number): HighlightRecord[] {
  const seen = new Set<string>();
  return highlights.filter((highlight) => {
    if (highlight.is_active !== 1) return false;
    const cover = highlight.images[0] || highlight.image;
    if (!cover || !imagePathSchema.safeParse(cover).success || seen.has(cover)) return false;
    seen.add(cover);
    return true;
  }).slice(0, Math.max(0, limit ?? Infinity));
}
