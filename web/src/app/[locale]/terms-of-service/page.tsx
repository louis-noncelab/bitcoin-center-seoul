import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { LegalPage, legalMetadata, legalPurchase } from "@/components/site/legal-page";
import { routing } from "@/i18n/routing";

type Props = { readonly params: Promise<{ readonly locale: string }>; readonly searchParams: Promise<{ purchase?: string | string[] }> };

export async function generateMetadata({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return legalMetadata(locale, "terms-of-service", legalPurchase((await searchParams).purchase));
}

export default async function TermsOfServicePage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return <LegalPage locale={locale} kind="terms-of-service" purchase={legalPurchase((await searchParams).purchase)} />;
}
