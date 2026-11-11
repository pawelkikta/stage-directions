import { useMemo, type ReactNode } from "react";
import { CHAPTERS, STEPS } from "../../data/chapters.ts";
import { chapterContent, type ChapterContent } from "../../data/chapterContent.ts";
import { useAppStore } from "../../state/useAppStore.ts";
import { useProgress } from "../../state/useProgress.ts";
import { LessonBlocks, SelfCheckList } from "../Lesson.tsx";
import { SituationCard } from "../SandboxView.tsx";
import { StepCard } from "../LabView.tsx";
import { Screws } from "../shell/Plate.tsx";
import { ArrowLeft, ArrowRight, StepIcon } from "../shell/icons.tsx";
import { ChapterDrill } from "./ChapterDrill.tsx";
import { useStepStatus } from "./useStepStatus.ts";

/** One chapter: a title plate, four step buttons, the step, and "next". */
export function ChapterView({ index }: { index: number }) {
  const step = useAppStore((s) => s.step);
  const chapter = CHAPTERS.find((c) => c.index === index)!;
  const content = useMemo(() => chapterContent(index), [index]);

  return (
    <div className="mx-auto max-w-[920px] px-4 pb-24 pt-8 sm:px-6">
      <ChapterPlate index={index} />
      <StepBar index={index} content={content} />

      <div key={`${index}-${step}`} className="mt-10">
        {step === "learn" && <LearnStep index={index} content={content} />}
        {step === "predict" && <PredictStep content={content} />}
        {step === "check" && <CheckStep index={index} content={content} />}
        {step === "run" && <RunStep content={content} />}
      </div>

      <StepNav index={index} title={chapter.short} />
    </div>
  );
}

function ChapterPlate({ index }: { index: number }) {
  const c = CHAPTERS.find((x) => x.index === index)!;
  return (
    <section className="plate overflow-hidden bg-bg-panel px-6 pb-6 pt-7 sm:px-8">
      <Screws />
      <span aria-hidden className="numeral pointer-events-none absolute -top-1 right-5 text-[150px] sm:text-[190px]">
        {index}
      </span>
      <p className="caps relative text-gold-soft">
        Chapter {index}
        {c.topics.length > 0 && (
          <span className="text-ink-faint">
            {"  ·  "}
            {c.topics.map((t) => `${t.topic} ${t.weight}%`).join("  ·  ")} of the exam
          </span>
        )}
        {c.topics.length === 0 && <span className="text-ink-faint">{"  ·  "}foundation, no own exam topic</span>}
      </p>
      <h1 className="relative mt-2 text-[30px] font-bold leading-tight text-ink sm:text-[34px]">{c.title}</h1>
      <p className="relative mt-3 max-w-[60ch] text-[16px] leading-relaxed text-ink-muted">{c.summary}</p>
      {c.formula && (
        <div className="relative mt-5 border-t border-border pt-4">
          <p className="font-mono text-[13px] leading-relaxed text-ink sm:text-[14px]">
            {c.formula.text.split(/(\s›\s|\s·\s)/).map((part, i) => {
              if (part.trim() === "›" || part.trim() === "·")
                return <span key={i} className="text-ink-faint">{part}</span>;
              // LIVERPS: mark the letter that gives the acronym (rElocates -> E)
              const m = c.formula!.initials ? part.match(/^([^A-Z]*)([A-Z])(.*)$/) : null;
              return m ? (
                <span key={i}>
                  {m[1]}
                  <span className="font-semibold text-gold-soft">{m[2]}</span>
                  {m[3]}
                </span>
              ) : (
                <span key={i}>{part}</span>
              );
            })}
          </p>
          <p className="caps mt-1 text-ink-faint">{c.formula.note}</p>
        </div>
      )}
    </section>
  );
}

function StepBar({ index, content }: { index: number; content: ChapterContent }) {
  const step = useAppStore((s) => s.step);
  const setStep = useAppStore((s) => s.setStep);
  const status = useStepStatus(index, content);

  return (
    <nav aria-label="Steps" className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {STEPS.map((s) => {
        const active = s.id === step;
        const st = status[s.id];
        return (
          <button
            key={s.id}
            onClick={() => setStep(s.id)}
            aria-current={active ? "step" : undefined}
            className={`flex flex-col items-center gap-1.5 border px-2 pb-3 pt-3 text-center transition-colors ${
              active
                ? "border-copper bg-copper text-bg"
                : `border-copper bg-bg-panel hover:bg-bg-elev ${st.empty ? "text-ink-faint" : "text-copper"}`
            }`}
          >
            <StepIcon step={s.id} />
            <span className="caps text-[12px] font-semibold">
              {s.n} · {s.label}
            </span>
            <span className={`text-[12px] ${active ? "opacity-80" : "text-ink-faint"}`}>
              {st.done && <span className={active ? "" : "text-emerald-300"}>✓ </span>}
              {st.text}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function StepIntro({ title, children }: { title: string; children: ReactNode }) {
  return (
    <header className="mb-6">
      <h2 className="text-[22px] font-semibold text-ink">{title}</h2>
      <div className="mt-1.5 max-w-[68ch] text-[16px] leading-relaxed text-ink-muted">{children}</div>
    </header>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="border border-dashed border-border px-5 py-6 text-[15px] text-ink-faint">{children}</p>;
}

function LearnStep({ index, content }: { index: number; content: ChapterContent }) {
  if (!content.lesson) return <Empty>This chapter has no lesson yet.</Empty>;
  return (
    <article>
      <LessonBlocks lesson={content.lesson} chapter={index} />
    </article>
  );
}

function PredictStep({ content }: { content: ChapterContent }) {
  return (
    <>
      <StepIntro title="Predict, then look">
        Every situation is a few small <code className="font-mono text-[14px]">.usda</code> files. Read them, pick what
        USD will print, and only then see the real output. You do not need USD installed: the output was recorded on
        real OpenUSD.
      </StepIntro>
      {content.predict.length + content.bugs.length === 0 && (
        <Empty>No situations for this chapter yet. Go on to Check.</Empty>
      )}
      {content.predict.length > 0 && (
        <section>
          <h3 className="caps mb-3 text-ink-faint">Predict the result · {content.predict.length}</h3>
          <div className="flex flex-col gap-3">
            {content.predict.map((item, i) => (
              <SituationCard key={item.id} item={item} index={i} showLessonLink={false} />
            ))}
          </div>
        </section>
      )}
      {content.bugs.length > 0 && (
        <section className="mt-10">
          <h3 className="caps mb-3 text-ink-faint">Find the bug · {content.bugs.length}</h3>
          <div className="flex flex-col gap-3">
            {content.bugs.map((item, i) => (
              <SituationCard key={item.id} item={item} index={content.predict.length + i} showLessonLink={false} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function CheckStep({ index, content }: { index: number; content: ChapterContent }) {
  return (
    <>
      <StepIntro title="Check yourself">
        First the short check from the lesson. Then a drill with exam-style questions from this chapter only.
      </StepIntro>
      {content.lesson && content.lesson.selfCheck.length > 0 && (
        <section>
          <h3 className="caps mb-3 text-ink-faint">Lesson check · {content.lesson.selfCheck.length}</h3>
          <SelfCheckList lesson={content.lesson} />
        </section>
      )}
      <section className="mt-10">
        <h3 className="caps mb-3 text-ink-faint">Chapter drill</h3>
        <ChapterDrill chapter={index} pool={content.quiz} />
      </section>
    </>
  );
}

function RunStep({ content }: { content: ChapterContent }) {
  const setView = useAppStore((s) => s.setView);
  return (
    <>
      <StepIntro title="Run it in real USD">
        Optional. You need Python with OpenUSD (no GPU, no Omniverse).{" "}
        <button onClick={() => setView("lab")} className="text-copper underline underline-offset-4 hover:text-ink">
          Set up the environment
        </button>{" "}
        once, then paste each script into a <code className="font-mono text-[14px]">.py</code> file.
      </StepIntro>
      {content.lab.length === 0 ? (
        <Empty>No scripts for this chapter yet.</Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {content.lab.map((e) => (
            <div key={e.step.id}>
              <p className="caps mb-1.5 text-ink-faint">
                {e.track} · exercise {e.number}
              </p>
              <StepCard step={e.step} index={e.number - 1} showLessonLink={false} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/** Previous / next at the bottom. After the last step, the next chapter. */
function StepNav({ index, title }: { index: number; title: string }) {
  const step = useAppStore((s) => s.step);
  const setStep = useAppStore((s) => s.setStep);
  const goChapter = useAppStore((s) => s.goChapter);
  const setView = useAppStore((s) => s.setView);
  const markLesson = useProgress((s) => s.markLesson);
  const lessonId = chapterContent(index).lesson?.id;

  const i = STEPS.findIndex((s) => s.id === step);
  const prev = i > 0 ? STEPS[i - 1] : null;
  const next = i < STEPS.length - 1 ? STEPS[i + 1] : null;
  const nextChapter = CHAPTERS.find((c) => c.index === index + 1);

  const goNext = () => {
    // reading the whole lesson and moving on counts as "Learn" done
    if (step === "learn" && lessonId) markLesson(lessonId, true);
    if (next) setStep(next.id);
    else if (nextChapter) goChapter(nextChapter.index);
    else setView("factory");
  };

  const nextLabel = next
    ? `${next.n} · ${next.label}`
    : nextChapter
      ? `Chapter ${nextChapter.index} · ${nextChapter.short}`
      : "Final project · Drone Factory";

  return (
    <nav aria-label="Next step" className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-5">
      {prev ? (
        <button onClick={() => setStep(prev.id)} className="flex items-center gap-2 text-[14px] text-copper hover:text-ink">
          <ArrowLeft /> {prev.n} · {prev.label}
        </button>
      ) : (
        <span className="caps text-ink-faint">
          Chapter {index} · {title}
        </span>
      )}
      <button
        onClick={goNext}
        className="flex items-center gap-3 bg-copper px-5 py-3 text-left text-bg hover:opacity-90"
      >
        <span>
          <span className="caps block text-[10px] opacity-75">{next ? "Next step" : "Next"}</span>
          <span className="block text-[15px] font-semibold">{nextLabel}</span>
        </span>
        <ArrowRight />
      </button>
    </nav>
  );
}
