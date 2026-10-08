import type { ReactNode } from "react";
import { LocaleDocument } from "@/components/locale-document";

export { generateMetadata, generateStaticParams } from "../../[locale]/layout";

export default function PrivateLocaleLayout({ children }: { children: ReactNode }) {
  return <LocaleDocument analyticsEnabled={false}>{children}</LocaleDocument>;
}
