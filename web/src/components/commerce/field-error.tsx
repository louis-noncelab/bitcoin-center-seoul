import { ApiError, apiFieldMessage } from "@/lib/api-client";
import type { Locale } from "@/i18n/routing";

export function fieldError(error: unknown, field: string, locale: Locale): string | undefined {
  return error instanceof ApiError && error.fields[field] ? apiFieldMessage(error, field, locale) : undefined;
}

export function constraintError(form: HTMLFormElement): ApiError {
  const fields: Record<string, string> = {};
  for (const element of Array.from(form.elements)) {
    if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement)
      || !element.willValidate || element.validity.valid) continue;
    const field = element.id === "shipping-country" ? "countryCode"
      : element.id.startsWith("customer-") ? `customer.${element.name}`
      : element.id.startsWith("shipping-") ? `address.${element.name}` : element.name;
    fields[field] = "invalid";
  }
  return new ApiError("INVALID_INPUT", "", 400, fields);
}

export function FieldError({ id, error }: { readonly id: string; readonly error: string | undefined }) {
  return error ? <p id={`${id}-error`} className="commerce-field-error">{error}</p> : null;
}
