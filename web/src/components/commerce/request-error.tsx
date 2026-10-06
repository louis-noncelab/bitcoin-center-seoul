import { useEffect, useRef } from "react";
import { ApiError, apiErrorMessage, apiFieldMessage } from "@/lib/api-client";
import { FormNotice } from "@/components/ui/form-field";
import { ActionLink } from "@/components/ui/primitives";
import type { Locale } from "@/i18n/routing";
import { meetupApiMessages } from "@/lib/api-messages";

export function RequestError({ error, locale, returnTo, meetup = false }: { readonly error: unknown; readonly locale: Locale; readonly returnTo: string; readonly meetup?: boolean }) {
  const summary = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error) { const invalid = document.querySelector<HTMLElement>('[aria-invalid="true"]:not(:disabled)'); (invalid ?? summary.current)?.focus(); } }, [error]);
  if (!error) return null;
  const auth = error instanceof ApiError && (error.status === 401 || error.status === 403 || error.code === "MEMBER_REQUIRED");
  const message = meetup && error instanceof ApiError ? meetupApiMessages[error.code]?.[locale === "ko" ? 0 : 1] : undefined;
  return <div ref={summary} tabIndex={-1}><FormNotice><p>{message ?? apiErrorMessage(error, locale)}</p>
    {error instanceof ApiError && Object.keys(error.fields).length > 0 && <ul>{Object.keys(error.fields).map((field) => <li key={field}>{apiFieldMessage(error, field, locale)}</li>)}</ul>}
    {auth && <ActionLink href={`/${locale}/account/login?returnTo=${encodeURIComponent(returnTo)}`} variant="secondary">{locale === "ko" ? "로그인" : "Sign in"}</ActionLink>}
  </FormNotice></div>;
}
