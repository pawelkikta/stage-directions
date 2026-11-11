/* ===========================================================================
 * Scene -> scenegraph tree (a structure for clickable views)
 *
 * Builds the node hierarchy from the layer's authored prims, with computed
 * absolute paths (for example /World/Geom/Cube and .size for a property).
 * It is still a Sdf view (one layer) - no composition.
 * ======================================================================== */
import type { Layer, Path, Prim, Property, Scene } from "./types.ts";

export interface TreePropertyNode {
  path: Path; // for example /World/Geom/Cube.size
  name: string;
  kind: "attribute" | "relationship";
  valueType?: string;
  /** A short description of the value for display. */
  valueLabel?: string;
  hasTimeSamples?: boolean;
  targets?: Path[];
}

export interface TreePrimNode {
  path: Path; // for example /World/Geom/Cube
  name: string;
  specifier: Prim["specifier"];
  typeName?: string;
  kind?: string;
  active: boolean;
  instanceable: boolean;
  /** Number and types of arcs authored on the prim (for UI badges). */
  arcs: string[];
  properties: TreePropertyNode[];
  children: TreePrimNode[];
}

function valueLabel(prop: Property): string | undefined {
  if (prop.kind === "relationship") return undefined;
  if (prop.timeSamples && Object.keys(prop.timeSamples).length) {
    const n = Object.keys(prop.timeSamples).length;
    return `${n} timeSample${n === 1 ? "" : "s"}`;
  }
  if (prop.value === undefined || prop.value === null) return undefined;
  if (Array.isArray(prop.value)) return `[${prop.value.length}]`;
  return String(prop.value);
}

function collectArcs(prim: Prim): string[] {
  const arcs: string[] = [];
  if (prim.inherits?.length) arcs.push("inherits");
  if (prim.variantSets?.length) arcs.push("variantSet");
  if (prim.references?.length) arcs.push("references");
  if (prim.payloads?.length) arcs.push("payload");
  if (prim.specializes?.length) arcs.push("specializes");
  return arcs;
}

function buildPrimNode(prim: Prim, parentPath: string): TreePrimNode {
  const path = `${parentPath}/${prim.name}`;
  return {
    path,
    name: prim.name,
    specifier: prim.specifier,
    typeName: prim.typeName,
    kind: prim.kind,
    active: prim.active !== false,
    instanceable: prim.instanceable === true,
    arcs: collectArcs(prim),
    properties: prim.properties.map((p) => ({
      path: `${path}.${p.name}`,
      name: p.name,
      kind: p.kind,
      valueType: p.kind === "attribute" ? p.valueType : "rel",
      valueLabel: valueLabel(p),
      hasTimeSamples:
        p.kind === "attribute" &&
        !!p.timeSamples &&
        Object.keys(p.timeSamples).length > 0,
      targets: p.kind === "relationship" ? p.targets : undefined,
    })),
    children: prim.children.map((c) => buildPrimNode(c, path)),
  };
}

/** Tree for one layer. parentPath = "" -> paths start at "/". */
export function deriveTree(layer: Layer): TreePrimNode[] {
  return layer.rootPrims.map((p) => buildPrimNode(p, ""));
}

/** Shortcut: the tree of the scene's root layer. */
export function deriveSceneTree(scene: Scene): TreePrimNode[] {
  const root = scene.layers.find((l) => l.id === scene.rootLayerId);
  if (!root) throw new Error(`Scene "${scene.id}": missing rootLayerId ${scene.rootLayerId}`);
  return deriveTree(root);
}

/** Flattens the tree into a list of prims (useful for search and paths). */
export function flattenPrims(nodes: TreePrimNode[]): TreePrimNode[] {
  const out: TreePrimNode[] = [];
  const walk = (n: TreePrimNode) => {
    out.push(n);
    n.children.forEach(walk);
  };
  nodes.forEach(walk);
  return out;
}
