import { notFound, permanentRedirect } from "next/navigation";
import { connection } from "next/server";
import { hasLocale } from "next-intl";
import { NoticesFrame, noticesMetadata, noticeText } from "@/components/site/notices-public";
import { MarkdownContent } from "@/components/site/markdown-content";
import { ContentTags } from "@/components/site/content-tags";
import { routing } from "@/i18n/routing";
import { noticeBySlug } from "@/server/notices";

type Props = { readonly params: Promise<{ readonly locale: string; readonly slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  await connection();
  const notice = noticeBySlug(slug);
  if (!notice) notFound();
  return noticesMetadata(locale, notice);
}
export default async function NoticePage({ params }: Props) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  await connection();
  const notice = noticeBySlug(slug);
  if (!notice) notFound();
  if (notice.slug !== slug) permanentRedirect(`/${locale}/notices/${notice.slug}`);
  const content = noticeText(locale, notice);
  return <NoticesFrame locale={locale} title={content.title} detail><article className="event-detail"><time className="muted" dateTime={`${notice.created_at.replace(" ", "T")}Z`}>{notice.created_at.slice(0, 10)}</time><ContentTags tags={notice.tags} locale={locale} /><MarkdownContent lang={locale === "en" && !notice.descriptionEn ? "ko" : locale}>{content.description}</MarkdownContent></article></NoticesFrame>;
}
