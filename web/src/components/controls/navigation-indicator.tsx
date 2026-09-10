"use client";

import { useEffect, useRef } from "react";

export function NavigationIndicator() {
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
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
        return;
      }
      const target = label.getBoundingClientRect();
      indicator.style.transform = `translateX(${target.left - bounds.left}px) scaleX(${target.width})`;
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
      resize.disconnect();
      selection.disconnect();
      delete navigation.dataset.indicatorReady;
    };
  }, []);

  return <span ref={marker} className="navigation-indicator" aria-hidden="true" />;
}
