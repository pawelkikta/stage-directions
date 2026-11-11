/* Chapter content: filters lessons, sandbox, quiz and lab by layerIndex. */
import { LESSONS, type Lesson } from "./lessons.ts";
import { SANDBOX, type SandboxItem } from "./sandbox.ts";
import { QUIZ_BANK, type Question } from "./quiz.ts";
import {
  LAB_STEPS,
  LAB_STUDIO_STEPS,
  LAB_CUSTOM_STEPS,
  LAB_CONVERTER_STEPS,
  type LabStep,
} from "./lab.ts";

const TRACKS: { name: string; steps: LabStep[] }[] = [
  { name: "Track 1 · Mechanisms", steps: LAB_STEPS },
  { name: "Track 2 · Studio", steps: LAB_STUDIO_STEPS },
  { name: "Track 3 · Customizing", steps: LAB_CUSTOM_STEPS },
  { name: "Track 4 · Converter", steps: LAB_CONVERTER_STEPS },
];

export interface LabEntry {
  step: LabStep;
  track: string;
  /** Number inside the whole Lab (1-based), the same as on the Lab page. */
  number: number;
}

const LAB_ALL: LabEntry[] = (() => {
  let n = 0;
  return TRACKS.flatMap((t) => t.steps.map((step) => ({ step, track: t.name, number: ++n })));
})();

export interface ChapterContent {
  lesson?: Lesson;
  predict: SandboxItem[];
  bugs: SandboxItem[];
  quiz: Question[];
  lab: LabEntry[];
  widgets: number;
}

export function chapterContent(index: number): ChapterContent {
  const lesson = LESSONS.find((l) => l.layerIndex === index);
  return {
    lesson,
    predict: SANDBOX.filter((s) => s.layerIndex === index && s.mode === "predict"),
    bugs: SANDBOX.filter((s) => s.layerIndex === index && s.mode === "bug"),
    quiz: QUIZ_BANK.filter((q) => q.layerIndex === index),
    lab: LAB_ALL.filter((e) => e.step.layerIndex === index),
    widgets: lesson?.blocks.filter((b) => b.kind === "widget").length ?? 0,
  };
}
