/* ===========================================================================
 * Chapters: the only navigation of the app.
 * Each chapter = one SPINE layer, and every chapter has the same four steps.
 * Content is not copied here: lessons, sandbox situations, quiz questions and
 * lab exercises already carry `layerIndex`, so a chapter just filters them.
 * ======================================================================== */
import { SPINE } from "./spine.ts";
import type { Step } from "../state/useAppStore.ts";

export interface Chapter {
  index: number;
  /** Label in the chapter bar. */
  short: string;
  title: string;
  summary: string;
  topics: { topic: string; weight: number }[];
  /** One key line shown under the summary, like a formula in a lab manual. */
  formula?: { text: string; note: string; /** mark the first capital of each word (acronyms) */ initials?: boolean };
}

const META: Record<number, Omit<Chapter, "index" | "topics">> = {
  0: {
    short: "Big Picture",
    title: "The Big Picture",
    summary:
      "What problem USD solves, and the one model everything else rests on: Sdf is what a file says, Usd is what the stage sees after composition.",
    formula: { text: "Sdf = what one layer says  ·  Usd = what the stage sees", note: "two views of the same data" },
  },
  1: {
    short: "Fundamentals",
    title: "Scene Description Fundamentals",
    summary:
      "Stage, prim and property. Attributes vs relationships, paths, time codes and time samples, file formats and metadata.",
  },
  2: {
    short: "Schemas",
    title: "Schemas",
    summary:
      "Typed (IsA) vs API schemas. Scope, Xform, XformCommonAPI and lights, and the UsdGeom, UsdShade and UsdLux domains.",
  },
  3: {
    short: "Composition",
    title: "Composition",
    summary:
      "How USD combines many layers into one stage: the layer stack, def / over / class, the composition arcs and value resolution. Every question here is the same question: which opinion wins, and why?",
    formula: {
      text: "Local › Inherits › VariantSets › rElocates › References › Payloads › Specializes",
      note: "LIVERPS · strongest → weakest",
      initials: true,
    },
  },
  4: {
    short: "Assets",
    title: "Asset Structure & Aggregation",
    summary:
      "Asset interface and parameterization, the reference / payload pattern, workstreams, model hierarchy and kinds.",
  },
  5: {
    short: "Instancing",
    title: "Modularity & Instancing",
    summary:
      "Scenegraph instancing (also nested), point instancing with PointInstancer, and how to refine an instance.",
  },
  6: {
    short: "Data Exchange",
    title: "Data Exchange Pipelines",
    summary:
      "Anatomy of a converter: extracting geometry and materials, transforming data, validating assets, export hooks.",
  },
  7: {
    short: "Debug & Extend",
    title: "Customizing & Debugging",
    summary:
      "Plugins, custom schemas, file format plugins, custom kinds and variant fallbacks. Then usdview, introspection and performance.",
  },
};

export const CHAPTERS: Chapter[] = SPINE.map((l) => ({
  index: l.index,
  topics: l.topics.filter((t) => t.weight > 0),
  ...META[l.index],
}));

export const STEPS: { id: Step; n: number; label: string; hint: string }[] = [
  { id: "learn", n: 1, label: "Learn", hint: "Lesson with apparatus you can play with" },
  { id: "predict", n: 2, label: "Predict", hint: "Guess what real USD prints, then see it" },
  { id: "check", n: 3, label: "Check", hint: "Exam-style questions with explanations" },
  { id: "run", n: 4, label: "Run", hint: "Optional · your own Python + USD" },
];
