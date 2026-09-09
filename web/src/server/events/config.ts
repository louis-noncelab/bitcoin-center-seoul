import "server-only";

import path from "node:path";
import { ApiError, configurationError } from "@/server/events/errors";

function required(name: "APP_ORIGIN" | "BCS_EVENTS_DB" | "BCS_EVENTS_UPLOADS"): string {
  const value = process.env[name]?.trim();
  if (!value) throw configurationError(name);
  return value;
}

function absolutePath(name: "BCS_EVENTS_DB" | "BCS_EVENTS_UPLOADS"): string {
  const value = required(name);
  if (!path.isAbsolute(value)) throw configurationError(name);
  return path.resolve(value);
}

export function configuredDatabasePath(): string {
  return absolutePath("BCS_EVENTS_DB");
}

export function configuredUploadsPath(): string {
  return absolutePath("BCS_EVENTS_UPLOADS");
}

export function configuredOrigin(): URL {
  try {
    const url = new URL(required("APP_ORIGIN"));
    if (url.protocol !== "https:" && url.protocol !== "http:") throw configurationError("APP_ORIGIN");
    return new URL(url.origin);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof TypeError) throw configurationError("APP_ORIGIN");
    throw error;
  }
}
