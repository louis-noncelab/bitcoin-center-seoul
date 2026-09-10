import { z } from "zod";
import { contentImagesSchema } from "@/lib/events-contract";

const collectionFields = z.object({
  kind: z.enum(["book", "artwork"]),
  title: z.string().trim().min(1, "제목을 입력해 주세요.").max(200),
  titleEn: z.string().trim().max(200).default(""),
  creator: z.string().trim().max(200).default(""),
  creatorEn: z.string().trim().max(200).default(""),
  description: z.string().trim().max(20000).default(""),
  descriptionEn: z.string().trim().max(20000).default(""),
  images: contentImagesSchema,
  sort_order: z.number().int().min(-100000).max(100000).default(0),
  is_active: z.union([z.literal(0), z.literal(1)]).default(0),
}).strict();

const hasPublicCover = (value: z.infer<typeof collectionFields>) => value.is_active === 0 || value.images.length > 0;
const coverError = { message: "공개하려면 대표 이미지를 한 장 이상 등록해 주세요.", path: ["images"] };
export const collectionInputSchema = collectionFields.refine(hasPublicCover, coverError);
export const collectionRecordSchema = collectionFields.extend({
  id: z.number().int().positive(),
  revision: z.number().int().positive(),
  created_at: z.string(),
  updated_at: z.string(),
}).refine(hasPublicCover, coverError);
export type CollectionInput = z.infer<typeof collectionInputSchema>;
export type CollectionRecord = z.infer<typeof collectionRecordSchema>;
