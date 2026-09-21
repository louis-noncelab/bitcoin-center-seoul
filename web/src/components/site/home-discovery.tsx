import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { CollectionRecord } from "@/lib/collection-contract";
import { CenterPhoto } from "./center-photo";
import { collectionHref, collectionText } from "./collection-public";

export function HomeDiscovery({
  collection,
  locale,
}: {
  readonly collection: readonly CollectionRecord[];
  readonly locale: Locale;
}) {
  const ko = locale === "ko";
  const kinds = [
    {
      kind: "boardgame",
      label: ko ? "보드게임" : "Board games",
      photo: "boardgame",
    },
    { kind: "book", label: ko ? "도서" : "Books", photo: "exhibition" },
    {
      kind: "magazine",
      label: ko ? "매거진" : "Magazines",
      photo: "exhibition",
    },
    { kind: "artwork", label: ko ? "작품" : "Artworks", photo: "gallery" },
  ] as const;
  return (
    <div className="home-discovery">
      <section
        className="home-collection"
        aria-labelledby="home-collection-title"
      >
        <div className="home-discovery-heading">
          <h2 id="home-collection-title" className="home-section-title">
            {ko ? "센터 컬렉션" : "Center collection"}
          </h2>
          <Link href="/collection" locale={locale} className="section-link">
            {ko ? "전체 보기" : "View all"}
            <ArrowUpRight className="icon" aria-hidden="true" />
          </Link>
        </div>
        <p className="home-section-intro">
          {ko
            ? "센터에서 만나는 책과 게임, 매거진과 작품."
            : "Books, games, magazines and artworks at the center."}
        </p>
        <div className="home-collection-list">
          {kinds.map(({ kind, label, photo }) => {
            const record = collection.find((item) => item.kind === kind);
            const title = record ? collectionText(locale, record).title : label;
            return (
              <Link
                key={kind}
                href={
                  record ? collectionHref(record) : `/collection?kind=${kind}`
                }
                locale={locale}
                className="home-collection-row"
              >
                <span className="home-collection-image">
                  {record?.images[0] ? (
                    <Image
                      src={record.images[0]}
                      alt=""
                      fill
                      unoptimized
                      sizes="76px"
                    />
                  ) : (
                    <CenterPhoto name={photo} locale={locale} sizes="76px" />
                  )}
                </span>
                <span>
                  <strong>{label}</strong>
                  <span className="home-collection-description">
                    {kind === "magazine"
                      ? ko
                        ? "매거진 목록 준비 중"
                        : "Magazine list coming soon"
                      : record
                        ? title
                        : ko
                          ? `${label} 목록 보기`
                          : `Explore ${label.toLowerCase()}`}
                  </span>
                </span>
                <ArrowUpRight className="icon" aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </section>
      <section className="home-goods" aria-labelledby="home-goods-title">
        <div className="home-discovery-heading">
          <h2 id="home-goods-title" className="home-section-title">
            {ko ? "비센서 굿즈" : "Center goods"}
          </h2>
          <Link href="/goods" locale={locale} className="section-link">
            {ko ? "구매 안내" : "Explore"}
            <ArrowUpRight className="icon" aria-hidden="true" />
          </Link>
        </div>
        <div className="home-goods-panel">
          <CenterPhoto
            name="retail"
            locale={locale}
            sizes="(max-width: 767px) 90vw, 50vw"
          />
          <div>
            <p>
              {ko
                ? "비트코인을 일상 가까이."
                : "Keep Bitcoin close in everyday life."}
            </p>
            <p className="muted">
              {ko
                ? "센터 굿즈 소개와 판매처 안내."
                : "Discover center goods and where to find them."}
            </p>
            <Link href="/goods" locale={locale} className="section-link">
              {ko ? "굿즈 둘러보기" : "Explore center goods"}
              <ArrowUpRight className="icon" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
