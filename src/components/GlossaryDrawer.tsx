import { useEffect, useMemo, useRef, useState } from "react";
import { searchGlossary } from "../data/glossary.ts";
import { useAppStore } from "../state/useAppStore.ts";

const QUERY_KEY = "usd-atlas:glossary-drawer-query";

function loadQuery(): string {
  try {
    return localStorage.getItem(QUERY_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveQuery(q: string) {
  try {
    localStorage.setItem(QUERY_KEY, q);
  } catch {
    /* private window / blocked storage - search still works */
  }
}

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

/** Button + G shortcut + a slide-out glossary that does not cover the lesson. */
export function GlossaryDrawer() {
  const open = useAppStore((s) => s.glossaryOpen);
  const focus = useAppStore((s) => s.glossaryFocus);
  const view = useAppStore((s) => s.view);
  const toggle = useAppStore((s) => s.toggleGlossary);
  const close = useAppStore((s) => s.closeGlossary);
  const setView = useAppStore((s) => s.setView);
  const setFocusConcept = useAppStore((s) => s.setFocusConcept);

  const [q, setQ] = useState(loadQuery);
  const [expanded, setExpanded] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const results = useMemo(() => searchGlossary(q), [q]);

  // G shortcut (outside text fields) and Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Escape" && open) close();
      else if ((e.key === "g" || e.key === "G") && !isTyping(e.target)) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, toggle, close]);

  // jump from a tooltip in the lesson: show this entry expanded
  useEffect(() => {
    if (!open) return;
    if (focus) {
      setQ(focus);
      saveQuery(focus);
      setExpanded(focus);
    } else {
      input.current?.focus();
    }
  }, [open, focus]);

  useEffect(() => {
    if (!expanded) return;
    list.current
      ?.querySelector(`[data-term="${CSS.escape(expanded)}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [expanded, results]);

  if (view === "glossary") return null;

  return (
    <>
      {/* opened from "Glossary" in the top bar or with G */}
      <aside
        aria-label="Glossary"
        aria-hidden={!open}
        className={`fixed right-0 top-0 z-40 flex h-full w-full flex-col border-l border-border bg-bg-panel transition-transform duration-200 sm:w-[400px] ${
          open ? "translate-x-0 shadow-2xl shadow-black/30" : "pointer-events-none translate-x-full"
        }`}
      >
        <header className="flex items-center gap-2 border-b border-border px-4 py-3">
          <h2 className="flex-1 text-sm font-bold text-ink">Glossary</h2>
          <button
            onClick={() => {
              close();
              setView("glossary");
            }}
            className="text-[11px] text-ink-faint hover:text-ink"
          >
            full page
          </button>
          <button onClick={close} aria-label="Close the glossary" className="px-1 text-lg text-ink-muted hover:text-ink">
            ×
          </button>
        </header>

        <div className="border-b border-border px-4 py-3">
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              saveQuery(e.target.value);
              setExpanded(null);
            }}
            placeholder="Search: payload, LIVERPS, primvar…"
            className="w-full rounded-md border border-border bg-bg-elev px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-copper/50 focus:outline-none"
          />
          <p className="mt-1.5 text-[11px] text-ink-faint">
            {results.length} terms · <kbd className="font-mono">G</kbd> opens and closes ·{" "}
            <kbd className="font-mono">Esc</kbd> closes
          </p>
        </div>

        <div ref={list} className="flex-1 overflow-y-auto px-2 py-2">
          {results.length === 0 && (
            <p className="px-2 py-4 text-sm text-ink-faint">Nothing found for “{q}”.</p>
          )}
          {results.map((e) => {
            const isOpen = expanded === e.term;
            return (
              <div
                key={e.term}
                data-term={e.term}
                className={`rounded-md px-2 py-1.5 ${isOpen ? "bg-bg-elev" : "hover:bg-bg-elev/60"}`}
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : e.term)}
                  aria-expanded={isOpen}
                  className="flex w-full items-baseline gap-2 text-left"
                >
                  <span className="font-mono text-[13px] font-semibold text-gold-soft">{e.term}</span>
                  <span className="truncate text-[11px] text-ink-faint">{e.gloss}</span>
                </button>
                {isOpen && (
                  <>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{e.definition}</p>
                    {e.conceptId && (
                      <button
                        onClick={() => {
                          setFocusConcept(e.conceptId!);
                          close();
                          setView("concept-map");
                        }}
                        className="mt-1 text-[11px] text-copper-bright hover:text-gold-soft"
                      >
                        → show on the concept map
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}
