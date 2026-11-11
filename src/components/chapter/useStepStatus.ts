import type { ChapterContent } from "../../data/chapterContent.ts";
import type { Step } from "../../state/useAppStore.ts";
import { useProgress } from "../../state/useProgress.ts";

export interface StepStatus {
  text: string;
  done: boolean;
  empty: boolean;
}

/** How far the reader is in each step - shown under the step label. */
export function useStepStatus(index: number, content: ChapterContent): Record<Step, StepStatus> {
  const lessonDone = useProgress((s) => (content.lesson ? !!s.lessonsDone[content.lesson.id] : false));
  const sandboxDone = useProgress((s) => s.sandboxDone);
  const labDone = useProgress((s) => s.labDone);
  const drill = useProgress((s) => s.chapterDrill[index]);
  const situations = [...content.predict, ...content.bugs];
  const solved = situations.filter((x) => sandboxDone[x.id]).length;
  const labCount = content.lab.filter((e) => labDone[e.step.id]).length;
  return {
    learn: {
      text: `${content.widgets} apparatus`,
      done: lessonDone,
      empty: !content.lesson,
    },
    predict: {
      text: situations.length ? `${solved} / ${situations.length} solved` : "none yet",
      done: situations.length > 0 && solved === situations.length,
      empty: situations.length === 0,
    },
    check: {
      text: drill ? `best ${drill.correct} / ${drill.total}` : `${content.quiz.length} questions`,
      done: !!drill && drill.correct / drill.total >= 0.8,
      empty: content.quiz.length === 0,
    },
    run: {
      text: content.lab.length ? `${labCount} / ${content.lab.length} done` : "none yet",
      done: content.lab.length > 0 && labCount === content.lab.length,
      empty: content.lab.length === 0,
    },
  };
}
