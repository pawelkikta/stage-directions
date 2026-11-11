import { useMemo, useState } from "react";
import { GLOSSARY, searchGlossary } from "../data/glossary.ts";
import { EXAM_WEIGHTS, type ExamTopic } from "../core/types.ts";
import { useAppStore } from "../state/useAppStore.ts";

export function GlossaryView() {
  const [q, setQ] = useState("");
  const setView = useAppStore((s) => s.setView);
  const setFocusConcept = useAppStore((s) => s.setFocusConcept);
  const results = useMemo(() => searchGlossary(q), [q]);

  return (
    <div className="mx-auto max-w-[920px] px-4 pb-24 pt-10 sm:px-6">
      <header className="mb-6">
        <p className="caps text-gold-soft">Reference</p>
        <h1 className="mt-2 text-[32px] font-bold leading-tight text-ink sm:text-[38px]">Glossary</h1>
        <p className="mt-3 text-[16px] text-ink-muted">
          {GLOSSARY.length} terms, named the way the exam names them. Press <kbd className="border border-border px-1 font-mono text-[12px]">G</kbd> on any page to open them next to the text.
        </p>
      </header>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search: stage, payload, LIVERPS, primvar…"
        className="mb-5 w-full rounded-lg border border-border bg-bg-elev px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-copper/50 focus:outline-none"
      />

      {results.length === 0 ? (
        <p className="text-sm text-ink-faint">Nothing found for “{q}”.</p>
      ) : (
        <dl className="flex flex-col gap-3">
          {results.map((e) => (
            <div
              key={e.term}
              className="rounded-lg border border-border bg-bg-panel p-4"
            >
              <div className="flex flex-wrap items-baseline gap-2">
                <dt className="font-mono text-[15px] font-semibold text-gold-soft">
                  {e.term}
                </dt>
                <span className="text-xs text-ink-faint">- {e.gloss}</span>
                {e.examTopic && <TopicTag topic={e.examTopic} />}
              </div>
              <dd className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                {e.definition}
              </dd>
              {e.conceptId && (
                <button
                  onClick={() => {
                    setFocusConcept(e.conceptId!);
                    setView("concept-map");
                  }}
                  className="mt-2 text-xs text-copper-bright hover:text-gold-soft"
                >
                  → show on the concept map
                </button>
              )}
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function TopicTag({ topic }: { topic: ExamTopic }) {
  return (
    <span className="rounded bg-bg-elev px-1.5 py-0.5 text-[10px] text-ink-muted">
      {topic} · {EXAM_WEIGHTS[topic]}%
    </span>
  );
}
