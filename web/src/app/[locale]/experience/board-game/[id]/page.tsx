import { notFound } from "next/navigation";
import { connection } from "next/server";
import { hasLocale } from "next-intl";
import { cache } from "react";
import { CollectionFrame, collectionMetadata, collectionText } from "@/components/site/collection-public";
import { PhotoGallery } from "@/components/site/events-public";
import { MarkdownContent } from "@/components/site/markdown-content";
import { routing } from "@/i18n/routing";
import { getCollectionItem } from "@/server/collection";

const boardGameKinds = ["boardgame"] as const;
type Props = { readonly params: Promise<{ locale: string; id: string }> };
const readItem = cache(async (value: string) => {
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) notFound();
  await connection();
  const item = getCollectionItem(Number(value), false, boardGameKinds);
  if (!item) notFound();
  return item;
});
export async function generateMetadata({ params }: Props) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return collectionMetadata(locale, "boardgame", await readItem(id));
}
export default async function BoardGameDetailPage({ params }: Props) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const item = await readItem(id);
  const content = collectionText(locale, item);
  return <CollectionFrame locale={locale} section="boardgame" title={content.title} detail><article className="event-detail">
    <PhotoGallery images={item.images} title={content.title} locale={locale} />
    {content.creator && <div className="collection-detail-meta"><p lang={locale === "en" && !item.creatorEn ? "ko" : locale}>{content.creator}</p></div>}
    {content.description && <MarkdownContent lang={locale === "en" && !item.descriptionEn ? "ko" : locale}>{content.description}</MarkdownContent>}
  </article></CollectionFrame>;
}
