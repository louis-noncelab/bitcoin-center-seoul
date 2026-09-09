export class ApiError extends Error {
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
  return new ApiError(503, "CONFIGURATION_ERROR", `${name} 설정이 필요합니다.`);
}
