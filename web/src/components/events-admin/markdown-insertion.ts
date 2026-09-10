export type TextSnapshot = { readonly value: string; readonly selectionStart: number };

export function moveInsertion(before: TextSnapshot, after: TextSnapshot, position: number) {
  let start = 0;
  const limit = Math.min(before.selectionStart, after.selectionStart, before.value.length, after.value.length);
  while (start < limit && before.value[start] === after.value[start]) start += 1;
  let beforeEnd = before.value.length;
  let afterEnd = after.value.length;
  while (beforeEnd > start && afterEnd > start && before.value[beforeEnd - 1] === after.value[afterEnd - 1]) {
    beforeEnd -= 1; afterEnd -= 1;
  }
  if (position <= start) return position;
  if (position >= beforeEnd) return position + after.value.length - before.value.length;
  return start;
}

export function attachmentMarkdown(files: readonly { readonly name: string }[], images: readonly string[]) {
  return images.map((path, index) => {
    const name = (files[index]?.name ?? "사진").replace(/\.[^.]+$/, "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 120) || "사진";
    const alt = name.replace(/[\\[\]]/g, "\\$&");
    return `![${alt}](${path})`;
  }).join("\n\n");
}
