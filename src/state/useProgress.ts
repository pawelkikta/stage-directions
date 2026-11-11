import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ExamTopic } from "../core/types.ts";

export interface TopicStat {
  seen: number;
  correct: number;
}

export interface ExamResult {
  date: number;
  score: number;
  total: number;
  byTopic: Partial<Record<ExamTopic, TopicStat>>;
}

interface ProgressState {
  /** lessonId -> done. */
  lessonsDone: Record<string, boolean>;
  /** quiz answer stats per topic. */
  topicStats: Partial<Record<ExamTopic, TopicStat>>;
  /** ids of questions answered wrongly (for the "repeat wrong ones" mode). */
  missed: string[];
  /** ids of Lab exercises marked as done. */
  labDone: Record<string, boolean>;
  /** ids of situations: true = solved. */
  sandboxDone: Record<string, boolean>;
  /** Best chapter drill per chapter index ("3" -> 8 of 10). */
  chapterDrill: Record<string, { correct: number; total: number }>;
  lastExam?: ExamResult;

  recordAnswer: (topic: ExamTopic, correct: boolean) => void;
  /** Add/remove a question in the wrong-answer pool, based on correctness. */
  markMissed: (questionId: string, correct: boolean) => void;
  markLesson: (lessonId: string, done: boolean) => void;
  markLab: (stepId: string, done: boolean) => void;
  markSandbox: (id: string, done: boolean) => void;
  saveDrill: (chapter: number, correct: number, total: number) => void;
  saveExam: (result: ExamResult) => void;
  reset: () => void;
}

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      lessonsDone: {},
      topicStats: {},
      missed: [],
      labDone: {},
      sandboxDone: {},
      chapterDrill: {},
      lastExam: undefined,

      recordAnswer: (topic, correct) =>
        set((s) => {
          const prev = s.topicStats[topic] ?? { seen: 0, correct: 0 };
          return {
            topicStats: {
              ...s.topicStats,
              [topic]: {
                seen: prev.seen + 1,
                correct: prev.correct + (correct ? 1 : 0),
              },
            },
          };
        }),

      markMissed: (questionId, correct) =>
        set((s) => ({
          missed: correct
            ? s.missed.filter((id) => id !== questionId)
            : s.missed.includes(questionId)
              ? s.missed
              : [...s.missed, questionId],
        })),

      markLesson: (lessonId, done) =>
        set((s) => ({ lessonsDone: { ...s.lessonsDone, [lessonId]: done } })),

      markLab: (stepId, done) =>
        set((s) => ({ labDone: { ...s.labDone, [stepId]: done } })),

      markSandbox: (id, done) =>
        set((s) => ({ sandboxDone: { ...s.sandboxDone, [id]: done } })),

      saveDrill: (chapter, correct, total) =>
        set((s) => {
          const prev = s.chapterDrill[chapter];
          if (prev && prev.correct / prev.total >= correct / total) return {};
          return { chapterDrill: { ...s.chapterDrill, [chapter]: { correct, total } } };
        }),

      saveExam: (lastExam) => set({ lastExam }),

      reset: () =>
        set({
          lessonsDone: {},
          topicStats: {},
          missed: [],
          labDone: {},
          sandboxDone: {},
          chapterDrill: {},
          lastExam: undefined,
        }),
    }),
    { name: "usd-atlas-progress" },
  ),
);
