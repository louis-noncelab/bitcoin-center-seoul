import "server-only";
import { randomUUID } from "node:crypto";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const machineCodePattern = /^[A-Z][A-Z0-9_]{1,63}$/;
const routePattern = /^[a-z0-9][a-z0-9._:-]{0,119}$/;
const safeErrorNames = new Set(["ApiError", "Error", "HttpError", "PaymentError", "TransportError", "PrismaClientKnownRequestError", "RangeError", "TypeError", "ZodError"]);
const safeWorkerCodes = new Set([
  "PROVIDER_UNAVAILABLE", "ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "EPIPE",
  "EAUTH", "EENVELOPE", "EMESSAGE", "ECONNECTION", "ESOCKET",
  "P1000", "P1001", "P1002", "P1008", "P1017", "P2002", "P2024", "P2025", "P2028", "P2034",
]);
const safeCountNames = new Set(["archives", "checked", "claimed", "emails", "failed", "orders", "quotes", "requiresReconciliation", "sent", "unavailable"]);

export type SafeWorkerFailureEvent =
  | "email.queue_failed"
  | "maintenance.pass_failed"
  | "maintenance.stopped_unexpectedly"
  | "privacy.maintenance_failed";

export type SafeFailureStage =
  | "api.handle"
  | "email.queue"
  | "payments.maintenance"
  | "payments.worker"
  | "privacy.maintenance";

type SafeCounts = Partial<Record<
  "archives" | "checked" | "claimed" | "emails" | "failed" | "orders" | "quotes" | "requiresReconciliation" | "sent" | "unavailable",
  number
>>;

type SafeApiFailure = {
  readonly requestId: string;
  readonly route?: string | undefined;
  readonly status: number;
  readonly code: string;
  readonly retryable: boolean;
  readonly error: unknown;
};

type SafeWorkerFailure = {
  readonly event: SafeWorkerFailureEvent;
  readonly jobRunId: string;
  readonly stage: SafeFailureStage;
  readonly retryable: boolean;
  readonly error: unknown;
  readonly counts?: SafeCounts;
};

export function createCorrelationId(): string {
  return randomUUID();
}

export function safeMachineCode(value: string | undefined, fallback: string): string {
  if (value && machineCodePattern.test(value)) return value;
  return machineCodePattern.test(fallback) ? fallback : "UNEXPECTED_ERROR";
}

function safeCorrelationId(value: string): string {
  return uuidPattern.test(value) ? value : createCorrelationId();
}

function safeRoute(value: string | undefined): string {
  return value && routePattern.test(value) ? value : "api.unscoped";
}

function errorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("code" in error)) return undefined;
  const code = Reflect.get(error, "code");
  return typeof code === "string" && safeWorkerCodes.has(code) ? code : undefined;
}

function errorName(error: unknown): string {
  if (!error || typeof error !== "object" || !("name" in error)) return "UnknownError";
  const name = Reflect.get(error, "name");
  return typeof name === "string" && safeErrorNames.has(name) ? name : "UnknownError";
}

function safeStatus(value: number): number {
  return Number.isInteger(value) && value >= 400 && value <= 599 ? value : 500;
}

function safeCounts(value: SafeCounts | undefined): SafeCounts | undefined {
  if (!value) return undefined;
  return Object.fromEntries(Object.entries(value).filter(([name, count]) => safeCountNames.has(name) && Number.isInteger(count) && count >= 0));
}

export function safeLogApiFailure(input: SafeApiFailure): void {
  const status = safeStatus(input.status);
  console.error(JSON.stringify({
    event: "api.request_failed",
    requestId: safeCorrelationId(input.requestId),
    route: safeRoute(input.route),
    stage: "api.handle",
    status,
    code: safeMachineCode(input.code, "INTERNAL_ERROR"),
    errorName: errorName(input.error),
    retryable: input.retryable,
  }));
}

export function safeLogWorkerFailure(input: SafeWorkerFailure): void {
  const counts = safeCounts(input.counts);
  console.error(JSON.stringify({
    event: input.event,
    jobRunId: safeCorrelationId(input.jobRunId),
    stage: input.stage,
    code: safeMachineCode(errorCode(input.error), "UNEXPECTED_ERROR"),
    errorName: errorName(input.error),
    retryable: input.retryable,
    ...(counts ? { counts } : {}),
  }));
}
