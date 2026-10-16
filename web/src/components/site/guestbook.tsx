import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { guestbookCopy } from "@/content/guestbook";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { GuestbookRecord } from "@/lib/guestbook-contract";
import { guestbookPage } from "@/server/guestbook";
import { OriginalPhoto } from "./original-photo";
import { GuestbookNote } from "./guestbook-note";
import "@/styles/guestbook.css";

export function GuestbookEntry({ entry, locale, preview = false }: {
  readonly entry: GuestbookRecord; readonly locale: Locale; readonly preview?: boolean;
}) {
  const t = guestbookCopy[locale];
  const name = entry.visitorName || t.visitor;
  const body = locale === "en" ? entry.bodyEn || entry.body : entry.body;
  const lang = locale === "en" && entry.bodyEn ? "en" : "ko";
  const excerpt = Array.from(body);
  const reference = `${locale === "ko" ? `${entry.volume}권` : `Volume ${entry.volume}`} / No.${entry.entryNumber}`;
  return <article id={`entry-${entry.id}`} className={`guestbook-entry ${preview ? "guestbook-entry-preview" : "guestbook-card"}`} aria-labelledby={`guestbook-name-${entry.id}`}>
    <header className="guestbook-byline">
      <h2 id={`guestbook-name-${entry.id}`}>{name}</h2>
      <p className="muted">{reference}</p>
      {entry.visitDate && <p className="muted">{locale === "en" && `${t.visitDate} `}<time dateTime={entry.visitDate}>{entry.visitDate.replaceAll("-", ".")}</time>{locale === "ko" && ` ${t.visitDate}`}</p>}
    </header>
    <div className="guestbook-entry-content">
      {preview ? <>
        <p className="guestbook-body" lang={lang}>{body}</p>
        <Link href={`/guestbook#entry-${entry.id}`} locale={locale} className="section-link" aria-label={locale === "ko" ? `${name} 방명록 읽기` : `Read ${name}’s note`}>{locale === "ko" ? "계속 읽기" : "Read more"}<ArrowRight className="icon" aria-hidden="true" /></Link>
      </> : <>
        <p className="guestbook-excerpt" lang={lang}>{excerpt.slice(0, 180).join("")}{excerpt.length > 180 && "…"}</p>
        <GuestbookNote id={entry.id} name={name} reference={reference} locale={locale} photoCount={entry.images.length}
          thumbnail={entry.images[0] ? <Image src={entry.images[0]} alt="" fill unoptimized /> : null}>
          <p className="guestbook-body" lang={lang}>{body}</p>
          {entry.images.length > 0 && <div className="guestbook-photos">{entry.images.map((image, index) => <figure key={image}><OriginalPhoto src={image} alt={`${name}, ${t.photo} ${index + 1}`} /></figure>)}</div>}
        </GuestbookNote>
      </>}
    </div>
  </article>;
}

export async function GuestbookPreview({ locale }: { readonly locale: Locale }) {
  const records = (await guestbookPage()).records.slice(0, 3);
  if (!records.length) return null;
  const t = guestbookCopy[locale];
  return <section className="section-frame guestbook-preview" aria-labelledby="guestbook-preview-title">
    <div className="section-heading"><div><h2 id="guestbook-preview-title">{t.title}</h2><p className="muted">{t.intro}</p></div><Link href="/guestbook" locale={locale} className="section-link">{t.more}<ArrowRight className="icon" aria-hidden="true" /></Link></div>
    <div className="guestbook-preview-list">{records.map((entry) => <GuestbookEntry key={entry.id} entry={entry} locale={locale} preview />)}</div>
  </section>;
}
