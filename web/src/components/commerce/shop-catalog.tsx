import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { ContentLink } from "@/components/controls/content-link";
import type { Locale } from "@/i18n/routing";
import { price, type DisplayUnit } from "./format";
import "@/styles/site.css";
import "@/styles/events-public.css";
import "@/styles/reviews.css";
import "@/styles/collection.css";

type CatalogProduct = {
  readonly id: string;
  readonly slug: string;
  readonly titleKo: string;
  readonly titleEn: string;
  readonly descriptionKo: string;
  readonly descriptionEn: string;
  readonly imageUrl: string;
  readonly priceKind: "FREE" | "KRW_FIXED" | "BTC_FIXED";
  readonly priceAmount: string;
  readonly category: { readonly nameKo: string; readonly nameEn: string } | null;
  readonly variants: readonly { readonly availableStock: number }[];
};

// Same card shape the collection and goods listings use, so the shop reads as one site.
export function ShopCatalog({ products, locale, unit }: {
  readonly products: readonly CatalogProduct[];
  readonly locale: Locale;
  readonly unit: DisplayUnit;
}) {
  const ko = locale === "ko";
  if (products.length === 0) {
    return <p className="body-copy muted">{ko ? "판매 중인 상품이 없습니다." : "No products are on sale yet."}</p>;
  }
  return <>{products.map((product) => {
    const title = ko ? product.titleKo : product.titleEn;
    const summary = ko ? product.descriptionKo : product.descriptionEn;
    const soldOut = product.variants.every((variant) => variant.availableStock <= 0);
    const meta = [product.category ? (ko ? product.category.nameKo : product.category.nameEn) : "", price(product, locale, unit)].filter(Boolean).join(" · ");
    return <article className="review-card highlight-card collection-card" key={product.id}>
      <ContentLink href={`/shop/${product.slug}`} locale={locale} className="review-card-link highlight-card-link">
        {product.imageUrl && <span className="review-card-image highlight-card-photo collection-card-photo">
          <Image src={product.imageUrl} alt="" fill sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw" unoptimized />
        </span>}
        <div className="review-card-content highlight-card-copy">
          <h2 lang={locale === "en" && !product.titleEn ? "ko" : locale}>{title}</h2>
          {summary && <p className="review-card-summary highlight-card-summary">{summary}</p>}
          <div className="review-card-end">
            <p>{meta}</p>
            <span className="review-read">{soldOut ? (ko ? "품절" : "Sold out") : (ko ? "보기" : "View")}<ArrowRight className="icon" aria-hidden="true" /></span>
          </div>
        </div>
      </ContentLink>
    </article>;
  })}</>;
}
