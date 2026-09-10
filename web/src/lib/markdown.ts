import type { Nodes } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";

function nodeText(node: Nodes): string {
  switch (node.type) {
    case "root":
    case "blockquote":
    case "list":
    case "listItem":
    case "table":
    case "tableRow":
      return node.children.map(nodeText).join(" ");
    case "paragraph":
    case "heading":
    case "emphasis":
    case "strong":
    case "delete":
    case "link":
    case "linkReference":
    case "tableCell":
      return node.children.map(nodeText).join("");
    case "text":
    case "inlineCode":
    case "code":
    case "html":
    case "yaml":
      return node.value;
    case "image":
    case "imageReference":
      return node.alt ?? "";
    case "break":
    case "thematicBreak":
      return " ";
    case "definition":
    case "footnoteDefinition":
    case "footnoteReference":
      return "";
    default:
      throw new TypeError(`Unsupported Markdown node: ${node satisfies never}`);
  }
}

export function markdownExcerpt(source: string) {
  const plain = nodeText(fromMarkdown(source)).replace(/\s+/g, " ").trim();
  const characters = Array.from(plain);
  return characters.length > 200 ? `${characters.slice(0, 200).join("").trimEnd()}…` : plain;
}
