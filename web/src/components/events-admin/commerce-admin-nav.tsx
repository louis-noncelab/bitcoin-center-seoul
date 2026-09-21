"use client";

import { Link } from "@/i18n/navigation";

const pages = [
  { href: "/admin/products", label: "상품" },
  { href: "/admin/orders", label: "주문" },
  { href: "/admin/shipping", label: "배송비" },
  { href: "/admin/settings", label: "결제·환율" },
  { href: "/admin/review", label: "결제 검토" },
] as const;

/** Same toolbar row the content admin pages use, so the two areas navigate alike. */
export function CommerceAdminNav({ current, disabled = false }: {
  readonly current: string;
  readonly disabled?: boolean;
}) {
  return <div className="events-admin-toolbar">
    <nav aria-label="상점 관리" className="button-row">
      {pages.map(({ href, label }) => <Link
        key={href}
        href={href}
        locale="ko"
        className="button"
        data-variant={href === current ? "primary" : "secondary"}
        aria-current={href === current ? "page" : undefined}
        aria-disabled={disabled || undefined}
      >{label}</Link>)}
    </nav>
    <nav aria-label="콘텐츠 관리" className="button-row">
      <Link href="/admin" locale="ko" className="button" data-variant="quiet">콘텐츠 관리</Link>
    </nav>
  </div>;
}
