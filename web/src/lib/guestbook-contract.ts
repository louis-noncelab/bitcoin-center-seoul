import { z } from "zod";
import { contentImagesSchema, isCalendarDate } from "@/lib/events-contract";

export const guestbookInputSchema = z.object({
  entryNumber: z.number().int().min(1, "고유번호는 1 이상의 정수로 입력해 주세요.").max(2147483647),
  volume: z.number().int().min(1, "권 번호는 1 이상의 정수로 입력해 주세요.").max(2147483647).default(1),
  visitDate: z.string().refine((value) => value === "" || (/^\d{4}-\d{2}-\d{2}$/.test(value) && isCalendarDate(value)), "방문 날짜를 확인해 주세요.").default(""),
  visitorName: z.string().trim().max(100).default(""),
  body: z.string().trim().min(1, "방명록 내용을 입력해 주세요.").max(4000),
  bodyEn: z.string().trim().max(4000).default(""),
  images: contentImagesSchema.default([]),
  is_active: z.union([z.literal(0), z.literal(1)]).default(0),
}).strict();

export const guestbookRecordSchema = guestbookInputSchema.extend({
  id: z.number().int().positive(), revision: z.number().int().positive(),
  created_at: z.string(), updated_at: z.string(),
});
export type GuestbookInput = z.infer<typeof guestbookInputSchema>;
export type GuestbookRecord = z.infer<typeof guestbookRecordSchema>;

export function guestbookPageNumber(value: string | string[] | undefined): number | null {
  if (value === undefined) return 1;
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  const page = Number(value);
  return Number.isSafeInteger(page) && page <= 1_000_000 ? page : null;
}

export const guestbookHref = (page: number) => `/guestbook${page === 1 ? "" : `?page=${page}`}`;
