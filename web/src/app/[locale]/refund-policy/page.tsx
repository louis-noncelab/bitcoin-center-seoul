import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { LegalPage, legalMetadata, legalPurchase } from "@/components/site/legal-page";
import { routing } from "@/i18n/routing";

type Props = { readonly params: Promise<{ readonly locale: string }>; readonly searchParams: Promise<{ purchase?: string | string[] }> };

export async function generateMetadata({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return legalMetadata(locale, "refund-policy", legalPurchase((await searchParams).purchase));
}

export default async function RefundPolicyPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return <LegalPage locale={locale} kind="refund-policy" purchase={legalPurchase((await searchParams).purchase)} />;
}
