import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { WalletGuide } from "@/components/wallet-guide/wallet-guide";
import { pageMetadata } from "@/content/site";
import { walletCopy } from "@/content/wallet-guide";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import "@/styles/site.css";
import "@/styles/site-sections.css";
import "@/styles/wallet-guide.css";

type Props = { readonly params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const metadata = pageMetadata(locale, "experience");
  const title = walletCopy[locale].welcome.title;
  const description = walletCopy[locale].welcome.message2;
  const path = "/experience/wallet";
  return {
    ...metadata,
    title: `${title} | ${metadata.openGraph?.siteName}`,
    description,
    alternates: { canonical: `/${locale}${path}`, languages: { ko: `/ko${path}`, en: `/en${path}`, "x-default": `/ko${path}` } },
    openGraph: { ...metadata.openGraph, title, description, url: `/${locale}${path}` },
    twitter: { ...metadata.twitter, title, description },
  };
}

export default async function WalletPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return (
    <>
      <SiteHeader locale={locale} section="experience" />
      <main id="main" className="container detail-page wallet-page" tabIndex={-1}>
        <div className="detail-heading">
          <Link href="/experience" locale={locale} className="button" data-variant="secondary">
            <ArrowLeft className="icon" aria-hidden="true" />
            {locale === "ko" ? "전시·체험으로" : "Back to experience"}
          </Link>
          <h1>{walletCopy[locale].welcome.title}</h1>
        </div>
        <WalletGuide locale={locale} />
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
