import { useState, type ReactNode } from "react";
import { Highlight } from "./Highlight.tsx";
import type { Lang } from "../core/syntax.ts";

/** A code block with a label and a copy button (Lab, situations). */
export function CodeBlock({
  code,
  label,
  tone = "code",
  lang,
  extra,
}: {
  code: string;
  label: ReactNode;
  tone?: "code" | "output";
  lang?: Lang;
  /** Extra items in the header, next to the copy button. */
  extra?: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  return (
    <figure className="my-3">
      <figcaption className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs text-ink-faint">{label}</span>
        <span className="flex items-center gap-2">
          {extra}
          {tone === "code" && (
            <button
              onClick={copy}
              className="rounded border border-border px-2 py-0.5 text-[11px] text-ink-muted transition-colors hover:border-copper/50 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-copper"
            >
              {copied ? "copied ✓" : "copy"}
            </button>
          )}
        </span>
      </figcaption>
      <pre
        className={`overflow-auto rounded-lg border p-3 font-mono text-[12.5px] leading-relaxed ${
          tone === "output"
            ? "border-emerald-800/40 bg-emerald-950/20 text-emerald-100/90"
            : "border-border bg-code text-ink"
        }`}
      >
        {tone === "output" ? code : <Highlight code={code} lang={lang} />}
      </pre>
    </figure>
  );
}
