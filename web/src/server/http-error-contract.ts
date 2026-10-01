import "server-only";

export const safeHttpErrorSymbol = Symbol.for("bcs.safe-http-error");

export type SafeHttpError = Error & {
  readonly [safeHttpErrorSymbol]: true;
  readonly status: number;
  readonly code: string;
  readonly fields?: Readonly<Record<string, string>>;
};

type SafeHttpPayload = {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly fields?: Readonly<Record<string, string>>;
  };
};

const publicServerErrorMessage =
  "처리하지 못했습니다. 잠시 후 다시 시도해 주세요. / Please try again shortly.";

function isFields(value: unknown): value is Readonly<Record<string, string>> {
  return typeof value === "object" && value !== null
    && Object.values(value).every((item) => typeof item === "string");
}

export function isSafeHttpError(error: unknown): error is SafeHttpError {
  if (!(error instanceof Error)) return false;
  return safeHttpErrorSymbol in error
    && error[safeHttpErrorSymbol] === true
    && "status" in error
    && typeof error.status === "number"
    && Number.isInteger(error.status)
    && error.status >= 400
    && error.status <= 599
    && "code" in error
    && typeof error.code === "string"
    && /^[A-Z0-9_]+$/.test(error.code)
    && (!("fields" in error) || error.fields === undefined || isFields(error.fields));
}

export function safeHttpPayload(error: SafeHttpError): SafeHttpPayload {
  const message = error.status >= 500 ? publicServerErrorMessage : error.message;
  return {
    error: {
      code: error.code,
      message,
      ...(error.status < 500 && error.fields ? { fields: error.fields } : {}),
    },
  };
}
