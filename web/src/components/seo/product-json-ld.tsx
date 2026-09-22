import { centerContent } from "@/content/center";
import { siteOrigin } from "@/content/site";
import type { Locale } from "@/i18n/routing";
import { markdownExcerpt } from "@/lib/markdown";

type ProductSeo = {
  readonly slug: string;
  readonly titleKo: string;
  readonly titleEn: string;
  readonly descriptionKo: string;
  readonly descriptionEn: string;
  readonly images: readonly string[];
  readonly priceKind: "FREE" | "KRW_FIXED" | "BTC_FIXED";
  readonly priceAmount: string;
  readonly variants: readonly { readonly availableStock: number }[];
};

function absoluteUrl(value: string) {
  if (value.startsWith("https://") || value.startsWith("http://")) return value;
  return `${siteOrigin}${value.startsWith("/") ? "" : "/"}${value}`;
}

function btcPrice(sats: string) {
  const value = BigInt(sats);
  const whole = value / 100_000_000n;
  const fraction = (value % 100_000_000n).toString().padStart(8, "0").replace(/0+$/, "");
  return fraction ? `${whole.toString()}.${fraction}` : whole.toString();
}

export function ProductJsonLd({ locale, product }: { readonly locale: Locale; readonly product: ProductSeo }) {
  const title = locale === "ko" ? product.titleKo : product.titleEn;
  const description = markdownExcerpt(locale === "ko" ? product.descriptionKo : product.descriptionEn);
  const url = `${siteOrigin}/${locale}/shop/${product.slug}`;
  const available = product.variants.some((variant) => variant.availableStock > 0);
  const offer = product.priceKind === "FREE" ? null : {
    "@type": "Offer",
    url,
    priceCurrency: product.priceKind === "KRW_FIXED" ? "KRW" : "BTC",
    price: product.priceKind === "KRW_FIXED" ? product.priceAmount : btcPrice(product.priceAmount),
    availability: `https://schema.org/${available ? "InStock" : "OutOfStock"}`,
  };
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: title,
    description,
    url,
    ...(product.images.length ? { image: product.images.map(absoluteUrl) } : {}),
    brand: { "@type": "Brand", name: centerContent[locale].hero.title },
    ...(offer ? { offers: offer } : {}),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
