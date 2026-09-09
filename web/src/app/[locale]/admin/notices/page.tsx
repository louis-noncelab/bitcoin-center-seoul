import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { NoticesAdmin } from "@/components/events-admin/notices-admin";
import { BrandWordmark } from "@/components/site/brand-wordmark";
import { ThemeToggle } from "@/components/controls/theme-toggle";
import { ActionLink } from "@/components/ui/primitives";
import { routing } from "@/i18n/routing";
import "@/styles/site.css";
import "@/styles/events-admin.css";

export const metadata = { title: "공지사항 관리 | Bitcoin Center Seoul", robots: { index: false, follow: false } };

export default async function AdminPage({ params }: { readonly params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return <><header className="container events-admin-toolbar events-admin-header" lang="ko"><ActionLink href="/ko" variant="quiet" className="site-wordmark" aria-label="비트코인 센터 서울 홈"><BrandWordmark /></ActionLink><ThemeToggle label="다크 모드" /></header><main id="main" lang="ko" tabIndex={-1} className="container events-admin-page"><h1>공지사항 관리</h1><NoticesAdmin /></main></>;
}
