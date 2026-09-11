"use client";

import { motion, useMotionValue, useSpring } from "motion/react";
import { useEffect } from "react";

export function CursorFollower() {
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const opacity = useMotionValue(0);
  const x = useSpring(pointerX, { stiffness: 500, damping: 35, mass: 0.5 });
  const y = useSpring(pointerY, { stiffness: 500, damping: 35, mass: 0.5 });

  useEffect(() => {
    const enabled = matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    const hide = () => opacity.set(0);
    const move = (event: PointerEvent) => {
      if (!enabled.matches || event.pointerType !== "mouse") return hide();
      pointerX.set(event.clientX); pointerY.set(event.clientY);
      if (!opacity.get()) { x.jump(event.clientX); y.jump(event.clientY); }
      opacity.set(1);
    };
    const leave = (event: PointerEvent) => { if (!event.relatedTarget) hide(); };
    const keyboard = (event: KeyboardEvent) => { if (event.key === "Tab") hide(); };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerout", leave);
    window.addEventListener("blur", hide);
    window.addEventListener("keydown", keyboard);
    enabled.addEventListener("change", hide);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerout", leave);
      window.removeEventListener("blur", hide);
      window.removeEventListener("keydown", keyboard);
      enabled.removeEventListener("change", hide);
    };
  }, [opacity, pointerX, pointerY, x, y]);

  return <motion.span className="cursor-follower" aria-hidden="true" style={{ x, y, opacity }} />;
}
