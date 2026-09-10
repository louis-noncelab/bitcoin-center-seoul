import { z } from "zod";
import { contentTagsSchema } from "@/lib/content-tags";

const requiredText = (maximum: number) => z.string().trim().min(1).max(maximum);
const optionalText = (maximum: number) => z.string().trim().max(maximum);
export const contentSlugSchema = z.string().trim().toLowerCase().max(100).refine(
  (value) => value === "" || (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && /[a-z]/.test(value)),
  "주소는 영문 소문자, 숫자, 하이픈으로 입력하고 영문자를 하나 이상 포함해주세요.",
).default("");
export const isCalendarDate = (value: string): boolean => {
  const match = /^(\d{4})[-.](\d{2})[-.](\d{2})$/.exec(value.trim());
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
};
const date = z
  .string()
  .max(32)
  .refine(isCalendarDate, "날짜 형식이 올바르지 않습니다.");
const optionalDate = z
  .string()
  .max(32)
  .refine(
    (value) => value === "" || isCalendarDate(value),
    "날짜 형식이 올바르지 않습니다.",
  );
export const imagePathSchema = z
  .string()
  .max(512)
  .refine(
    (value) =>
      value === "" ||
      /^\/images\/(?:uploads|events\/uploads|highlights\/uploads)\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.(?:avif|gif|jpe?g|png|webp)$/i.test(
        value,
      ),
    "이미지 경로가 올바르지 않습니다.",
  );
const externalLink = z
  .string()
  .max(2048)
  .refine((value) => {
    if (value === "") return true;
    try {
      const protocol = new URL(value).protocol;
      return protocol === "https:" || protocol === "http:";
    } catch (error) {
      if (error instanceof TypeError) return false;
      throw error;
    }
  }, "링크는 http 또는 https URL이어야 합니다.");
const images = z
  .array(imagePathSchema.refine((value) => value !== "", "빈 이미지 경로는 사용할 수 없습니다."))
  .max(12)
  .refine((values) => new Set(values).size === values.length, "같은 이미지를 중복해서 사용할 수 없습니다.");

const eventFields = {
  slug: contentSlugSchema,
  tags: contentTagsSchema,
  title: requiredText(200),
  titleEn: requiredText(200),
  date,
  time: optionalText(100),
  location: optionalText(300),
  locationEn: optionalText(300),
  description: requiredText(20_000),
  descriptionEn: requiredText(20_000),
  image: imagePathSchema,
  link: externalLink,
  images,
} as const;

const highlightFields = {
  slug: contentSlugSchema,
  tags: contentTagsSchema,
  title: requiredText(200),
  titleEn: requiredText(200),
  meta: optionalText(200),
  metaEn: optionalText(200),
  category: optionalText(100),
  categoryEn: optionalText(100),
  date: optionalDate,
  startDate: optionalDate,
  endDate: optionalDate,
  host: optionalText(300),
  hostEn: optionalText(300),
  description: requiredText(20_000),
  descriptionEn: requiredText(20_000),
  image: imagePathSchema,
  link: externalLink,
  icon: optionalText(100),
  sort_order: z.number().int().min(-100_000).max(100_000),
  is_active: z.union([z.literal(0), z.literal(1)]),
  images,
} as const;

const validateHighlightPeriod = (
  value: { readonly date: string; readonly startDate: string; readonly endDate: string },
  context: z.RefinementCtx,
): void => {
  const single = value.date !== "";
  const start = value.startDate !== "";
  const end = value.endDate !== "";
  const period = start && end;
  const validSingle = single && !start && !end;
  const validPeriod = !single && period;
  if (!validSingle && !validPeriod) {
    context.addIssue({ code: "custom", path: ["date"], message: "단일 날짜 또는 시작일과 종료일 중 하나만 입력해주세요." });
  }
  if (period && value.endDate.trim().replaceAll(".", "-") < value.startDate.trim().replaceAll(".", "-")) {
    context.addIssue({ code: "custom", path: ["endDate"], message: "종료일은 시작일보다 빠를 수 없습니다." });
  }
};

export const eventRecordSchema = z
  .object({
    id: z.number().int().positive(),
    ...eventFields,
  })
  .strict();

export const highlightRecordSchema = z
  .object({
    id: z.number().int().positive(),
    ...highlightFields,
  })
  .strict()
  .superRefine(validateHighlightPeriod);

export const eventInputSchema = z.object(eventFields).strict();
export const highlightInputSchema = z.object(highlightFields).strict().superRefine(validateHighlightPeriod);

export type EventRecord = z.infer<typeof eventRecordSchema>;
export type HighlightRecord = z.infer<typeof highlightRecordSchema>;
export type EventInput = z.infer<typeof eventInputSchema>;
export type HighlightInput = z.infer<typeof highlightInputSchema>;
