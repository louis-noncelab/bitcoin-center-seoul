import { notFound } from "next/navigation";
import { CommercePage } from "@/components/commerce/commerce-page";
import { PaymentConfirmation } from "@/components/commerce/payment-confirmation";
import { commerceMetadata, pageLocale } from "@/components/commerce/page-support";

type Props = { readonly params: Promise<{ locale: string; code: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale: value, code } = await params;
  const locale = pageLocale(value);
  if (!/^[a-f0-9]{24}$/.test(code)) notFound();
  return commerceMetadata(locale, { path: `/orders/confirm/${code}`, title: locale === "ko" ? "결제 확인" : "Payment confirmation" }, { indexed: false });
}

export default async function PaymentConfirmationPage({ params }: Props) {
  const { locale: value, code } = await params;
  const locale = pageLocale(value);
  if (!/^[a-f0-9]{24}$/.test(code)) notFound();
  return <CommercePage locale={locale} focus="narrow" title={locale === "ko" ? "결제 확인" : "Payment confirmation"}>
    <PaymentConfirmation code={code} locale={locale} />
  </CommercePage>;
}
