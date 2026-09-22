import { CartPageClient } from "@/components/commerce/cart-page";
import { CommercePage } from "@/components/commerce/commerce-page";
import { commerceMetadata, pageLocale } from "@/components/commerce/page-support";

type Props = { readonly params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props) {
  const locale = pageLocale((await params).locale);
  return commerceMetadata(locale, { path: "/cart", title: locale === "ko" ? "장바구니" : "Cart" }, { indexed: false });
}
export default async function CartPage({ params }: Props) {
  const locale = pageLocale((await params).locale);
  return <CommercePage
    locale={locale}
    focus="narrow"
    title={locale === "ko" ? "장바구니" : "Cart"}
    introduction={locale === "ko"
      ? "담긴 상품의 가격·재고·배송비는 주문 화면의 서버 견적으로 확정합니다."
      : "Prices, stock and shipping are confirmed by the server quote at checkout."}
  >
    <CartPageClient locale={locale} />
  </CommercePage>;
}
