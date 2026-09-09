import { notFound } from "next/navigation";
import { connection } from "next/server";
import { hasLocale } from "next-intl";
import { ContentLink } from "@/components/controls/content-link";
import { NoticesFrame, noticesMetadata, noticeText } from "@/components/site/notices-public";
import { routing } from "@/i18n/routing";
import { listNotices } from "@/server/notices";

type Props = { readonly params: Promise<{ readonly locale: string }> };
export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return noticesMetadata(locale);
}
export default async function NoticesPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  await connection();
  const notices = listNotices();
  return <NoticesFrame locale={locale} title={locale === "ko" ? "공지사항" : "Notices"}>
    <ul className="notices-list">{notices.map((notice) => <li key={notice.id}><ContentLink href={`/notices/${notice.slug}`} locale={locale}><time dateTime={`${notice.created_at.replace(" ", "T")}Z`} className="muted">{notice.created_at.slice(0, 10)}</time><h2>{noticeText(locale, notice).title}</h2></ContentLink></li>)}{!notices.length && <li className="muted">{locale === "ko" ? "등록된 공지가 없습니다." : "No notices have been published yet."}</li>}</ul>
  </NoticesFrame>;
}
