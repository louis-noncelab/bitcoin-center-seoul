import type { ReactNode } from "react";

export function FormField({ id, label, hint, children }: {
  readonly id: string;
  readonly label: string;
  readonly hint?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}
    </div>
  );
}

export function FormNotice({ children, kind = "error" }: {
  readonly children: ReactNode;
  readonly kind?: "error" | "success" | "info";
}) {
  if (!children) return null;
  return <div className="form-notice" data-kind={kind} role={kind === "error" ? "alert" : "status"}>{children}</div>;
}
