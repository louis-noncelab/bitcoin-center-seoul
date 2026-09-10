import { ArrowUpRight, Mail, Phone } from "lucide-react";
import { BackToTop } from "@/components/controls/back-to-top";
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
        <div className="footer-top">
          <div className="footer-visit">
            <h2 className="footer-label">{content.nav.find((item) => item.id === "visit")?.label}</h2>
            <address className="footer-address">{visit.address.value}</address>
            <p className="footer-access muted">{visit.address.note}</p>
            <dl className="footer-hours">
              <dt className="sr-only">{visit.hours.label}</dt>
              {visit.hours.lines.map((line) => <dd key={line}>{line}</dd>)}
            </dl>
          </div>
          <nav aria-labelledby="footer-navigation-title" className="footer-navigation">
            <h2 id="footer-navigation-title" className="footer-label">
              {locale === "ko" ? "센터 안내" : "Explore"}
            </h2>
            <ul>
              <li><Link href="/notices" locale={locale}>{locale === "ko" ? "공지사항" : "Notices"}</Link></li>
              <li><Link href="/collection" locale={locale}>{locale === "ko" ? "도서·작품" : "Books & art"}</Link></li>
              {content.nav.filter((item) => item.id !== "home").map((item) => (
                <li key={item.id}>
                  <Link href={`/${item.id}`} prefetch={item.id === "journal" ? false : undefined} locale={locale}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav className="footer-commerce" aria-labelledby="footer-commerce-title">
            <h2 id="footer-commerce-title" className="footer-label">{locale === "ko" ? "참여하기" : "Get involved"}</h2>
            <ul>
              <li><a href="https://www.saturdayblock.com/shop?brand=bcs" target="_blank" rel="noopener noreferrer">{locale === "ko" ? "센터 상품" : "Center shop"}<ArrowUpRight className="icon" aria-hidden="true" /><span className="sr-only">{locale === "ko" ? " (새 창)" : " (new window)"}</span></a></li>
              <li><a href="https://www.saturdayblock.com/meetup?brand=bcs" target="_blank" rel="noopener noreferrer">{locale === "ko" ? "밋업 신청" : "Join a meetup"}<ArrowUpRight className="icon" aria-hidden="true" /><span className="sr-only">{locale === "ko" ? " (새 창)" : " (new window)"}</span></a></li>
            </ul>
          </nav>
          <div className="footer-contact" role="group" aria-labelledby="footer-contact-title">
            <h2 id="footer-contact-title" className="footer-label">{locale === "ko" ? "문의하기" : "Contact"}</h2>
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
              <ActionLink href="https://x.com/BtcCtrSeoul" variant="quiet" target="_blank" rel="noopener noreferrer" aria-label={locale === "ko" ? "X (새 창)" : "X (new window)"} title="X">
                <svg className="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.64 7.584H.47l8.6-9.835L0 1.154h7.594l5.243 6.932 6.064-6.933Zm-1.29 19.49h2.039L6.487 3.24H4.3l13.31 17.403Z" /></svg>
              </ActionLink>
              <ActionLink href="https://www.instagram.com/bitcoincenterseoul/" variant="quiet" target="_blank" rel="noopener noreferrer" aria-label={locale === "ko" ? "인스타그램 (새 창)" : "Instagram (new window)"} title="Instagram">
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
              </ActionLink>
            </div>
            <a href={visit.contact.email.href} className="footer-collaboration">{locale === "ko" ? "협업 제안" : "Propose a collaboration"}<ArrowUpRight className="icon" aria-hidden="true" /></a>
          </div>
        </div>
        <div className="footer-bottom">
          <span lang="en">© Bitcoin Center Seoul</span>

        </div>
      </div>
      <BackToTop locale={locale} />
    </footer>
  );
}
