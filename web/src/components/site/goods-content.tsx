import { ArrowUpRight } from "lucide-react";
import { CenterPhoto } from "./center-photo";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import type { Locale } from "@/i18n/routing";
import "@/styles/site.css";
import "@/styles/home-expanded.css";

export function GoodsContent({ locale }: { readonly locale: Locale }) {
  const ko = locale === "ko";
  return (
    <>
      <SiteHeader locale={locale} section="goods" />
      <main
        id="main"
        tabIndex={-1}
        className="container detail-page goods-page"
      >
        <div className="detail-heading">
          <h1>{ko ? "비센서 굿즈" : "Center goods"}</h1>
          <p className="body-copy muted">
            {ko
              ? "비트코인을 일상 가까이. 센터 굿즈와 구매 안내."
              : "Keep Bitcoin close in everyday life. Center goods and purchasing information."}
          </p>
        </div>
        <div className="goods-introduction">
          <CenterPhoto name="retail" locale={locale} />
          <div>
            <h2>{ko ? "굿즈 구매 안내" : "Where to buy"}</h2>
            <p>
              {ko
                ? "판매 중인 상품과 가격, 재고는 샛비 판매처에서 확인해 주세요."
                : "Visit the SatB shop for available products, prices and stock."}
            </p>
            <a
              className="button"
              href="https://www.saturdayblock.com/shop?brand=bcs"
              target="_blank"
              rel="noopener noreferrer"
            >
              {ko ? "샛비에서 굿즈 보기" : "Explore goods on SatB"}
              <ArrowUpRight className="icon" aria-hidden="true" />
              <span className="sr-only">
                {ko ? " (새 창)" : " (new window)"}
              </span>
            </a>
          </div>
        </div>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
