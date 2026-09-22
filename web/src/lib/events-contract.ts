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
export const externalLink = z
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
export const contentImagesSchema = z
  .array(imagePathSchema.refine((value) => value !== "", "빈 이미지 경로는 사용할 수 없습니다."))
  .max(12)
  .refine((values) => new Set(values).size === values.length, "같은 이미지를 중복해서 사용할 수 없습니다.");

const eventFields = {
  registrationClosed: z.boolean().optional(),
  venueType: z.enum(["center", "external"]),
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
  ticketPriceKrw: z.string().trim().regex(/^$|^[1-9]\d{0,8}$/, "참가비는 1원 이상의 정수로 입력해 주세요.").default(""),
  ticketCapacity: z.number().int().min(0).max(100_000).default(0),
  externalPayment: z.boolean().default(true),
  isOnline: z.boolean().default(false),
  onlineUrl: externalLink.default(""),
  onlineInstructions: optionalText(1000).default(""),
  onlineInstructionsEn: optionalText(1000).default(""),
  images: contentImagesSchema,
} as const;

const ticketFieldsConsistent = (event: { readonly externalPayment: boolean; readonly ticketPriceKrw: string; readonly ticketCapacity: number }, context: z.RefinementCtx) => {
  if (event.externalPayment) return;
  if (!event.ticketPriceKrw) context.addIssue({ code: "custom", path: ["ticketPriceKrw"], message: "센터 결제를 쓰려면 참가비를 입력해 주세요." });
  if (event.ticketCapacity < 1) context.addIssue({ code: "custom", path: ["ticketCapacity"], message: "센터 결제를 쓰려면 정원을 1명 이상 입력해 주세요." });
};

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
  images: contentImagesSchema,
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
    revision: z.number().int().positive(),
    ...eventFields,
    registrationClosed: z.boolean().default(false),
  })
  .strict()
  .superRefine(ticketFieldsConsistent);

export const highlightRecordSchema = z
  .object({
    id: z.number().int().positive(),
    revision: z.number().int().positive(),
    ...highlightFields,
  })
  .strict()
  .superRefine(validateHighlightPeriod);

export const eventInputSchema = z.object(eventFields).strict().superRefine((event, context) => {
  if (event.isOnline && event.onlineUrl.length === 0) context.addIssue({ code: "custom", path: ["onlineUrl"], message: "온라인 밋업은 참여 링크가 필요합니다." });
  if (event.venueType === "external" && !event.isOnline && event.location.length === 0) context.addIssue({ code: "custom", path: ["location"], message: "외부 장소를 입력해 주세요." });
  ticketFieldsConsistent(event, context);
});
export const highlightInputSchema = z.object(highlightFields).strict().superRefine(validateHighlightPeriod);

export type EventRecord = z.infer<typeof eventRecordSchema>;
export type HighlightRecord = z.infer<typeof highlightRecordSchema>;
export type EventInput = z.infer<typeof eventInputSchema>;
export type HighlightInput = z.infer<typeof highlightInputSchema>;
