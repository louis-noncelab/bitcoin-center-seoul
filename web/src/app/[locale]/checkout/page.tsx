import { z } from "zod";
import { Checkout } from "@/components/commerce/checkout";
import { CommercePage } from "@/components/commerce/commerce-page";
import { commerceMetadata, pageLocale } from "@/components/commerce/page-support";

type Props = {
  readonly params: Promise<{ locale: string }>;
  readonly searchParams: Promise<{ variant?: string | string[]; quantity?: string | string[] }>;
};
const selection = z.object({
  variant: z.string().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/),
  quantity: z.coerce.number().int().min(1).max(100).default(1),
});
export async function generateMetadata({ params }: Props) {
  const locale = pageLocale((await params).locale);
  return commerceMetadata(locale, { path: "/checkout", title: locale === "ko" ? "주문하기" : "Checkout" });
}
export default async function CheckoutPage({ params, searchParams }: Props) {
  const locale = pageLocale((await params).locale);
  const result = selection.safeParse(await searchParams);
  return <CommercePage locale={locale} title={locale === "ko" ? "주문하기" : "Checkout"} backTo="/cart">
    <Checkout locale={locale} selection={result.success ? { variantId: result.data.variant, quantity: result.data.quantity } : null} />
  </CommercePage>;
}
