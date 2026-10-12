import { connection } from "next/server";
import { centerContent, centerPostalAddress, centerSocialLinks } from "@/content/center";
import { defaultShareImage } from "@/content/share";
import { siteOrigin } from "@/content/site";
import type { Locale } from "@/i18n/routing";
import { getCenterOpeningHours } from "@/server/center-status";

export async function OrganizationJsonLd({ locale }: { readonly locale: Locale }) {
  await connection();
  const { hero, visit } = centerContent[locale];
  const identity = {
    "@context": "https://schema.org",
    "@graph": [{
    "@type": "LocalBusiness",
    "@id": `${siteOrigin}/#organization`,
    name: hero.title,
    alternateName: centerContent[locale === "ko" ? "en" : "ko"].hero.title,
    url: siteOrigin,
    logo: `${siteOrigin}/brand/bcs-horizontal-color.png`,
    description: hero.introduction,
    email: visit.contact.email.label,
    telephone: visit.contact.phone.label,
    image: `${siteOrigin}${defaultShareImage}`,
    address: centerPostalAddress(locale),
    hasMap: visit.mapLinks[0].href,
    sameAs: Object.values(centerSocialLinks),
    ...(await getCenterOpeningHours()),
    }, {
      "@type": "WebSite",
      "@id": `${siteOrigin}/#website`,
      url: siteOrigin,
      name: hero.title,
      alternateName: centerContent[locale === "ko" ? "en" : "ko"].hero.title,
      inLanguage: ["ko", "en"],
      publisher: { "@id": `${siteOrigin}/#organization` },
    }],
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
