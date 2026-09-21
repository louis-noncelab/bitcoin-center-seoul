"use client";

import { ChevronDown } from "lucide-react";
import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type MenuOption = {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
};

function readOptions(children: ReactNode): MenuOption[] {
  const options: MenuOption[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child) || child.type !== "option") return;
    const props = child.props as { value?: string | number; children?: ReactNode; disabled?: boolean };
    const value = props.value === undefined || props.value === null ? "" : String(props.value);
    const label = typeof props.children === "string" || typeof props.children === "number"
      ? String(props.children)
      : value;
    options.push({ value, label, ...(props.disabled ? { disabled: true } : {}) });
  });
  return options;
}

export function MenuSelect({
  id,
  name,
  value,
  defaultValue,
  onChange,
  disabled = false,
  required = false,
  children,
  className = "",
  "aria-label": ariaLabel,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
}: {
  readonly id?: string;
  readonly name?: string;
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onChange?: (event: { target: { value: string; name: string; id: string } }) => void;
  readonly disabled?: boolean;
  readonly required?: boolean;
  readonly children: ReactNode;
  readonly className?: string;
  readonly "aria-label"?: string;
  readonly "aria-describedby"?: string;
  readonly "aria-invalid"?: boolean | "true" | "false";
}) {
  const options = useMemo(() => readOptions(children), [children]);
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? options[0]?.value ?? "");
  const selected = value ?? uncontrolled;
  const current = options.find((option) => option.value === selected) ?? options[0];

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(next: string) {
    if (value === undefined) setUncontrolled(next);
    onChange?.({ target: { value: next, name: name ?? "", id: id ?? "" } });
    setOpen(false);
  }

  return (
    <div
      className={`menu-select ${className}`.trim()}
      ref={root}
      data-open={open ? "true" : "false"}
      onBlur={(event) => {
        if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      {name ? <input type="hidden" name={name} value={selected} required={required} /> : null}
      <button
        type="button"
        id={id}
        className="menu-select-trigger"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        aria-required={required || undefined}
        disabled={disabled}
        onClick={() => { if (!disabled) setOpen((currentOpen) => !currentOpen); }}
      >
        <span>{current?.label || "\u00a0"}</span>
        <ChevronDown className="icon" aria-hidden="true" />
      </button>
      <div
        id={listId}
        className="menu-select-menu"
        role="listbox"
        data-open={open ? "true" : "false"}
        aria-hidden={!open}
        inert={!open}
      >
        {options.map((option) => (
          <button
            key={option.value || "empty"}
            type="button"
            role="option"
            aria-selected={option.value === selected}
            disabled={option.disabled}
            onClick={() => choose(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
