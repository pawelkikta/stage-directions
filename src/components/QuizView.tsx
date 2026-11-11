import { useEffect, useMemo, useState } from "react";
import {
  QUIZ_BANK,
  BANK_BY_TOPIC,
  SCENARIO_COUNT,
  CODE_COUNT,
  CODE_QUESTIONS,
  sampleWeighted,
  getQuestionsByIds,
  type Question,
} from "../data/quiz.ts";
import { EXAM_WEIGHTS, type ExamTopic } from "../core/types.ts";
import { shuffle, withShuffledOptions } from "../core/shuffle.ts";
import { useProgress, type TopicStat } from "../state/useProgress.ts";
import { useAppStore } from "../state/useAppStore.ts";
import { Highlight } from "./Highlight.tsx";
import { Screws } from "./shell/Plate.tsx";
import { OPTION_BASE, OPTION_TONE, optionState } from "./chapter/options.ts";

type Phase = "menu" | "run" | "result";
type Mode = "practice" | "exam";

const EXAM_COUNT = 65;
const EXAM_SECONDS = 120 * 60;
/** Rough pass mark, only as orientation - NVIDIA does not publish one per topic. */
const PASS = 75;

const KIND_LABEL: Record<Question["kind"], string> = {
  recall: "fact",
  scenario: "scenario",
  code: "read the code",
};

/** Practice exam: a timed exam, short practice runs, and how you do per topic. */
export function QuizView() {
  const [phase, setPhase] = useState<Phase>("menu");
  const [mode, setMode] = useState<Mode>("practice");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(EXAM_SECONDS);

  const recordAnswer = useProgress((s) => s.recordAnswer);
  const markMissed = useProgress((s) => s.markMissed);
  const saveExam = useProgress((s) => s.saveExam);
  const missed = useProgress((s) => s.missed);

  const startList = (qs: Question[], m: Mode) => {
    setMode(m);
    // shuffle options once per run, so Back / Next and the result see the same order
    setQuestions(qs.map(withShuffledOptions));
    setAnswers(Array(qs.length).fill(null));
    setIdx(0);
    setSecondsLeft(EXAM_SECONDS);
    setPhase("run");
  };

  const start = (m: Mode, count: number) => startList(sampleWeighted(count), m);
  const startReview = () => {
    const qs = getQuestionsByIds(missed);
    if (qs.length > 0) startList(shuffle(qs).slice(0, 20), "practice");
  };
  const startCodeDrill = () => startList(shuffle(CODE_QUESTIONS).slice(0, 20), "practice");

  // exam timer
  useEffect(() => {
    if (phase !== "run" || mode !== "exam") return;
    if (secondsLeft <= 0) {
      finish();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, mode, secondsLeft]);

  const answer = (optIdx: number) => {
    setAnswers((a) => {
      const next = [...a];
      next[idx] = optIdx;
      return next;
    });
    if (mode === "practice") {
      const correct = optIdx === questions[idx].answer;
      recordAnswer(questions[idx].topic, correct);
      markMissed(questions[idx].id, correct);
    }
  };

  const finish = () => {
    if (mode === "exam") {
      const byTopic: Partial<Record<ExamTopic, TopicStat>> = {};
      let score = 0;
      questions.forEach((qq, i) => {
        const correct = answers[i] === qq.answer;
        if (correct) score++;
        const prev = byTopic[qq.topic] ?? { seen: 0, correct: 0 };
        byTopic[qq.topic] = { seen: prev.seen + 1, correct: prev.correct + (correct ? 1 : 0) };
        recordAnswer(qq.topic, correct);
        markMissed(qq.id, correct);
      });
      saveExam({ date: Date.now(), score, total: questions.length, byTopic });
    }
    setPhase("result");
  };

  if (phase === "menu")
    return <Menu onStart={start} missedCount={missed.length} onReview={startReview} onCodeDrill={startCodeDrill} />;
  if (phase === "result")
    return <Result questions={questions} answers={answers} mode={mode} onRestart={() => setPhase("menu")} />;

  // --- run ---
  const cur = questions[idx];
  const picked = answers[idx];
  const isLast = idx === questions.length - 1;
  const feedback = mode === "practice" && picked !== null;

  return (
    <div className="mx-auto max-w-[760px] px-4 pb-24 pt-8 sm:px-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="caps text-ink-faint">
          {mode === "exam" ? "Exam" : "Practice"} · question {idx + 1} / {questions.length}
        </span>
        {mode === "exam" ? (
          <span className={`font-mono text-[15px] ${secondsLeft < 300 ? "text-gold-soft" : "text-ink"}`}>
            {fmtTime(secondsLeft)}
          </span>
        ) : (
          <button onClick={() => setPhase("menu")} className="caps text-ink-faint hover:text-ink">
            Quit
          </button>
        )}
      </div>
      <div className="mb-6 h-[3px] w-full bg-border">
        <div className="h-full bg-copper transition-all" style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
      </div>

      <div className="plate bg-bg-panel px-5 pb-5 pt-6">
        <Screws />
        <p className="caps mb-3 text-gold-soft">
          {cur.topic} · {KIND_LABEL[cur.kind]}
        </p>
        {cur.code && (
          <pre className="mb-4 overflow-auto border border-border bg-code p-4 font-mono text-[13px] leading-relaxed text-ink">
            <Highlight code={cur.code} />
          </pre>
        )}
        <p className="mb-5 text-[18px] font-medium leading-snug text-ink">{cur.q}</p>

        <div className="flex flex-col gap-2">
          {cur.options.map((opt, i) => {
            const tone = feedback
              ? OPTION_TONE[optionState(i, picked, cur.answer)]
              : mode === "exam" && picked === i
                ? "border-copper bg-copper/10 text-ink"
                : OPTION_TONE.idle;
            return (
              <button key={i} disabled={feedback} onClick={() => answer(i)} className={`${OPTION_BASE} ${tone}`}>
                {opt}
              </button>
            );
          })}
        </div>

        {feedback && <Explanation q={cur} correct={picked === cur.answer} />}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="px-1 py-2 text-[14px] text-copper hover:text-ink disabled:opacity-30"
        >
          ← Back
        </button>
        {isLast ? (
          <button onClick={finish} className="bg-copper px-5 py-2.5 text-[14px] font-semibold text-bg hover:opacity-90">
            {mode === "exam" ? "Finish the exam" : "See the result"}
          </button>
        ) : (
          <button
            onClick={() => setIdx((i) => i + 1)}
            disabled={mode === "practice" && picked === null}
            className="bg-copper px-5 py-2.5 text-[14px] font-semibold text-bg hover:opacity-90 disabled:opacity-30"
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}

function Menu({
  onStart,
  missedCount,
  onReview,
  onCodeDrill,
}: {
  onStart: (m: Mode, count: number) => void;
  missedCount: number;
  onReview: () => void;
  onCodeDrill: () => void;
}) {
  return (
    <div className="mx-auto max-w-[920px] px-4 pb-24 pt-10 sm:px-6">
      <p className="caps text-gold-soft">Practice exam</p>
      <h1 className="mt-2 text-[32px] font-bold leading-tight text-ink sm:text-[38px]">Test yourself like on exam day</h1>
      <p className="mt-3 max-w-[64ch] text-[16px] leading-relaxed text-ink-muted">
        Questions come from the whole pool of {QUIZ_BANK.length} ({SCENARIO_COUNT} scenarios, {CODE_COUNT} code
        reading), weighted like the exam blueprint. Every run is a new set. They are written for practice, not taken from
        the real exam.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-[1.3fr_1fr]">
        <section className="plate bg-bg-panel px-6 pb-6 pt-7">
          <Screws />
          <p className="caps text-ink-faint">Exam mode</p>
          <p className="mt-2 font-mono text-[15px] text-ink">
            {EXAM_COUNT} questions · {EXAM_SECONDS / 60} min · no hints
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
            You see the result per exam topic only at the end, like on the real exam.
          </p>
          <button
            onClick={() => onStart("exam", EXAM_COUNT)}
            className="mt-5 bg-copper px-5 py-3 text-[15px] font-semibold text-bg hover:opacity-90"
          >
            Start the exam
          </button>
        </section>

        <section className="border border-border bg-bg-panel px-6 pb-6 pt-6">
          <p className="caps text-ink-faint">Practice with feedback</p>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
            An explanation after every answer. Mixed topics, weighted like the exam.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[10, 15, 20].map((n) => (
              <button
                key={n}
                onClick={() => onStart("practice", n)}
                className="border border-copper px-3 py-1.5 text-[14px] text-copper hover:bg-copper hover:text-bg"
              >
                {n} questions
              </button>
            ))}
            <button
              onClick={onCodeDrill}
              className="border border-copper px-3 py-1.5 text-[14px] text-copper hover:bg-copper hover:text-bg"
            >
              Code reading · {Math.min(CODE_COUNT, 20)}
            </button>
          </div>
          {missedCount > 0 && (
            <button
              onClick={onReview}
              className="mt-4 block w-full border-l-[3px] border-gold bg-gold/5 px-4 py-3 text-left hover:bg-gold/10"
            >
              <span className="block text-[15px] font-semibold text-gold-soft">
                Review your mistakes · {Math.min(missedCount, 20)}
              </span>
              <span className="block text-[13px] text-ink-muted">
                {missedCount} {missedCount === 1 ? "question" : "questions"} answered wrong. A right answer removes it.
              </span>
            </button>
          )}
        </section>
      </div>

      <TopicStats />
    </div>
  );
}

/** How you do per exam topic (all practice and exams), plus the last exam. */
function TopicStats() {
  const topicStats = useProgress((s) => s.topicStats);
  const lastExam = useProgress((s) => s.lastExam);
  const reset = useProgress((s) => s.reset);

  return (
    <section className="mt-14">
      <div className="flex items-baseline justify-between border-b border-rule pb-2">
        <h2 className="caps text-ink">Your topics</h2>
        <button
          onClick={() => {
            if (confirm("Reset all progress? Lessons, situations, drills and exam results will be cleared.")) reset();
          }}
          className="caps text-ink-faint hover:text-gold-soft"
        >
          Reset progress
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-2.5">
        {(Object.keys(EXAM_WEIGHTS) as ExamTopic[]).map((t) => {
          const s = topicStats[t];
          const p = s && s.seen > 0 ? Math.round((s.correct / s.seen) * 100) : null;
          return (
            <div key={t} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[220px_1fr_110px]">
              <span className="text-[14px] text-ink">
                {t} <span className="font-mono text-[12px] text-ink-faint">{EXAM_WEIGHTS[t]}%</span>
              </span>
              <span className="col-span-2 row-start-2 h-[8px] bg-bg-elev sm:col-span-1 sm:row-start-auto">
                {p !== null && (
                  <span
                    className={`block h-full ${p >= PASS ? "bg-copper" : "bg-amber-500"}`}
                    style={{ width: `${p}%` }}
                  />
                )}
              </span>
              <span className="text-right font-mono text-[12px] text-ink-faint">
                {p === null ? "no answers yet" : `${p}% · ${s!.correct}/${s!.seen}`}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-4 max-w-[70ch] text-[13px] leading-relaxed text-ink-faint">
        Amber = below {PASS}%: your weak spots. This measures you on this pool of{" "}
        {Object.values(BANK_BY_TOPIC).reduce((a, b) => a + b, 0)} questions only. It is a good pointer, not a promise
        that you will pass.
        {lastExam &&
          ` Last exam: ${Math.round((lastExam.score / lastExam.total) * 100)}% (${lastExam.score}/${lastExam.total}), ${new Date(lastExam.date).toLocaleDateString("en-GB")}.`}
      </p>
    </section>
  );
}

function Explanation({ q, correct }: { q: Question; correct: boolean }) {
  const goChapter = useAppStore((s) => s.goChapter);
  return (
    <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
      <span className={`font-semibold ${correct ? "text-emerald-300" : "text-red-300"}`}>
        {correct ? "Right. " : "Not quite. "}
      </span>
      {q.explanation}
      {q.layerIndex !== undefined && (
        <button
          onClick={() => goChapter(q.layerIndex!)}
          className="ml-2 text-copper underline underline-offset-4 hover:text-ink"
        >
          Chapter {q.layerIndex} →
        </button>
      )}
    </p>
  );
}

function Result({
  questions,
  answers,
  mode,
  onRestart,
}: {
  questions: Question[];
  answers: (number | null)[];
  mode: Mode;
  onRestart: () => void;
}) {
  const goChapter = useAppStore((s) => s.goChapter);
  const score = questions.reduce((acc, qq, i) => acc + (answers[i] === qq.answer ? 1 : 0), 0);
  const pct = Math.round((score / questions.length) * 100);

  const byTopic = useMemo(() => {
    const m: Partial<Record<ExamTopic, TopicStat>> = {};
    questions.forEach((qq, i) => {
      const prev = m[qq.topic] ?? { seen: 0, correct: 0 };
      m[qq.topic] = { seen: prev.seen + 1, correct: prev.correct + (answers[i] === qq.answer ? 1 : 0) };
    });
    return m;
  }, [questions, answers]);

  const wrong = questions.filter((qq, i) => answers[i] !== qq.answer);

  return (
    <div className="mx-auto max-w-[760px] px-4 pb-24 pt-10 sm:px-6">
      <p className="caps text-ink-faint">{mode === "exam" ? "Exam result" : "Practice result"}</p>
      <p className="mt-2 font-mono text-[56px] leading-none text-gold-soft">
        {pct}%
      </p>
      <p className="mt-2 text-[16px] text-ink-muted">
        {score} of {questions.length} right
        {mode === "exam" && (pct >= PASS ? ` · above the rough ${PASS}% mark` : ` · below the rough ${PASS}% mark`)}
      </p>

      <h2 className="caps mt-10 border-b border-rule pb-2 text-ink">Per topic</h2>
      <div className="mt-4 flex flex-col gap-2.5">
        {(Object.keys(byTopic) as ExamTopic[]).map((t) => {
          const s = byTopic[t]!;
          const p = Math.round((s.correct / s.seen) * 100);
          return (
            <div key={t} className="grid grid-cols-[150px_1fr_60px] items-center gap-3 sm:grid-cols-[220px_1fr_70px]">
              <span className="text-[14px] text-ink">{t}</span>
              <span className="h-[8px] bg-bg-elev">
                <span className={`block h-full ${p >= PASS ? "bg-copper" : "bg-amber-500"}`} style={{ width: `${p}%` }} />
              </span>
              <span className="text-right font-mono text-[12px] text-ink-faint">
                {s.correct}/{s.seen}
              </span>
            </div>
          );
        })}
      </div>

      {wrong.length > 0 && (
        <>
          <h2 className="caps mt-10 border-b border-rule pb-2 text-ink">To review · {wrong.length}</h2>
          <div className="mt-4 flex flex-col gap-3">
            {wrong.map((qq) => (
              <div key={qq.id} className="border border-border bg-bg-panel p-4">
                {qq.code && (
                  <pre className="mb-3 overflow-auto border border-border bg-code p-3 font-mono text-[12px] leading-relaxed text-ink">
                    <Highlight code={qq.code} />
                  </pre>
                )}
                <p className="text-[15px] font-medium text-ink">{qq.q}</p>
                <p className="mt-1.5 text-[14px] text-emerald-300">Right answer: {qq.options[qq.answer]}</p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-ink-muted">
                  {qq.explanation}
                  {qq.layerIndex !== undefined && (
                    <button
                      onClick={() => goChapter(qq.layerIndex!)}
                      className="ml-2 text-copper underline underline-offset-4 hover:text-ink"
                    >
                      Chapter {qq.layerIndex} →
                    </button>
                  )}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      <button onClick={onRestart} className="mt-8 bg-copper px-5 py-3 text-[15px] font-semibold text-bg hover:opacity-90">
        Back to the practice exam
      </button>
    </div>
  );
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
