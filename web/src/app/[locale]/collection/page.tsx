import { notFound } from "next/navigation";
import { connection } from "next/server";
import { hasLocale } from "next-intl";
import {
  CollectionFrame,
  CollectionGallery,
  collectionCopy,
  collectionMetadata,
} from "@/components/site/collection-public";
import { routing } from "@/i18n/routing";
import { listCollection } from "@/server/collection";

type Props = {
  readonly params: Promise<{ locale: string }>;
  readonly searchParams: Promise<{ kind?: string | string[] }>;
};
export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return collectionMetadata(locale, "library");
}
export default async function CollectionPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  await connection();
  const { kind } = await searchParams;
  return (
    <CollectionFrame
      locale={locale}
      section="library"
      title={collectionCopy[locale].title}
    >
      <CollectionGallery
        records={listCollection(false, ["book", "artwork", "boardgame"])}
        locale={locale}
        kind={typeof kind === "string" ? kind : "all"}
      />
    </CollectionFrame>
  );
}
