import { z } from "zod";
import type { Locale } from "@/i18n/routing";

export class AdminRequestError extends Error {
  constructor(readonly status: number, readonly code?: string) { super(`ADMIN_REQUEST_${status}`); }
}

export async function adminRequest<T>(path: string, schema: z.ZodType<T>, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options, credentials: "same-origin", cache: "no-store",
    signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(45_000)]) : AbortSignal.timeout(45_000),
  });
  if (!response.ok) {
    let code: string | undefined;
    if (response.headers.get("content-type")?.includes("application/json")) {
      const parsed = z.object({ error: z.object({ code: z.string() }) }).safeParse(await response.json());
      if (parsed.success) code = parsed.data.error.code;
    }
    throw new AdminRequestError(response.status, code);
  }
  return z.object({ data: schema }).parse(await response.json()).data;
}

export function jsonBody(body: unknown, method = "POST", revision?: number): RequestInit {
  return { method, headers: { "Content-Type": "application/json", ...revisionHeaders(revision) }, body: JSON.stringify(body) };
}

export function revisionHeaders(revision: number | undefined): Record<string, string> {
  return revision === undefined ? {} : { "If-Match": `"${revision}"` };
}

export function errorText(error: unknown, locale: Locale): string {
  const ko = locale === "ko";
  if (error instanceof AdminRequestError) {
    switch (error.status) {
      case 409:
        if (error.code === "GUESTBOOK_NUMBER_CONFLICT") return ko ? "이미 사용 중인 고유번호입니다. 다른 번호를 입력해 주세요. 작성한 내용은 유지됩니다." : "This guestbook number is already in use. Enter another number. Your entries are preserved.";
        if (error.code === "EDIT_CONFLICT") return ko ? "다른 사람이 먼저 수정했습니다. 덮어쓰지 않았으며 입력한 내용은 유지됩니다. 필요한 내용을 복사한 뒤 취소하고, 최신 항목을 다시 열어주세요." : "Someone else edited this item first. Nothing was overwritten and your entries are preserved. Copy anything you need, cancel, and reopen the latest item.";
        if (error.code === "SETTINGS_CHANGED") return ko ? "다른 관리자가 설정을 먼저 저장했습니다. 입력한 내용은 유지됩니다. 필요한 내용을 복사한 뒤 새로고침하여 최신 설정을 확인해 주세요." : "Another administrator saved these settings first. Your entries are preserved. Copy what you need, then reload to review the latest settings.";
        if (error.code === "LIGHTNING_ADDRESS_IN_USE") return ko ? "현재 결제금을 받는 주소입니다. 다른 주소를 선택하고 설정을 저장한 뒤 삭제해 주세요." : "This address currently receives payments. Select and save another address before deleting it.";
        if (error.code === "LIGHTNING_ADDRESS_NOT_FOUND") return ko ? "선택한 라이트닝 주소가 삭제되었습니다. 입력한 내용은 유지됩니다. 필요한 내용을 복사한 뒤 새로고침하여 최신 주소 목록에서 다시 선택해 주세요." : "The selected Lightning address was deleted. Your entries are preserved. Copy what you need, then reload and select an address from the latest list.";
        if (error.code === "SLUG_CONFLICT" || error.code === "SLUG_EXISTS") return ko ? "이미 사용 중인 URL 슬러그입니다. 다른 주소를 입력해 주세요." : "This URL slug is already in use. Choose another address.";
        return ko ? "다른 변경과 충돌해 처리하지 못했습니다. 최신 상태를 확인한 뒤 다시 시도해 주세요." : "This request conflicts with a newer change. Review the latest state and try again.";
      case 428: return ko ? "수정 버전을 확인할 수 없어 저장 및 삭제를 중단했습니다. 입력한 내용을 복사한 뒤 페이지를 새로고침해 주세요." : "Save or delete was blocked because the revision is missing. Copy your entries before refreshing the page.";
      case 401: return ko ? "비밀번호를 확인해 주세요. 세션이 만료되었다면 다시 로그인해 주세요." : "Check your password, or sign in again if your session expired.";
      case 403: return ko ? "이 요청을 허용할 수 없습니다. 같은 사이트에서 다시 시도해 주세요." : "This request is not allowed. Try again from this site.";
      case 404: return ko ? "항목을 찾을 수 없습니다. 목록을 새로 불러와 주세요." : "This item was not found. Reload the list.";
      case 413: return ko ? "사진 용량이 너무 큽니다. 사진당 10MB, 한 번에 총 30MB 이내로 선택해 주세요." : "Choose images under 10MB each and 30MB in total.";
      case 429: return ko ? "요청이 많습니다. 잠시 후 다시 시도해 주세요." : "Too many requests. Please wait before trying again.";
      case 400: case 422: return ko ? "입력 내용과 날짜, 링크, 사진 형식을 확인해 주세요. 입력한 내용은 유지됩니다." : "Check the fields, dates, links and image formats. Your entries are preserved.";
      default: return ko ? "처리하지 못했습니다. 입력한 내용은 유지됩니다. 잠시 후 다시 시도해 주세요." : "The request could not be completed. Your entries are preserved. Please try again.";
    }
  }
  return ko ? "연결을 확인하고 다시 시도해 주세요. 입력한 내용은 유지됩니다." : "Check your connection and try again. Your entries are preserved.";
}
