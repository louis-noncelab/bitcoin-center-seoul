import { notFound } from "next/navigation";
import { CommercePage } from "@/components/commerce/commerce-page";
import { commerceMetadata, pageLocale } from "@/components/commerce/page-support";
import { ProductGallery } from "@/components/commerce/product-gallery";
import { ProductPurchase } from "@/components/commerce/product-purchase";
import { ProductJsonLd } from "@/components/seo/product-json-ld";
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
  const product = await load(slug);
  const title = ko ? product.titleKo : product.titleEn;
  const images = product.images?.length ? product.images : (product.imageUrl ? [product.imageUrl] : []);
  const category = product.category ? (ko ? product.category.nameKo : product.category.nameEn) : null;
  return <CommercePage
    locale={locale}
    title={title}
    backTo="/shop"
    backLabel={ko ? "상점으로" : "Back to the shop"}
    detail
    focus="wide"
  >
    <ProductJsonLd locale={locale} product={product} />
    <article className="commerce-product-page">
      <div className={`commerce-detail-grid${images.length ? "" : " commerce-detail-grid--without-image"}`}>
        <ProductGallery images={images} name={title} />
        <ProductPurchase product={product} locale={locale} title={title}>
          {category ? <p className="caption">{category}</p> : null}
          <p className="commerce-product-description">{ko ? product.descriptionKo : product.descriptionEn}</p>
        </ProductPurchase>
      </div>
    </article>
  </CommercePage>;
}
