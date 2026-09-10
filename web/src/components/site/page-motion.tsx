"use client";

import { useEffect } from "react";
import "@/styles/motion.css";

export function PageMotion({ pageKey }: { readonly pageKey: string }) {
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    if (preference.matches) return;
    const main = document.getElementById("main");
    if (!main) return;
    const tokens = getComputedStyle(main);
    const cssDuration = tokens.getPropertyValue("--duration-reveal").trim();
    const duration = parseFloat(cssDuration) * (cssDuration.endsWith("ms") ? 1 : 1000);
    const cssStagger = tokens.getPropertyValue("--duration-stagger").trim();
    const stagger = parseFloat(cssStagger) * (cssStagger.endsWith("ms") ? 1 : 1000);
    const animations: Animation[] = [];
    const pending = new Map<Element, number>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const delay = pending.get(entry.target);
        if (delay === undefined) continue;
        pending.delete(entry.target);
        animations.push(entry.target.animate(
          [
            { opacity: 0, transform: `translateY(${tokens.getPropertyValue("--reveal-distance")})` },
            { opacity: 1, transform: "translateY(0)" },
          ],
          {
            duration,
            delay,
            easing: tokens.getPropertyValue("--ease-out").trim(),
            fill: "backwards",
          },
        ));
        observer.unobserve(entry.target);
      }
    });
    main.querySelectorAll(".section-frame").forEach((section) => {
      const parts = section.querySelectorAll("[data-reveal-part]");
      const targets = parts.length ? Array.from(parts) : [section];
      targets.forEach((target, index) => {
        pending.set(target, Math.min(index * stagger, 160));
        observer.observe(target);
      });
    });
    function stop() {
      pending.clear();
      observer.disconnect();
      animations.forEach((animation) => animation.cancel());
      animations.length = 0;
    }
    preference.addEventListener("change", stop);
    return () => {
      stop();
      preference.removeEventListener("change", stop);
    };
  }, [pageKey]);

  return null;
}
