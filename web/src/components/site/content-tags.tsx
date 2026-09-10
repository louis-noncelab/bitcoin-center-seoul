import type { Locale } from "@/i18n/routing";

export function ContentTags({ tags, locale }: { readonly tags: readonly string[]; readonly locale: Locale }) {
  if (tags.length === 0) return null;
  return (
    <ul className="content-tags" role="list" aria-label={locale === "ko" ? "해시태그" : "Hashtags"}>
      {tags.map((tag) => <li key={tag}>#{tag}</li>)}
    </ul>
  );
}
