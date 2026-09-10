import Markdown, { defaultUrlTransform, type Components } from "react-markdown";
import { getImageProps } from "next/image";
import remarkBreaks from "remark-breaks";
import { imagePathSchema } from "@/lib/events-contract";

function safeUrl(value: string, key: string) {
  if (key === "src") {
    const path = imagePathSchema.safeParse(value);
    return path.success && path.data ? path.data : undefined;
  }
  try {
    const { protocol } = new URL(value, "https://markdown.invalid");
    const transformed = protocol === "tel:" ? value : defaultUrlTransform(value);
    return ["http:", "https:", "mailto:", "tel:"].includes(protocol) && transformed ? transformed : undefined;
  } catch (error) {
    if (error instanceof TypeError) return undefined;
    throw error;
  }
}

const components = {
  h1: ({ children }) => <h2>{children}</h2>,
  a: ({ children, href, title }) => href === undefined ? <span>{children}</span> : <a href={href} title={title}>{children}</a>,
  img: ({ src, alt }) => {
    if (typeof src !== "string" || !src) return <>{alt}</>;
    const { props } = getImageProps({ src, alt: alt ?? "", width: 1600, height: 1200, sizes: "(max-width: 767px) 100vw, 62ch", unoptimized: true });
    // eslint-disable-next-line @next/next/no-img-element -- Next image props serve already resized, trusted local uploads.
    return <img {...props} alt={props.alt} />;
  },
  pre: ({ children }) => <pre tabIndex={0}>{children}</pre>,
} satisfies Components;

export function MarkdownContent({ children, lang }: { readonly children: string; readonly lang: string }) {
  return (
    <div className="event-description markdown-content" lang={lang}>
      <Markdown remarkPlugins={[remarkBreaks]} components={components} urlTransform={safeUrl}>{children}</Markdown>
    </div>
  );
}
