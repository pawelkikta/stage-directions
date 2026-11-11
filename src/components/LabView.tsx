import { useState } from "react";
import {
  LAB_CONVERTER_INTRO,
  LAB_CONVERTER_STEPS,
  LAB_GUI_INTRO,
  LAB_STUDIO_INTRO,
  LAB_STUDIO_STEPS,
  LAB_STUDIO_TREE,
  LAB_CUSTOM_INTRO,
  LAB_CUSTOM_STEPS,
  LAB_GUI_TRACKS,
  LAB_GUI_VERDICT,
  LAB_REALITY,
  LAB_SETUP,
  LAB_STEPS,
  type GuiTrack,
  type LabStep,
  type LabTweak,
} from "../data/lab.ts";
import { mdt } from "./md.tsx";
import { useAppStore } from "../state/useAppStore.ts";
import { useProgress } from "../state/useProgress.ts";
import { CodeBlock } from "./CodeBlock.tsx";
import { Screws } from "./shell/Plate.tsx";

type LabImage = NonNullable<LabStep["image"]>;

function LabFigure({ image }: { image: LabImage }) {
  return (
    <figure className="my-3">
      <img
        src={`${import.meta.env.BASE_URL}${image.src}`}
        alt={image.alt}
        loading="lazy"
        className="mx-auto max-h-[460px] w-auto rounded-lg border border-border"
      />
      {image.caption && (
        <figcaption className="mt-1 text-xs text-ink-faint">{mdt(image.caption)}</figcaption>
      )}
    </figure>
  );
}

/** A button that hides the result until the user tries to predict it. */
function GuessButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="my-3 w-full rounded-lg border border-dashed border-copper/50 bg-bg px-4 py-3 text-left transition-colors hover:border-copper hover:bg-copper/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-copper"
    >
      <span className="block text-sm font-semibold text-gold-soft">{label}</span>
      <span className="mt-0.5 block text-xs text-ink-faint">
        Predict first, then compare. It is the fastest way to find gaps.
      </span>
    </button>
  );
}

type DiffLine = { sign: "-" | "+" | " " | "…"; text: string };

/**
 * Changes from `tweak.edits` as a diff of whole script lines: "-" old, "+" new,
 * no sign - an unchanged line, for orientation.
 */
function editDiff(script: string, edits: LabTweak["edits"]): DiffLine[] {
  const out: DiffLine[] = [];
  let text = script;
  edits.forEach(({ find, replace }, n) => {
    const at = text.indexOf(find);
    if (at < 0) return;
    const start = text.lastIndexOf("\n", at - 1) + 1;
    const lineEnd = text.indexOf("\n", at + find.length);
    const end = find.endsWith("\n") ? at + find.length : lineEnd < 0 ? text.length : lineEnd;
    const split = (s: string) => (s.replace(/\n+$/, "") ? s.replace(/\n+$/, "").split("\n") : []);
    const before = split(text.slice(start, end));
    const after = split(text.slice(start, at) + replace + text.slice(at + find.length, end));
    let head = 0;
    while (head < before.length && head < after.length && before[head] === after[head]) head++;
    let tail = 0;
    while (
      tail < before.length - head &&
      tail < after.length - head &&
      before[before.length - 1 - tail] === after[after.length - 1 - tail]
    ) {
      tail++;
    }
    if (n > 0) out.push({ sign: "…", text: "" });
    before.slice(0, head).forEach((t) => out.push({ sign: " ", text: t }));
    before.slice(head, before.length - tail).forEach((t) => out.push({ sign: "-", text: t }));
    after.slice(head, after.length - tail).forEach((t) => out.push({ sign: "+", text: t }));
    before.slice(before.length - tail).forEach((t) => out.push({ sign: " ", text: t }));
    text = text.slice(0, at) + replace + text.slice(at + find.length);
  });
  return out;
}

function EditDiff({ script, edits }: { script: string; edits: LabTweak["edits"] }) {
  return (
    <pre className="my-2 overflow-auto rounded-lg border border-border bg-code p-3 font-mono text-[12.5px] leading-relaxed">
      {editDiff(script, edits).map((l, i) => (
        <div
          key={i}
          className={
            l.sign === "-" ? "text-red-300/90" : l.sign === "+" ? "text-emerald-300/90" : "text-ink-faint"
          }
        >
          {l.sign === "…" ? "…" : `${l.sign} ${l.text}` || " "}
        </div>
      ))}
    </pre>
  );
}

function TweakCard({ tweak, script }: { tweak: LabTweak; script: string }) {
  const [showDiff, setShowDiff] = useState(false);
  const [shown, setShown] = useState(false);
  return (
    <div className="mt-4 rounded-lg border border-copper/40 bg-copper/5 p-3">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-copper-bright">
        Change one thing
      </p>
      <p className="text-[15px] leading-[1.7] text-ink-muted">{mdt(tweak.task)}</p>
      {tweak.rerun && (
        <p className="mt-1 text-xs leading-relaxed text-ink-faint">
          This change overwrites files that later exercises use. After the experiment, run the
          original script again.
        </p>
      )}
      <button
        onClick={() => setShowDiff((v) => !v)}
        aria-expanded={showDiff}
        className="mt-2 text-xs text-copper-bright hover:text-gold-soft"
      >
        {showDiff ? "− hide the exact change" : "+ show the exact change"}
      </button>
      {showDiff && <EditDiff script={script} edits={tweak.edits} />}

      {shown ? (
        <>
          <CodeBlock code={tweak.expect} label="After the change" tone="output" />
          {tweak.image && <LabFigure image={tweak.image} />}
          <p className="text-[15px] leading-[1.7] text-ink-muted">{mdt(tweak.why)}</p>
        </>
      ) : (
        <GuessButton label="What will it print now? Guess, then show" onClick={() => setShown(true)} />
      )}
    </div>
  );
}

export function StepCard({
  step,
  index,
  showLessonLink = true,
}: {
  step: LabStep;
  index: number;
  /** Inside a chapter the lesson is one tab away - no link needed. */
  showLessonLink?: boolean;
}) {
  const setView = useAppStore((s) => s.setView);
  const done = useProgress((s) => !!s.labDone[step.id]);
  const markLab = useProgress((s) => s.markLab);
  const [open, setOpen] = useState(index === 0);
  // A finished exercise does not need to hide anything.
  const [shown, setShown] = useState(done);
  const { layerIndex } = step;

  return (
    <section
      className={`rounded-lg border ${
        done ? "border-emerald-700/40 bg-emerald-950/10" : "border-border bg-bg-panel"
      }`}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-4 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-copper"
      >
        <span className="mt-0.5 font-mono text-sm text-copper-bright">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">{step.title}</span>
          <span className="mt-0.5 block text-xs text-ink-faint">{step.tag}</span>
        </span>
        {done && <span className="text-xs text-emerald-400">✓</span>}
        <span className="text-ink-faint">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          <p className="text-[15px] leading-[1.7] text-ink-muted">{mdt(step.goal)}</p>

          <CodeBlock
            code={step.script}
            label={step.scriptLabel ?? "Paste into a .py file and run"}
            lang={step.shell ? "shell" : undefined}
          />
          {step.extraScript && (
            <CodeBlock
              code={step.extraScript.code}
              label={step.extraScript.label}
              lang="shell"
            />
          )}

          {shown ? (
            <>
              <CodeBlock
                code={step.expect}
                label="What you should see"
                tone="output"
              />
              {step.image && <LabFigure image={step.image} />}

              <div className="mt-4 rounded-lg border border-gold/30 bg-gold/5 p-3">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gold-soft">
                  What this shows
                </p>
                <p className="text-[15px] leading-[1.7] text-ink-muted">{mdt(step.why)}</p>
              </div>

              {step.tweak && <TweakCard tweak={step.tweak} script={step.script} />}
            </>
          ) : (
            <GuessButton
              label={step.image ? "What will you see? Guess, then show" : "What will it print? Guess, then show"}
              onClick={() => setShown(true)}
            />
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              onClick={() => markLab(step.id, !done)}
              className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                done
                  ? "border-emerald-700/50 bg-emerald-900/20 text-emerald-300"
                  : "border-copper/40 bg-copper/10 text-gold-soft hover:bg-copper/20"
              }`}
            >
              {done ? "✓ done (click to undo)" : "Mark as done"}
            </button>
            {showLessonLink && layerIndex !== undefined && (
              <button
                onClick={() => setView(`layer:${layerIndex}`)}
                className="text-xs text-copper-bright hover:text-gold-soft"
              >
                → chapter {layerIndex}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function GuiTrackCard({ track }: { track: GuiTrack }) {
  return (
    <section className="rounded-lg border border-border bg-bg-panel p-4">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-bold text-ink">{track.tool}</h3>
      </div>
      <p className="text-[15px] leading-[1.7] text-ink-muted">{mdt(track.pitch)}</p>

      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-gold-soft">
        How to get it
      </p>
      <p className="text-[15px] leading-[1.7] text-ink-muted">{mdt(track.install)}</p>

      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-gold-soft">
        Panels you should be able to name
      </p>
      <dl className="mt-1">
        {track.panels.map((p) => (
          <div key={p.name} className="mb-1.5">
            <dt className="text-[13px] font-medium text-ink">{p.name}</dt>
            <dd className="text-[13.5px] leading-relaxed text-ink-muted">
              {mdt(p.what)}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 rounded-lg border border-gold/30 bg-gold/5 p-3">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gold-soft">
          Best for
        </p>
        <p className="text-[15px] leading-[1.7] text-ink-muted">{mdt(track.best)}</p>
      </div>

      {track.oneStage && (
        <div className="mt-3 rounded-lg border border-border bg-bg p-3">
          <p className="text-[15px] leading-[1.7] text-ink-muted">
            {mdt(track.oneStage)}
          </p>
          {track.oneStageCode && (
            <CodeBlock code={track.oneStageCode} label="scene.usda" />
          )}
          {track.oneStageWhy && (
            <p className="text-[13.5px] leading-relaxed text-ink-muted">
              {mdt(track.oneStageWhy)}
            </p>
          )}
        </div>
      )}

      <div className="mt-2 rounded-lg border border-red-700/40 bg-red-900/10 p-3">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-red-300">
          What it cannot do
        </p>
        <p className="text-[15px] leading-[1.7] text-ink-muted">{mdt(track.limits)}</p>
      </div>
    </section>
  );
}

/** Appendix: set up Python + OpenUSD once, then every script of every track. */
export function LabView() {
  const labDone = useProgress((s) => s.labDone);
  const tracks = [
    { title: "Track 1 · Mechanisms: how USD really behaves", intro: "Do them in order: exercises 3, 6 and 7 use files made earlier. Work in one empty folder.", steps: LAB_STEPS },
    { title: "Track 2 · Studio: what it looks like in real production", intro: LAB_STUDIO_INTRO, steps: LAB_STUDIO_STEPS, tree: LAB_STUDIO_TREE },
    { title: "Track 3 · Customizing: extending USD without compiling", intro: LAB_CUSTOM_INTRO, steps: LAB_CUSTOM_STEPS },
    { title: "Track 4 · Converter: from a source file to .usdz", intro: LAB_CONVERTER_INTRO, steps: LAB_CONVERTER_STEPS },
  ];
  const allSteps = tracks.flatMap((t) => t.steps);
  const doneCount = allSteps.filter((s) => labDone[s.id]).length;
  let n = 0;

  return (
    <div className="mx-auto max-w-[920px] px-4 pb-24 pt-10 sm:px-6">
      <p className="caps text-gold-soft">Appendix · for the Run steps</p>
      <h1 className="mt-2 text-[32px] font-bold leading-tight text-ink sm:text-[38px]">Set up OpenUSD</h1>
      <p className="mt-3 max-w-[68ch] text-[16px] leading-relaxed text-ink-muted">{mdt(LAB_SETUP.intro)}</p>

      <section className="plate mt-8 bg-bg-panel px-5 pb-6 pt-7 sm:px-7">
        <Screws />
        <p className="caps text-ink-faint">One-time setup · pick one way</p>
        <div className="mt-4 flex flex-col gap-6">
          {LAB_SETUP.routes.map((r) => (
            <div key={r.id} className="border-t border-border pt-5 first:border-t-0 first:pt-0">
              <h2 className="text-[18px] font-semibold text-ink">{r.title}</h2>
              <p className="mt-1 max-w-[68ch] text-[15px] leading-[1.7] text-ink-muted">{mdt(r.when)}</p>
              <CodeBlock code={r.cmd} label={r.cmdLabel} />
              <CodeBlock code={r.verify} label="Check that it works" />
              <CodeBlock code={r.verifyExpect} label="It should print" tone="output" />
              <p className="max-w-[68ch] text-[14px] leading-relaxed text-ink-muted">{mdt(r.note)}</p>
            </div>
          ))}
        </div>
        <aside className="mt-6 border-l-[3px] border-copper bg-bg-elev px-5 py-4">
          <p className="caps mb-1.5 text-copper">About USD versions</p>
          <p className="text-[15px] leading-[1.7] text-ink-muted">{mdt(LAB_SETUP.versionNote)}</p>
        </aside>
      </section>

      <section className="mt-10 max-w-[72ch]">
        <h2 className="text-[22px] font-semibold text-ink">{LAB_REALITY.title}</h2>
        {[LAB_REALITY.editable, LAB_REALITY.boundary, LAB_REALITY.jobs, LAB_REALITY.tip].map((para, i) => (
          <p key={i} className="mt-3 text-[16px] leading-[1.72] text-ink-muted">
            {mdt(para)}
          </p>
        ))}
      </section>

      <div className="mt-14 flex items-baseline justify-between border-b border-rule pb-2">
        <h2 className="caps text-ink">All scripts, by track</h2>
        <span className="caps text-ink-faint">
          {doneCount} / {allSteps.length} done
        </span>
      </div>
      <p className="mt-3 max-w-[68ch] text-[15px] leading-relaxed text-ink-muted">
        Every chapter shows its own scripts in the Run step. Here they are all together, in the order of the tracks.
      </p>

      {tracks.map((t) => (
        <section key={t.title} className="mt-10">
          <h3 className="text-[19px] font-semibold text-ink">{t.title}</h3>
          <p className="mt-1.5 max-w-[68ch] text-[15px] leading-relaxed text-ink-muted">{mdt(t.intro)}</p>
          {t.tree && <CodeBlock code={t.tree} label="The structure you will build" tone="output" />}
          <div className="mt-4 flex flex-col gap-3">
            {t.steps.map((s) => (
              <StepCard key={s.id} step={s} index={n++} />
            ))}
          </div>
        </section>
      ))}

      <section className="mt-14">
        <h2 className="caps border-b border-rule pb-2 text-ink">What about a GUI? usdview vs Omniverse</h2>
        <p className="mt-3 max-w-[68ch] text-[15px] leading-relaxed text-ink-muted">{mdt(LAB_GUI_INTRO)}</p>
        <div className="mt-4 flex flex-col gap-3">
          {LAB_GUI_TRACKS.map((t) => (
            <GuiTrackCard key={t.id} track={t} />
          ))}
        </div>
        <aside className="mt-4 border-l-[3px] border-copper bg-bg-elev px-5 py-4">
          <p className="caps mb-1.5 text-copper">Verdict</p>
          <p className="text-[15px] leading-[1.7] text-ink-muted">{mdt(LAB_GUI_VERDICT)}</p>
        </aside>
      </section>
    </div>
  );
}
