"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { ContentLink } from "@/components/controls/content-link";
import { FormField } from "@/components/ui/form-field";
import { MenuSelect } from "@/components/ui/menu-select";
import { Button, ChoiceControl } from "@/components/ui/primitives";
import type { Locale } from "@/i18n/routing";
import { useDisplayRate, useDisplayUnit } from "./display-unit";
import { price } from "./format";
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
  readonly category: { readonly slug: string; readonly nameKo: string; readonly nameEn: string } | null;
  readonly variants: readonly { readonly availableStock: number; readonly optionLabelKo: string; readonly optionLabelEn: string }[];
};

// Same card shape the collection and goods listings use, so the shop reads as one site.
export function ShopCatalog({ products, locale }: {
  readonly products: readonly CatalogProduct[];
  readonly locale: Locale;
}) {
  const ko = locale === "ko";
  const unit = useDisplayUnit();
  const rate = useDisplayRate();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [inStock, setInStock] = useState(false);
  const term = query.trim().toLocaleLowerCase(locale);
  const categories = [...new Map(products.flatMap((product) => product.category ? [[product.category.slug, product.category] as const] : [])).values()];
  const filtered = products.filter((product) => {
    const labels = [product.titleKo, product.titleEn, ...product.variants.flatMap((variant) => [variant.optionLabelKo, variant.optionLabelEn])];
    return (!term || labels.some((label) => label.toLocaleLowerCase(locale).includes(term)))
      && (!category || product.category?.slug === category)
      && (!inStock || product.variants.some((variant) => variant.availableStock > 0));
  });
  if (products.length === 0) {
    return <p className="body-copy muted">{ko ? "판매 중인 상품이 없습니다." : "No products are on sale yet."}</p>;
  }
  return <div className="form-stack">
    <div className="form-stack" role="search" aria-label={ko ? "상점 상품 찾기" : "Find shop products"}>
      <div className="form-row">
        <FormField id="shop-search" label={ko ? "상품 검색" : "Search products"}>
          <input id="shop-search" type="search" value={query} maxLength={100} onChange={(event) => setQuery(event.target.value)} placeholder={ko ? "상품명 또는 옵션" : "Product name or option"} />
        </FormField>
        <FormField id="shop-category" label={ko ? "종류" : "Category"}>
          <MenuSelect id="shop-category" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">{ko ? "전체" : "All categories"}</option>
            {categories.map((item) => <option value={item.slug} key={item.slug}>{ko ? item.nameKo : item.nameEn}</option>)}
          </MenuSelect>
        </FormField>
      </div>
      <div className="form-actions">
        <label className="choice-label"><ChoiceControl type="checkbox" checked={inStock} onChange={(event) => setInStock(event.target.checked)} />{ko ? "재고 있는 상품만" : "In-stock products only"}</label>
        <Button variant="quiet" disabled={!query && !category && !inStock} onClick={() => { setQuery(""); setCategory(""); setInStock(false); }}>{ko ? "필터 초기화" : "Reset filters"}</Button>
        <p className="caption" role="status" aria-live="polite" aria-atomic="true">{ko ? `상품 ${filtered.length}개` : `${filtered.length} ${filtered.length === 1 ? "product" : "products"}`}</p>
      </div>
    </div>
    <div className="collection-results" key={`${term}:${category}:${inStock}`}>
    {filtered.length === 0 ? <p className="body-copy muted">{ko ? "조건에 맞는 상품이 없습니다." : "No products match your filters."}</p> : <div className="review-grid highlights-grid">{filtered.map((product) => {
          const title = ko ? product.titleKo : product.titleEn;
          const summary = ko ? product.descriptionKo : product.descriptionEn;
          const soldOut = product.variants.every((variant) => variant.availableStock <= 0);
          const meta = [product.category ? (ko ? product.category.nameKo : product.category.nameEn) : "", price(product, locale, unit, rate)].filter(Boolean).join(" · ");
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
        })}</div>}
    </div>
  </div>;
}
