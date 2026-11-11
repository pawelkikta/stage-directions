import { useMemo } from "react";
import { tokenize, tokenizeLines, type Lang, type Tok } from "../core/syntax.ts";

const cls = (tok: Tok) => (tok.k === "text" ? undefined : `syn-${tok.k}`);

/** Colored code to put in a <pre>. The language is guessed when not given. */
export function Highlight({ code, lang }: { code: string; lang?: Lang }) {
  const toks = useMemo(() => tokenize(code, lang), [code, lang]);
  return (
    <>
      {toks.map((tok, i) => (
        <span key={i} className={cls(tok)}>
          {tok.t}
        </span>
      ))}
    </>
  );
}

/** Code line by line - when a view decorates single lines (for example the winner). */
export function HighlightLines({
  code,
  lang,
  lineClass,
}: {
  code: string;
  lang?: Lang;
  lineClass?: (line: string, index: number) => string | undefined;
}) {
  const lines = useMemo(() => tokenizeLines(code, lang), [code, lang]);
  const raw = useMemo(() => code.split("\n"), [code]);
  return (
    <>
      {lines.map((line, i) => (
        <div key={i} className={lineClass?.(raw[i] ?? "", i)}>
          {line.length ? line.map((tok, j) => <span key={j} className={cls(tok)}>{tok.t}</span>) : " "}
        </div>
      ))}
    </>
  );
}
