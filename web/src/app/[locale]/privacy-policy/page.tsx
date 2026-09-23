import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { LegalPage, legalMetadata } from "@/components/site/legal-page";
import { routing } from "@/i18n/routing";

type Props = { readonly params: Promise<{ readonly locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return legalMetadata(locale, "privacy-policy");
}

export default async function PrivacyPolicyPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return <LegalPage locale={locale} kind="privacy-policy" />;
}
