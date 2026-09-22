import { centerContent } from "@/content/center";
import { siteOrigin } from "@/content/site";
import type { Locale } from "@/i18n/routing";

export function OrganizationJsonLd({ locale }: { readonly locale: Locale }) {
  const { hero, visit } = centerContent[locale];
  const identity = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteOrigin}/#organization`,
    name: hero.title,
    alternateName: centerContent[locale === "ko" ? "en" : "ko"].hero.title,
    url: siteOrigin,
    logo: `${siteOrigin}/brand/bcs-horizontal-color.png`,
    description: hero.introduction,
    email: visit.contact.email.label,
    telephone: visit.contact.phone.label,
  } as const;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(identity).replace(/</g, "\\u003c"),
      }}
    />
  );
}
