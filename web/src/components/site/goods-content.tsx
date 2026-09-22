import type { CollectionRecord } from "@/lib/collection-contract";
import { Link } from "@/i18n/navigation";
import { CollectionGrid } from "./collection-public";
import { CenterPhoto } from "./center-photo";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import type { Locale } from "@/i18n/routing";
import "@/styles/site.css";
import "@/styles/home-expanded.css";

export function GoodsContent({ locale, records }: { readonly locale: Locale; readonly records: readonly CollectionRecord[] }) {
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
        {records.length > 0 && <section className="goods-catalog" aria-label={ko ? "굿즈 목록" : "Goods catalog"}><CollectionGrid records={records} locale={locale} /></section>}
        <div className="goods-introduction">
          <CenterPhoto name="retail" locale={locale} />
          <div>
            <h2>{ko ? "굿즈 구매 안내" : "Where to buy"}</h2>
            <p>
              {ko
                ? "판매 중인 도서와 굿즈는 센터 상점에서 비트코인으로 결제합니다. 가격과 재고도 상점에서 확인합니다."
                : "Books and goods on sale are paid in bitcoin in the center shop, where prices and stock are shown."}
            </p>
            <Link className="button" href="/shop" locale={locale}>
              {ko ? "상점에서 구매" : "Buy in the shop"}
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
