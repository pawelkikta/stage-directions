import { useState } from "react";
import type { Question } from "../../data/quiz.ts";
import { shuffle, withShuffledOptions } from "../../core/shuffle.ts";
import { useProgress } from "../../state/useProgress.ts";
import { Highlight } from "../Highlight.tsx";
import { OPTION_BASE, OPTION_TONE, optionState } from "./options.ts";

const DRILL_SIZE = 10;

function pick(pool: Question[], n: number): Question[] {
  return shuffle(pool)
    .slice(0, n)
    .map((q) => withShuffledOptions(q));
}

const KIND_LABEL: Record<Question["kind"], string> = {
  recall: "fact",
  scenario: "scenario",
  code: "read the code",
};

/**
 * A short practice run on this chapter's questions only:
 * one question at a time, feedback after every answer.
 */
export function ChapterDrill({ chapter, pool }: { chapter: number; pool: Question[] }) {
  const [run, setRun] = useState<Question[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const best = useProgress((s) => s.chapterDrill[chapter]);
  const recordAnswer = useProgress((s) => s.recordAnswer);
  const markMissed = useProgress((s) => s.markMissed);
  const saveDrill = useProgress((s) => s.saveDrill);
  const size = Math.min(DRILL_SIZE, pool.length);

  const start = () => {
    setRun(pick(pool, size));
    setIdx(0);
    setPicked(null);
    setScore(0);
  };

  if (pool.length === 0) {
    return <p className="text-[15px] text-ink-faint">No practice questions in this chapter yet.</p>;
  }

  if (!run) {
    return (
      <div className="plate flex flex-wrap items-center justify-between gap-4 bg-bg-panel px-5 py-5">
        <div>
          <p className="text-[16px] font-semibold text-ink">
            {size} random questions from this chapter's {pool.length}
          </p>
          <p className="mt-1 text-[14px] text-ink-faint">
            {best ? `Your best run: ${best.correct} of ${best.total}.` : "One question at a time, with an explanation after each answer."}
          </p>
        </div>
        <button onClick={start} className="bg-copper px-5 py-2.5 text-[14px] font-semibold text-bg hover:opacity-90">
          {best ? "Run again" : "Start the drill"}
        </button>
      </div>
    );
  }

  if (idx >= run.length) {
    return (
      <div className="plate bg-bg-panel px-5 py-6 text-center">
        <p className="caps text-ink-faint">Result</p>
        <p className="mt-2 font-mono text-[40px] leading-none text-gold-soft">
          {score}
          <span className="text-[20px] text-ink-faint"> / {run.length}</span>
        </p>
        <p className="mt-3 text-[15px] text-ink-muted">
          {score === run.length
            ? "Clean run. Move on to the next step."
            : "Wrong answers go to the review pool of the practice exam."}
        </p>
        <button onClick={start} className="mt-4 border border-copper px-4 py-2 text-[14px] text-copper hover:bg-copper hover:text-bg">
          New set of {size}
        </button>
      </div>
    );
  }

  const q = run[idx];
  const answer = (i: number) => {
    if (picked !== null) return;
    const ok = i === q.answer;
    setPicked(i);
    if (ok) setScore((s) => s + 1);
    recordAnswer(q.topic, ok);
    markMissed(q.id, ok);
  };
  const next = () => {
    const last = idx === run.length - 1;
    if (last) saveDrill(chapter, score, run.length);
    setIdx((n) => n + 1);
    setPicked(null);
  };

  return (
    <div className="plate bg-bg-panel px-5 py-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="caps text-ink-faint">
          Question {idx + 1} / {run.length} · {KIND_LABEL[q.kind]}
        </span>
        <span className="font-mono text-[13px] text-ink-faint">
          {score} correct
        </span>
      </div>
      <div className="mb-5 flex h-[3px] gap-[3px]">
        {run.map((_, i) => (
          <span key={i} className={`flex-1 ${i < idx ? "bg-copper" : i === idx ? "bg-gold" : "bg-border"}`} />
        ))}
      </div>

      {q.code && (
        <pre className="mb-4 overflow-auto border border-border bg-code p-4 font-mono text-[13px] leading-relaxed text-ink">
          <Highlight code={q.code} />
        </pre>
      )}
      <p className="mb-4 text-[17px] font-medium leading-snug text-ink">{q.q}</p>

      <div className="flex flex-col gap-2">
        {q.options.map((opt, i) => (
          <button
            key={i}
            disabled={picked !== null}
            onClick={() => answer(i)}
            className={`${OPTION_BASE} ${OPTION_TONE[optionState(i, picked, q.answer)]}`}
          >
            {opt}
          </button>
        ))}
      </div>

      {picked !== null && (
        <>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
            <span className={`font-semibold ${picked === q.answer ? "text-emerald-300" : "text-red-300"}`}>
              {picked === q.answer ? "Right. " : "Not quite. "}
            </span>
            {q.explanation}
          </p>
          <div className="mt-5 flex justify-end">
            <button onClick={next} className="bg-copper px-5 py-2 text-[14px] font-semibold text-bg hover:opacity-90">
              {idx === run.length - 1 ? "See the result" : "Next question"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
