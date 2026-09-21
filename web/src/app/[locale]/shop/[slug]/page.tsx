import Image from "next/image";
import { notFound } from "next/navigation";
import { CommercePage } from "@/components/commerce/commerce-page";
import { commerceMetadata, pageLocale } from "@/components/commerce/page-support";
import { DisplayUnitProvider } from "@/components/commerce/display-unit";
import { ProductPurchase } from "@/components/commerce/product-purchase";
import { getCommerceSettings } from "@/server/commerce/settings";
import { getProduct } from "@/server/catalog";
import { HttpError } from "@/server/http";

type Props = { readonly params: Promise<{ locale: string; slug: string }> };

async function load(slug: string) {
  try {
    return await getProduct(slug);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: Props) {
  const { locale: value, slug } = await params;
  const locale = pageLocale(value);
  const product = await load(slug);
  return commerceMetadata(locale, {
    path: `/shop/${slug}`,
    title: locale === "ko" ? product.titleKo : product.titleEn,
    description: locale === "ko" ? product.descriptionKo : product.descriptionEn,
  });
}

export default async function ProductPage({ params }: Props) {
  const { locale: value, slug } = await params;
  const locale = pageLocale(value);
  const ko = locale === "ko";
  const [product, settings] = await Promise.all([load(slug), getCommerceSettings()]);
  const title = ko ? product.titleKo : product.titleEn;
  return <CommercePage
    locale={locale}
    title={title}
    backTo="/shop"
    backLabel={ko ? "상점으로" : "Back to the shop"}
    detail
  >
    <article className={`commerce-product-page ${product.imageUrl ? "" : "commerce-detail-grid--without-image"}`}>
      <div className={product.imageUrl ? "commerce-detail-grid" : ""}>
        {product.imageUrl && <div className="commerce-product-media commerce-product-photo">
          <Image src={product.imageUrl} alt="" fill sizes="(max-width: 767px) 100vw, 55vw" unoptimized />
        </div>}
        <DisplayUnitProvider unit={settings.productDisplayUnit}>
          <ProductPurchase product={product} locale={locale} title={title}>
            <p className="commerce-product-description">{ko ? product.descriptionKo : product.descriptionEn}</p>
          </ProductPurchase>
        </DisplayUnitProvider>
      </div>
    </article>
  </CommercePage>;
}
