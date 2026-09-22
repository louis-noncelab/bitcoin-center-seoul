import "server-only";
import { createHmac } from "node:crypto";
import { decryptPayload, encryptPayload } from "@/server/email";
import { getServerConfig } from "@/server/config";

export function sealString(value: string): string {
  return encryptPayload({ v: value });
}

export function openString(stored: string): string {
  if (!stored.startsWith("v1.")) return stored;
  return decryptPayload(stored).v ?? "";
}

export function customerEmailHash(email: string): string {
  return createHmac("sha256", Buffer.from(getServerConfig().tokenEncryptionKey, "base64")).update(email.trim().toLowerCase()).digest("base64url");
}

export function openAddress(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const text = openString(value);
  if (!value.startsWith("v1.")) return value;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
