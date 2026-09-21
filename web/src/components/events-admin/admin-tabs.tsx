"use client";

import { useId, type ReactNode } from "react";
import { domMax, LazyMotion } from "motion/react";
import * as m from "motion/react-m";
import { Button } from "@/components/ui/primitives";

export function AdminTabs<Value extends string>({ label, items, value, onChange, disabled = false, variant = "secondary", children }: {
  readonly label: string;
  readonly items: readonly { readonly value: Value; readonly label: string }[];
  readonly value: Value;
  readonly onChange: (value: Value) => void;
  readonly disabled?: boolean;
  readonly variant?: "quiet" | "secondary";
  readonly children?: ReactNode;
}) {
  const instance = useId();
  return <LazyMotion features={domMax} strict>
    <nav className="button-row admin-tabs" aria-label={label}>
      {items.map((item) => <Button key={item.value} variant={variant} aria-pressed={value === item.value} disabled={disabled} onClick={() => onChange(item.value)}>
        {value === item.value && <m.span className="admin-tab-indicator" layoutId={`${instance}-selection`} initial={false} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }} aria-hidden="true" />}
        <span className="admin-tab-label">{item.label}</span>
      </Button>)}
      {children}
    </nav>
  </LazyMotion>;
}
