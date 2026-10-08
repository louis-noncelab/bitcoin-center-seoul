import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { DashboardAdmin } from "@/components/events-admin/dashboard-admin";
import { BrandWordmark } from "@/components/site/brand-wordmark";
import { ThemeToggle } from "@/components/controls/theme-toggle";
import { ActionLink } from "@/components/ui/primitives";
import { routing } from "@/i18n/routing";
import "@/styles/site.css";
import "@/styles/events-admin.css";

export const metadata = { title: "관리 대시보드 | Bitcoin Center Seoul" };

export default async function DashboardPage({ params }: { readonly params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return <><header className="container events-admin-toolbar events-admin-header" lang="ko"><ActionLink href="/ko" variant="quiet" className="site-wordmark" aria-label="비트코인 센터 서울 홈"><BrandWordmark /></ActionLink><ThemeToggle label="다크 모드" /></header><main id="main" lang="ko" tabIndex={-1} className="container events-admin-page"><h1>관리 대시보드</h1><DashboardAdmin /></main></>;
}
