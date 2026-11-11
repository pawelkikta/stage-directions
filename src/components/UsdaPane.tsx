import { Highlight } from "./Highlight.tsx";

/** A text view of .usda (read-only) with syntax colors. */
export function UsdaPane({ source, filename }: { source: string; filename?: string }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-code">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="font-mono text-xs text-copper-bright">
          {filename ?? "layer.usda"}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-ink-faint">
          Sdf view
        </span>
      </div>
      <pre className="flex-1 overflow-auto p-3 font-mono text-[12.5px] leading-relaxed text-ink">
        <Highlight code={source} lang="usda" />
      </pre>
    </div>
  );
}
