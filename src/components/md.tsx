import type { ReactNode } from "react";
import { findTerm } from "../data/glossaryIndex.ts";
import { Term } from "./Term.tsx";

const CODE_CLASS =
  "rounded bg-bg-elev px-1 py-0.5 font-mono text-[0.85em] text-copper-bright";

export interface MdOptions {
  /** Attach glossary terms to `code` and **bold** (a tooltip with the definition). */
  terms?: boolean;
}

/** Wraps an element in a glossary tooltip when its whole text is a term. */
function linked(text: string, node: ReactNode, key: number, opts: MdOptions): ReactNode {
  const entry = opts.terms ? findTerm(text) : undefined;
  return entry ? (
    <Term key={key} entry={entry}>
      {node}
    </Term>
  ) : (
    node
  );
}

/**
 * Only `code` - also used INSIDE **bold** / *italic*, because the alternative
 * `**[^*]+**` would swallow backticks as plain text.
 */
function withCode(text: string, nextKey: () => number, opts: MdOptions): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /`[^`]+`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const inner = m[0].slice(1, -1);
    const k = nextKey();
    out.push(
      linked(
        inner,
        <code key={k} className={CODE_CLASS}>
          {inner}
        </code>,
        nextKey(),
        opts,
      ),
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Minimal inline markdown: **bold**, *italic*, `code` and line breaks on \n. */
export function md(text: string, opts: MdOptions = {}): ReactNode[] {
  const out: ReactNode[] = [];
  let key = 0;
  const nextKey = () => key++;

  text.split("\n").forEach((line, lineIdx) => {
    // \n in the text = a real line break (otherwise HTML would collapse it into a space)
    if (lineIdx > 0) out.push(<br key={nextKey()} />);

    // the order in the alternation matters: **bold** before *italic*
    const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
      if (m.index > last) out.push(line.slice(last, m.index));
      const tok = m[0];
      if (tok.startsWith("**")) {
        const inner = tok.slice(2, -2);
        const plain = inner.replace(/`/g, "");
        // the whole bold text is a term -> do not attach the code inside separately
        const whole = opts.terms && findTerm(plain);
        const k = nextKey();
        out.push(
          linked(
            plain,
            <strong key={k} className="font-semibold text-ink">
              {withCode(inner, nextKey, whole ? {} : opts)}
            </strong>,
            nextKey(),
            opts,
          ),
        );
      } else if (tok.startsWith("*")) {
        out.push(
          <em key={nextKey()} className="text-ink-muted">
            {withCode(tok.slice(1, -1), nextKey, opts)}
          </em>,
        );
      } else {
        const inner = tok.slice(1, -1);
        const k = nextKey();
        out.push(
          linked(
            inner,
            <code key={k} className={CODE_CLASS}>
              {inner}
            </code>,
            nextKey(),
            opts,
          ),
        );
      }
      last = m.index + tok.length;
    }
    if (last < line.length) out.push(line.slice(last));
  });

  return out;
}

/** md with glossary terms attached - for lesson and Lab text. */
export const mdt = (text: string) => md(text, { terms: true });
