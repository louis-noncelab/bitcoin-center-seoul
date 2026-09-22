import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminFrame } from "@/components/events-admin/admin-sidebar";
import "@/styles/site.css";
import "@/styles/events-admin.css";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { readonly children: ReactNode }) {
  return <AdminFrame>{children}</AdminFrame>;
}
