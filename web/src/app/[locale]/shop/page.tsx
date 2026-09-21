import Image from "next/image";
import { ContentLink } from "@/components/controls/content-link";
import { CommercePage } from "@/components/commerce/commerce-page";
import { commerceMetadata, pageLocale } from "@/components/commerce/page-support";
import { price } from "@/components/commerce/format";
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
    introduction={ko ? "원화로 표시된 가격은 주문 시점의 시세로 사토시로 환산해 비트코인으로 결제합니다." : "Prices shown in KRW are converted to satoshis at the exchange rate quoted when you order."}
    backTo="/"
  >
    {products.length === 0
      ? <p className="muted">{ko ? "판매 중인 상품이 없습니다." : "No products are on sale yet."}</p>
      : <ul className="commerce-product-grid">
        {products.map((product) => {
          const soldOut = product.variants.every((variant) => variant.availableStock <= 0);
          return <li key={product.id}>
            <ContentLink href={`/shop/${product.slug}`} locale={locale} className="commerce-product-card">
              {product.imageUrl
                ? <Image src={product.imageUrl} alt="" width={480} height={480} className="commerce-product-thumb" />
                : <span className="commerce-product-thumb commerce-product-thumb-empty" aria-hidden="true" />}
              <h2>{ko ? product.titleKo : product.titleEn}</h2>
              <p className="commerce-product-price">{price(product, locale, settings.productDisplayUnit)}</p>
              {soldOut && <p className="caption">{ko ? "품절" : "Sold out"}</p>}
            </ContentLink>
          </li>;
        })}
      </ul>}
  </CommercePage>;
}
