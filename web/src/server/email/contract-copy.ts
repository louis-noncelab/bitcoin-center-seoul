import { z } from "zod";

const documentSchema = z.object({
  title: z.string(),
  description: z.string(),
  introduction: z.string().optional(),
  effectiveDate: z.string().optional(),
  details: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  sections: z.array(z.object({ heading: z.string(), paragraphs: z.array(z.string()).optional(), bullets: z.array(z.string()).optional() })).optional(),
});
const evidenceSchema = z.object({
  locale: z.enum(["ko", "en"]),
  disclosure: z.array(z.string()),
  terms: documentSchema,
  refunds: documentSchema,
  business: documentSchema.optional(),
  version: z.string().regex(/^[a-f0-9]{64}$/),
  acceptedAt: z.iso.datetime(),
});

export function acceptedContractCopy(value: unknown): string {
  if (value === null || value === undefined) return "";
  const evidence = evidenceSchema.parse(value);
  const ko = evidence.locale === "ko";
  return [
    ko ? "주문 시 동의한 약관 사본" : "Copy of the terms accepted for this order",
    `${ko ? "동의 일시" : "Accepted at"}: ${evidence.acceptedAt}`,
    `${ko ? "문서 식별값" : "Document identifier"}: ${evidence.version}`,
    ...evidence.disclosure,
    ...[...(evidence.business ? [evidence.business] : []), evidence.terms, evidence.refunds].flatMap((document) => [
      document.title, document.description, document.introduction, document.effectiveDate,
      ...(document.details ?? []).map((detail) => `${detail.label}: ${detail.value}`),
      ...(document.sections ?? []).flatMap((section) => [section.heading, ...(section.paragraphs ?? []), ...(section.bullets ?? []).map((bullet) => `• ${bullet}`)]),
    ]),
  ].filter(Boolean).join("\n\n");
}
