import { useState } from "react";
import type { SandboxEdit, SandboxItem } from "../data/sandbox.ts";
import { SANDBOX_VERIFIED, type VerifiedRun } from "../data/sandbox.verified.ts";
import { buildScript, scriptHash } from "../core/sandboxScript.ts";
import { withShuffledOptions } from "../core/shuffle.ts";
import { tokenizeLines, type Lang } from "../core/syntax.ts";
import { EXAM_WEIGHTS } from "../core/types.ts";
import { useAppStore } from "../state/useAppStore.ts";
import { useProgress } from "../state/useProgress.ts";
import { CodeBlock } from "./CodeBlock.tsx";
import { md, mdt } from "./md.tsx";

/** The verified result - but only if it matches today's script text. */
function verified(run: VerifiedRun | undefined, script: string): string | null {
  return run && run.hash === scriptHash(script) ? run.output : null;
}

function Output({ text, label }: { text: string | null; label: string }) {
  if (text === null) {
    return (
      <p className="my-3 rounded-md border border-amber-700/40 bg-amber-900/10 px-3 py-2 text-xs text-amber-200">
        This situation changed after the last verifier run. The output needs a refresh.
      </p>
    );
  }
  return <CodeBlock code={text} label={label} tone="output" />;
}

/** Situation files are mostly .usda, but sometimes also studio code (.py) or plugInfo.json. */
function langOf(name: string): Lang {
  if (name.endsWith(".py")) return "python";
  if (name.endsWith(".json")) return "json";
  if (name.endsWith(".usda") || name.endsWith(".usd")) return "usda";
  return "plain";
}

function DiffView({ edits }: { edits: SandboxEdit[] }) {
  return (
    <div className="my-3 flex flex-col gap-2">
      {edits.map((e, i) => (
        <figure key={i} className="overflow-hidden rounded-lg border border-border bg-code">
          <figcaption className="border-b border-border px-3 py-1 font-mono text-[11px] text-ink-faint">{e.file}</figcaption>
          <pre className="overflow-auto py-2 font-mono text-[12.5px] leading-relaxed text-ink">
            {(
              [
                ["-", e.before, "bg-red-900/25"],
                ["+", e.after, "bg-emerald-900/25"],
              ] as const
            ).map(([sign, text, bg]) =>
              text === ""
                ? null
                : tokenizeLines(text.replace(/\n$/, ""), langOf(e.file)).map((line, j) => (
                    <div key={`${sign}${j}`} className={`${bg} flex px-3`}>
                      <span className="w-4 shrink-0 select-none text-ink-faint">{sign}</span>
                      <span>
                        {line.length
                          ? line.map((t, k) => (
                              <span key={k} className={t.k === "text" ? undefined : `syn-${t.k}`}>
                                {t.t}
                              </span>
                            ))
                          : " "}
                      </span>
                    </div>
                  )),
            )}
          </pre>
        </figure>
      ))}
    </div>
  );
}

function Explain({ md }: { md: string }) {
  return (
    <div className="mt-3 rounded-lg border border-gold/30 bg-gold/5 p-3">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gold-soft">What this shows</p>
      <p className="max-w-[40rem] text-[15px] leading-[1.7] text-ink-muted">{mdt(md)}</p>
    </div>
  );
}

function PredictBody({ item }: { item: SandboxItem }) {
  const [picked, setPicked] = useState<number | null>(null);
  // The order in the data would give the answer away - shuffle once on mount.
  const [choice] = useState(() =>
    withShuffledOptions({ options: item.options ?? [], answer: item.answer ?? -1 }),
  );
  const markSandbox = useProgress((s) => s.markSandbox);
  const run = SANDBOX_VERIFIED[item.id];
  const script = buildScript(item);
  const tryScript = item.tryIt ? buildScript(item, item.tryIt.edits, item.tryIt.label) : "";

  return (
    <>
      <p className="mt-4 text-[15px] font-medium text-ink">{mdt(item.question ?? "")}</p>
      <div className="mt-2 flex flex-col gap-2">
        {choice.options.map((opt, i) => {
          const show = picked !== null;
          const tone = !show
            ? "border-border text-ink-muted hover:border-copper/50 hover:text-ink"
            : i === choice.answer
              ? "border-emerald-600/60 bg-emerald-900/20 text-emerald-200"
              : i === picked
                ? "border-red-600/60 bg-red-900/20 text-red-200"
                : "border-border text-ink-faint";
          return (
            <button
              key={i}
              disabled={show}
              onClick={() => {
                setPicked(i);
                if (i === choice.answer) markSandbox(item.id, true);
              }}
              className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${tone}`}
            >
              {md(opt)}
            </button>
          );
        })}
      </div>

      {picked === null ? (
        <p className="mt-3 text-xs text-ink-faint">The script and its real output appear after you answer.</p>
      ) : (
        <>
          <p className={`mt-3 text-sm ${picked === choice.answer ? "text-emerald-300" : "text-red-300"}`}>
            {picked === choice.answer ? "Right." : "Not quite. See what USD prints."}
          </p>
          <CodeBlock code={script} label="Script: writes the files and checks the result" lang="python" />
          <Output text={verified(run?.base, script)} label="Output" />
          <Explain md={item.explain} />
          {item.tryIt && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-ink">Try it: {mdt(item.tryIt.label)}</p>
              <DiffView edits={item.tryIt.edits} />
              <CodeBlock code={tryScript} label="Script after the change" lang="python" />
              <Output text={verified(run?.tryIt, tryScript)} label="Output after the change" />
            </div>
          )}
        </>
      )}
    </>
  );
}

function BugBody({ item }: { item: SandboxItem }) {
  const [hints, setHints] = useState(0);
  const [solved, setSolved] = useState(false);
  const run = SANDBOX_VERIFIED[item.id];
  const script = buildScript(item);
  const fixedScript = item.fix ? buildScript(item, item.fix, "after the fix") : "";
  const total = item.hints?.length ?? 0;

  return (
    <>
      <CodeBlock code={script} label="Script: writes the files and shows the symptom" lang="python" />
      <Output text={verified(run?.base, script)} label="Output" />

      {hints > 0 && (
        <ol className="mt-3 flex flex-col gap-2">
          {item.hints?.slice(0, hints).map((h, i) => (
            <li key={i} className="rounded-md border border-border bg-bg-elev px-3 py-2 text-[14px] leading-relaxed text-ink-muted">
              <span className="mr-2 font-mono text-xs text-copper-bright">{i + 1}.</span>
              {mdt(h)}
            </li>
          ))}
        </ol>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {hints < total && !solved && (
          <button
            onClick={() => setHints((n) => n + 1)}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-ink-muted hover:text-ink"
          >
            Hint ({hints + 1}/{total})
          </button>
        )}
        {!solved && (
          <button
            onClick={() => setSolved(true)}
            className="rounded-md border border-copper/40 bg-copper/10 px-3 py-1.5 text-xs text-gold-soft hover:bg-copper/20"
          >
            Show the solution
          </button>
        )}
      </div>

      {solved && item.fix && (
        <div className="mt-4">
          <p className="text-sm font-semibold text-ink">The fix</p>
          <DiffView edits={item.fix} />
          <CodeBlock code={fixedScript} label="Script after the fix" lang="python" />
          <Output text={verified(run?.fixed, fixedScript)} label="Output after the fix" />
          <Explain md={item.explain} />
        </div>
      )}
    </>
  );
}

export function SituationCard({
  item,
  index,
  showLessonLink = true,
}: {
  item: SandboxItem;
  index: number;
  /** Inside a chapter the lesson is one tab away - no link needed. */
  showLessonLink?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const done = useProgress((s) => !!s.sandboxDone[item.id]);
  const markSandbox = useProgress((s) => s.markSandbox);
  const setView = useAppStore((s) => s.setView);

  return (
    <section
      className={`rounded-lg border ${done ? "border-emerald-700/40 bg-emerald-950/10" : "border-border bg-bg-panel"}`}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-4 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-copper"
      >
        <span className="mt-0.5 font-mono text-sm text-copper-bright">{String(index + 1).padStart(2, "0")}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">{item.title}</span>
          <span className="mt-0.5 block text-xs text-ink-faint">
            {item.topic} · {EXAM_WEIGHTS[item.topic]}% of the exam
          </span>
        </span>
        {done && <span className="text-xs text-emerald-400">✓</span>}
        <span className="text-ink-faint">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          <p className="max-w-[40rem] text-[15px] leading-[1.7] text-ink-muted">{mdt(item.setup)}</p>
          {item.symptom && (
            <div className="mt-3 rounded-lg border border-red-700/40 bg-red-900/10 px-3 py-2">
              <span className="mr-2 rounded bg-red-800/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-300">
                Symptom
              </span>
              <span className="text-[14px] leading-relaxed text-ink-muted">{mdt(item.symptom)}</span>
            </div>
          )}

          {item.files.map((f) => (
            <CodeBlock key={f.name} code={f.code} label={<span className="font-mono">{f.name}</span>} lang={langOf(f.name)} />
          ))}

          {item.mode === "predict" ? <PredictBody item={item} /> : <BugBody item={item} />}

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-3">
            <button
              onClick={() => markSandbox(item.id, !done)}
              className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                done
                  ? "border-emerald-700/50 bg-emerald-900/20 text-emerald-300"
                  : "border-border text-ink-muted hover:text-ink"
              }`}
            >
              {done ? "✓ solved (click to undo)" : "Mark as solved"}
            </button>
            <span className="text-xs text-ink-faint">
              Open in usdview: <code className="font-mono text-copper-bright">usdview {item.open}</code>
            </span>
            {showLessonLink && (
            <button
              onClick={() => setView(`layer:${item.layerIndex}`)}
              className="text-xs text-copper-bright hover:text-gold-soft"
            >
              → chapter {item.layerIndex}
            </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
