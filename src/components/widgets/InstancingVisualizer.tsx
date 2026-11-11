import { useState } from "react";

type Mode = "copies" | "native" | "point";

const MODE_INFO: Record<
  Mode,
  { label: string; desc: string; uniqueData: (n: number) => string }
> = {
  copies: {
    label: "Copies (def × N)",
    desc:
      "Each copy is a full, independent subtree. Editable separately, but memory and time grow linearly with N.",
    uniqueData: (n) => `${n} × a full subtree`,
  },
  native: {
    label: "Scenegraph (native) instancing",
    desc:
      "Identical prims with instanceable=true share ONE prototype. The inside of an instance is read-only - an override only on the instance root, or de-instancing.",
    uniqueData: () => `1 prototype + N light instances`,
  },
  point: {
    label: "PointInstancer",
    desc:
      "The arrays positions[] + protoIndices[] + orientations[]/scales[] map N points to prototypes. A vectorized format - hundreds of thousands of instances, compactly.",
    uniqueData: (n) => `1 prototype + arrays of length ${n}`,
  },
};

export function InstancingVisualizer() {
  const [n, setN] = useState(12);
  const [mode, setMode] = useState<Mode>("native");
  const info = MODE_INFO[mode];

  // a relative "memory cost" (an intuition, not real bytes)
  const cost =
    mode === "copies" ? n * 10 : mode === "native" ? 10 + n * 1 : 10 + n * 0.4;
  const costMax = n * 10;
  const pct = Math.round((cost / costMax) * 100);

  const shown = Math.min(n, 48);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          N ={" "}
          <input
            type="range"
            min={1}
            max={200}
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
            className="accent-copper"
          />
          <span className="w-10 font-mono text-gold-soft">{n}</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(MODE_INFO) as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-md border px-2.5 py-1 text-sm transition-colors ${
                mode === m
                  ? "border-copper/50 bg-copper/15 text-gold-soft"
                  : "border-border text-ink-muted hover:text-ink hover:bg-bg-elev"
              }`}
            >
              {MODE_INFO[m].label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* the instances */}
        <div className="rounded-lg border border-border bg-bg-panel p-3">
          <p className="mb-2 text-xs uppercase tracking-wider text-ink-faint">
            {n} instances {n > shown && `(showing ${shown})`}
          </p>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: shown }).map((_, i) => (
              <div
                key={i}
                className={`h-5 w-5 rounded-sm border ${
                  mode === "copies"
                    ? "border-amber-600/50 bg-amber-700/30"
                    : "border-copper/50 bg-copper/25"
                }`}
                title={mode === "copies" ? "an independent copy" : "instance → prototype"}
              />
            ))}
          </div>
          {mode !== "copies" && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[11px] text-ink-faint">prototype:</span>
              <div className="h-6 w-6 rounded border border-gold/60 bg-gold/20" />
              <span className="text-[11px] text-ink-muted">
                shared by all of them
              </span>
            </div>
          )}
        </div>

        {/* cost + description */}
        <div className="rounded-lg border border-border bg-bg-panel p-3">
          <p className="mb-1 text-xs uppercase tracking-wider text-ink-faint">
            Memory intuition (relative)
          </p>
          <div className="mb-1 h-4 w-full overflow-hidden rounded bg-bg-elev">
            <div
              className={`h-full ${
                mode === "copies" ? "bg-amber-600" : "bg-copper"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mb-3 font-mono text-xs text-ink-muted">
            {info.uniqueData(n)} · ~{pct}% of the cost of N copies
          </p>
          <p className="text-[13px] leading-relaxed text-ink-muted">{info.desc}</p>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-ink-faint">
        Native instancing and point instancing are two different mechanisms. Native: a hierarchy
        of instanceable prims. Point: one PointInstancer with arrays - for masses (forests, crowds).
      </p>
    </div>
  );
}
