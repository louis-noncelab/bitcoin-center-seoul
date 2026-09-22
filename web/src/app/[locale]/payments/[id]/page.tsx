import { notFound } from "next/navigation";
import { CommercePage } from "@/components/commerce/commerce-page";
import { commerceMetadata, pageLocale } from "@/components/commerce/page-support";
import { PaymentView } from "@/components/commerce/payment-view";

type Props = {
  readonly params: Promise<{ locale: string; id: string }>;
};
export async function generateMetadata({ params }: Props) {
  const { locale: value, id } = await params;
  const locale = pageLocale(value);
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) notFound();
  return commerceMetadata(locale, { path: `/payments/${id}`, title: locale === "ko" ? "비트코인 결제" : "Bitcoin payment" }, { indexed: false });
}
export default async function PaymentPage({ params }: Props) {
  const { locale: value, id } = await params;
  const locale = pageLocale(value);
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) notFound();
  return <CommercePage locale={locale} focus="narrow" title={locale === "ko" ? "비트코인 결제" : "Bitcoin payment"} backTo="/shop">
    <PaymentView id={id} locale={locale} />
  </CommercePage>;
}
