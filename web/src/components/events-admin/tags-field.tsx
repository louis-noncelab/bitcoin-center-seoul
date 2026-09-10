import { FormControl } from "@/components/ui/primitives";

export function TagsField({ tags = [] }: { readonly tags?: readonly string[] }) {
  return (
    <label>
      해시태그 (선택)
      <FormControl><input name="tags" aria-label="해시태그 (선택)" defaultValue={tags.join(", ")} placeholder="비트코인, 라이트닝, Bitcoin" aria-describedby="content-tags-help" /></FormControl>
      <span id="content-tags-help" className="muted">쉼표(,)로 구분해 최대 10개, 하나당 30자까지 입력하세요. 앞의 #은 생략해도 됩니다. 한국어·영어 페이지에 같은 태그가 표시됩니다.</span>
    </label>
  );
}
