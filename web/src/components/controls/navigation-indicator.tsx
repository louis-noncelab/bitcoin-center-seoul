"use client";

import { useLayoutEffect, useRef } from "react";

// Route pages remount the header; hand off its painted position before removal.
let previous: { transform: string; width: number } | undefined;

export function NavigationIndicator() {
  const marker = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const indicator = marker.current;
    const navigation = indicator?.parentElement;
    if (!indicator || !navigation) return;

    function position() {
      if (!indicator || !navigation) return;
      const label = navigation.querySelector<HTMLElement>(
        '.navigation-feedback[data-pending="true"]',
      ) ?? navigation.querySelector<HTMLElement>('[aria-current="page"] .navigation-feedback');
      const bounds = navigation.getBoundingClientRect();
      if (!label || !bounds.width) {
        indicator.style.opacity = "0";
        delete navigation.dataset.indicatorReady;
        previous = undefined;
        return;
      }
      const target = label.getBoundingClientRect();
      const transform = `translate(${target.left - bounds.left}px, ${target.bottom - bounds.bottom}px) scaleX(${target.width})`;
      if (navigation.dataset.indicatorReady !== "true") {
        indicator.style.transition = "none";
        indicator.style.transform = previous?.width === bounds.width ? previous.transform : transform;
        indicator.style.opacity = "1";
        navigation.dataset.indicatorReady = "true";
        indicator.getBoundingClientRect();
        indicator.style.removeProperty("transition");
      }
      indicator.style.transform = transform;
      indicator.style.opacity = "1";
      navigation.dataset.indicatorReady = "true";
    }

    position();
    const resize = new ResizeObserver(position);
    resize.observe(navigation);
    const selection = new MutationObserver(position);
    selection.observe(navigation, {
      subtree: true, attributes: true, attributeFilter: ["aria-current", "data-pending"],
    });
    return () => {
      const width = navigation.getBoundingClientRect().width;
      previous = width && navigation.dataset.indicatorReady === "true"
        ? { transform: getComputedStyle(indicator).transform, width }
        : undefined;
      resize.disconnect();
      selection.disconnect();
      delete navigation.dataset.indicatorReady;
    };
  }, []);

  return <span ref={marker} className="navigation-indicator" aria-hidden="true" />;
}
