"use client";

import { ChevronDown } from "lucide-react";
import { Children, Fragment, isValidElement, useEffect, useId, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode, type SelectHTMLAttributes } from "react";

type Option = { readonly value: string; readonly label: string; readonly disabled: boolean };

function optionLabel(children: ReactNode, fallback: string): string {
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map((child) => optionLabel(child, "")).join("");
  return fallback;
}

function readOptions(children: ReactNode): Option[] {
  const options: Option[] = [];
  const visit = (nodes: ReactNode) => {
    Children.forEach(nodes, (child) => {
      if (!isValidElement<{ value?: string | number; disabled?: boolean; children?: ReactNode }>(child)) return;
      if (child.type === Fragment) {
        visit(child.props.children);
        return;
      }
      if (child.type !== "option") return;
      const value = child.props.value == null ? optionLabel(child.props.children, "") : String(child.props.value);
      options.push({ value, label: optionLabel(child.props.children, value), disabled: Boolean(child.props.disabled) });
    });
  };
  visit(children);
  return options;
}

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, "children" | "size" | "multiple"> & { readonly children?: ReactNode };

export function MenuSelect({ children, value, defaultValue, onChange, name, id, required, disabled, className, "aria-invalid": invalid, "aria-describedby": describedBy, "aria-label": label, autoComplete }: Props) {
  const options = readOptions(children);
  const controlled = value !== undefined;
  const [inner, setInner] = useState(String(defaultValue ?? ""));
  const current = controlled ? String(value) : inner;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(current);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((item) => item.value === current);
  const enabled = options.filter((item) => !item.disabled);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  function choose(next: string) {
    if (!controlled) setInner(next);
    setOpen(false);
    onChange?.({ target: { value: next, name: name ?? "" }, currentTarget: { value: next, name: name ?? "" } } as ChangeEvent<HTMLSelectElement>);
  }

  function move(step: number) {
    const index = Math.max(0, enabled.findIndex((item) => item.value === active));
    const next = enabled[(index + step + enabled.length) % enabled.length];
    if (next) setActive(next.value);
  }

  function onKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) { setActive(current); setOpen(true); return; }
      move(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Home" && open) {
      event.preventDefault();
      const first = enabled[0];
      if (first) setActive(first.value);
    } else if (event.key === "End" && open) {
      event.preventDefault();
      const last = enabled[enabled.length - 1];
      if (last) setActive(last.value);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) { setActive(current); setOpen(true); return; }
      const item = options.find((option) => option.value === active && !option.disabled);
      if (item) choose(item.value);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return <div ref={root} className={className ? `menu-select ${className}` : "menu-select"} data-open={open} data-invalid={invalid ? "true" : undefined}>
    <button
      type="button"
      id={id}
      className="menu-select-trigger"
      disabled={disabled}
      aria-label={label}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={open ? listId : undefined}
      aria-describedby={describedBy}
      onClick={() => { setActive(current); setOpen((opened) => !opened); }}
      onKeyDown={onKey}
    >
      <span>{selected?.label ?? "선택"}</span>
      <ChevronDown className="icon" aria-hidden="true" />
    </button>
    <input className="menu-select-value" tabIndex={-1} name={name} value={current} required={required} autoComplete={autoComplete} onChange={() => undefined} aria-hidden="true" readOnly />
    {open ? <ul id={listId} role="listbox" className="menu-select-popover" aria-labelledby={id}>
      {options.map((option) => <li key={`${option.value}\u0000${option.label}`} role="presentation">
        <button
          type="button"
          role="option"
          className="menu-select-option"
          disabled={option.disabled}
          aria-selected={option.value === current}
          data-active={option.value === active || undefined}
          onMouseEnter={() => setActive(option.value)}
          onClick={() => { if (!option.disabled) choose(option.value); }}
        >{option.label}</button>
      </li>)}
    </ul> : null}
  </div>;
}
