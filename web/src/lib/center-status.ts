import { z } from "zod";

export const centerStatusSchema = z.enum(["open", "event", "closed"]);
export const openingOverrideSchema = z.enum(["open", "closed"]);
export const centerStatusInputSchema = z.object({ override: openingOverrideSchema.nullable() }).strict();
export const centerStatusSnapshotSchema = z.object({
  status: centerStatusSchema.nullable(),
  override: openingOverrideSchema.nullable(),
  date: z.string(),
  holiday: z.string().nullable(),
  checkedAt: z.iso.datetime(),
  nextChangeAt: z.iso.datetime(),
});
export type CenterStatus = z.infer<typeof centerStatusSchema>;
export type OpeningOverride = z.infer<typeof openingOverrideSchema>;
export type CenterStatusSnapshot = z.infer<typeof centerStatusSnapshotSchema>;
export const centerStatusLabels = {
  ko: { open: "운영 중", event: "밋업 중", closed: "운영 종료", unknown: "확인 중" },
  en: { open: "Open", event: "In session", closed: "Closed", unknown: "Check status" },
} as const;

export function seoulDate(now = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(now);
}
