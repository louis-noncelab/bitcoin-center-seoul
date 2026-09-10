"use client";

import { ArrowRight } from "lucide-react";
import { domMax, LazyMotion } from "motion/react";
import * as m from "motion/react-m";
import {
  useCallback,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import "@/styles/motion.css";

export type SelectionItem = {
  readonly id: string;
  readonly label: string;
  readonly content: ReactNode;
};

const selectionTransition = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1],
} as const;

type SelectionState = {
  readonly current: number;
  readonly outgoing: number | null;
  readonly direction: "forward" | "backward";
  readonly animated: boolean;
};

const motionQuery = "(prefers-reduced-motion: reduce)";
const getMotionPreference = () => matchMedia(motionQuery).matches;
const getServerMotionPreference = () => true;

export function SelectionTabs({
  label,
  keyboardHint,
  items,
  orientation = "vertical",
  action,
}: {
  readonly label: string;
  readonly keyboardHint: string;
  readonly items: readonly [SelectionItem, ...SelectionItem[]];
  readonly orientation?: "horizontal" | "vertical";
  readonly action?: ReactNode;
}) {
  const [selection, setSelection] = useState<SelectionState>({
    current: 0,
    outgoing: null,
    direction: "forward",
    animated: false,
  });
  const subscribeMotion = useCallback((onChange: () => void) => {
    const preference = matchMedia(motionQuery);
    function update() {
      if (preference.matches) {
        setSelection((current) => ({ ...current, outgoing: null, animated: false }));
      }
      onChange();
    }
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  const reduceMotion = useSyncExternalStore(subscribeMotion, getMotionPreference, getServerMotionPreference);
  const instance = useId();
  const tablist = useRef<HTMLDivElement>(null);

  function select(index: number) {
    setSelection((current) => index === current.current ? current : {
      current: index,
      outgoing: reduceMotion ? null : current.current,
      direction: index > current.current ? "forward" : "backward",
      animated: !reduceMotion,
    });
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let target: number;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        target = (index + 1) % items.length;
        break;
      case "ArrowUp":
      case "ArrowLeft":
        target = (index - 1 + items.length) % items.length;
        break;
      case "Home":
        target = 0;
        break;
      case "End":
        target = items.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    tablist.current
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      .item(target)
      .focus();
  }

  return (
    <LazyMotion features={domMax} strict>
      <div className="selection-specimen">
        <div className="selection-layout">
          <div className="selection-heading" data-action={action ? "true" : undefined}>
          <div
            ref={tablist}
            role="tablist"
            aria-label={label}
            aria-orientation={orientation}
            aria-describedby={`${instance}-hint`}
            className="selection-list"
          >
            {items.map((item, index) => {
              const active = selection.current === index;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={`${instance}-tab-${item.id}`}
                  aria-controls={`${instance}-panel-${item.id}`}
                  aria-selected={active}
                  tabIndex={active ? 0 : -1}
                  className="selection-tab"
                  onClick={() => select(index)}
                  onFocus={() => select(index)}
                  onKeyDown={(event) => handleKeyDown(event, index)}
                >
                  {active && (reduceMotion ? (
                    <span className="selection-background" aria-hidden="true" />
                  ) : (
                    <m.span
                      className="selection-background"
                      layoutId={`${instance}-selection`}
                      initial={false}
                      transition={selectionTransition}
                      aria-hidden="true"
                    />
                  ))}
                  <span className="selection-label">{item.label}</span>
                  <ArrowRight
                    className="icon selection-arrow"
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
          {action}
          </div>
          <div className="selection-panels" data-direction={selection.direction}>
            {items.map((item, index) => {
              const active = selection.current === index;
              const outgoing = selection.outgoing === index && !reduceMotion;
              return (
                <div
                  key={item.id}
                  id={`${instance}-panel-${item.id}`}
                  role="tabpanel"
                  aria-labelledby={`${instance}-tab-${item.id}`}
                  aria-hidden={active ? undefined : true}
                  tabIndex={active ? 0 : -1}
                  hidden={!active && !outgoing}
                  inert={!active}
                  className="selection-panel"
                  data-motion={outgoing ? "outgoing" : active && selection.animated && !reduceMotion ? "incoming" : undefined}
                  onAnimationEnd={(event) => {
                    if (event.target !== event.currentTarget || !outgoing) return;
                    setSelection((current) => current.outgoing === index ? { ...current, outgoing: null } : current);
                  }}
                >
                  {item.content}
                </div>
              );
            })}
          </div>
        </div>
        <p id={`${instance}-hint`} className="caption muted keyboard-hint">
          {keyboardHint}
        </p>
      </div>
    </LazyMotion>
  );
}
