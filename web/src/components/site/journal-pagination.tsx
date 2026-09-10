import Form from "next/form";
import { Fragment } from "react";
import { ContentLink } from "@/components/controls/content-link";
import { Button, FormControl } from "@/components/ui/primitives";
import type { Locale } from "@/i18n/routing";

export function JournalPagination({ locale, pagination: { page, totalPages } }: {
  readonly locale: Locale;
  readonly pagination: { readonly page: number; readonly totalPages: number };
}) {
  if (totalPages <= 1) return null;
  const pages = totalPages <= 7
    ? Array.from({ length: totalPages }, (_, index) => index + 1)
    : [...new Set([1, page - 1, page, page + 1, totalPages])].filter((value) => value >= 1 && value <= totalPages).sort((left, right) => left - right);
  const href = (value: number) => value === 1 ? "/journal" : `/journal?page=${value}`;
  return (
    <nav className="journal-pagination" aria-label={locale === "ko" ? "활동 기록 페이지" : "Journal pages"}>
      <div className="journal-page-links">
        {page > 1 && <ContentLink href={href(page - 1)} locale={locale} className="button" data-variant="quiet" rel="prev">{locale === "ko" ? "이전" : "Previous"}</ContentLink>}
        {pages.map((value, index) => (
          <Fragment key={value}>
            {index > 0 && value - (pages[index - 1] ?? value) > 1 && <span aria-hidden="true">…</span>}
            <ContentLink href={href(value)} locale={locale} className="button" data-variant="quiet" aria-label={locale === "ko" ? `${value}페이지` : `Page ${value}`} aria-current={value === page ? "page" : undefined}>{value}</ContentLink>
          </Fragment>
        ))}
        {page < totalPages && <ContentLink href={href(page + 1)} locale={locale} className="button" data-variant="quiet" rel="next">{locale === "ko" ? "다음" : "Next"}</ContentLink>}
      </div>
      <Form action={`/${locale}/journal`} prefetch={false} className="journal-page-jump">
        <label htmlFor="journal-page">{locale === "ko" ? "페이지" : "Page"}</label>
        <FormControl><input key={page} id="journal-page" name="page" type="number" inputMode="numeric" min={1} max={totalPages} step={1} defaultValue={page} required aria-describedby="journal-page-total" /></FormControl>
        <span className="muted" aria-hidden="true">/ {totalPages}</span>
        <span id="journal-page-total" className="sr-only">{locale === "ko" ? `전체 ${totalPages}페이지` : `${totalPages} pages in total`}</span>
        <Button type="submit" variant="secondary">{locale === "ko" ? "이동" : "Go"}</Button>
      </Form>
    </nav>
  );
}
