import { notFound } from "next/navigation";
import { CommercePage } from "@/components/commerce/commerce-page";
import { commerceMetadata, pageLocale } from "@/components/commerce/page-support";
import { PaymentView } from "@/components/commerce/payment-view";

type Props = {
  readonly params: Promise<{ locale: string; id: string }>;
  readonly searchParams: Promise<{ order?: string | string[] }>;
};
export async function generateMetadata({ params }: Props) {
  const { locale: value, id } = await params;
  const locale = pageLocale(value);
  return commerceMetadata(locale, { path: `/payments/${id}`, title: locale === "ko" ? "비트코인 결제" : "Bitcoin payment" });
}
export default async function PaymentPage({ params, searchParams }: Props) {
  const { locale: value, id } = await params;
  const locale = pageLocale(value);
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) notFound();
  const query = await searchParams;
  // Zaprite returns the customer here with no query string, so the order link is best-effort.
  const order = typeof query.order === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(query.order) ? query.order : null;
  return <CommercePage locale={locale} title={locale === "ko" ? "비트코인 결제" : "Bitcoin payment"} backTo="/goods">
    <PaymentView id={id} locale={locale} returnPath={order ? `/${locale}/orders/${order}` : `/${locale}/goods`} />
  </CommercePage>;
}
