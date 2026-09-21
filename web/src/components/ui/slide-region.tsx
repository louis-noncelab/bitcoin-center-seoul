import type { ReactNode } from "react";
import "@/styles/slide-region.css";

export function SlideRegion({ open, id, children }: {
  readonly open: boolean;
  readonly id?: string;
  readonly children: ReactNode;
}) {
  return <div id={id} className="slide-region" data-open={open} aria-hidden={!open} inert={!open}>
    <div className="slide-region-content">{children}</div>
  </div>;
}
