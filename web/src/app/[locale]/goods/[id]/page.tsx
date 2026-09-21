import { notFound } from "next/navigation";
import { connection } from "next/server";
import { hasLocale } from "next-intl";
import { cache } from "react";
import { CollectionFrame, PurchaseLink, collectionCopy, collectionMetadata, collectionText } from "@/components/site/collection-public";
import { PhotoGallery } from "@/components/site/events-public";
import { MarkdownContent } from "@/components/site/markdown-content";
import { routing } from "@/i18n/routing";
import { getCollectionByPath } from "@/server/collection";

type Props = { readonly params: Promise<{ locale: string; id: string }> };
const readItem = cache(async (value: string) => {
  await connection();
  const item = getCollectionByPath(value, false, ["goods"]);
  if (!item) notFound();
  return item;
});
export async function generateMetadata({ params }: Props) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return collectionMetadata(locale, "goods", await readItem(id));
}
export default async function GoodsDetailPage({ params }: Props) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const item = await readItem(id);
  const content = collectionText(locale, item);
  return <CollectionFrame locale={locale} section="goods" title={content.title} detail><article className="event-detail">
    <PhotoGallery images={item.images} title={content.title} locale={locale} />
    <div className="collection-detail-meta"><p className="caption muted">{collectionCopy[locale][item.kind]}</p>{content.creator && <p lang={locale === "en" && !item.creatorEn ? "ko" : locale}>{content.creator}</p>}</div>
    <div className="button-row"><PurchaseLink record={item} locale={locale} /></div>
    {content.description && <MarkdownContent lang={locale === "en" && !item.descriptionEn ? "ko" : locale}>{content.description}</MarkdownContent>}
  </article></CollectionFrame>;
}
