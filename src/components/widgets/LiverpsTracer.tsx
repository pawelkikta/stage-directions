import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { LIVERPS_ORDER, LIVERPS_LETTER, liverpsRank, type ArcType } from "../../core/types.ts";
import {
  resolve,
  fmtVal,
  SCENARIOS,
  type Opinion,
  type ResolutionScenario,
} from "../../core/composition.ts";
import { arcItemName, buildFiles, counts, parseValue } from "../../core/liverpsFile.ts";
import { md } from "../md.tsx";
import { HighlightLines } from "../Highlight.tsx";

const ARC_NAME: Record<ArcType, string> = {
  local: "Local (sublayers)",
  inherit: "Inherits",
  variant: "Variants",
  relocate: "rElocates",
  reference: "References",
  payload: "Payloads",
  specialize: "Specializes",
};

/** The opinion's name in the file: fixed from the moment it is created. */
function nameOf(s: ResolutionScenario, o: Opinion, index: number): string {
  return o.name ?? arcItemName(s, o.arc, index);
}

/** What the opinion is called in the UI. */
function sourceLabel(s: ResolutionScenario, o: Opinion, index: number): string {
  const name = nameOf(s, o, index);
  switch (o.arc) {
    case "local":
      return name === s.names.local ? "shot.usda (root layer)" : `${name} (sublayer)`;
    case "inherit":
    case "specialize":
      return `class ${name}`;
    case "variant":
      return `variantSet "${name}" = "${name === s.names.variant ? s.variantSelection : "on"}"`;
    default:
      return `@${name}@`;
  }
}

let newId = 1000;

/** A copy of the scenario's opinions; each gets a fixed name in the file. */
const seed = (s: ResolutionScenario): Opinion[] =>
  s.opinions.map((o) => ({ ...o, name: o.name ?? s.names[o.arc] }));

export function LiverpsTracer() {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const scenario = useMemo<ResolutionScenario>(
    () => SCENARIOS.find((s) => s.id === scenarioId)!,
    [scenarioId],
  );
  const [opinions, setOpinions] = useState<Opinion[]>(() => seed(scenario));
  /** Text typed in the opinions' manual fields (the value is computed from it). */
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [step, setStep] = useState<number>(-1); // -1 = static; 0..6 = scan
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setOpinions(seed(scenario));
    setDrafts({});
    setStep(-1);
    setPlaying(false);
  }, [scenario]);

  const valid = useMemo(() => opinions.filter((o) => counts(scenario, o)), [opinions, scenario]);
  const { winner } = useMemo(() => resolve(valid), [valid]);
  const winnerRank = winner ? liverpsRank(winner.arc) : 99;
  const files = useMemo(() => buildFiles(scenario, opinions, winner?.id), [scenario, opinions, winner]);

  useEffect(() => {
    if (!playing) return;
    const arc = LIVERPS_ORDER[step];
    const laneHas = valid.some((o) => o.arc === arc);
    if (laneHas || step >= LIVERPS_ORDER.length - 1) {
      const t = setTimeout(() => setPlaying(false), 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep((s) => s + 1), 650);
    return () => clearTimeout(t);
  }, [playing, step, valid]);

  const stopTrace = () => {
    setStep(-1);
    setPlaying(false);
  };
  const change = (fn: (os: Opinion[]) => Opinion[]) => {
    stopTrace();
    setOpinions(fn);
  };

  const toggle = (id: string) =>
    change((os) => os.map((o) => (o.id === id ? { ...o, enabled: !o.enabled } : o)));

  const addOpinion = (arc: ArcType) => {
    const id = `n${newId++}`;
    setDrafts((d) => ({ ...d, [id]: "" }));
    change((os) => {
      const last = os.map((o) => o.arc).lastIndexOf(arc);
      const taken = new Set(os.filter((o) => o.arc === arc).map((o, i) => nameOf(scenario, o, i)));
      let k = 1;
      while (taken.has(arcItemName(scenario, arc, k))) k++;
      const fresh: Opinion = { id, arc, value: null, source: "", enabled: true, name: arcItemName(scenario, arc, k) };
      const next = [...os];
      next.splice(last === -1 ? next.length : last + 1, 0, fresh);
      return next;
    });
  };

  const removeOpinion = (id: string) => change((os) => os.filter((o) => o.id !== id));

  const editValue = (id: string, text: string) => {
    setDrafts((d) => ({ ...d, [id]: text }));
    change((os) => os.map((o) => (o.id === id ? { ...o, value: parseValue(scenario, text) } : o)));
  };

  /** Swap with the previous opinion of the same arc = move up in the list. */
  const moveUp = (id: string) =>
    change((os) => {
      const i = os.findIndex((o) => o.id === id);
      let j = i - 1;
      while (j >= 0 && os[j].arc !== os[i].arc) j--;
      if (j < 0) return os;
      const next = [...os];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const scanning = playing || step !== -1;
  const valueText = (o: Opinion) => `${fmtVal(o.value)}${o.label ? ` ${o.label}` : ""}`;
  const placeholder = scenario.attr.type === "float" ? "number" : "r, g, b";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={scenarioId}
            onChange={(e) => setScenarioId(e.target.value)}
            className="rounded-md border border-border bg-bg-elev px-2 py-1 text-sm text-ink"
          >
            {SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
          <code className="font-mono text-xs text-copper-bright">{scenario.attributePath}</code>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={playing ? stopTrace : () => (setStep(0), setPlaying(true))}
            className="rounded-md border border-copper/40 bg-copper/15 px-3 py-1.5 text-sm text-gold-soft hover:bg-copper/25"
          >
            {playing ? "■ Stop" : "▶ Trace LIVERPS"}
          </button>
          {step !== -1 && !playing && (
            <button
              onClick={stopTrace}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-ink-muted hover:text-ink"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <p className="mb-4 text-xs text-ink-faint">{scenario.description}</p>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-gold/30 bg-gold/5 px-4 py-3">
        <span className="text-xs uppercase tracking-wider text-ink-faint">Get()</span>
        {winner ? (
          <>
            <span className="font-mono text-lg font-bold text-gold-soft">{valueText(winner)}</span>
            <span className="rounded bg-bg-elev px-2 py-0.5 text-xs text-ink-muted">
              wins: {LIVERPS_LETTER[winner.arc]} · {ARC_NAME[winner.arc]} ·{" "}
              {sourceLabel(scenario, winner, opinions.filter((o) => o.arc === winner.arc).indexOf(winner))}
            </span>
          </>
        ) : scenario.schemaDefault ? (
          <>
            <span className="font-mono text-lg font-bold text-gold-soft">
              {fmtVal(scenario.schemaDefault.value)}
            </span>
            <span className="rounded bg-bg-elev px-2 py-0.5 text-xs text-ink-muted">
              no opinion - {scenario.schemaDefault.note}
            </span>
          </>
        ) : (
          <span className="font-mono text-lg font-bold text-gold-soft">None - no opinion</span>
        )}
      </div>

      <div className="mb-1 flex justify-between px-1 text-[11px] text-ink-faint">
        <span>↑ stronger arc</span>
        <span>in a lane: the stronger opinion is on the left</span>
      </div>
      <div className="flex flex-col gap-2">
        {LIVERPS_ORDER.map((arc, idx) => {
          const laneOps = opinions.filter((o) => o.arc === arc);
          const laneValid = laneOps.some((o) => counts(scenario, o));
          const isWinnerLane = winner?.arc === arc;
          const beingChecked = scanning && step === idx;
          const revealed = !scanning || step >= idx;
          const dimmed = scanning ? step < idx : idx > winnerRank;

          let status: string | null = null;
          if (beingChecked) status = laneValid ? "← wins here" : "empty → go on";
          else if (revealed && isWinnerLane) status = "WINS";
          else if (revealed && idx < winnerRank) status = "no opinion → go on";
          else if (!scanning && idx > winnerRank) status = "not checked";

          return (
            <motion.div
              key={arc}
              animate={{ opacity: dimmed ? 0.55 : 1 }}
              className={`flex items-stretch gap-3 rounded-lg border bg-bg-panel p-2 transition-colors duration-300 ${
                beingChecked ? "border-gold" : isWinnerLane && revealed ? "border-copper" : "border-border"
              }`}
            >
              <div className="flex w-20 shrink-0 flex-col items-center justify-center rounded-md bg-bg-elev py-1 sm:w-28">
                <span
                  className={`font-mono text-lg font-bold ${
                    isWinnerLane && revealed ? "text-gold-soft" : "text-copper-bright"
                  }`}
                >
                  {LIVERPS_LETTER[arc]}
                </span>
                <span className="text-center text-[10px] text-ink-muted">{ARC_NAME[arc]}</span>
                {idx === 0 && <span className="text-[9px] text-emerald-400">strongest</span>}
                {idx === LIVERPS_ORDER.length - 1 && (
                  <span className="text-[9px] text-red-400">weakest</span>
                )}
              </div>

              <div className="flex flex-1 flex-wrap items-center gap-2">
                {arc === "relocate" ? (
                  <span className="text-xs text-ink-faint">
                    {md("relocates moves prims in the namespace - this `shot.usda` has none")}
                  </span>
                ) : (
                  <>
                    {laneOps.length === 0 && <span className="text-xs text-ink-faint">no opinion</span>}
                    {laneOps.map((o, i) => {
                      const manual = o.id.startsWith("n");
                      const ok = counts(scenario, o);
                      const isWinner = o.id === winner?.id;
                      const canMoveUp = i > 0 && !(arc === "local" && i === 1);
                      return (
                        <div
                          key={o.id}
                          className={`flex items-center gap-1.5 rounded-md border px-2 py-1 ${
                            isWinner
                              ? "border-gold/50 bg-gold/10"
                              : o.enabled
                                ? "border-border bg-bg-elev"
                                : "border-dashed border-border opacity-50"
                          }`}
                        >
                          {laneOps.length > 1 && (
                            <span className="font-mono text-[10px] text-ink-faint">{i + 1}.</span>
                          )}
                          <input
                            type="checkbox"
                            checked={o.enabled}
                            onChange={() => toggle(o.id)}
                            aria-label="opinion enabled"
                            className="accent-copper"
                          />
                          {manual ? (
                            <input
                              value={drafts[o.id] ?? ""}
                              placeholder={placeholder}
                              onChange={(e) => editValue(o.id, e.target.value)}
                              className={`w-24 rounded border bg-bg px-1 font-mono text-xs text-ink ${
                                ok || !o.enabled ? "border-border" : "border-red-400/60"
                              }`}
                            />
                          ) : (
                            <span className="font-mono text-xs text-ink">{valueText(o)}</span>
                          )}
                          <span className="text-[10px] text-ink-faint">{sourceLabel(scenario, o, i)}</span>
                          {canMoveUp && (
                            <button
                              onClick={() => moveUp(o.id)}
                              title="move up in the list (stronger)"
                              className="text-[11px] text-ink-faint hover:text-copper-bright"
                            >
                              ◀
                            </button>
                          )}
                          {manual && (
                            <button
                              onClick={() => removeOpinion(o.id)}
                              aria-label="remove opinion"
                              className="text-ink-faint hover:text-red-400"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      );
                    })}
                    <button
                      onClick={() => addOpinion(arc)}
                      className="rounded border border-dashed border-border px-1.5 text-xs text-ink-faint hover:text-copper-bright"
                      title={`Add an opinion to ${ARC_NAME[arc]}`}
                    >
                      + add
                    </button>
                  </>
                )}
              </div>

              <div className="flex w-20 shrink-0 items-center justify-end pr-1 text-right sm:w-28">
                {status === "WINS" ? (
                  <span className="rounded bg-copper/20 px-2 py-0.5 text-[11px] font-semibold text-gold-soft">
                    WINS
                  </span>
                ) : status ? (
                  <span
                    className={`text-[11px] ${status === "← wins here" ? "text-gold-soft" : "text-ink-faint"}`}
                  >
                    {status}
                  </span>
                ) : null}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {files.map((f) => (
          <figure key={f.name} className="overflow-hidden rounded-lg border border-border bg-code">
            <figcaption className="border-b border-border px-3 py-1.5 text-[11px] text-ink-faint">
              <span className="font-mono text-ink-muted">{f.name}</span>
              {f.name === "shot.usda" && " - the file that gives exactly these opinions"}
            </figcaption>
            <pre className="max-h-[420px] overflow-auto p-3 font-mono text-[12px] leading-relaxed text-ink">
              <HighlightLines
                code={f.text}
                lang="usda"
                lineClass={(ln) => (ln.includes("# <- wins") ? "-mx-3 bg-gold/10 px-3" : undefined)}
              />
            </pre>
          </figure>
        ))}
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-ink-muted">
        {md(
          scenario.id !== "lamp-intensity"
            ? "**Try it:** switch Local off - the color from `@chair.usd@` wins. Switch that one off too - " +
              "gray from `_BaseChair` is left, because specializes is the weakest, but it is still " +
              "an opinion. Switch everything off: `displayColor` has no default value in the schema, " +
              "so `Get()` returns `None`."
            : "**Try it:** switch Local off - Inherits wins. Add a second reference with a different " +
            "number: as long as `@lamp.usd@` has an opinion, the new one does not win, because it stands later in the " +
            "`references` list. Move it to the front with the ◀ arrow and watch `prepend references` " +
            "in the file. Finally switch everything off: `Get()` does not return nothing, but the default " +
            "value from the schema (lesson L7).",
        )}
      </p>
      <p className="mt-2 text-[12px] leading-relaxed text-ink-faint">
        {md(
          "A flat scan works here, because all the arcs sit on **one prim in shot.usda**. " +
            "If the variant `quality` were written inside `lamp.usd`, then in that file " +
            "the value written directly (500) would beat the variant (800) - LIVERPS also counts " +
            "inside each reference. This is the trap from lesson L5.",
        )}
      </p>
    </div>
  );
}
