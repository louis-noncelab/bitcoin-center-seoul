"use client";

import { useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/primitives";
import type { Locale } from "@/i18n/routing";
import { adminRequest, errorText, jsonBody } from "./request";

export function LoginForm({ locale, onLogin }: { readonly locale: Locale; readonly onLogin: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const ko = locale === "ko";
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const form = event.currentTarget;
    busy.current = true; setPending(true); setError("");
    try {
      await adminRequest("/api/admin/login", z.unknown(), jsonBody({ password: String(new FormData(form).get("password") ?? "") }));
      form.reset(); onLogin();
    } catch (caught) { setError(errorText(caught, locale)); }
    finally { busy.current = false; setPending(false); }
  }
  return (
    <form className="events-login events-form" onSubmit={(event) => void submit(event)}>
      <h2>{ko ? "관리자 로그인" : "Administrator sign in"}</h2>
      <p className="muted">{ko ? "행사와 하이라이트를 관리하려면 로그인해 주세요." : "Sign in to manage events and highlights."}</p>
      <label>{ko ? "관리자 비밀번호" : "Administrator password"}<input name="password" type="password" autoComplete="current-password" required maxLength={1024} /></label>
      {error && <p role="alert" className="events-error">{error}</p>}
      <Button type="submit" disabled={pending}>{pending ? (ko ? "로그인 중…" : "Signing in…") : (ko ? "로그인" : "Sign in")}</Button>
    </form>
  );
}
