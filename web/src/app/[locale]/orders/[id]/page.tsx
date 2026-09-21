import { notFound } from "next/navigation";
import { CommercePage } from "@/components/commerce/commerce-page";
import { commerceMetadata, pageLocale } from "@/components/commerce/page-support";
import { OrderDetails } from "@/components/commerce/resource-details";

type Props = { readonly params: Promise<{ locale: string; id: string }> };
export async function generateMetadata({ params }: Props) {
  const { locale: value, id } = await params;
  const locale = pageLocale(value);
  return commerceMetadata(locale, { path: `/orders/${id}`, title: locale === "ko" ? "주문 확인" : "Your order" });
}
export default async function OrderPage({ params }: Props) {
  const { locale: value, id } = await params;
  const locale = pageLocale(value);
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) notFound();
  return <CommercePage locale={locale} title={locale === "ko" ? "주문 확인" : "Your order"}>
    <OrderDetails id={id} locale={locale} />
  </CommercePage>;
}
