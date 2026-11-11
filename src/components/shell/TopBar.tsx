import { useEffect, useRef } from "react";
import { CHAPTERS } from "../../data/chapters.ts";
import { APP_NAME, APP_TAGLINE } from "../../core/brand.ts";
import { useAppStore, type Theme } from "../../state/useAppStore.ts";

/**
 * The only navigation: brand, two tools on the right,
 * and the numbered chapter bar (0-7 + F for the final project).
 */
export function TopBar() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const goChapter = useAppStore((s) => s.goChapter);
  const toggleGlossary = useAppStore((s) => s.toggleGlossary);
  const active = view.startsWith("layer:") ? Number(view.split(":")[1]) : view === "factory" ? "F" : null;

  return (
    <header className="shrink-0 border-b border-rule bg-bg">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pt-3 sm:px-6">
        <button onClick={() => setView("home")} className="text-left" aria-label={`${APP_NAME} – start`}>
          <span className="block text-[13px] font-bold uppercase tracking-[0.32em] text-ink sm:text-[14px]">
            {APP_NAME}
          </span>
          <span className="mt-0.5 hidden text-[12px] text-copper sm:block">{APP_TAGLINE}</span>
        </button>
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setView("quiz")}
            aria-current={view === "quiz" ? "page" : undefined}
            className={`px-2 py-1 text-[13px] hover:text-ink ${view === "quiz" ? "text-ink underline decoration-gold decoration-2 underline-offset-[6px]" : "text-copper"}`}
          >
            <span className="sm:hidden">Exam</span>
            <span className="hidden sm:inline">Practice exam</span>
          </button>
          <button onClick={toggleGlossary} className="flex items-center gap-1.5 px-2 py-1 text-[13px] text-copper hover:text-ink">
            Glossary
            <kbd className="hidden border border-border px-1 font-mono text-[10px] text-ink-faint sm:inline">G</kbd>
          </button>
          <ThemeSwitch />
        </div>
      </div>

      <nav aria-label="Chapters" className="mx-auto max-w-6xl overflow-x-auto px-2 sm:px-4">
        <ol className="flex min-w-max items-end gap-0.5 pt-2">
          {CHAPTERS.map((c) => (
            <li key={c.index}>
              <ChapterTab n={String(c.index)} label={c.short} active={active === c.index} onClick={() => goChapter(c.index)} />
            </li>
          ))}
          <li className="ml-1 border-l border-border pl-1">
            <ChapterTab n="F" label="Drone Factory" active={active === "F"} onClick={() => setView("factory")} />
          </li>
        </ol>
      </nav>
    </header>
  );
}

function ChapterTab({ n, label, active, onClick }: { n: string; label: string; active: boolean; onClick: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  // on a phone the bar scrolls sideways - keep the open chapter in view
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [active]);
  return (
    <button
      ref={ref}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`group flex items-baseline gap-1.5 border-b-[3px] px-2.5 pb-2 pt-1 transition-colors ${
        active ? "border-gold" : "border-transparent hover:border-border"
      }`}
    >
      <span className={`text-[22px] font-light leading-none ${active ? "text-gold-soft" : "text-copper"}`}>{n}</span>
      <span className={`text-[13px] ${active ? "font-semibold text-ink" : "text-copper group-hover:text-ink"}`}>{label}</span>
    </button>
  );
}

const THEMES: { id: Theme; label: string }[] = [
  { id: "paper", label: "Paper" },
  { id: "blueprint", label: "Blueprint" },
];

function ThemeSwitch() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  return (
    <div role="group" aria-label="Theme" className="ml-1 flex border border-rule">
      {THEMES.map((t) => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          aria-pressed={theme === t.id}
          title={`Theme: ${t.label}`}
          className={`px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] transition-colors ${
            theme === t.id ? "bg-copper text-bg" : "text-copper hover:text-ink"
          }`}
        >
          <span className="sm:hidden">{t.label[0]}</span>
          <span className="hidden sm:inline">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
