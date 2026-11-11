import { useMemo } from "react";
import { CHAPTERS, STEPS, type Chapter } from "../data/chapters.ts";
import { chapterContent } from "../data/chapterContent.ts";
import { loadLast, useAppStore, type View } from "../state/useAppStore.ts";
import { useStepStatus } from "./chapter/useStepStatus.ts";
import { Screws } from "./shell/Plate.tsx";
import { ArrowRight, StepIcon } from "./shell/icons.tsx";

const MAX_WEIGHT = 23;

const LOOP_TEXT: Record<string, string> = {
  learn: "Read a short lesson. Every idea comes with an apparatus you can click and change.",
  predict: "Look at a few small .usda files and guess what USD prints. Then see the real output.",
  check: "Answer exam-style questions from this chapter. Every answer explains why.",
  run: "Optional. Paste the scripts into your own Python with OpenUSD and watch it happen.",
};

/** Start: what this is, the four-step loop, and the path through the chapters. */
export function HomeView() {
  const goChapter = useAppStore((s) => s.goChapter);
  const setView = useAppStore((s) => s.setView);
  const last = useMemo(() => loadLast(), []);
  const lastChapter = last ? CHAPTERS.find((c) => c.index === last.chapter) : undefined;
  const lastStep = last ? STEPS.find((s) => s.id === last.step) : undefined;

  return (
    <div className="mx-auto max-w-[1000px] px-4 pb-24 pt-10 sm:px-6">
      {/* --- what this is --- */}
      <section className="grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:items-end">
        <div>
          <p className="caps text-gold-soft">A lab manual for OpenUSD</p>
          <h1 className="mt-3 text-[38px] font-bold leading-[1.05] tracking-tight text-ink sm:text-[50px]">
            Learn how USD builds a stage. One chapter at a time.
          </h1>
          <p className="mt-5 max-w-[56ch] text-[17px] leading-relaxed text-ink-muted">
            Eight chapters follow the blueprint of the NVIDIA NCP-OUSD exam. Every chapter has the same four steps, so
            you always know what comes next.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            {lastChapter && lastStep ? (
              <button
                onClick={() => goChapter(lastChapter.index, lastStep.id)}
                className="flex items-center gap-3 bg-copper px-5 py-3 text-left text-bg hover:opacity-90"
              >
                <span>
                  <span className="caps block text-[10px] opacity-75">Continue</span>
                  <span className="block text-[15px] font-semibold">
                    {lastChapter.index} {lastChapter.short} · {lastStep.label}
                  </span>
                </span>
                <ArrowRight />
              </button>
            ) : (
              <button
                onClick={() => goChapter(0)}
                className="flex items-center gap-3 bg-copper px-5 py-3 text-[15px] font-semibold text-bg hover:opacity-90"
              >
                Start with chapter 0 <ArrowRight />
              </button>
            )}
            <button
              onClick={() => setView("quiz")}
              className="border border-copper px-5 py-3 text-[15px] text-copper hover:bg-copper hover:text-bg"
            >
              Practice exam
            </button>
          </div>
        </div>

        {/* --- the loop --- */}
        <div className="plate bg-bg-panel px-5 pb-5 pt-6">
          <Screws />
          <p className="caps text-ink-faint">Every chapter, four steps</p>
          <ol className="mt-4 flex flex-col gap-4">
            {STEPS.map((s) => (
              <li key={s.id} className="flex gap-3">
                <span className="mt-0.5 text-copper">
                  <StepIcon step={s.id} />
                </span>
                <span>
                  <span className="caps text-[12px] font-semibold text-ink">
                    {s.n} · {s.label}
                  </span>
                  <span className="mt-0.5 block text-[14px] leading-snug text-ink-muted">{LOOP_TEXT[s.id]}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* --- the path --- */}
      <section className="mt-16">
        <div className="flex items-baseline justify-between border-b border-rule pb-2">
          <h2 className="caps text-ink">The path</h2>
          <span className="caps hidden text-ink-faint sm:inline">share of the exam</span>
        </div>
        <ol>
          {CHAPTERS.map((c) => (
            <li key={c.index}>
              <ChapterRow chapter={c} onOpen={() => goChapter(c.index)} />
            </li>
          ))}
          <li>
            <button
              onClick={() => setView("factory")}
              className="group grid w-full grid-cols-[48px_1fr] items-start gap-x-4 border-b border-border py-5 text-left hover:bg-bg-elev sm:grid-cols-[64px_1fr_200px]"
            >
              <span className="pl-1 text-[40px] font-light leading-none text-gold-soft">F</span>
              <span>
                <span className="block text-[18px] font-semibold text-ink group-hover:underline group-hover:underline-offset-4">
                  Drone Factory · final project
                </span>
                <span className="mt-1 block max-w-[60ch] text-[15px] leading-relaxed text-ink-muted">
                  Build the digital twin of a small factory from USD, one step at a time. It uses everything from the
                  chapters before.
                </span>
              </span>
              <span className="caps hidden self-center text-ink-faint sm:block">uses all of it</span>
            </button>
          </li>
        </ol>
      </section>

      {/* --- off the path --- */}
      <section className="mt-16">
        <h2 className="caps border-b border-rule pb-2 text-ink">Off the path</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tool title="Practice exam" text="65 questions, 120 minutes, scored per exam topic." view="quiz" />
          <Tool title="Glossary" text="Every term with a short definition. Press G anywhere." view="glossary" />
          <Tool title="Concept map" text="How the ideas connect, one concept at a time." view="concept-map" />
          <Tool title="Set up USD" text="Python + OpenUSD for the Run steps. No GPU needed." view="lab" />
        </div>
        <p className="mt-8 text-[13px] text-ink-faint">
          Not affiliated with NVIDIA, Pixar or the Alliance for OpenUSD.{" "}
          <button onClick={() => setView("about")} className="underline underline-offset-4 hover:text-ink">
            About and license
          </button>
        </p>
      </section>
    </div>
  );
}

function ChapterRow({ chapter: c, onOpen }: { chapter: Chapter; onOpen: () => void }) {
  const content = useMemo(() => chapterContent(c.index), [c.index]);
  const status = useStepStatus(c.index, content);
  const weight = Math.max(0, ...c.topics.map((t) => t.weight));

  return (
    <button
      onClick={onOpen}
      className="group grid w-full grid-cols-[48px_1fr] items-start gap-x-4 border-b border-border py-5 text-left hover:bg-bg-elev sm:grid-cols-[64px_1fr_200px]"
    >
      <span className="pl-1 text-[40px] font-light leading-none text-copper">{c.index}</span>
      <span>
        <span className="block text-[18px] font-semibold text-ink group-hover:underline group-hover:underline-offset-4">
          {c.title}
        </span>
        <span className="mt-1 block max-w-[60ch] text-[15px] leading-relaxed text-ink-muted">{c.summary}</span>
        <span className="mt-3 flex items-center gap-1.5" aria-label="Progress in the four steps">
          {STEPS.map((s) => {
            const st = status[s.id];
            return (
              <span
                key={s.id}
                title={`${s.label}: ${st.text}`}
                className={`h-2.5 w-6 border ${
                  st.empty ? "border-dashed border-border" : st.done ? "border-copper bg-copper" : "border-copper"
                }`}
              />
            );
          })}
        </span>
      </span>
      <span className="col-start-2 mt-3 sm:col-start-3 sm:mt-1">
        {weight > 0 ? (
          <>
            <span className="block h-[6px] w-full max-w-[200px] bg-bg-elev">
              <span className="block h-full bg-gold" style={{ width: `${(weight / MAX_WEIGHT) * 100}%` }} />
            </span>
            <span className="mt-1.5 block font-mono text-[12px] leading-snug text-ink-faint">
              {c.topics.map((t) => `${t.topic} ${t.weight}%`).join(" · ")}
            </span>
          </>
        ) : (
          <span className="block font-mono text-[12px] text-ink-faint">foundation</span>
        )}
      </span>
    </button>
  );
}

function Tool({ title, text, view }: { title: string; text: string; view: View }) {
  const setView = useAppStore((s) => s.setView);
  return (
    <button onClick={() => setView(view)} className="border border-border bg-bg-panel p-4 text-left hover:border-copper">
      <span className="block text-[15px] font-semibold text-copper">{title}</span>
      <span className="mt-1 block text-[14px] leading-snug text-ink-muted">{text}</span>
    </button>
  );
}
