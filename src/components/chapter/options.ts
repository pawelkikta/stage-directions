/** One look for answer options everywhere (self-checks, chapter drill). */
export type OptionState = "idle" | "correct" | "wrong" | "dim";

export const OPTION_TONE: Record<OptionState, string> = {
  idle: "border-border bg-bg-panel text-ink-muted hover:border-copper hover:text-ink",
  correct: "border-emerald-600 bg-emerald-900/20 text-emerald-200",
  wrong: "border-red-600 bg-red-900/20 text-red-200",
  dim: "border-border bg-bg-panel text-ink-faint",
};

export const OPTION_BASE =
  "w-full border px-4 py-2.5 text-left text-[15px] leading-snug transition-colors disabled:cursor-default";

export function optionState(i: number, picked: number | null, answer: number): OptionState {
  if (picked === null) return "idle";
  if (i === answer) return "correct";
  if (i === picked) return "wrong";
  return "dim";
}
