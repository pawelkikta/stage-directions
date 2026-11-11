import { useEffect, useMemo, useState } from "react";
import {
  LIVERPS_ORDER,
  LIVERPS_LETTER,
  liverpsRank,
  type ArcType,
} from "../../core/types.ts";
import {
  resolve,
  fmtVal,
  SCENARIOS,
  type Opinion,
} from "../../core/composition.ts";

const ARC_NAME: Record<ArcType, string> = {
  local: "Local",
  inherit: "Inherits",
  variant: "Variants",
  relocate: "rElocates",
  reference: "References",
  payload: "Payloads",
  specialize: "Specializes",
};

export function ValueResolutionCalc() {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const scenario = SCENARIOS.find((s) => s.id === scenarioId)!;
  const [opinions, setOpinions] = useState<Opinion[]>(scenario.opinions);

  useEffect(() => {
    setOpinions(scenario.opinions.map((o) => ({ ...o })));
  }, [scenario]);

  const { ordered, winner } = useMemo(() => resolve(opinions), [opinions]);
  const winnerRank = winner ? liverpsRank(winner.arc) : 99;

  const toggle = (id: string) =>
    setOpinions((os) =>
      os.map((o) => (o.id === id ? { ...o, enabled: !o.enabled } : o)),
    );

  // narracja skanu po arcach LIVERPS
  const steps = LIVERPS_ORDER.map((arc) => {
    const hit = opinions.find((o) => o.arc === arc && o.enabled);
    return { arc, hit, rank: liverpsRank(arc) };
  });

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
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
        <code className="font-mono text-xs text-copper-bright">
          {scenario.attributePath}
        </code>
        <span className="rounded bg-bg-elev px-1.5 py-0.5 text-[11px] text-ink-muted">
          {scenario.valueType}
        </span>
      </div>

      {/* the table of opinions, sorted by strength */}
      <div className="mb-4 overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-ink-faint">
            <th className="py-1.5 pr-2">#</th>
            <th className="py-1.5 pr-2">Arc</th>
            <th className="py-1.5 pr-2">Value</th>
            <th className="py-1.5 pr-2">Source</th>
            <th className="py-1.5 pr-2">On</th>
            <th className="py-1.5">Status</th>
          </tr>
        </thead>
        <tbody>
          {ordered.length === 0 && (
            <tr>
              <td colSpan={6} className="py-3 text-center text-ink-faint">
                No enabled opinions - the attribute has no value on the stage.
              </td>
            </tr>
          )}
          {[...opinions]
            .sort(
              (a, b) =>
                liverpsRank(a.arc) - liverpsRank(b.arc) ||
                (a.subStrength ?? 0) - (b.subStrength ?? 0),
            )
            .map((o) => {
              const isWinner = o.id === winner?.id;
              return (
                <tr
                  key={o.id}
                  className={`border-b border-border/50 ${
                    isWinner ? "bg-gold/5" : ""
                  }`}
                >
                  <td className="py-1.5 pr-2 font-mono text-copper-bright">
                    {LIVERPS_LETTER[o.arc]}
                  </td>
                  <td className="py-1.5 pr-2 text-ink-muted">{ARC_NAME[o.arc]}</td>
                  <td className="py-1.5 pr-2 font-mono text-ink">
                    {fmtVal(o.value)}
                    {o.label && <span className="ml-1 font-sans text-ink-faint">{o.label}</span>}
                  </td>
                  <td className="py-1.5 pr-2 text-[11px] text-ink-faint">
                    {o.source}
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      type="checkbox"
                      checked={o.enabled}
                      onChange={() => toggle(o.id)}
                      className="accent-copper"
                    />
                  </td>
                  <td className="py-1.5">
                    {!o.enabled ? (
                      <span className="text-[11px] text-ink-faint">off</span>
                    ) : isWinner ? (
                      <span className="rounded bg-copper/20 px-2 py-0.5 text-[11px] font-semibold text-gold-soft">
                        WINS
                      </span>
                    ) : (
                      <span className="text-[11px] text-ink-faint">
                        {liverpsRank(o.arc) < winnerRank ? "-" : "overridden"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
      </div>

      {/* the scan, step by step */}
      <div className="rounded-lg border border-border bg-bg-panel p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">
          The value resolution scan (LIVERPS)
        </p>
        <ol className="space-y-1 text-[13px]">
          {steps.map((s, i) => {
            const reached = s.rank <= winnerRank;
            const isWin = s.hit && s.hit.id === winner?.id;
            return (
              <li
                key={s.arc}
                className={`flex items-center gap-2 ${
                  reached ? "" : "opacity-40"
                }`}
              >
                <span className="font-mono text-copper-bright">
                  {i + 1}. {LIVERPS_LETTER[s.arc]}
                </span>
                <span className="text-ink-muted">{ARC_NAME[s.arc]}</span>
                {isWin ? (
                  <span className="text-gold-soft">
                    → has an opinion {fmtVal(s.hit!.value)} ·{" "}
                    <strong>RESULT</strong>
                  </span>
                ) : s.rank < winnerRank ? (
                  <span className="text-ink-faint">→ no opinion, go on</span>
                ) : (
                  <span className="text-ink-faint">→ not checked</span>
                )}
              </li>
            );
          })}
        </ol>
        <div className="mt-3 flex items-center gap-2 border-t border-border pt-2">
          <span className="text-xs uppercase tracking-wider text-ink-faint">
            Result
          </span>
          <span className="font-mono text-base font-bold text-gold-soft">
            {winner ? fmtVal(winner.value) : "- none"}
          </span>
        </div>
      </div>
    </div>
  );
}
