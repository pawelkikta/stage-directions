/* ===========================================================================
 * Scene -> .usda (the TEXT view of a Sdf layer)
 *
 * Renders the opinions authored in ONE layer (Layer) as .usda text.
 * This is the Sdf view: "what is written in this file", not the composed Usd view.
 * ======================================================================== */
import type {
  Attribute,
  ArcRef,
  Layer,
  Prim,
  Property,
  Relationship,
  Scene,
  Variant,
} from "./types.ts";

const PAD = "    "; // 4 spaces, as in the USD convention

function indent(depth: number): string {
  return PAD.repeat(depth);
}

function quote(s: string): string {
  return `"${s.replace(/"/g, '\\"')}"`;
}

/** Formats one attribute value in .usda syntax. */
function fmtValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return quote(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return fmtNumber(v);
  if (Array.isArray(v)) {
    // array of numbers -> (a, b, c); array of arrays -> [(..),(..)]
    if (v.length > 0 && Array.isArray(v[0])) {
      return `[${(v as unknown[][]).map((row) => `(${row.map(fmtNumber).join(", ")})`).join(", ")}]`;
    }
    if (v.length > 0 && typeof v[0] === "number") {
      return `(${(v as number[]).map(fmtNumber).join(", ")})`;
    }
    return `[${(v as unknown[]).map(fmtValue).join(", ")}]`;
  }
  return String(v);
}

function fmtNumber(n: unknown): string {
  if (typeof n !== "number") return String(n);
  return Number.isInteger(n) ? n.toString() : n.toString();
}

function fmtAttribute(attr: Attribute, depth: number): string[] {
  const pad = indent(depth);
  const lines: string[] = [];
  const prefix = [
    attr.custom ? "custom " : "",
    attr.variability === "uniform" ? "uniform " : "",
  ].join("");

  if (attr.timeSamples && Object.keys(attr.timeSamples).length > 0) {
    lines.push(`${pad}${prefix}${attr.valueType} ${attr.name} = {`);
    for (const t of Object.keys(attr.timeSamples)
      .map(Number)
      .sort((a, b) => a - b)) {
      lines.push(`${pad}${PAD}${t}: ${fmtValue(attr.timeSamples[t])},`);
    }
    lines.push(`${pad}}`);
  } else if (attr.value !== undefined) {
    lines.push(
      `${pad}${prefix}${attr.valueType} ${attr.name} = ${fmtValue(attr.value)}`,
    );
  } else {
    // a declaration without a value
    lines.push(`${pad}${prefix}${attr.valueType} ${attr.name}`);
  }
  return lines;
}

function fmtRelationship(rel: Relationship, depth: number): string[] {
  const pad = indent(depth);
  const prefix = rel.custom ? "custom " : "";
  const targets =
    rel.targets.length === 1
      ? `<${rel.targets[0]}>`
      : `[${rel.targets.map((t) => `<${t}>`).join(", ")}]`;
  return [`${pad}${prefix}rel ${rel.name} = ${targets}`];
}

function fmtProperty(prop: Property, depth: number): string[] {
  return prop.kind === "attribute"
    ? fmtAttribute(prop, depth)
    : fmtRelationship(prop, depth);
}

function fmtArcRef(ref: ArcRef): string {
  const asset = ref.assetPath ? ref.assetPath : "";
  const prim = ref.primPath ? `<${ref.primPath}>` : "";
  return [asset, prim].filter(Boolean).join("");
}

/** Builds the prim's metadata block `( ... )` from the composition arcs. */
function fmtPrimMetadata(prim: Prim, depth: number): string[] {
  const pad = indent(depth);
  const entries: string[] = [];

  if (prim.kind) entries.push(`${pad}${PAD}kind = ${quote(prim.kind)}`);

  if (prim.inherits && prim.inherits.length)
    entries.push(
      `${pad}${PAD}inherits = ${prim.inherits.length === 1 ? `<${prim.inherits[0]}>` : `[${prim.inherits.map((p) => `<${p}>`).join(", ")}]`}`,
    );

  if (prim.references && prim.references.length)
    entries.push(
      `${pad}${PAD}references = ${prim.references.map(fmtArcRef).join(", ")}`,
    );

  if (prim.payloads && prim.payloads.length)
    entries.push(
      `${pad}${PAD}payload = ${prim.payloads.map(fmtArcRef).join(", ")}`,
    );

  if (prim.specializes && prim.specializes.length)
    entries.push(
      `${pad}${PAD}specializes = ${prim.specializes.map((p) => `<${p}>`).join(", ")}`,
    );

  if (prim.variantSets && prim.variantSets.length) {
    const sel = prim.variantSets
      .filter((vs) => vs.selection)
      .map((vs) => `${quote(vs.name)} = ${quote(vs.selection!)}`);
    if (sel.length)
      entries.push(`${pad}${PAD}variants = {\n${pad}${PAD}${PAD}${sel.join(`\n${pad}${PAD}${PAD}`)}\n${pad}${PAD}}`);
  }

  if (prim.instanceable) entries.push(`${pad}${PAD}instanceable = true`);
  if (prim.active === false) entries.push(`${pad}${PAD}active = false`);

  if (!entries.length) return [];
  return [`${pad}(`, ...entries, `${pad})`];
}

function fmtVariantSets(prim: Prim, depth: number): string[] {
  if (!prim.variantSets || !prim.variantSets.length) return [];
  const pad = indent(depth);
  const lines: string[] = [];
  for (const vs of prim.variantSets) {
    lines.push(`${pad}variantSet ${quote(vs.name)} = {`);
    for (const variant of vs.variants) {
      lines.push(...fmtVariant(variant, depth + 1));
    }
    lines.push(`${pad}}`);
  }
  return lines;
}

function fmtVariant(variant: Variant, depth: number): string[] {
  const pad = indent(depth);
  const lines: string[] = [`${pad}${quote(variant.name)} {`];
  for (const p of variant.properties ?? []) lines.push(...fmtProperty(p, depth + 1));
  for (const child of variant.prims ?? []) lines.push(...fmtPrim(child, depth + 1));
  lines.push(`${pad}}`);
  return lines;
}

function fmtPrim(prim: Prim, depth: number): string[] {
  const pad = indent(depth);
  const typePart = prim.typeName ? `${prim.typeName} ` : "";
  const header = `${pad}${prim.specifier} ${typePart}${quote(prim.name)}`;

  const meta = fmtPrimMetadata(prim, depth);
  const lines: string[] = [];

  if (meta.length) {
    lines.push(header, ...meta, `${pad}{`);
  } else {
    lines.push(`${header}`, `${pad}{`);
  }

  for (const p of prim.properties) lines.push(...fmtProperty(p, depth + 1));
  if (prim.properties.length && (prim.children.length || prim.variantSets?.length))
    lines.push("");

  lines.push(...fmtVariantSets(prim, depth + 1));
  for (const child of prim.children) lines.push(...fmtPrim(child, depth + 1));

  lines.push(`${pad}}`);
  return lines;
}

/** Renders one layer as .usda text (the Sdf view). */
export function deriveUsda(layer: Layer): string {
  const lines: string[] = ["#usda 1.0"];

  // the layer's metadata block
  const layerMeta: string[] = [];
  if (layer.defaultPrim)
    layerMeta.push(`${PAD}defaultPrim = ${quote(layer.defaultPrim)}`);
  if (layer.subLayers && layer.subLayers.length)
    layerMeta.push(
      `${PAD}subLayers = [\n${layer.subLayers.map((s) => `${PAD}${PAD}@${s}@`).join(",\n")}\n${PAD}]`,
    );
  if (layerMeta.length) lines.push("(", ...layerMeta, ")");

  lines.push("");
  for (const prim of layer.rootPrims) {
    lines.push(...fmtPrim(prim, 0), "");
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

/** Shortcut: renders the scene's root layer. */
export function deriveSceneUsda(scene: Scene): string {
  const root = scene.layers.find((l) => l.id === scene.rootLayerId);
  if (!root) throw new Error(`Scene "${scene.id}": missing rootLayerId ${scene.rootLayerId}`);
  return deriveUsda(root);
}

/** Helper: a layer by id. */
export function getLayer(scene: Scene, layerId: string): Layer | undefined {
  return scene.layers.find((l) => l.id === layerId);
}
