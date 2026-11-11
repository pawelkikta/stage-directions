interface Panel {
  name: string;
  what: string;
  tie: string;
}

const PANELS: Panel[] = [
  {
    name: "Tree / Outliner",
    what: "The prim hierarchy of the composed stage (paths, type, kind).",
    tie: "= our scenegraph explorer.",
  },
  {
    name: "Viewport",
    what: "The 3D preview. The prim is in the tree, but you cannot see it? → visibility / purpose / active.",
    tie: "Render debugging.",
  },
  {
    name: "Property / Meta",
    what: "The properties of the selected prim + the composed values and metadata.",
    tie: "= the result of value resolution.",
  },
  {
    name: "Composition (Layer Stack)",
    what: "Where an opinion comes from: the layers and arcs that contribute to the prim.",
    tie: "⭐ = the LIVERPS tracer in real life.",
  },
  {
    name: "Time slider",
    what: "Scrubbing time - shows the timeSamples of attributes.",
    tie: "= TimeCode / animation.",
  },
];

export function UsdviewTour() {
  return (
    <div>
      {/* a mock usdview window */}
      <div className="overflow-hidden rounded-lg border border-border bg-code">
        <div className="flex items-center gap-2 border-b border-border bg-bg-panel px-3 py-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
          <span className="ml-2 font-mono text-[11px] text-ink-faint">usdview shot.usda</span>
        </div>
        <div className="grid grid-cols-1 gap-2 p-2 sm:grid-cols-[1fr_1.3fr_1fr]">
          <div className="rounded border border-sky-700/30 bg-bg-panel p-2">
            <p className="text-[11px] font-semibold text-sky-300">Tree / Outliner</p>
            <pre className="mt-1 font-mono text-[10px] leading-relaxed text-ink-muted">
{`/World  Xform
 ├ Ball  Sphere
 └ Key   SphereLight`}
            </pre>
          </div>
          <div className="flex min-h-[80px] items-center justify-center rounded border border-emerald-700/30 bg-bg-elev p-2">
            <span className="text-[11px] text-ink-faint">◐ Viewport (3D preview)</span>
          </div>
          <div className="rounded border border-violet-700/30 bg-bg-panel p-2">
            <p className="text-[11px] font-semibold text-violet-300">Property / Composition</p>
            <pre className="mt-1 font-mono text-[10px] leading-relaxed text-ink-muted">
{`radius = 2.0
 ← shot.usda (Local)
 ← chair.usd (Ref)`}
            </pre>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-border px-3 py-1.5">
          <span className="font-mono text-[10px] text-ink-faint">⏱</span>
          <div className="h-1 flex-1 rounded bg-bg-elev">
            <div className="h-1 w-1/3 rounded bg-copper" />
          </div>
          <span className="font-mono text-[10px] text-ink-faint">time 1-24</span>
        </div>
      </div>

      {/* panel legend */}
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {PANELS.map((p) => (
          <div key={p.name} className="rounded-lg border border-border bg-bg-panel p-2.5">
            <p className="text-[13px] font-medium text-ink">{p.name}</p>
            <p className="text-[12px] leading-relaxed text-ink-muted">{p.what}</p>
            <p className="mt-0.5 text-[11px] text-copper-bright">{p.tie}</p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] text-ink-faint">
        The debugging workflow: select a prim → the Composition panel shows which layer or arc
        won the opinion (the same as the tracer). It is the first place you look when
        a value is “wrong”.
      </p>
    </div>
  );
}
