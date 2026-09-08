"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import "@/styles/controls.css";

export function ReadingProgress() {
  const bar = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const element = bar.current;
    if (!element) return;
    let frame = 0;

    const update = () => {
      frame = 0;
      const documentHeight = document.documentElement.scrollHeight;
      const distance = documentHeight - document.documentElement.clientHeight;
      const progress = distance > 0 ? Math.min(1, Math.max(0, window.scrollY / distance)) : 0;
      element.style.transform = `scaleX(${progress})`;
    };

    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("pageshow", schedule);
    schedule();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("pageshow", schedule);
    };
  }, [pathname]);

  return <div ref={bar} className="reading-progress" aria-hidden="true" />;
}
