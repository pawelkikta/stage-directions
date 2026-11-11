import { useState } from "react";
import type { TreePrimNode } from "../core/deriveTree.ts";

/** A clickable scenegraph tree with live paths (a small scenegraph explorer). */
export function TreePane({ nodes }: { nodes: TreePrimNode[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-bg-panel">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-medium text-ink-muted">Scenegraph</span>
        <span className="font-mono text-[11px] text-ink-faint">
          {selected ?? "/"}
        </span>
      </div>
      <div className="flex-1 overflow-auto p-2">
        {nodes.map((n) => (
          <PrimRow
            key={n.path}
            node={n}
            depth={0}
            selected={selected}
            onSelect={setSelected}
          />
        ))}
      </div>
    </div>
  );
}

function specifierColor(spec: TreePrimNode["specifier"]) {
  return spec === "def"
    ? "text-emerald-300"
    : spec === "over"
      ? "text-amber-300"
      : "text-sky-300";
}

function PrimRow({
  node,
  depth,
  selected,
  onSelect,
}: {
  node: TreePrimNode;
  depth: number;
  selected: string | null;
  onSelect: (p: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;
  return (
    <div>
      <div
        className={`flex items-center gap-2 rounded px-2 py-1 text-sm ${
          selected === node.path ? "bg-copper/15" : "hover:bg-bg-elev"
        }`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        <button
          onClick={() => setOpen((o) => !o)}
          className={`w-3 text-ink-faint ${hasChildren ? "" : "invisible"}`}
        >
          {open ? "▾" : "▸"}
        </button>
        <button
          onClick={() => onSelect(node.path)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <span className={`font-mono text-[11px] ${specifierColor(node.specifier)}`}>
            {node.specifier}
          </span>
          <span className="text-ink">{node.name}</span>
          {node.typeName && (
            <span className="font-mono text-[11px] text-copper-bright">
              {node.typeName}
            </span>
          )}
          {node.kind && (
            <span className="rounded bg-bg-elev px-1 text-[10px] text-ink-muted">
              {node.kind}
            </span>
          )}
          {node.arcs.map((a) => (
            <span
              key={a}
              className="rounded bg-gold/10 px-1 text-[10px] text-gold-soft"
            >
              {a}
            </span>
          ))}
        </button>
      </div>

      {open && (
        <>
          {node.properties.map((p) => (
            <div
              key={p.path}
              className="flex items-center gap-2 py-0.5 text-[12px] text-ink-muted"
              style={{ paddingLeft: `${depth * 14 + 38}px` }}
            >
              <span className="font-mono text-[11px] text-ink-faint">
                {p.valueType}
              </span>
              <span>{p.name}</span>
              {p.valueLabel && (
                <span className="font-mono text-[11px] text-gold-soft">
                  = {p.valueLabel}
                </span>
              )}
              {p.targets && (
                <span className="font-mono text-[11px] text-sky-300">
                  → {p.targets.join(", ")}
                </span>
              )}
            </div>
          ))}
          {node.children.map((c) => (
            <PrimRow
              key={c.path}
              node={c}
              depth={depth + 1}
              selected={selected}
              onSelect={onSelect}
            />
          ))}
        </>
      )}
    </div>
  );
}
