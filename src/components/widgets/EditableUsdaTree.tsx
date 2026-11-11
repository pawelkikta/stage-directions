import { useMemo, useState } from "react";
import type { Layer, Prim, Specifier, AttributeValue } from "../../core/types.ts";
import { deriveUsda } from "../../core/deriveUsda.ts";
import { deriveTree } from "../../core/deriveTree.ts";
import { UsdaPane } from "../UsdaPane.tsx";
import { TreePane } from "../TreePane.tsx";

const SEED_LAYER: Layer = {
  id: "edit",
  name: "edit.usda",
  defaultPrim: "World",
  rootPrims: [
    {
      name: "World",
      specifier: "def",
      typeName: "Xform",
      kind: "group",
      properties: [],
      children: [
        {
          name: "Box",
          specifier: "def",
          typeName: "Cube",
          properties: [
            { kind: "attribute", name: "size", valueType: "double", value: 2 },
            {
              kind: "attribute",
              name: "primvars:displayColor",
              valueType: "color3f[]",
              value: [[0.72, 0.45, 0.2]],
              isPrimvar: true,
            },
          ],
          children: [],
        },
        {
          name: "Key",
          specifier: "def",
          typeName: "SphereLight",
          properties: [
            { kind: "attribute", name: "inputs:intensity", valueType: "float", value: 800 },
          ],
          children: [],
        },
      ],
    },
  ],
};

const SCALAR = new Set(["double", "float", "half", "int", "string", "token", "bool"]);

function mapPrimAt(prims: Prim[], path: string[], fn: (p: Prim) => Prim): Prim[] {
  const [head, ...rest] = path;
  return prims.map((p) => {
    if (p.name !== head) return p;
    return rest.length === 0 ? fn(p) : { ...p, children: mapPrimAt(p.children, rest, fn) };
  });
}

export function EditableUsdaTree() {
  const [layer, setLayer] = useState<Layer>(SEED_LAYER);
  const [view, setView] = useState<"usda" | "tree">("usda");

  const usda = useMemo(() => deriveUsda(layer), [layer]);
  const tree = useMemo(() => deriveTree(layer), [layer]);

  const update = (path: string[], fn: (p: Prim) => Prim) =>
    setLayer((l) => ({ ...l, rootPrims: mapPrimAt(l.rootPrims, path, fn) }));

  const setSpecifier = (path: string[], specifier: Specifier) =>
    update(path, (p) => ({ ...p, specifier }));
  const setAttr = (path: string[], name: string, value: AttributeValue) =>
    update(path, (p) => ({
      ...p,
      properties: p.properties.map((pr) =>
        pr.kind === "attribute" && pr.name === name ? { ...pr, value } : pr,
      ),
    }));

  const renderEditor = (prim: Prim, path: string[], depth: number) => (
    <div key={path.join("/")} style={{ paddingLeft: depth * 12 }}>
      <div className="flex flex-wrap items-center gap-2 py-1">
        <select
          value={prim.specifier}
          onChange={(e) => setSpecifier(path, e.target.value as Specifier)}
          className="rounded border border-border bg-bg-elev px-1 py-0.5 font-mono text-[11px] text-ink"
        >
          {(["def", "over", "class"] as Specifier[]).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span className="font-mono text-sm text-ink">{prim.name}</span>
        {prim.typeName && (
          <span className="font-mono text-[11px] text-copper-bright">{prim.typeName}</span>
        )}
      </div>
      {prim.properties.map((pr) =>
        pr.kind === "attribute" ? (
          <div
            key={pr.name}
            className="flex items-center gap-2 py-0.5"
            style={{ paddingLeft: 16 }}
          >
            <span className="font-mono text-[11px] text-ink-faint">{pr.valueType}</span>
            <span className="text-[12px] text-ink-muted">{pr.name}</span>
            {SCALAR.has(pr.valueType) ? (
              <input
                value={String(pr.value ?? "")}
                onChange={(e) => {
                  const raw = e.target.value;
                  const n = parseFloat(raw);
                  setAttr(
                    path,
                    pr.name,
                    pr.valueType === "string" || pr.valueType === "token" || Number.isNaN(n)
                      ? raw
                      : n,
                  );
                }}
                className="w-24 rounded border border-border bg-bg px-1 font-mono text-[12px] text-gold-soft"
              />
            ) : (
              <span className="font-mono text-[12px] text-ink-faint">
                = {JSON.stringify(pr.value)} (complex - read-only)
              </span>
            )}
          </div>
        ) : null,
      )}
      {prim.children.map((c) => renderEditor(c, [...path, c.name], depth + 1))}
    </div>
  );

  return (
    <div>
      <div className="grid grid-cols-1 auto-rows-[50vh] gap-3 lg:h-[48vh] lg:auto-rows-auto lg:grid-cols-2">
        <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-bg-panel">
          <div className="border-b border-border px-3 py-2 text-xs font-medium text-ink-muted">
            Editor (tree) - change the specifier or a value
          </div>
          <div className="flex-1 overflow-auto p-2">
            {layer.rootPrims.map((p) => renderEditor(p, [p.name], 0))}
          </div>
        </div>

        <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-bg-panel">
          <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
            {(["usda", "tree"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded px-2 py-0.5 text-xs ${
                  view === v ? "bg-copper/20 text-gold-soft" : "text-ink-muted hover:text-ink"
                }`}
              >
                {v === "usda" ? ".usda (Sdf)" : "tree (Usd)"}
              </button>
            ))}
            <span className="ml-auto text-[11px] text-ink-faint">live preview</span>
          </div>
          <div className="flex-1 overflow-hidden p-0">
            {view === "usda" ? (
              <UsdaPane source={usda} filename={layer.name} />
            ) : (
              <TreePane nodes={tree} />
            )}
          </div>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-ink-faint">
        One model in state → we derive the <code className="text-copper-bright">.usda</code>{" "}
        (Sdf) and the tree (Usd) side by side. An edit on the left refreshes both views immediately -
        without writing a USD parser.
      </p>
    </div>
  );
}
