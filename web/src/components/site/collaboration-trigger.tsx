"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, X } from "lucide-react";
import { z } from "zod";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { apiErrorMessage, apiRequest, jsonRequest } from "@/lib/api-client";
import { Dialog } from "@/components/ui/confirmation-dialog";
import { Button } from "@/components/ui/primitives";
import "@/styles/collaboration.css";

const responseSchema = z.object({ received: z.literal(true) });
type SubmissionResult = { readonly kind: "success" } | { readonly kind: "error"; readonly message: string } | null;

const copy = {
  ko: {
    trigger: "협업 제안", title: "협업 제안", description: "비트코인센터 서울과 함께할 아이디어를 알려 주세요.",
    type: "제안 유형", choose: "선택해 주세요", event: "행사·밋업", content: "콘텐츠", community: "커뮤니티 협업", other: "기타",
    name: "이름", email: "이메일", organization: "소속·단체 (선택)", message: "제안 내용",
    consent: "이름·이메일·소속(선택)·제안 유형·내용을 검토와 답변에 사용하는 데 동의합니다. 수집일부터 최대 1년 보유하며, 목적 달성·동의 철회 시 지체 없이 파기합니다(법정 보존 제외). 동의를 거부할 수 있으나 이 제안 양식은 이용할 수 없습니다.", privacy: "개인정보 처리방침",
    send: "제안 보내기", sending: "접수 중…", close: "닫기", success: "제안이 접수되었습니다. 남겨 주신 이메일로 연락드리겠습니다.",
  },
  en: {
    trigger: "Propose a collaboration", title: "Propose a collaboration", description: "Share an idea to work with Bitcoin Center Seoul.",
    type: "Proposal type", choose: "Choose a type", event: "Events and meetups", content: "Content", community: "Community partnership", other: "Other",
    name: "Name", email: "Email", organization: "Organization (optional)", message: "Proposal",
    consent: "I consent to using my name, email, optional organization, proposal type and message to review and respond. Retained for up to one year from collection; erased without delay when the purpose ends or consent is withdrawn, except legally required records. I may decline, but cannot use this form without consent.", privacy: "Privacy policy",
    send: "Send proposal", sending: "Submitting…", close: "Close", success: "Your proposal was received. We will contact you by email.",
  },
} as const;

export function CollaborationTrigger({ locale }: { readonly locale: Locale }) {
  const t = copy[locale];
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SubmissionResult>(null);

  const close = () => {
    if (busy) return;
    setOpen(false);
    setResult(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy(true);
    setResult(null);
    try {
      await apiRequest("/api/collaboration", responseSchema, jsonRequest({
        locale,
        type: values.get("type"),
        name: values.get("name"),
        email: values.get("email"),
        organization: values.get("organization"),
        message: values.get("message"),
        consent: values.get("consent") === "on",
      }));
      form.reset();
      setResult({ kind: "success" });
    } catch (error) {
      setResult({ kind: "error", message: apiErrorMessage(error, locale) });
    } finally {
      setBusy(false);
    }
  };

  return <>
    <button type="button" className="footer-collaboration" onClick={() => setOpen(true)}>
      {t.trigger}<ArrowRight className="icon" aria-hidden="true" />
    </button>
    <Dialog open={open} onClose={close} title={t.title} description={t.description} className="collaboration-dialog">
      {result?.kind === "success" ? <>
        <p className="form-notice" data-kind="success" role="status">{t.success}</p>
        <div className="dialog-actions"><Button onClick={close} autoFocus>{t.close}</Button></div>
      </> : <form className="collaboration-form" onSubmit={submit}>
        <div className="collaboration-fields-scroll"><fieldset className="collaboration-fields" disabled={busy}>
        <div className="form-row">
          <div className="form-field"><label htmlFor="collaboration-name">{t.name}</label><input id="collaboration-name" name="name" autoComplete="name" autoFocus required maxLength={80} /></div>
          <div className="form-field"><label htmlFor="collaboration-email">{t.email}</label><input id="collaboration-email" name="email" type="email" autoComplete="email" required maxLength={254} /></div>
        </div>
        <div className="form-row">
          <div className="form-field"><label htmlFor="collaboration-organization">{t.organization}</label><input id="collaboration-organization" name="organization" autoComplete="organization" maxLength={120} /></div>
          <div className="form-field"><label htmlFor="collaboration-type">{t.type}</label><select id="collaboration-type" name="type" required defaultValue="">
            <option value="" disabled>{t.choose}</option>
            <option value="event">{t.event}</option><option value="content">{t.content}</option><option value="community">{t.community}</option><option value="other">{t.other}</option>
          </select></div>
        </div>
        <div className="form-field"><label htmlFor="collaboration-message">{t.message}</label><textarea id="collaboration-message" name="message" rows={6} minLength={10} maxLength={3000} required /></div>
        <div className="collaboration-consent"><label className="choice-label"><input className="choice-input" type="checkbox" name="consent" required /><span>{t.consent}</span></label><Link href="/privacy-policy" locale={locale} onClick={(event) => { if (busy) event.preventDefault(); else close(); }}>{t.privacy}</Link></div>
        </fieldset></div>
        {result?.kind === "error" && <p className="form-notice" data-kind="error" role="alert">{result.message}</p>}
        <div className="dialog-actions">
          <Button variant="secondary" onClick={close} disabled={busy}><X className="icon" aria-hidden="true" />{t.close}</Button>
          <Button type="submit" disabled={busy}>{busy ? t.sending : t.send}</Button>
        </div>
      </form>}
    </Dialog>
  </>;
}
