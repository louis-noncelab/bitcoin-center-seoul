"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "./primitives";

export function Dialog({ open, onClose, title, description, children, className = "" }: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) dialog.showModal();
    else dialog.close();
    return () => dialog.close();
  }, [open]);
  return (
    <dialog ref={ref} tabIndex={-1} className={`site-dialog ${className}`} aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const dialog = event.currentTarget;
        const controls = Array.from(dialog.querySelectorAll<HTMLElement>("a[href], button, input, select, textarea, [tabindex]")).filter((element) =>
          element.tabIndex >= 0 && !element.matches(":disabled") && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden"
        );
        const first = controls[0];
        const last = controls.at(-1);
        const active = dialog.ownerDocument.activeElement;
        if (!first || !last) {
          event.preventDefault();
          dialog.focus();
        } else if (event.shiftKey && (active === first || active === dialog)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (active === last || active === dialog)) {
          event.preventDefault();
          first.focus();
        }
      }}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="dialog-surface">
        <h2 id={titleId}>{title}</h2>
        {description && <p id={descriptionId}>{description}</p>}
        {children}
      </div>
    </dialog>
  );
}

type Confirmation = {
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly cancelLabel?: string;
};

export function useConfirmation() {
  const [content, setContent] = useState<Confirmation | null>(null);
  const [open, setOpen] = useState(false);
  const resolve = useRef<((accepted: boolean) => void) | null>(null);
  const finish = useCallback((accepted: boolean) => {
    const complete = resolve.current;
    resolve.current = null;
    setOpen(false);
    complete?.(accepted);
  }, []);
  const confirm = useCallback((next: Confirmation): Promise<boolean> => {
    if (resolve.current) return Promise.resolve(false);
    return new Promise((complete) => {
      resolve.current = complete;
      setContent(next);
      setOpen(true);
    });
  }, []);
  useEffect(() => () => {
    resolve.current?.(false);
    resolve.current = null;
  }, []);
  return {
    confirm,
    dialog: content && <Dialog open={open} title={content.title} description={content.description} onClose={() => finish(false)}>
      <div className="dialog-actions">
        <Button variant="secondary" autoFocus onClick={() => finish(false)}>{content.cancelLabel ?? "취소"}</Button>
        <Button onClick={() => finish(true)}>{content.confirmLabel}</Button>
      </div>
    </Dialog>,
  };
}
