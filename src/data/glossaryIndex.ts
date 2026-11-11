/* ===========================================================================
 * Glossary index for term hints in lesson text.
 *
 * We link only what the lesson author already highlighted: `code` and **bold**,
 * when the WHOLE fragment is a term (or a variant of it). Plain text is left
 * alone - it would give false matches.
 * ======================================================================== */
import type { GlossaryEntry } from "../core/types.ts";
import { GLOSSARY } from "./glossary.ts";

/** Too general or misleading to underline in text. */
const NO_LINK = new Set(["usd", "openusd", "uniform", "custom"]);

/** Forms used in the lessons that cannot be derived from the term name. */
const EXTRA: Record<string, string> = {
  arc: "Composition Arc",
  arcs: "Composition Arc",
  "composition arcs": "Composition Arc",
  variant: "Variant Set",
  variants: "Variant Set",
  timecodes: "TimeCode / TimeSamples",
  "native instancing": "Scenegraph Instancing",
  "scenegraph (native) instancing": "Scenegraph Instancing",
  "point instancing": "PointInstancer",
  component: "Kind",
  subcomponent: "Kind",
  assembly: "Kind",
  instanceable: "Scenegraph Instancing",
  "instanceable = true": "Scenegraph Instancing",
};

const norm = (s: string) => s.trim().toLowerCase().replace(/\(\)$/, "");

function keysOf(e: GlossaryEntry): Set<string> {
  const keys = new Set<string>();
  const add = (s: string) => {
    const k = norm(s);
    if (k) keys.add(k);
  };
  add(e.term);
  const paren = e.term.match(/^(.*?)\s*\((.*?)\)\s*(.*)$/);
  if (paren) {
    add(paren[1]);
    add(paren[2]);
    if (paren[3]) add(`${paren[1]} ${paren[3]}`);
  }
  if (e.term.includes("/")) e.term.split("/").forEach(add);
  e.aliases?.forEach(add);
  for (const k of [...keys]) {
    if (k.includes(" ")) keys.add(k.replace(/ /g, ""));
  }
  for (const k of [...keys]) {
    if (/^[a-z ]+$/.test(k) && !k.endsWith("s")) keys.add(`${k}s`);
  }
  return keys;
}

const INDEX = new Map<string, GlossaryEntry>();
for (const e of GLOSSARY) {
  for (const k of keysOf(e)) {
    if (!NO_LINK.has(k) && !INDEX.has(k)) INDEX.set(k, e);
  }
}
for (const [k, term] of Object.entries(EXTRA)) {
  const e = GLOSSARY.find((g) => g.term === term);
  if (e && !INDEX.has(k)) INDEX.set(k, e);
}

/** The glossary entry, if the whole text fragment is a term. */
export function findTerm(text: string): GlossaryEntry | undefined {
  return INDEX.get(norm(text));
}
