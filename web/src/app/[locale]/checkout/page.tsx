import { z } from "zod";
import { Checkout } from "@/components/commerce/checkout";
import { CommercePage } from "@/components/commerce/commerce-page";
import { commerceMetadata, pageLocale } from "@/components/commerce/page-support";

type Props = {
  readonly params: Promise<{ locale: string }>;
  readonly searchParams: Promise<{ variant?: string | string[]; quantity?: string | string[]; kind?: string | string[] }>;
};
const selection = z.object({
  variant: z.string().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/),
  quantity: z.coerce.number().int().min(1).max(100).default(1),
});
export async function generateMetadata({ params }: Props) {
  const locale = pageLocale((await params).locale);
  return commerceMetadata(locale, { path: "/checkout", title: locale === "ko" ? "주문하기" : "Checkout" }, { indexed: false });
}
export default async function CheckoutPage({ params, searchParams }: Props) {
  const locale = pageLocale((await params).locale);
  const query = await searchParams;
  const result = selection.safeParse(query);
  const meetup = query.kind === "meetup";
  const ko = locale === "ko";
  return <CommercePage locale={locale} focus="wide" section={meetup ? "programs" : "goods"} title={meetup ? (ko ? "밋업 예약" : "Meetup reservation") : (ko ? "주문하기" : "Checkout")} backTo={meetup ? "/programs" : "/cart"} backLabel={meetup ? (ko ? "행사로" : "Back to events") : (ko ? "장바구니로" : "Back to cart")}>
    <Checkout locale={locale} selection={result.success ? { variantId: result.data.variant, quantity: result.data.quantity } : null} />
  </CommercePage>;
}
