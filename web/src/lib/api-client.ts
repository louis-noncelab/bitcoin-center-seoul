import { z } from "zod";
import type { Locale } from "@/i18n/routing";
import { apiMessages } from "./api-messages";

const failure = z.object({ error: z.object({
  code: z.string(),
  message: z.string(),
  fields: z.record(z.string(), z.string()).optional(),
}) });

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly fields: Readonly<Record<string, string>> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  init: RequestInit = {},
): Promise<T> {
  const timeout = AbortSignal.timeout(30_000);
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  const result = await fetch(path, { ...init, signal, credentials: "same-origin", cache: "no-store" });
  const body: unknown = await result.json();
  if (!result.ok) {
    const parsed = failure.safeParse(body);
    if (parsed.success) {
      const error = parsed.data.error;
      throw new ApiError(error.code, error.message, result.status, error.fields);
    }
    throw new ApiError("REQUEST_FAILED", "처리하지 못했습니다. / The request could not be completed.", result.status);
  }
  return z.object({ data: schema }).parse(body).data;
}

export function jsonRequest(body: unknown, method = "POST"): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

const fieldFallbacks: Readonly<Record<string, readonly [string, string]>> = {
  name: ["이름을 입력해 주세요.", "Enter your name."],
  email: ["이메일 주소를 확인해 주세요.", "Check your email address."],
  password: ["비밀번호를 확인해 주세요.", "Check your password."],
  currentPassword: ["현재 비밀번호를 확인해 주세요.", "Check your current password."],
  confirmPassword: ["새 비밀번호 확인이 일치하지 않습니다.", "The new password confirmation does not match."],
  "customer.name": ["이름을 입력해 주세요.", "Enter your name."],
  "customer.email": ["이메일 주소를 확인해 주세요.", "Check your email address."],
  "customer.phone": ["전화번호를 확인해 주세요.", "Check your phone number."],
  countryCode: ["배송 국가를 선택해 주세요.", "Select a delivery country."],
  "address.line1": ["배송지 주소를 입력해 주세요.", "Enter the street address."],
  "address.line2": ["상세 주소를 확인해 주세요.", "Check the apartment or suite."],
  "address.city": ["시·군·구를 입력해 주세요.", "Enter the city."],
  "address.region": ["시·도 또는 주를 확인해 주세요.", "Check the state or province."],
  "address.postalCode": ["우편번호를 확인해 주세요.", "Check the postal code."],
  notes: ["요청 사항은 500자 이내로 입력해 주세요.", "Keep order notes to 500 characters."],
  attendees: ["참가 인원을 확인해 주세요.", "Check the number of attendees."],
  scheduleStartsAt: ["회차를 선택해 주세요.", "Choose a session."],
  memo: ["요청 사항을 입력해 주세요.", "Enter the requested note."],
  company: ["소속 또는 단체명을 확인해 주세요.", "Check the organization name."],
  type: ["문의 유형을 선택해 주세요.", "Choose an inquiry type."],
  message: ["문의 내용을 입력해 주세요.", "Enter your message."],
  phone: ["전화번호를 확인해 주세요.", "Check the phone number."],
  website: ["웹사이트 주소를 확인해 주세요.", "Check the website URL."],
  timeline: ["희망 일정을 확인해 주세요.", "Check the timeline."],
  authorName: ["이름을 입력해 주세요.", "Enter your name."],
  authorEmail: ["이메일 주소를 확인해 주세요.", "Check your email address."],
  rating: ["별점을 1–5점으로 선택해 주세요.", "Choose a rating from 1 to 5."],
  body: ["후기 내용을 입력해 주세요.", "Enter your review."],
  question: ["문의 내용을 입력해 주세요.", "Enter your question."],
  adminReply: ["답변을 입력해 주세요.", "Enter a reply."],
  answer: ["답변을 입력해 주세요.", "Enter an answer."],
};

const genericFieldFallback = ["입력한 항목을 확인해 주세요.", "Check the information you entered."] as const;

export function apiFieldMessage(error: ApiError, field: string, locale: Locale): string {
  const detail = error.fields[field];
  const bilingual = detail?.split(" / ");
  const index = locale === "ko" ? 0 : 1;
  const localized = bilingual?.[index]?.trim();
  if (bilingual?.length === 2 && localized && bilingual[1 - index]?.trim()) return localized;
  return (fieldFallbacks[field] ?? genericFieldFallback)[index];
}

export function apiErrorMessage(error: unknown, locale: Locale): string {
  if (error instanceof ApiError) {
    const message = apiMessages[error.code];
    if (message) return message[locale === "ko" ? 0 : 1];
    const bilingual = error.message.split(" / ");
    return bilingual[locale === "ko" ? 0 : 1] ?? error.message;
  }
  return locale === "ko"
    ? "연결을 확인한 뒤 다시 시도해 주세요. 입력한 내용은 그대로 남아 있습니다."
    : "Check your connection and try again. Your entries have been kept.";
}
