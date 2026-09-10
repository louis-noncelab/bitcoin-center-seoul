import { z } from "zod";

const tagSchema = z.string()
  .refine((value) => !/[\p{Cc},]/u.test(value), "해시태그 안에는 쉼표나 제어 문자를 사용할 수 없습니다.")
  .transform((value) => value.normalize("NFC").trim().replace(/^(?:#\s*)+/u, "").replace(/\s+/gu, " "))
  .refine((value) => value.length > 0, "빈 해시태그는 사용할 수 없습니다.")
  .refine((value) => Array.from(value).length <= 30, "해시태그는 하나당 30자 이내로 입력해 주세요.");

export const contentTagsSchema = z.array(tagSchema)
  .max(10, "해시태그는 최대 10개까지 입력할 수 있습니다.")
  .transform((tags) => {
    const seen = new Set<string>();
    return tags.filter((tag) => {
      const key = tag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })
  .readonly()
  .default([]);

export function splitContentTags(value: string): readonly string[] {
  return value.trim() ? value.split(",") : [];
}
