import { notFound, permanentRedirect } from "next/navigation";
import { connection } from "next/server";
import { hasLocale } from "next-intl";
import { cache } from "react";
import { CollectionFrame, PurchaseLink, collectionHref, collectionMetadata, collectionText } from "@/components/site/collection-public";
import { PhotoGallery } from "@/components/site/events-public";
import { MarkdownContent } from "@/components/site/markdown-content";
import { routing } from "@/i18n/routing";
import { getCollectionByPath } from "@/server/collection";

const boardGameKinds = ["boardgame"] as const;
type Props = { readonly params: Promise<{ locale: string; id: string }> };
const readItem = cache(async (value: string) => {
  await connection();
  const item = getCollectionByPath(value, false, boardGameKinds);
  if (!item) notFound();
  return item;
});
export async function generateMetadata({ params }: Props) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return collectionMetadata(locale, "boardgame", await readItem(id));
}
export default async function BoardGameDetailPage({ params }: Props) {
  const { locale, id: value } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const item = await readItem(value);
  const canonical = String(item.slug || item.id);
  if (value !== canonical) permanentRedirect(`/${locale}${collectionHref(item)}`);
  const content = collectionText(locale, item);
  return <CollectionFrame locale={locale} section="boardgame" title={content.title} detail><article className="event-detail">
    <PhotoGallery images={item.images} title={content.title} locale={locale} />
    {content.creator && <div className="collection-detail-meta"><p lang={locale === "en" && !item.creatorEn ? "ko" : locale}>{content.creator}</p></div>}
    <div className="button-row"><PurchaseLink record={item} locale={locale} /></div>
    {content.description && <MarkdownContent lang={locale === "en" && !item.descriptionEn ? "ko" : locale}>{content.description}</MarkdownContent>}
  </article></CollectionFrame>;
}
