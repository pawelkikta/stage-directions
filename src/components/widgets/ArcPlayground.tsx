import { useState } from "react";
import { ARC_INFO } from "../../core/composition.ts";
import { LIVERPS_LETTER, liverpsRank } from "../../core/types.ts";
import { Highlight } from "../Highlight.tsx";

function Code({
  title,
  file,
  src,
  accent,
}: {
  title: string;
  file: string;
  src: string;
  accent: string;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-code">
      <div className="border-b border-border px-3 py-1.5">
        <span className={`text-[11px] font-semibold uppercase tracking-wider ${accent}`}>
          {title}
        </span>
        <span className="ml-2 font-mono text-[11px] text-ink-faint">{file}</span>
      </div>
      <pre className="overflow-auto p-3 font-mono text-[12px] leading-relaxed text-ink">
        <Highlight code={src} lang="usda" />
      </pre>
    </div>
  );
}

export function ArcPlayground() {
  const [idx, setIdx] = useState(0);
  const info = ARC_INFO[idx];

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {ARC_INFO.map((a, i) => (
          <button
            key={a.arc}
            onClick={() => setIdx(i)}
            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm transition-colors ${
              i === idx
                ? "border-copper/50 bg-copper/15 text-gold-soft"
                : "border-border text-ink-muted hover:text-ink hover:bg-bg-elev"
            }`}
          >
            <span className="font-mono font-bold">{LIVERPS_LETTER[a.arc]}</span>
            {a.name_en}
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-center gap-2">
        <span className="rounded bg-bg-elev px-2 py-0.5 text-[11px] text-ink-muted">
          strength #{liverpsRank(info.arc) + 1} / 7
        </span>
        <p className="text-sm text-ink-muted">{info.oneLiner}</p>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Code
          title="Before"
          file={info.beforeFile}
          src={info.before}
          accent="text-ink-muted"
        />
        <Code
          title="After (with the arc)"
          file={info.afterFile}
          src={info.after}
          accent="text-copper-bright"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-emerald-700/40 bg-emerald-900/10 p-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-300">
            When to use
          </p>
          <ul className="list-disc space-y-1 pl-4 text-[13px] text-ink-muted">
            {info.whenUse.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-red-700/40 bg-red-900/10 p-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-red-300">
            When NOT to
          </p>
          <ul className="list-disc space-y-1 pl-4 text-[13px] text-ink-muted">
            {info.whenAvoid.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
