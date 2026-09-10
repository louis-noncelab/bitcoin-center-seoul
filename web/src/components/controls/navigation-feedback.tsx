"use client";

import { useLinkStatus } from "next/link";

export function NavigationFeedback({ label }: { readonly label: string }) {
  const { pending } = useLinkStatus();

  return (
    <span
      className="navigation-feedback"
      data-pending={pending || undefined}
    >{label}</span>
  );
}
