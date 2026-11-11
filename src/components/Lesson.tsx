import { useEffect, useState } from "react";
import type { Callout, Lesson, LessonBlock, SelfCheck } from "../data/lessons.ts";
import { md, mdt } from "./md.tsx";
import { withShuffledOptions } from "../core/shuffle.ts";
import { useProgress } from "../state/useProgress.ts";
import { SdfVsUsdWidget, ScenegraphWidget } from "./widgets/EmbeddedScene.tsx";
import { LiverpsTracer } from "./widgets/LiverpsTracer.tsx";
import { LayerStack } from "./widgets/LayerStack.tsx";
import { ArcPlayground } from "./widgets/ArcPlayground.tsx";
import { ValueResolutionCalc } from "./widgets/ValueResolutionCalc.tsx";
import { VariantSwitcher } from "./widgets/VariantSwitcher.tsx";
import { InstancingVisualizer } from "./widgets/InstancingVisualizer.tsx";
import { ModelHierarchyBuilder } from "./widgets/ModelHierarchyBuilder.tsx";
import { SchemaInspector } from "./widgets/SchemaInspector.tsx";
import { EditableUsdaTree } from "./widgets/EditableUsdaTree.tsx";
import { FileFormatsWidget } from "./widgets/FileFormats.tsx";
import { ListEditingWidget } from "./widgets/ListEditing.tsx";
import { PxrBridge } from "./widgets/PxrBridge.tsx";
import { UsdviewTour } from "./widgets/UsdviewTour.tsx";
import { Highlight } from "./Highlight.tsx";
import { Apparatus } from "./shell/Plate.tsx";
import { OPTION_BASE, OPTION_TONE, optionState } from "./chapter/options.ts";

type WidgetId = Extract<LessonBlock, { kind: "widget" }>["widget"];

const WIDGETS: Record<WidgetId, React.ComponentType> = {
  "sdf-vs-usd": SdfVsUsdWidget,
  scenegraph: ScenegraphWidget,
  "liverps-tracer": LiverpsTracer,
  "layer-stack": LayerStack,
  "arc-playground": ArcPlayground,
  "value-resolution": ValueResolutionCalc,
  "variant-switcher": VariantSwitcher,
  instancing: InstancingVisualizer,
  "model-hierarchy": ModelHierarchyBuilder,
  "schema-inspector": SchemaInspector,
  "editable-usda": EditableUsdaTree,
  "file-formats": FileFormatsWidget,
  "list-editing": ListEditingWidget,
  "pxr-bridge": PxrBridge,
  "usdview-tour": UsdviewTour,
};

const WIDGET_NAMES: Record<WidgetId, string> = {
  "sdf-vs-usd": "Sdf vs Usd",
  scenegraph: "Scenegraph explorer",
  "liverps-tracer": "LIVERPS tracer",
  "layer-stack": "Layer stack",
  "arc-playground": "Arc playground",
  "value-resolution": "Value resolution",
  "variant-switcher": "Variant switcher",
  instancing: "Instancing",
  "model-hierarchy": "Model hierarchy",
  "schema-inspector": "Schema inspector",
  "editable-usda": ".usda ⇄ tree",
  "file-formats": "File formats",
  "list-editing": "List editing",
  "pxr-bridge": "pxr bridge",
  "usdview-tour": "usdview tour",
};

/** Margin notes: a colored rule on the left and a small caps label. */
const CALLOUT_STYLE: Record<Callout, { box: string; label: string; labelClass: string }> = {
  key: { box: "border-copper bg-bg-elev", label: "Key idea", labelClass: "text-copper" },
  myth: { box: "border-gold bg-gold/5", label: "Trap", labelClass: "text-gold-soft" },
  tip: { box: "border-emerald-500 bg-emerald-900/10", label: "Tip", labelClass: "text-emerald-300" },
  exam: { box: "border-copper bg-bg-panel", label: "On the exam", labelClass: "bg-copper px-1.5 py-0.5 text-bg" },
};

/** Running numbers: headings and apparatus are numbered per chapter (3.1, 3.2 ...). */
function numberBlocks(blocks: LessonBlock[]) {
  let h = 0;
  let w = 0;
  return blocks.map((b) => (b.kind === "heading" ? ++h : b.kind === "widget" ? ++w : 0));
}

function Block({ block, chapter, n }: { block: LessonBlock; chapter: number; n: number }) {
  switch (block.kind) {
    case "prose":
      return <p className="my-4 max-w-[68ch] text-[17px] leading-[1.72] text-ink-muted">{mdt(block.md)}</p>;
    case "heading":
      return (
        <h2 className="mb-3 mt-14 flex items-baseline gap-3 border-t border-border pt-6">
          <span className="caps shrink-0 text-gold-soft">
            {chapter}.{n}
          </span>
          <span className="text-[22px] font-semibold leading-tight text-ink">{block.text}</span>
        </h2>
      );
    case "code":
      return (
        <figure className="my-6">
          <pre className="overflow-auto border border-border bg-code p-4 font-mono text-[13px] leading-relaxed text-ink">
            <Highlight code={block.code} />
          </pre>
          {block.caption && (
            <figcaption className="mt-2 max-w-[68ch] text-[14px] leading-relaxed text-ink-faint">{mdt(block.caption)}</figcaption>
          )}
        </figure>
      );
    case "image":
      return (
        <figure className="my-8">
          <div className="plate bg-bg-panel p-2">
            <img
              src={`${import.meta.env.BASE_URL}${block.src}`}
              alt={block.alt}
              loading="lazy"
              className="mx-auto max-h-[520px] w-auto"
            />
          </div>
          {block.caption && (
            <figcaption className="mt-3 max-w-[68ch] text-[14px] leading-relaxed text-ink-faint">{mdt(block.caption)}</figcaption>
          )}
        </figure>
      );
    case "callout": {
      const s = CALLOUT_STYLE[block.tone];
      return (
        <aside className={`my-6 max-w-[72ch] border-l-[3px] px-5 py-4 ${s.box}`}>
          <p className="mb-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className={`caps ${s.labelClass}`}>{s.label}</span>
            <span className="text-[15px] font-semibold text-ink">{mdt(block.title)}</span>
          </p>
          <p className="text-[16px] leading-[1.7] text-ink-muted">{mdt(block.md)}</p>
        </aside>
      );
    }
    case "widget": {
      const Widget = WIDGETS[block.widget];
      return (
        <Apparatus
          label={`Apparatus ${chapter}.${n}`}
          name={WIDGET_NAMES[block.widget]}
          caption={block.caption ? mdt(block.caption) : undefined}
        >
          <Widget />
        </Apparatus>
      );
    }
  }
}

/** The lesson text with its apparatus, without the self-check (that lives in the Check step). */
export function LessonBlocks({ lesson, chapter }: { lesson: Lesson; chapter: number }) {
  const numbers = numberBlocks(lesson.blocks);
  return (
    <>
      {lesson.blocks.map((b, i) => (
        <Block key={i} block={b} chapter={chapter} n={numbers[i]} />
      ))}
    </>
  );
}

function SelfCheckCard({
  check: source,
  idx,
  onAnswered,
}: {
  check: SelfCheck;
  idx: number;
  onAnswered: (idx: number) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  // The order in the data would give the answer away - shuffle once on mount.
  const [check] = useState(() => withShuffledOptions(source));
  return (
    <div className="border border-border bg-bg-panel p-5">
      <p className="mb-4 flex gap-3 text-[16px] font-medium leading-snug text-ink">
        <span className="caps mt-1 shrink-0 text-gold-soft">Q{idx + 1}</span>
        {/* no glossary tooltips - a definition would give the answer away */}
        <span>{md(check.q)}</span>
      </p>
      <div className="flex flex-col gap-2">
        {check.options.map((opt, i) => (
          <button
            key={i}
            disabled={picked !== null}
            onClick={() => {
              setPicked(i);
              onAnswered(idx);
            }}
            className={`${OPTION_BASE} ${OPTION_TONE[optionState(i, picked, check.answer)]}`}
          >
            {opt}
          </button>
        ))}
      </div>
      {picked !== null && (
        <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
          <span className={`font-semibold ${picked === check.answer ? "text-emerald-300" : "text-red-300"}`}>
            {picked === check.answer ? "Right. " : "Not quite. "}
          </span>
          {mdt(check.explanation)}
        </p>
      )}
    </div>
  );
}

/** Self-check questions of a lesson. All answered = lesson marked as done. */
export function SelfCheckList({ lesson }: { lesson: Lesson }) {
  const markLesson = useProgress((s) => s.markLesson);
  const [answered, setAnswered] = useState<Set<number>>(new Set());

  useEffect(() => setAnswered(new Set()), [lesson.id]);
  useEffect(() => {
    if (lesson.selfCheck.length > 0 && answered.size === lesson.selfCheck.length) {
      markLesson(lesson.id, true);
    }
  }, [answered, lesson, markLesson]);

  return (
    <div className="flex flex-col gap-4">
      {lesson.selfCheck.map((c, i) => (
        <SelfCheckCard
          key={`${lesson.id}-${i}`}
          check={c}
          idx={i}
          onAnswered={(ix) =>
            setAnswered((prev) => {
              const n = new Set(prev);
              n.add(ix);
              return n;
            })
          }
        />
      ))}
    </div>
  );
}
