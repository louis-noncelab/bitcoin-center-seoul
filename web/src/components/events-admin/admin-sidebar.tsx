"use client";

import { createContext, useContext, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { z } from "zod";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/primitives";
import { LeaveGuard, useLeaveConfirmation } from "./leave-guard";
import { adminRequest, errorText, jsonBody } from "./request";

const AdminSessionContext = createContext<(authenticated: boolean) => void>(() => {});

export function useAdminSession() {
  return useContext(AdminSessionContext);
}

const sessionSchema = z.object({ authenticated: z.boolean() });

type AdminNavItem = { readonly href: string; readonly label: string };

const groups: readonly { readonly label: string; readonly items: readonly AdminNavItem[] }[] = [
  {
    label: "운영",
    items: [
      { href: "/admin/dashboard", label: "운영 현황" },
      { href: "/admin/orders", label: "주문 관리" },
      { href: "/admin/meetups/checkin", label: "밋업 체크인" },
    ],
  },
  {
    label: "콘텐츠",
    items: [
      { href: "/admin", label: "행사와 하이라이트" },
      { href: "/admin/notices", label: "공지사항" },
      { href: "/admin/reviews", label: "방문 후기" },
      { href: "/admin/collection", label: "전시 소개" },
    ],
  },
  {
    label: "판매",
    items: [
      { href: "/admin/products", label: "상품과 분류" },
      { href: "/admin/shipping", label: "배송비" },
      { href: "/admin/coupons", label: "쿠폰" },
    ],
  },
  {
    label: "설정과 알림",
    items: [
      { href: "/admin/settings", label: "결제와 가격 설정" },
      { href: "/admin/mail", label: "메일 발송" },
      { href: "/admin/logs", label: "작업 기록" },
    ],
  },
  { label: "도구", items: [{ href: "/admin/review", label: "결제 시뮬레이션" }] },
];

function currentPage(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminFrame({ children }: { readonly children: ReactNode }) {
  const [session, setSession] = useState<boolean | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    adminRequest("/api/admin/session", sessionSchema, { signal: abort.signal })
      .then((result) => { if (!abort.signal.aborted) setSession(result.authenticated); })
      .catch(() => { if (!abort.signal.aborted) setSession(false); });
    return () => abort.abort();
  }, []);
  return <AdminSessionContext.Provider value={setSession}>
    <LeaveGuard><AdminShell session={session} onLogout={() => setSession(false)}>{children}</AdminShell></LeaveGuard>
  </AdminSessionContext.Provider>;
}

function AdminShell({ session, onLogout, children }: { readonly session: boolean | null; readonly onLogout: () => void; readonly children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [seenPath, setSeenPath] = useState(pathname);
  const menuButton = useRef<HTMLButtonElement>(null);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
  }
  const signedIn = session === true;
  const here = groups.flatMap((group) => group.items).find((item) => currentPage(pathname, item.href));
  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (document.querySelector("dialog[open]")) return;
      setOpen(false);
      menuButton.current?.focus();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);
  return <div className={signedIn ? (open ? "admin-shell admin-menu-open" : "admin-shell") : "admin-signed-out"} lang="ko">
    {signedIn && <div className="admin-mobile-bar">
      <Button ref={menuButton} variant="secondary" aria-expanded={open} aria-controls="admin-sidebar" onClick={() => setOpen((value) => !value)}>{open ? "메뉴 닫기" : "메뉴 열기"}</Button>
      <span className="admin-mobile-title">{here?.label ?? "센터 관리"}</span>
    </div>}
    {signedIn && <AdminSidebar onNavigate={() => setOpen(false)} onLogout={onLogout} />}
    <div className="admin-stage">
      {children}
    </div>
  </div>;
}

function GuardLink({ href, children, onNavigate, current = false, className }: { readonly href: string; readonly children: string; readonly onNavigate?: () => void; readonly current?: boolean; readonly className?: string }) {
  const router = useRouter();
  const confirmLeave = useLeaveConfirmation();
  function go(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    void confirmLeave().then((accepted) => {
      if (!accepted) return;
      onNavigate?.();
      router.push(href, { locale: "ko" });
    });
  }
  return <Link href={href} locale="ko" className={className} aria-current={current ? "page" : undefined} onClick={go}>{children}</Link>;
}

function LogoutButton({ onLogout }: { readonly onLogout: () => void }) {
  const router = useRouter();
  const confirmLeave = useLeaveConfirmation();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    if (pending) return;
    if (!await confirmLeave()) return;
    setPending(true);
    setError("");
    try {
      await adminRequest("/api/admin/logout", z.unknown(), jsonBody({}));
      onLogout();
      router.push("/admin", { locale: "ko" });
      router.refresh();
    } catch (caught) {
      setError(errorText(caught, "ko"));
      setPending(false);
    }
  }
  return <>
    {error && <p className="events-error" role="alert">{error}</p>}
    <Button variant="quiet" disabled={pending} onClick={() => void logout()}>로그아웃</Button>
  </>;
}

function AdminSidebar({ onNavigate, onLogout }: { readonly onNavigate: () => void; readonly onLogout: () => void }) {
  const pathname = usePathname();
  const here = groups.flatMap((group) => group.items).find((item) => currentPage(pathname, item.href));
  useEffect(() => {
    document.querySelector<HTMLElement>(".admin-side-link[aria-current='page']")?.scrollIntoView({ block: "nearest" });
  }, [pathname]);

  return <aside id="admin-sidebar" className="admin-sidebar" lang="ko">
    <p className="admin-sidebar-mark">센터 관리</p>
    <p className="admin-sidebar-here">{here ? here.label : "관리"}</p>
    <nav aria-label="관리자 메뉴" className="admin-sidebar-nav">
      {groups.map((group) => <div key={group.label} className="admin-sidebar-group">
        <p className="admin-sidebar-label">{group.label}</p>
        <ul>
          {group.items.map((item) => {
            const current = currentPage(pathname, item.href);
            return <li key={item.href}>
              <GuardLink href={item.href} onNavigate={onNavigate} current={current} className="admin-side-link">{item.label}</GuardLink>
            </li>;
          })}
        </ul>
      </div>)}
    </nav>
    <div className="admin-sidebar-foot">
      <LogoutButton onLogout={onLogout} />
      <GuardLink href="/" className="admin-side-link">공개 사이트로</GuardLink>
    </div>
  </aside>;
}
