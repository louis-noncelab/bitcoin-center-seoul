"use client";

import { useLinkStatus } from "next/link";

export function NavigationFeedback() {
  const { pending } = useLinkStatus();

  return (
    <span
      className="navigation-feedback"
      data-pending={pending || undefined}
      aria-hidden="true"
    />
  );
}
