import { ArrowUp, ArrowUpRight, Mail, Phone } from "lucide-react";
import { BrandMarquee } from "@/components/controls/brand-marquee";
import { ActionLink } from "@/components/ui/primitives";
import { centerContent } from "@/content/center";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import "@/styles/footer.css";

export function SiteFooter({ locale }: { readonly locale: Locale }) {
  const content = centerContent[locale];
  const { visit } = content;
  return (
    <footer id="visit" className="site-footer" aria-label={visit.title}>
      <div className="container">
        <BrandMarquee locale={locale} />
        <div className="footer-top">
          <div className="footer-visit">
            <h2 className="footer-label">{content.nav[6].label}</h2>
            <address className="footer-address">{visit.address.value}</address>
            <p className="footer-access muted">{visit.address.note}</p>
            <dl className="footer-hours">
              <dt className="sr-only">{visit.hours.label}</dt>
              {visit.hours.lines.map((line) => <dd key={line}>{line}</dd>)}
            </dl>
            {visit.mapLinks.map((link) => (
              <ActionLink key={link.href} href={link.href} className="footer-map">
                {link.label}<ArrowUpRight className="icon" aria-hidden="true" />
              </ActionLink>
            ))}
          </div>
          <nav aria-labelledby="footer-navigation-title" className="footer-navigation">
            <h2 id="footer-navigation-title" className="footer-label">
              {locale === "ko" ? "센터 안내" : "Explore"}
            </h2>
            <ul>
              {content.nav.filter((item) => item.id !== "home").map((item) => (
                <li key={item.id}>
                  <Link href={`/${item.id}`} locale={locale}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="footer-contact" role="group" aria-labelledby="footer-contact-title">
            <h2 id="footer-contact-title" className="sr-only">{visit.contact.label}</h2>
            <div className="footer-actions">
              <ActionLink
                href={visit.contact.email.href}
                variant="quiet"
                aria-label={`${locale === "ko" ? "이메일 보내기" : "Send email"}: ${visit.contact.email.label}`}
                title={visit.contact.email.label}
              >
                <Mail className="icon" aria-hidden="true" />
              </ActionLink>
              <ActionLink
                href={visit.contact.phone.href}
                variant="quiet"
                aria-label={`${locale === "ko" ? "전화 걸기" : "Call"}: ${visit.contact.phone.label}`}
                title={visit.contact.phone.label}
              >
                <Phone className="icon" aria-hidden="true" />
              </ActionLink>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span lang="en">© Bitcoin Center Seoul</span>
          <ActionLink href="#top" variant="secondary" className="footer-to-top">
            {locale === "ko" ? "맨 위로" : "Back to top"}<ArrowUp className="icon" aria-hidden="true" />
          </ActionLink>
        </div>
      </div>
    </footer>
  );
}
