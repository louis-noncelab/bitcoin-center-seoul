import { ArrowUpRight, Mail, Phone } from "lucide-react";
import { BackToTop } from "@/components/controls/back-to-top";
import { ActionLink } from "@/components/ui/primitives";
import { centerContent } from "@/content/center";
import { publicNavigation } from "@/content/public-navigation";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { CollaborationTrigger } from "./collaboration-trigger";
import "@/styles/footer.css";

export function SiteFooter({ locale }: { readonly locale: Locale }) {
  const content = centerContent[locale];
  const { visit } = content;
  return (
    <footer id="visit" className="site-footer" aria-label={visit.title}>
      <div className="container">
        <div className="footer-top">
          <div className="footer-visit">
            <h2 className="footer-label">
              {content.nav.find((item) => item.id === "visit")?.label}
            </h2>
            <address className="footer-address">{visit.address.value}</address>
            <p className="footer-access muted">{visit.address.note}</p>
            <dl className="footer-hours">
              <dt className="sr-only">{visit.hours.label}</dt>
              {visit.hours.lines.map((line) => (
                <dd key={line}>{line}</dd>
              ))}
            </dl>
          </div>
          <nav
            aria-labelledby="footer-navigation-title"
            className="footer-navigation"
          >
            <h2 id="footer-navigation-title" className="footer-label">
              {locale === "ko" ? "센터 안내" : "Explore"}
            </h2>
            <ul>
              {publicNavigation(locale).map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    prefetch={item.id === "news" ? false : undefined}
                    locale={locale}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav
            className="footer-commerce"
            aria-labelledby="footer-commerce-title"
          >
            <h2 id="footer-commerce-title" className="footer-label">
              {locale === "ko" ? "참여하기" : "Get involved"}
            </h2>
            <ul>
              <li>
                <Link href="/shop" locale={locale}>
                  {locale === "ko" ? "센터 상품" : "Center shop"}
                </Link>
              </li>
              <li>
                <a
                  href="https://www.saturdayblock.com/meetup?brand=bcs"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {locale === "ko" ? "밋업 신청" : "Join a meetup"}
                  <ArrowUpRight className="icon" aria-hidden="true" />
                  <span className="sr-only">
                    {locale === "ko" ? " (새 창)" : " (new window)"}
                  </span>
                </a>
              </li>
            </ul>
          </nav>
          <div
            className="footer-contact"
            role="group"
            aria-labelledby="footer-contact-title"
          >
            <h2 id="footer-contact-title" className="footer-label">
              {locale === "ko" ? "문의하기" : "Contact"}
            </h2>
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
              <ActionLink
                href="https://x.com/BtcCtrSeoul"
                variant="quiet"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={locale === "ko" ? "X (새 창)" : "X (new window)"}
                title="X"
              >
                <svg
                  className="icon"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.64 7.584H.47l8.6-9.835L0 1.154h7.594l5.243 6.932 6.064-6.933Zm-1.29 19.49h2.039L6.487 3.24H4.3l13.31 17.403Z" />
                </svg>
              </ActionLink>
              <ActionLink
                href="https://www.instagram.com/bitcoincenterseoul/"
                variant="quiet"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={
                  locale === "ko"
                    ? "인스타그램 (새 창)"
                    : "Instagram (new window)"
                }
                title="Instagram"
              >
                <svg
                  className="icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle
                    cx="17.5"
                    cy="6.5"
                    r="1"
                    fill="currentColor"
                    stroke="none"
                  />
                </svg>
              </ActionLink>
            </div>
            <CollaborationTrigger locale={locale} />
          </div>
        </div>
        <div className="footer-bottom">
          <div className="footer-business">
            <p>{locale === "ko" ? "논스랩 주식회사 · 대표 고덕윤 · 사업자등록번호 568-88-01463" : "Nonce Lab Inc. · CEO Deokyoon Ko · Business registration 568-88-01463"}</p>
            <p>{locale === "ko" ? "통신판매업 신고번호 제 2022-서울강서-0536" : "Mail-order registration: 2022-Seoul Gangseo-0536"}</p>
            <p><a href="https://www.ftc.go.kr/bizCommPop.do?wrkr_no=5688801463" target="_blank" rel="noopener noreferrer">{locale === "ko" ? "공정거래위원회 사업자정보 확인" : "Verify business registration with the KFTC"}<span className="sr-only">{locale === "ko" ? " (새 창)" : " (new window)"}</span></a></p>
            <address>{locale === "ko" ? "사업장 및 센터 주소: 서울특별시 마포구 신촌로2안길 30, 2층" : "Registered business and Center address: 2F, 30 Sinchon-ro 2an-gil, Mapo-gu, Seoul 04056"}</address>
            <p>{locale === "ko" ? "호스팅 서비스: Amazon Web Services (AWS), 서울 리전" : "Hosting service: Amazon Web Services (AWS), Seoul Region"}</p>
            <p><a href="tel:+8227021718">{locale === "ko" ? "02-702-1718" : "+82 2-702-1718"}</a><span aria-hidden="true"> · </span><a href="mailto:hello@noncelab.com">hello@noncelab.com</a></p>
          </div>
          <nav className="footer-legal" aria-label={locale === "ko" ? "사업자 및 법적 안내" : "Business and legal information"}>
            <ul>
              <li><Link href="/business-info" locale={locale}>{locale === "ko" ? "사업자정보" : "Business information"}</Link></li>
              <li><Link href="/privacy-policy" locale={locale}>{locale === "ko" ? "개인정보 처리방침" : "Privacy policy"}</Link></li>
              <li><Link href="/terms-of-service" locale={locale}>{locale === "ko" ? "이용약관" : "Terms of service"}</Link></li>
              <li><Link href="/refund-policy" locale={locale}>{locale === "ko" ? "환불 및 반품정책" : "Refund and returns"}</Link></li>
            </ul>
          </nav>
          <span className="footer-copyright" lang="en">© Bitcoin Center Seoul</span>
        </div>
      </div>
      <BackToTop locale={locale} />
    </footer>
  );
}
