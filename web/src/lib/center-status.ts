import { z } from "zod";

export const centerStatusSchema = z.enum(["open", "event", "closed"]);
export const centerStatusInputSchema = z.object({ status: centerStatusSchema.nullable() }).strict();
export type CenterStatus = z.infer<typeof centerStatusSchema>;
export const centerStatusLabels = {
  ko: { open: "운영 중", event: "행사 진행 중", closed: "운영 종료", unknown: "운영 안내" },
  en: { open: "Open", event: "Event on", closed: "Closed", unknown: "Visit info" },
} as const;

export function seoulDate(now = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(now);
}
