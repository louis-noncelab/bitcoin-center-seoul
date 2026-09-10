export function MarkdownHelp({ id }: { readonly id: string }) {
  return (
    <p id={id} className="muted">
      Markdown을 사용할 수 있습니다. <code>## 소제목</code>, <code>**굵게**</code>, <code>- 목록</code>, <code>[링크 이름](https://…)</code>, <code>&gt; 인용</code>, <code>`코드`</code>. 줄바꿈도 그대로 표시됩니다.
      사진 첨부 버튼이나 드래그로 커서 위치에 사진을 넣고 <code>![사진 설명](주소)</code>의 설명을 수정하세요. 한 번에 12장 · 각 10MB · 총 30MB, JPG·PNG·WebP·GIF·AVIF를 지원합니다. 사진은 이 사이트에 업로드한 파일만 표시하고, HTML은 글자로 표시합니다.
    </p>
  );
}
