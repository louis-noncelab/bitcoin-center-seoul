import { z } from "zod";
import { contentSlugSchema, imagePathSchema, isCalendarDate } from "@/lib/events-contract";

export const reviewKinds = ["blog", "cafe", "video", "note"] as const;
export const reviewPlatforms = { blog: "NAVER BLOG", cafe: "NAVER CAFE", video: "YOUTUBE", note: "X" } as const;
const optionalText = (max: number) => z.string().trim().max(max).default("");
const reviewFields = z.object({
  kind: z.enum(reviewKinds),
  url: z.string().trim().min(1).max(2048).refine((value) => {
    try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; }
    catch (error) { if (error instanceof TypeError) return false; throw error; }
  }, "원문 링크는 HTTPS 주소로 입력해 주세요."),
  author: z.string().trim().min(1, "작성자를 입력해 주세요.").max(200),
  date: optionalText(10).refine((value) => value === "" || (/^\d{4}-\d{2}-\d{2}$/.test(value) && isCalendarDate(value)), "날짜를 확인해 주세요."),
  title: z.string().trim().min(1, "제목을 입력해 주세요.").max(200),
  titleEn: optionalText(200),
  summary: z.string().trim().min(1, "소개를 입력해 주세요.").max(2000),
  summaryEn: optionalText(2000),
  slug: contentSlugSchema,
  description: optionalText(20000),
  descriptionEn: optionalText(20000),
  feature_title: optionalText(200),
  feature_titleEn: optionalText(200),
  image: imagePathSchema.default(""),
  sort_order: z.number().int().min(-100000).max(100000).default(0),
  is_active: z.union([z.literal(0), z.literal(1)]).default(0),
}).strict();
export const reviewInputSchema = reviewFields.refine((value) => (!value.description && !value.descriptionEn) || !!value.slug, {
  path: ["slug"], message: "본문을 작성한 후기는 URL 슬러그를 입력해 주세요.",
}).refine((value) => !value.descriptionEn || !!value.description, {
  path: ["description"], message: "한국어 본문을 먼저 작성해 주세요.",
});
export const reviewRecordSchema = reviewFields.extend({
  id: z.number().int().positive(), revision: z.number().int().positive(),
  created_at: z.string(), updated_at: z.string(),
});
export const reviewSelectionInputSchema = z.object({
  featured_id: z.number().int().positive().nullable(),
  home_ids: z.array(z.number().int().positive()).max(3).refine((ids) => new Set(ids).size === ids.length, "홈 후기는 중복해서 선택할 수 없습니다."),
}).strict();
export const reviewSelectionSchema = reviewSelectionInputSchema.extend({ revision: z.number().int().positive() });
export const reviewAdminSchema = z.object({ records: z.array(reviewRecordSchema), selection: reviewSelectionSchema });
export type ReviewInput = z.infer<typeof reviewInputSchema>;
export type ReviewRecord = z.infer<typeof reviewRecordSchema>;
export type ReviewSelectionInput = z.infer<typeof reviewSelectionInputSchema>;
export type ReviewSelection = z.infer<typeof reviewSelectionSchema>;
