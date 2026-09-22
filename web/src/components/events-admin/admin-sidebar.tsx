"use client";

import { createContext, useContext, useEffect, useState, type MouseEvent, type ReactNode } from "react";
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
    label: "오늘",
    items: [
      { href: "/admin/dashboard", label: "대시보드" },
      { href: "/admin/orders", label: "주문" },
      { href: "/admin/meetups/checkin", label: "밋업 체크인" },
      { href: "/admin/review", label: "결제 검토" },
      { href: "/admin/mail", label: "메일 발송" },
    ],
  },
  {
    label: "콘텐츠",
    items: [
      { href: "/admin", label: "행사·하이라이트 관리" },
      { href: "/admin/notices", label: "공지사항" },
      { href: "/admin/reviews", label: "방문 후기" },
      { href: "/admin/collection", label: "전시" },
    ],
  },
  {
    label: "상품",
    items: [
      { href: "/admin/products", label: "상품·분류" },
      { href: "/admin/shipping", label: "배송비" },
      { href: "/admin/coupons", label: "쿠폰" },
    ],
  },
  {
    label: "설정",
    items: [
      { href: "/admin/settings", label: "결제·환율" },
      { href: "/admin/logs", label: "기록" },
    ],
  },
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
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
  }
  const signedIn = session === true;
  return <div className={signedIn ? (open ? "admin-shell admin-menu-open" : "admin-shell") : "admin-signed-out"} lang="ko">
    {signedIn && <AdminSidebar onNavigate={() => setOpen(false)} onLogout={onLogout} />}
    <div className="admin-stage">
      {signedIn && <div className="admin-mobile-bar">
        <Button variant="secondary" aria-expanded={open} aria-controls="admin-sidebar" onClick={() => setOpen((value) => !value)}>{open ? "메뉴 닫기" : "관리 메뉴"}</Button>
        <GuardLink href="/admin">행사·하이라이트 관리</GuardLink>
        <GuardLink href="/admin/notices">공지사항</GuardLink>
        <LogoutButton onLogout={onLogout} />
      </div>}
      {children}
    </div>
  </div>;
}

function GuardLink({ href, children, onNavigate, current = false, className }: { readonly href: string; readonly children: string; readonly onNavigate?: () => void; readonly current?: boolean; readonly className?: string }) {
  const router = useRouter();
  const confirmLeave = useLeaveConfirmation();
  function go(event: MouseEvent<HTMLAnchorElement>) {
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
