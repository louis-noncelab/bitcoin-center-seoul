import { CommercePage } from "@/components/commerce/commerce-page";
import { commerceMetadata, pageLocale } from "@/components/commerce/page-support";
import { ShopCatalog } from "@/components/commerce/shop-catalog";
import { listProducts } from "@/server/catalog";
import { getCommerceSettings } from "@/server/commerce/settings";

type Props = { readonly params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props) {
  const locale = pageLocale((await params).locale);
  return commerceMetadata(locale, {
    path: "/shop",
    title: locale === "ko" ? "센터 상점" : "Center shop",
    description: locale === "ko" ? "비트코인으로 결제하는 센터 상점입니다." : "The center shop, paid in bitcoin.",
  });
}

export default async function ShopPage({ params }: Props) {
  const locale = pageLocale((await params).locale);
  const ko = locale === "ko";
  const [products, settings] = await Promise.all([listProducts(), getCommerceSettings()]);
  return <CommercePage
    locale={locale}
    title={ko ? "센터 상점" : "Center shop"}
    introduction={ko
      ? "원화로 표시된 가격은 주문 시점의 시세로 사토시로 환산해 비트코인으로 결제합니다."
      : "Prices shown in KRW are converted to satoshis at the exchange rate quoted when you order."}
    backTo="/goods"
  >
    <ShopCatalog products={products} locale={locale} unit={settings.productDisplayUnit} />
  </CommercePage>;
}
