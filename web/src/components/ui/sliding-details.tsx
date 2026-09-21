"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function SlidingDetails({ summary, children, className }: {
  readonly summary: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const animation = useRef<Animation | null>(null);
  const expanded = useRef(false);

  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const settle = () => { if (preference.matches) animation.current?.finish(); };
    preference.addEventListener("change", settle);
    return () => { preference.removeEventListener("change", settle); animation.current?.cancel(); };
  }, []);

  return <details ref={ref} className={className}>
    <summary onClick={(event) => {
      event.preventDefault();
      const details = ref.current;
      const content = details?.querySelector<HTMLElement>(".sliding-details-content");
      if (!details || !content) return;
      const start = details.open ? content.getBoundingClientRect().height : 0;
      expanded.current = animation.current ? !expanded.current : !details.open;
      animation.current?.cancel();
      details.open = true;
      content.inert = !expanded.current;
      content.setAttribute("aria-hidden", String(!expanded.current));
      event.currentTarget.setAttribute("aria-expanded", String(expanded.current));
      const finish = () => {
        details.open = expanded.current;
        animation.current = null;
      };
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) { finish(); return; }
      const styles = getComputedStyle(details);
      const time = styles.getPropertyValue(expanded.current ? "--duration-menu-enter" : "--duration-menu-exit").trim();
      const duration = parseFloat(time) * (time.endsWith("ms") ? 1 : 1000);
      const current = content.animate([
        { height: `${start}px` },
        { height: expanded.current ? `${content.scrollHeight}px` : "0px" },
      ], { duration, easing: styles.getPropertyValue("--ease-out").trim() });
      animation.current = current;
      current.onfinish = () => { if (animation.current === current) finish(); };
    }}>{summary}</summary>
    <div className="sliding-details-content">{children}</div>
  </details>;
}
