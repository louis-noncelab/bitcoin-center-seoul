import { notFound } from "next/navigation";
import { CommercePage } from "@/components/commerce/commerce-page";
import { commerceMetadata, pageLocale } from "@/components/commerce/page-support";
import { OrderDetails } from "@/components/commerce/resource-details";

type Props = { readonly params: Promise<{ locale: string; id: string }> };
export async function generateMetadata({ params }: Props) {
  const { locale: value, id } = await params;
  const locale = pageLocale(value);
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) notFound();
  return commerceMetadata(locale, { path: `/orders/${id}`, title: locale === "ko" ? "내역 확인" : "Your details" }, { indexed: false });
}
export default async function OrderPage({ params }: Props) {
  const { locale: value, id } = await params;
  const locale = pageLocale(value);
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) notFound();
  return <CommercePage locale={locale} focus="narrow" title={locale === "ko" ? "내역 확인" : "Your details"} backTo="/" backLabel={locale === "ko" ? "홈으로" : "Back to home"}>
    <OrderDetails id={id} locale={locale} />
  </CommercePage>;
}
