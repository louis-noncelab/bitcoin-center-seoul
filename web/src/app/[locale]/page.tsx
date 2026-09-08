import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { OrganizationJsonLd } from "@/components/seo/organization-json-ld";
import { Home } from "@/components/site/home";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { pageMetadata } from "@/content/site";
import { routing } from "@/i18n/routing";
import "@/styles/site.css";
import "@/styles/site-sections.css";

type Props = { readonly params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return pageMetadata(locale);
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return (
    <>
      <SiteHeader locale={locale} />
      <Home locale={locale} />
      <SiteFooter locale={locale} />
      <OrganizationJsonLd locale={locale} />
    </>
  );
}
