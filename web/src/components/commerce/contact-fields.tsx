import { FormField } from "@/components/ui/form-field";
import type { Locale } from "@/i18n/routing";
import { FieldError, fieldError } from "./field-error";
import { IntlPhoneInput } from "./intl-phone-input";

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
    <FormField id="customer-email" label={ko ? "이메일" : "Email"} hint={ko ? "주문 관련 연락을 받을 주소입니다." : "An address where the center can contact you about your order."}>
      <input id="customer-email" name="email" type="email" autoComplete="email" aria-describedby={`customer-email-hint${emailError ? " customer-email-error" : ""}`} aria-invalid={Boolean(emailError)} required maxLength={254} />
      <FieldError id="customer-email" error={emailError} />
    </FormField>
    <FormField id="customer-phone" label={ko ? `전화번호${needPhone ? "" : " (선택)"}` : `Phone number${needPhone ? "" : " (optional)"}`} hint={ko ? "국가번호를 선택하고 전화번호를 입력해 주세요." : "Choose a country code, then enter your phone number."}>
      <IntlPhoneInput locale={locale} required={needPhone} invalid={Boolean(phoneError)} describedBy={`customer-phone-hint${phoneError ? " customer-phone-error" : ""}`} />
      <FieldError id="customer-phone" error={phoneError} />
    </FormField>
  </fieldset>;
}
