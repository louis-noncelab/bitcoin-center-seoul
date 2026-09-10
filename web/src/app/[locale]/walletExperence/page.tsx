import { notFound, permanentRedirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export default async function LegacyWalletPage({ params }: { readonly params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  permanentRedirect(getPathname({ locale, href: "/experience/wallet" }));
}
