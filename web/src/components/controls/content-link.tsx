"use client";

import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

type Props = Omit<ComponentProps<typeof Link>, "href" | "locale" | "scroll" | "onNavigate"> & {
  readonly href: string;
  readonly locale: Locale;
};

export function ContentLink({ href, locale, ...props }: Props) {
  return <Link {...props} href={href} locale={locale} prefetch={false} />;
}
