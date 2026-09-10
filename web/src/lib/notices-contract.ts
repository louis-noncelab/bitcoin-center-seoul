import { z } from "zod";
import { contentSlugSchema } from "@/lib/events-contract";
import { contentTagsSchema } from "@/lib/content-tags";

export const noticeInputSchema = z.object({
  slug: contentSlugSchema.refine((value) => value.length > 0, "URL 슬러그를 입력해 주세요."),
  tags: contentTagsSchema,
  title: z.string().trim().min(1).max(200),
  titleEn: z.string().trim().max(200).default(""),
  description: z.string().trim().min(1).max(20000),
  descriptionEn: z.string().trim().max(20000).default(""),
  is_active: z.union([z.literal(0), z.literal(1)]),
}).strict();
export const noticeRecordSchema = noticeInputSchema.extend({
  id: z.number().int().positive(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type NoticeInput = z.infer<typeof noticeInputSchema>;
export type NoticeRecord = z.infer<typeof noticeRecordSchema>;
