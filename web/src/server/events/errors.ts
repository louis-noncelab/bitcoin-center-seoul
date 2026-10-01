import { safeHttpErrorSymbol } from "@/server/http-error-contract";

export class ApiError extends Error {
  readonly [safeHttpErrorSymbol] = true;
  readonly code: string;
  readonly status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export function configurationError(name: string): ApiError {
  void name;
  return new ApiError(503, "CONFIGURATION_ERROR", "서버 설정을 확인해 주세요.");
}
