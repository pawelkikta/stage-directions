import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  STACK_SEED,
  resolveStack,
  fmtVal,
  type StackLayer,
  type StackState,
} from "../../core/composition.ts";
import { md } from "../md.tsx";
import { Highlight } from "../Highlight.tsx";

/** The value written when a layer gets an opinion from the button. */
const ADDED_VALUE = 500;

/** The root layer text for the current order of sublayers. */
function rootUsda(s: StackState): string {
  const list = s.sublayers.map((l) => `        @./${l.file}@`).join(",\n");
  let out = `#usda 1.0\n(\n    subLayers = [\n${list}\n    ]\n)\n`;
  if (s.root.value !== null) {
    out +=
      `\nover "World"\n{\n    over "Key"\n    {\n` +
      `        float inputs:intensity = ${typeof s.root.value === "number" ? s.root.value : "?   # type a number"}\n    }\n}\n`;
  }
  return out;
}

export function LayerStack() {
  const [stack, setStack] = useState<StackState>(() => ({
    ...STACK_SEED,
    root: { ...STACK_SEED.root },
    sublayers: STACK_SEED.sublayers.map((l) => ({ ...l })),
  }));
  const { winnerId, value } = resolveStack(stack);

  const update = (id: string, fn: (l: StackLayer) => StackLayer) =>
    setStack((s) => ({
      ...s,
      root: s.root.id === id ? fn(s.root) : s.root,
      sublayers: s.sublayers.map((l) => (l.id === id ? fn(l) : l)),
    }));

  const toggle = (id: string) =>
    update(id, (l) => ({ ...l, value: l.value === null ? ADDED_VALUE : null }));

  const edit = (id: string, raw: string) =>
    update(id, (l) => {
      const n = Number(raw);
      return { ...l, value: raw.trim() !== "" && Number.isFinite(n) ? n : raw };
    });

  const move = (i: number, dir: -1 | 1) =>
    setStack((s) => {
      const j = i + dir;
      if (j < 0 || j >= s.sublayers.length) return s;
      const next = [...s.sublayers];
      [next[i], next[j]] = [next[j], next[i]];
      return { ...s, sublayers: next };
    });

  const row = (l: StackLayer, rank: string, side: ReactNode) => {
    const isWinner = l.id === winnerId;
    const hasOpinion = l.value !== null;
    return (
      <motion.div
        layout
        key={l.id}
        transition={{ type: "spring", stiffness: 500, damping: 40 }}
        className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
          isWinner ? "border-gold/50 bg-copper/10" : "border-border bg-bg-panel"
        }`}
      >
        <span className="w-6 font-mono text-[10px] text-ink-faint">{rank}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-mono text-sm text-ink">{l.file}</div>
          <div className="text-[11px] text-ink-faint">{l.owner}</div>
        </div>

        <div className="w-20">
          {hasOpinion ? (
            <input
              value={String(l.value)}
              onChange={(e) => edit(l.id, e.target.value)}
              aria-label={`opinion in ${l.file}`}
              className={`w-full rounded border bg-bg px-1.5 py-0.5 font-mono text-xs text-ink ${
                typeof l.value === "number" ? "border-border" : "border-red-400/60"
              }`}
            />
          ) : (
            <span className="text-xs text-ink-faint">no opinion</span>
          )}
        </div>

        <button
          onClick={() => toggle(l.id)}
          className="w-24 rounded border border-border px-2 py-0.5 text-[11px] text-ink-muted hover:text-ink"
        >
          {hasOpinion ? "remove opinion" : "add opinion"}
        </button>

        <div className="w-20 text-right">
          {isWinner && (
            <span className="rounded bg-copper/20 px-2 py-0.5 text-[11px] font-semibold text-gold-soft">
              WINS
            </span>
          )}
        </div>

        <div className="flex w-6 flex-col items-center">{side}</div>
      </motion.div>
    );
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-gold/30 bg-gold/5 px-4 py-3">
        <code className="font-mono text-xs text-copper-bright">{stack.attributePath}</code>
        <span className="text-xs uppercase tracking-wider text-ink-faint">on the stage</span>
        <span className="font-mono text-lg font-bold text-gold-soft">
          {value === null ? "- no layer has an opinion" : fmtVal(value)}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <div className="mb-2 flex justify-between px-1 text-[11px] text-ink-faint">
            <span>↑ stronger</span>
            <span>weaker ↓</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {row(
              stack.root,
              "root",
              <span title="The root layer cannot be moved" className="text-[11px] text-ink-faint">
                🔒
              </span>,
            )}
            <div className="px-1 pt-1 text-[11px] text-ink-faint">
              sublayers - in the order of the list <code className="text-copper-bright">subLayers</code>
            </div>
            {stack.sublayers.map((l, i) =>
              row(
                l,
                `#${i + 1}`,
                <>
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label={`move ${l.file} up`}
                    className="text-ink-faint hover:text-ink disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === stack.sublayers.length - 1}
                    aria-label={`move ${l.file} down`}
                    className="text-ink-faint hover:text-ink disabled:opacity-30"
                  >
                    ▼
                  </button>
                </>,
              ),
            )}
          </div>
        </div>

        <figure className="flex flex-col overflow-hidden rounded-lg border border-border bg-code">
          <figcaption className="border-b border-border px-3 py-1.5 text-[11px] text-ink-faint">
            <span className="font-mono text-ink-muted">sh010.usda</span> - this is how the order looks in the file
          </figcaption>
          <pre className="overflow-auto p-3 font-mono text-[12px] leading-relaxed text-ink">
            <Highlight code={rootUsda(stack)} lang="usda" />
          </pre>
        </figure>
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-ink-muted">
        {md(
          "**Try it:** remove the lighting department's opinion - layout wins, because the empty " +
            "`sh010_anim.usda` is simply skipped. Then move layout to the " +
            "top of the list and watch the file text below change. Finally, give " +
            "the root an opinion: it wins whatever the sublayer order.",
        )}
      </p>
      <p className="mt-2 text-[12px] leading-relaxed text-ink-faint">
        {md(
          "The root has no arrows, because in USD you cannot push it below its own " +
            "sublayers - its opinions always win in this stack (only the session layer " +
            "stands higher). And “layer order” is not some hidden " +
            "setting, it is just the order of the lines in `subLayers`.",
        )}
      </p>
    </div>
  );
}
