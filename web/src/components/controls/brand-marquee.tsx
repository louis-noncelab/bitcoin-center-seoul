"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/routing";
import { Button } from "@/components/ui/primitives";

export function BrandMarquee({ locale }: { readonly locale: Locale }) {
  const frame = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const element = frame.current;
    element?.setAttribute("data-enhanced", "true");
    return () => element?.removeAttribute("data-enhanced");
  }, []);
  const label = locale === "ko"
    ? paused ? "글자 움직임 재생" : "글자 움직임 멈추기"
    : paused ? "Play text animation" : "Pause text animation";

  return (
    <div ref={frame} className="brand-marquee" data-paused={paused}>
      <span className="sr-only" lang="en">Bitcoin Center Seoul</span>
      <div className="brand-marquee-window" aria-hidden="true">
        <div className="brand-marquee-track" lang="en">
          {[0, 1].map((group) => (
            <div className="brand-marquee-group" key={group}>
              {[0, 1].map((copy) => (
                <span key={copy}>Bitcoin Center <span className="brand-marquee-city">Seoul</span></span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <Button
        variant="secondary"
        className="brand-marquee-control"
        aria-label={label}
        onClick={() => setPaused((value) => !value)}
      >
        {paused ? <Play className="icon" aria-hidden="true" /> : <Pause className="icon" aria-hidden="true" />}
      </Button>
    </div>
  );
}
