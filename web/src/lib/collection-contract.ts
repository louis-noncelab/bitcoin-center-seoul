import { z } from "zod";
import { contentImagesSchema, contentSlugSchema, externalLink } from "@/lib/events-contract";

export const collectionKinds = ["book", "artwork", "boardgame", "goods"] as const;
export const libraryKinds = ["book", "artwork"] as const;
export const isPurchasableKind = (kind: CollectionKind) => kind === "book" || kind === "goods";

const collectionFields = z.object({
  kind: z.enum(collectionKinds),
  slug: contentSlugSchema,
  purchaseUrl: externalLink.default(""),
  soldOut: z.boolean().optional(),
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
const hasPublicSlug = (value: z.infer<typeof collectionFields>) => value.kind !== "boardgame" || value.is_active === 0 || value.slug.length > 0;
const coverError = { message: "공개하려면 대표 이미지를 한 장 이상 등록해 주세요.", path: ["images"] };
export const collectionInputSchema = collectionFields
  .refine((value) => !value.purchaseUrl && !value.soldOut, { message: "구매 링크와 품절은 사용하지 않습니다. 도서·굿즈 판매는 상점에서 등록해 주세요.", path: ["purchaseUrl"] })
  .refine(hasPublicCover, coverError)
  .refine(hasPublicSlug, { message: "공개 보드게임은 URL 슬러그를 입력해 주세요.", path: ["slug"] });
export const collectionRecordSchema = collectionFields.extend({
  soldOut: z.boolean().default(false),
  id: z.number().int().positive(),
  revision: z.number().int().positive(),
  created_at: z.string(),
  updated_at: z.string(),
}).refine(hasPublicCover, coverError);
export type CollectionInput = z.infer<typeof collectionInputSchema>;
export type CollectionKind = (typeof collectionKinds)[number];
export type CollectionRecord = z.infer<typeof collectionRecordSchema>;
