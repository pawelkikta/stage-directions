import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { GlossaryEntry } from "../core/types.ts";
import { useAppStore } from "../state/useAppStore.ts";

const WIDTH = 320;
const GAP = 6;

/**
 * A glossary term in lesson text: a dotted underline; on hover
 * (or a tap on touch) a tooltip with the definition and a jump to the slide-out glossary.
 * The tooltip goes through a portal, so that callout/figure frames do not clip it.
 */
export function Term({ entry, children }: { entry: GlossaryEntry; children: ReactNode }) {
  const openGlossary = useAppStore((s) => s.openGlossary);
  const trigger = useRef<HTMLSpanElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number }>({ left: 0 });

  const later = (fn: () => void, ms: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(fn, ms);
  };
  const close = () => {
    window.clearTimeout(timer.current);
    setOpen(false);
    setPinned(false);
  };

  useLayoutEffect(() => {
    if (!open || !trigger.current) return;
    const r = trigger.current.getBoundingClientRect();
    const w = Math.min(WIDTH, window.innerWidth - 16);
    const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
    const h = bubble.current?.offsetHeight ?? 160;
    setPos(
      r.bottom + GAP + h > window.innerHeight - 8
        ? { left, bottom: window.innerHeight - r.top + GAP }
        : { left, top: r.bottom + GAP },
    );
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!trigger.current?.contains(t) && !bubble.current?.contains(t)) close();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const hoverIn = (e: React.PointerEvent) => e.pointerType === "mouse" && later(() => setOpen(true), 150);
  const hoverOut = (e: React.PointerEvent) =>
    e.pointerType === "mouse" && !pinned && later(() => setOpen(false), 180);

  return (
    <>
      <span
        ref={trigger}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onPointerEnter={hoverIn}
        onPointerLeave={hoverOut}
        onClick={() => {
          window.clearTimeout(timer.current);
          if (pinned) close();
          else {
            setOpen(true);
            setPinned(true);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
            setPinned(true);
          }
        }}
        className="cursor-help underline decoration-ink-faint/35 decoration-dotted underline-offset-4 hover:decoration-copper-bright focus-visible:outline focus-visible:outline-1 focus-visible:outline-copper"
      >
        {children}
      </span>
      {open &&
        createPortal(
          <div
            ref={bubble}
            role="tooltip"
            onPointerEnter={() => window.clearTimeout(timer.current)}
            onPointerLeave={(e) => e.pointerType === "mouse" && !pinned && later(() => setOpen(false), 180)}
            style={{ ...pos, width: Math.min(WIDTH, window.innerWidth - 16) }}
            className="fixed z-50 rounded-lg border border-border bg-bg-panel p-3 shadow-xl shadow-black/40"
          >
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-mono text-sm font-semibold text-gold-soft">{entry.term}</span>
              <span className="text-xs text-ink-faint">{entry.gloss}</span>
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">{entry.definition}</p>
            <button
              onClick={() => {
                close();
                openGlossary(entry.term);
              }}
              className="mt-2 text-xs text-copper-bright hover:text-gold-soft"
            >
              Open in the glossary →
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
