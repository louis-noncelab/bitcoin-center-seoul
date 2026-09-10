import { notFound } from "next/navigation";
import { connection } from "next/server";
import { hasLocale } from "next-intl";
import { CollectionFrame, CollectionGallery, collectionCopy, collectionMetadata } from "@/components/site/collection-public";
import { routing } from "@/i18n/routing";
import { listCollection } from "@/server/collection";

type Props = { readonly params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return collectionMetadata(locale);
}
export default async function CollectionPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  await connection();
  return <CollectionFrame locale={locale} title={collectionCopy[locale].title}><CollectionGallery records={listCollection()} locale={locale} /></CollectionFrame>;
}
