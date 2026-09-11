import { notFound } from "next/navigation";
import { connection } from "next/server";
import { hasLocale } from "next-intl";
import { CollectionFrame, CollectionGrid, boardGameCopy, collectionMetadata } from "@/components/site/collection-public";
import { routing } from "@/i18n/routing";
import { listCollection } from "@/server/collection";

const boardGameKinds = ["boardgame"] as const;
type Props = { readonly params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return collectionMetadata(locale, "boardgame");
}
export default async function BoardGamePage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  await connection();
  return <CollectionFrame locale={locale} section="boardgame" title={boardGameCopy[locale].title}><CollectionGrid records={listCollection(false, boardGameKinds)} locale={locale} empty={boardGameCopy[locale].empty} /></CollectionFrame>;
}
