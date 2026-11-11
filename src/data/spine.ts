/* ===========================================================================
 * The spine of the app - 8 chapters mapped from the official course modules,
 * tagged with the exam weights. Titles and summaries live in chapters.ts.
 * ======================================================================== */
import type { ExamTopic } from "../core/types.ts";

export interface SpineLayer {
  index: number; // 0..7
  code: string; // "L0".."L7"
  module: string; // the original course module
  topics: { topic: ExamTopic | "Foundational"; weight: number }[];
}

export const SPINE: SpineLayer[] = [
  {
    index: 0,
    code: "L0",
    module: "Introduction",
    topics: [{ topic: "Foundational", weight: 0 }],
  },
  {
    index: 1,
    code: "L1",
    module: "Module 1",
    topics: [{ topic: "Data Modeling", weight: 13 }],
  },
  {
    index: 2,
    code: "L2",
    module: "Module 2",
    topics: [
      { topic: "Data Modeling", weight: 13 },
      { topic: "Visualization", weight: 8 },
    ],
  },
  {
    index: 3,
    code: "L3",
    module: "Modules 3+5",
    topics: [{ topic: "Composition", weight: 23 }],
  },
  {
    index: 4,
    code: "L4",
    module: "Module 6",
    topics: [
      { topic: "Content Aggregation", weight: 10 },
      { topic: "Pipeline Development", weight: 14 },
    ],
  },
  {
    index: 5,
    code: "L5",
    module: "Module 8",
    topics: [{ topic: "Content Aggregation", weight: 10 }],
  },
  {
    index: 6,
    code: "L6",
    module: "Module 7",
    topics: [
      { topic: "Data Exchange", weight: 15 },
      { topic: "Pipeline Development", weight: 14 },
    ],
  },
  {
    index: 7,
    code: "L7",
    module: "Cross-cutting",
    topics: [
      { topic: "Customizing USD", weight: 6 },
      { topic: "Debugging", weight: 11 },
    ],
  },
];
