import { useMemo, useState } from "react";

type KindVal = "-" | "group" | "assembly" | "component" | "subcomponent";
const KIND_OPTS: KindVal[] = ["-", "group", "assembly", "component", "subcomponent"];
const MODEL_KINDS: KindVal[] = ["group", "assembly", "component"];
const isModel = (k: KindVal) => MODEL_KINDS.includes(k);

interface KNode {
  id: string;
  name: string;
  kind: KindVal;
  children: KNode[];
}

const SEED: KNode = {
  id: "world",
  name: "World",
  kind: "group",
  children: [
    {
      id: "building",
      name: "Building",
      kind: "assembly",
      children: [
        {
          id: "floor",
          name: "Floor1",
          kind: "component",
          children: [
            { id: "chair", name: "Chair", kind: "subcomponent", children: [] },
          ],
        },
      ],
    },
  ],
};

interface Issue {
  id: string;
  name: string;
  msg: string;
}

function validate(node: KNode, parent: KNode | null, out: Issue[]) {
  const k = node.kind;
  if (isModel(k) && parent && !isModel(parent.kind)) {
    out.push({
      id: node.id,
      name: node.name,
      msg: `a model (${k}) needs a model parent - it breaks contiguity (parent: ${parent.kind})`,
    });
  }
  if (parent?.kind === "component" && isModel(k)) {
    out.push({
      id: node.id,
      name: node.name,
      msg: `a component is a leaf - below it only a subcomponent, not a model (${k})`,
    });
  }
  if (k === "subcomponent" && parent && parent.kind !== "component" && parent.kind !== "subcomponent") {
    out.push({
      id: node.id,
      name: node.name,
      msg: `a subcomponent should be under a component (parent: ${parent.kind})`,
    });
  }
  node.children.forEach((c) => validate(c, node, out));
}

function setKind(node: KNode, id: string, kind: KindVal): KNode {
  if (node.id === id) return { ...node, kind };
  return { ...node, children: node.children.map((c) => setKind(c, id, kind)) };
}

const KIND_COLOR: Record<KindVal, string> = {
  "-": "text-ink-faint",
  group: "text-sky-300",
  assembly: "text-violet-300",
  component: "text-emerald-300",
  subcomponent: "text-amber-300",
};

export function ModelHierarchyBuilder() {
  const [tree, setTree] = useState<KNode>(SEED);
  const issues = useMemo(() => {
    const out: Issue[] = [];
    validate(tree, null, out);
    return out;
  }, [tree]);
  const badIds = new Set(issues.map((i) => i.id));

  const renderNode = (node: KNode, depth: number) => (
    <div key={node.id}>
      <div
        className={`flex items-center gap-2 rounded px-2 py-1 ${
          badIds.has(node.id) ? "bg-red-900/20" : ""
        }`}
        style={{ paddingLeft: `${depth * 18 + 4}px` }}
      >
        <span className="font-mono text-sm text-ink">{node.name}</span>
        <select
          value={node.kind}
          onChange={(e) => setTree((t) => setKind(t, node.id, e.target.value as KindVal))}
          className={`rounded border border-border bg-bg-elev px-1.5 py-0.5 text-xs ${KIND_COLOR[node.kind]}`}
        >
          {KIND_OPTS.map((k) => (
            <option key={k} value={k}>
              kind = {k}
            </option>
          ))}
        </select>
        {badIds.has(node.id) && <span className="text-xs text-red-400">✗</span>}
      </div>
      {node.children.map((c) => renderNode(c, depth + 1))}
    </div>
  );

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-bg-panel p-2">
          {renderNode(tree, 0)}
        </div>
        <div
          className={`rounded-lg border p-3 ${
            issues.length === 0
              ? "border-emerald-700/40 bg-emerald-900/10"
              : "border-red-700/40 bg-red-900/10"
          }`}
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">
            Model hierarchy check
          </p>
          {issues.length === 0 ? (
            <p className="text-sm text-emerald-300">
              ✓ The hierarchy is valid - the models form an unbroken branch, the component is a leaf.
            </p>
          ) : (
            <ul className="space-y-1.5 text-[13px] text-red-200">
              {issues.map((i, idx) => (
                <li key={idx}>
                  <span className="font-mono text-red-300">{i.name}</span>: {i.msg}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <p className="mt-3 text-[11px] text-ink-faint">
        The rules: the model hierarchy must be <strong>contiguous</strong> from the root
        (a model only under a group/assembly). A <span className="text-emerald-300">component</span> is a
        leaf - below it only a <span className="text-amber-300">subcomponent</span>.{" "}
        An <span className="text-violet-300">assembly</span> is a group that collects models.
        Try setting Chair = component under Floor1 (component) → you will see an error.
      </p>
    </div>
  );
}
