import { connection } from "next/server";
import { listCollection } from "@/server/collection";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { pageMetadata } from "@/content/site";
import { GoodsContent } from "@/components/site/goods-content";

type Props = { readonly params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const base = pageMetadata(locale);
  const title = locale === "ko" ? "비센서 굿즈" : "Center goods";
  const description =
    locale === "ko"
      ? "비트코인 센터 서울 굿즈와 판매처 안내."
      : "Bitcoin Center Seoul goods and purchasing information.";
  return {
    ...base,
    title: `${title} | Bitcoin Center Seoul`,
    description,
    alternates: {
      canonical: `/${locale}/goods`,
      languages: { ko: "/ko/goods", en: "/en/goods", "x-default": "/ko/goods" },
    },
    openGraph: {
      ...base.openGraph,
      title,
      description,
      url: `/${locale}/goods`,
    },
    twitter: { ...base.twitter, title, description },
  };
}
export default async function GoodsPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  await connection();
  return <GoodsContent locale={locale} records={await listCollection(false, ["goods"])} />;
}
