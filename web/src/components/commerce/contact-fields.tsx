import { FormField } from "@/components/ui/form-field";
import type { Locale } from "@/i18n/routing";
import { FieldError, fieldError } from "./field-error";

export function ContactFields({ locale, shipping = false, phoneRequired = false, error }: { readonly locale: Locale; readonly shipping?: boolean; readonly phoneRequired?: boolean; readonly error?: unknown }) {
  const ko = locale === "ko";
  const nameError = fieldError(error, "customer.name", locale);
  const emailError = fieldError(error, "customer.email", locale);
  const phoneError = fieldError(error, "customer.phone", locale);
  const needPhone = shipping || phoneRequired;
  return <fieldset className="commerce-fieldset form-stack">
    <legend>{ko ? "연락처" : "Contact details"}</legend>
    <FormField id="customer-name" label={ko ? "이름" : "Full name"}>
      <input id="customer-name" name="name" autoComplete="name" required maxLength={100} aria-invalid={Boolean(nameError)} aria-describedby={nameError ? "customer-name-error" : undefined} />
      <FieldError id="customer-name" error={nameError} />
    </FormField>
    <FormField id="customer-email" label={ko ? "이메일" : "Email"} hint={ko ? "예약·주문 안내를 받을 주소입니다." : "For your booking or order updates."}>
      <input id="customer-email" name="email" type="email" autoComplete="email" aria-describedby={`customer-email-hint${emailError ? " customer-email-error" : ""}`} aria-invalid={Boolean(emailError)} required maxLength={254} />
      <FieldError id="customer-email" error={emailError} />
    </FormField>
    <FormField id="customer-phone" label={ko ? `전화번호${needPhone ? "" : " (선택)"}` : `Phone number${needPhone ? "" : " (optional)"}`} {...(shipping || phoneRequired ? { hint: shipping ? (ko ? "국가번호를 포함해 입력해 주세요." : "Include your country calling code.") : (ko ? "숫자 8자리 이상 입력해 주세요." : "Enter at least 8 digits.") } : {})}>
      <input id="customer-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" required={needPhone} minLength={phoneRequired ? 8 : undefined} maxLength={40} pattern={String.raw`[+0-9\(\) .\-]*`} aria-invalid={Boolean(phoneError)} aria-describedby={[shipping || phoneRequired ? "customer-phone-hint" : "", phoneError ? "customer-phone-error" : ""].filter(Boolean).join(" ") || undefined} />
      <FieldError id="customer-phone" error={phoneError} />
    </FormField>
  </fieldset>;
}
