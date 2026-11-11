import { useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useStore,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CONCEPT_GRAPH, getConcept, relatedConcepts } from "../data/concepts.ts";
import {
  EXAM_WEIGHTS,
  type ConceptGroup,
  type ConceptRelation,
} from "../core/types.ts";
import { useAppStore } from "../state/useAppStore.ts";

/** Fallback relation labels (when an edge has no label of its own). */
const RELATION_LABEL: Record<ConceptRelation, string> = {
  has: "has",
  "is-a": "is a",
  composes: "composes",
  overrides: "overrides",
  describes: "describes",
  related: "related",
};

const GROUP_ORDER: ConceptGroup[] = [
  "core",
  "data",
  "schema",
  "composition",
  "aggregation",
  "instancing",
];

const GROUP_META: Record<ConceptGroup, { label: string; color: string }> = {
  // category colors live in index.css (--cm-*), because each theme has its own palette
  core: { label: "Core", color: "var(--cm-core)" },
  data: { label: "Data", color: "var(--cm-data)" },
  schema: { label: "Schemas", color: "var(--cm-schema)" },
  composition: { label: "Composition", color: "var(--cm-composition)" },
  aggregation: { label: "Aggregation", color: "var(--cm-aggregation)" },
  instancing: { label: "Instancing", color: "var(--cm-instancing)" },
};

const COL_W = 250;
const ROW_H = 78;
const NODE_W = COL_W - 60;
const NODE_H = 36;

type Pos = { x: number; y: number };

interface NodeFx {
  anyFocus: boolean;
  isFocus: boolean;
  isNeighbor: boolean;
  isSelected: boolean;
}

function nodeStyle(group: ConceptGroup, fx: NodeFx): React.CSSProperties {
  const color = GROUP_META[group].color;
  const dim = fx.anyFocus && !fx.isNeighbor && !fx.isFocus;
  const ring = fx.isFocus
    ? "0 0 0 3px color-mix(in srgb, var(--color-gold-soft) 33%, transparent)"
    : fx.isSelected && !dim
      ? `0 0 0 3px color-mix(in srgb, ${color} 25%, transparent)`
      : undefined;
  return {
    width: NODE_W,
    fontSize: 12,
    borderRadius: 8,
    border: `${fx.isFocus || fx.isSelected ? 2 : 1}px solid ${fx.isFocus ? "var(--color-gold-soft)" : color}`,
    boxShadow: ring,
    background: fx.isFocus || fx.isSelected ? "var(--color-bg-elev)" : "var(--color-bg-panel)",
    color: "var(--color-ink)",
    padding: 6,
    opacity: dim ? 0.12 : 1,
    transition: "opacity 120ms ease",
  };
}

/** Fixed layout: column = group, row = position in the group. */
function buildLayout(): Node[] {
  const byGroup = new Map<ConceptGroup, string[]>();
  for (const n of CONCEPT_GRAPH.nodes) {
    const arr = byGroup.get(n.group) ?? [];
    arr.push(n.id);
    byGroup.set(n.group, arr);
  }
  const nodes: Node[] = [];
  GROUP_ORDER.forEach((group, col) => {
    (byGroup.get(group) ?? []).forEach((id, row) => {
      const c = getConcept(id)!;
      nodes.push({
        id,
        position: { x: col * COL_W, y: row * ROW_H + 40 },
        data: { label: c.name_en },
        style: nodeStyle(group, {
          anyFocus: false,
          isFocus: false,
          isNeighbor: false,
          isSelected: false,
        }),
      });
    });
  });
  return nodes;
}

/** A point on the edge of a node's rectangle, in the direction of `toward`. */
function borderPoint(p: Pos, toward: Pos): Pos {
  const cx = p.x + NODE_W / 2;
  const cy = p.y + NODE_H / 2;
  const dx = toward.x + NODE_W / 2 - cx;
  const dy = toward.y + NODE_H / 2 - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const hw = NODE_W / 2 + 2;
  const hh = NODE_H / 2 + 2;
  const scale = 1 / Math.max(Math.abs(dx) / hw, Math.abs(dy) / hh);
  return { x: cx + dx * scale, y: cy + dy * scale };
}

function edgeD(sPos: Pos, tPos: Pos): string {
  const s = borderPoint(sPos, tPos);
  const t = borderPoint(tPos, sPos);
  const dx = Math.abs(t.x - s.x) * 0.4 + 16;
  const dir = t.x >= s.x ? 1 : -1;
  return `M ${s.x} ${s.y} C ${s.x + dx * dir} ${s.y}, ${t.x - dx * dir} ${t.y}, ${t.x} ${t.y}`;
}

/**
 * Custom edges (an SVG overlay kept in sync with the react-flow transform).
 * Focus + context: with no focus - a faint network WITHOUT labels (calm). With a focus -
 * only the edges that touch the node are bright and carry relation labels; the rest fades.
 */
function EdgesOverlay({
  nodes,
  focusId,
  hidden,
}: {
  nodes: Node[];
  focusId: string | null;
  hidden: Set<ConceptGroup>;
}) {
  const [x, y, zoom] = useStore((s) => s.transform);
  const pos: Record<string, Pos> = {};
  for (const n of nodes) pos[n.id] = { x: n.position.x, y: n.position.y };

  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        overflow: "visible",
        zIndex: 1,
      }}
    >
      <g transform={`translate(${x} ${y}) scale(${zoom})`}>
        {CONCEPT_GRAPH.edges.map((e, i) => {
          const fg = getConcept(e.source)!.group;
          const tg = getConcept(e.target)!.group;
          if (hidden.has(fg) || hidden.has(tg)) return null;
          const s = pos[e.source];
          const t = pos[e.target];
          if (!s || !t) return null;

          const incident = !!focusId && (e.source === focusId || e.target === focusId);
          const opacity = focusId ? (incident ? 1 : 0.05) : 0.22;
          const stroke = incident
            ? "var(--color-gold-soft)"
            : e.relation === "is-a"
              ? "var(--color-border)"
              : "color-mix(in srgb, var(--color-ink-faint) 60%, transparent)";
          const sb = borderPoint(s, t);
          const tb = borderPoint(t, s);
          return (
            <g key={i} style={{ opacity, transition: "opacity 120ms ease" }}>
              <path
                d={edgeD(s, t)}
                fill="none"
                style={{ stroke }}
                strokeWidth={incident ? 1.8 : 1}
                strokeDasharray={e.relation === "related" ? "4 3" : undefined}
              />
              {incident && (
                <text
                  x={(sb.x + tb.x) / 2}
                  y={(sb.y + tb.y) / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={9}
                  style={{ fill: "var(--color-gold-soft)", stroke: "var(--color-bg)" }}
                  strokeWidth={3}
                  paintOrder="stroke"
                >
                  {e.label ?? RELATION_LABEL[e.relation]}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export function ConceptMapView() {
  const focusConcept = useAppStore((s) => s.focusConcept);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<ConceptGroup>>(new Set());
  const focusId = hovered ?? selected;

  const initialNodes = useMemo(buildLayout, []);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);

  // neighbors of the active node (focus + direct neighbors)
  const neighborIds = useMemo(() => {
    if (!focusId) return null;
    const nb = new Set<string>([focusId]);
    for (const e of CONCEPT_GRAPH.edges) {
      if (e.source === focusId) nb.add(e.target);
      if (e.target === focusId) nb.add(e.source);
    }
    return nb;
  }, [focusId]);

  // recompute styles + visibility (group filter) when the focus or the filter changes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => {
        const g = getConcept(n.id)!.group;
        return {
          ...n,
          hidden: hidden.has(g),
          style: nodeStyle(g, {
            anyFocus: !!focusId,
            isFocus: n.id === focusId,
            isNeighbor: !!neighborIds && neighborIds.has(n.id),
            isSelected: n.id === selected,
          }),
        };
      }),
    );
  }, [focusId, neighborIds, selected, hidden, setNodes]);

  useEffect(() => {
    if (focusConcept) setSelected(focusConcept);
  }, [focusConcept]);

  const toggleGroup = (g: ConceptGroup) =>
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(g) ? next.delete(g) : next.add(g);
      return next;
    });

  const concept = selected ? getConcept(selected) : undefined;
  const related = selected ? relatedConcepts(selected) : [];

  return (
    <div className="relative h-full w-full">
      {/* legend = group filter (click = hide/show) */}
      <div className="absolute left-4 top-4 z-10 flex max-w-[60%] flex-wrap gap-1.5">
        {GROUP_ORDER.map((g) => {
          const off = hidden.has(g);
          return (
            <button
              key={g}
              onClick={() => toggleGroup(g)}
              title={off ? "Show group" : "Hide group"}
              className={`flex items-center gap-1.5 rounded bg-bg-panel/80 px-2 py-1 text-[11px] backdrop-blur transition-opacity ${
                off ? "text-ink-faint line-through opacity-50" : "text-ink-muted"
              }`}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: GROUP_META[g].color }}
              />
              {GROUP_META[g].label}
            </button>
          );
        })}
        {hidden.size > 0 && (
          <button
            onClick={() => setHidden(new Set())}
            className="rounded bg-bg-panel/80 px-2 py-1 text-[11px] text-copper-bright backdrop-blur"
          >
            show all
          </button>
        )}
      </div>

      {/* hint */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-bg-panel/80 px-3 py-1 text-[11px] text-ink-faint backdrop-blur">
        {focusId
          ? `${getConcept(focusId)?.name_en}: connections highlighted`
          : "Hover or click a concept to see its connections"}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={[]}
        onNodesChange={onNodesChange}
        onNodeMouseEnter={(_, n) => setHovered(n.id)}
        onNodeMouseLeave={() => setHovered(null)}
        onNodeClick={(_, n) => setSelected(n.id)}
        onPaneClick={() => {
          setSelected(null);
          setHovered(null);
        }}
        nodesConnectable={false}
        fitView
        minZoom={0.2}
        proOptions={{ hideAttribution: true }}
      >
        <EdgesOverlay nodes={nodes} focusId={focusId} hidden={hidden} />
        <Background color="var(--color-border)" gap={20} />
        <Controls className="!bg-bg-panel !border-border" />
      </ReactFlow>

      {concept && (
        <aside className="absolute right-2 top-2 z-10 max-h-[calc(100%-1rem)] w-[min(20rem,calc(100vw-1rem))] overflow-y-auto rounded-lg border border-border bg-bg-panel/95 p-4 shadow-xl backdrop-blur sm:right-4 sm:top-4">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-base font-bold text-gold-soft">{concept.name_en}</h3>
            <button
              onClick={() => setSelected(null)}
              className="text-ink-faint hover:text-ink"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-ink-faint">{concept.gloss}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
            {concept.module && (
              <span className="rounded bg-bg-elev px-1.5 py-0.5 text-ink-muted">
                {concept.module}
              </span>
            )}
            {concept.examTopic && (
              <span className="rounded bg-copper/15 px-1.5 py-0.5 text-copper-bright">
                {concept.examTopic} · {EXAM_WEIGHTS[concept.examTopic]}%
              </span>
            )}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            {concept.definition}
          </p>
          {related.length > 0 && (
            <div className="mt-4">
              <p className="mb-1.5 text-[11px] uppercase tracking-wider text-ink-faint">
                Connected ({related.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {related.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelected(r.id)}
                    onMouseEnter={() => setHovered(r.id)}
                    onMouseLeave={() => setHovered(null)}
                    className="rounded border border-border px-2 py-0.5 text-xs text-ink-muted hover:border-copper/50 hover:text-gold-soft"
                  >
                    {r.name_en}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
