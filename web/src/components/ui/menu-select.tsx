"use client";

import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size" | "multiple">;

export function MenuSelect({ className, ...props }: Props) {
  return <span className={className ? `menu-select ${className}` : "menu-select"}>
    <select {...props} className="menu-select-control" />
    <ChevronDown className="icon menu-select-chevron" aria-hidden="true" />
  </span>;
}
