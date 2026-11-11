/* ===========================================================================
 * Stage Directions - CORE DATA MODEL
 *
 * One type, `Scene`, is the source of truth for ALL
 * visualizers. From one Scene object we derive, side by side:
 *   (a) the .usda view (text)           -> deriveUsda.ts
 *   (b) the scenegraph tree             -> deriveTree.ts
 *   (c) composition (LIVERPS)           -> composition.ts
 * So we do NOT write a USD parser - one model, many views.
 *
 * On purpose we model a Sdf layer (what is written in one layer), not
 * the composed Usd view. Composition (LIVERPS / value resolution) is computed
 * from this model.
 * ======================================================================== */

/** A prim/property path, for example "/World/Geom/Cube" or "/World/Geom/Cube.size". */
export type Path = string;

/** Prim specifier. `over` creates nothing by itself; `class` is skipped
 *  in the default traversal and render. */
export type Specifier = "def" | "over" | "class";

/** Kind in the model hierarchy. Rule: a component cannot contain another model
 *  (except a subcomponent); assembly/group collect models. */
export type Kind =
  | "component"
  | "assembly"
  | "group"
  | "subcomponent"
  // we allow custom kinds (Customizing USD)
  | (string & {});

/** The most common USD value types. An open list - the exam names, among others,
 *  float, token, matrix4d, color3f, point3f[]. */
export type ValueType =
  | "bool"
  | "int"
  | "int[]"
  | "float"
  | "float[]"
  | "double"
  | "half"
  | "string"
  | "token"
  | "token[]"
  | "asset"
  | "asset[]"
  | "float2"
  | "float3"
  | "double3"
  | "point3f"
  | "point3f[]"
  | "normal3f[]"
  | "color3f"
  | "color3f[]"
  | "texCoord2f[]"
  | "matrix4d"
  | "quatf"
  | (string & {});

/** A list of known types - for the schema inspector and hints. */
export const KNOWN_VALUE_TYPES: readonly ValueType[] = [
  "bool",
  "int",
  "int[]",
  "float",
  "float[]",
  "double",
  "half",
  "string",
  "token",
  "token[]",
  "asset",
  "float3",
  "double3",
  "point3f[]",
  "normal3f[]",
  "color3f",
  "color3f[]",
  "texCoord2f[]",
  "matrix4d",
  "quatf",
];

/** An attribute value at one time code. */
export type AttributeValue =
  | number
  | boolean
  | string
  | number[]
  | number[][]
  | null;

/** Time samples: key = timeCode, value = the attribute value at that time. */
export type TimeSamples = Record<number, AttributeValue>;

export interface Attribute {
  kind: "attribute";
  name: string;
  valueType: ValueType;
  /** The default value, when there are no timeSamples or the time is out of range. */
  value?: AttributeValue;
  /** Animation: overrides `value` at a given time. */
  timeSamples?: TimeSamples;
  /** "uniform", or "varying" by default. */
  variability?: "uniform" | "varying";
  /** primvar (for example "primvars:displayColor") - a helper flag for the UI. */
  isPrimvar?: boolean;
  /** custom (outside the schema). */
  custom?: boolean;
  /** for example interpolation for primvars. */
  metadata?: Record<string, unknown>;
}

export interface Relationship {
  kind: "relationship";
  name: string;
  /** Relationship targets (paths). */
  targets: Path[];
  custom?: boolean;
}

export type Property = Attribute | Relationship;

/** A pointer to an external or internal source for a reference/payload. */
export interface ArcRef {
  /** The asset file, for example "@./assets/chair.usd@". Missing = an internal reference. */
  assetPath?: string;
  /** The prim in the source; missing = the defaultPrim of the target layer. */
  primPath?: Path;
  /** Layer id within this scene (for references inside the model). */
  layerId?: string;
  /** An optional label for the UI. */
  label?: string;
}

export interface Variant {
  name: string;
  /** Prims added or edited in this variant (the variant's opinions). */
  prims?: Prim[];
  /** Properties put on the host prim in this variant. */
  properties?: Property[];
}

export interface VariantSet {
  name: string;
  variants: Variant[];
  /** The variant selected now (variant selection). */
  selection?: string;
}

export interface Prim {
  /** The local name, for example "Cube". */
  name: string;
  specifier: Specifier;
  /** The schema type, for example "Mesh", "Xform", "Scope", "SphereLight". */
  typeName?: string;
  kind?: Kind;
  /** active=false -> deactivation (the prim does not load). */
  active?: boolean;
  /** instanceable=true -> scenegraph (native) instancing. */
  instanceable?: boolean;

  properties: Property[];
  children: Prim[];

  /* --- composition arcs authored ON this prim (LIVERPS order) --- */
  inherits?: Path[];
  variantSets?: VariantSet[];
  references?: ArcRef[];
  payloads?: ArcRef[];
  specializes?: Path[];

  metadata?: Record<string, unknown>;
}

export interface Layer {
  id: string;
  /** File name, for example "shot.usda". */
  name: string;
  defaultPrim?: string;
  /** Sublayer ids - STRONGEST FIRST (as in the USD subLayers list). */
  subLayers?: string[];
  rootPrims: Prim[];
  metadata?: Record<string, unknown>;
}

export interface Scene {
  id: string;
  title: string;
  description?: string;
  /** Id of the root layer - the top of the local layer stack. */
  rootLayerId: string;
  layers: Layer[];
}

/* ===========================================================================
 * LIVERPS - the strength order of composition arcs (current, 7 arcs).
 * Local > Inherits > Variants > rElocates > References > Payloads > Specializes.
 * Lower rank = STRONGER. NOTE: "E" is rElocates (a real arc added
 * in OpenUSD), not a filler letter - older material (LIVRPS, 6 arcs)
 * is out of date. Specializes is the WEAKEST (on purpose - a base/fallback).
 * Source: docs.nvidia.com/learn-openusd … strength-ordering/what-is-liverps.
 * ======================================================================== */
export type ArcType =
  | "local" // opinions from the layer stack (sublayers + root layer)
  | "inherit"
  | "variant"
  | "relocate" // rElocates - namespace remapping of prims from a reference/payload
  | "reference"
  | "payload"
  | "specialize";

export const LIVERPS_ORDER: readonly ArcType[] = [
  "local",
  "inherit",
  "variant",
  "relocate",
  "reference",
  "payload",
  "specialize",
];

/** The LIVERPS letter for an arc (for the UI). */
export const LIVERPS_LETTER: Record<ArcType, string> = {
  local: "L",
  inherit: "I",
  variant: "V",
  relocate: "E",
  reference: "R",
  payload: "P",
  specialize: "S",
};

/** Strength rank: 0 = strongest (local), 6 = weakest (specialize). */
export function liverpsRank(arc: ArcType): number {
  return LIVERPS_ORDER.indexOf(arc);
}

/* ===========================================================================
 * ConceptGraph - the knowledge graph. Nodes = ideas, edges = typed relations.
 * ======================================================================== */

/** The topic areas of the NCP-OUSD exam with their percentage weights. */
export type ExamTopic =
  | "Composition"
  | "Data Exchange"
  | "Pipeline Development"
  | "Data Modeling"
  | "Debugging"
  | "Content Aggregation"
  | "Visualization"
  | "Customizing USD";

export const EXAM_WEIGHTS: Record<ExamTopic, number> = {
  Composition: 23,
  "Data Exchange": 15,
  "Pipeline Development": 14,
  "Data Modeling": 13,
  Debugging: 11,
  "Content Aggregation": 10,
  Visualization: 8,
  "Customizing USD": 6,
};

export type ConceptRelation =
  | "has"
  | "is-a"
  | "composes"
  | "overrides"
  | "describes"
  | "related";

/** The topic group of an idea - sets its column in the Concept Map layout. */
export type ConceptGroup =
  | "core" // stage/prim/property/path
  | "data" // attribute/relationship/types/time/metadata
  | "schema" // schemas + domains
  | "composition" // layers/arcs/LIVERPS/value resolution
  | "aggregation" // kind/model hierarchy/asset
  | "instancing"; // instancing/pointInstancer

export interface ConceptNode {
  id: string;
  name_en: string;
  gloss: string;
  definition: string;
  /** The original course module (for example "Module 3"). */
  module?: string;
  /** The exam topic that the idea mainly belongs to. */
  examTopic?: ExamTopic;
  /** Group for the graph layout. */
  group: ConceptGroup;
}

export interface ConceptEdge {
  source: string;
  target: string;
  relation: ConceptRelation;
  label?: string;
}

export interface ConceptGraph {
  nodes: ConceptNode[];
  edges: ConceptEdge[];
}

/* ===========================================================================
 * Glossary - the USD term stays verbatim, with a short plain-English gloss and a definition.
 * ======================================================================== */
export interface GlossaryEntry {
  term: string; // the USD term (verbatim)
  gloss: string; // a short plain-English gloss
  definition: string;
  examTopic?: ExamTopic;
  /** The linked ConceptGraph node (id) - for the jump to the Concept Map. */
  conceptId?: string;
  aliases?: string[];
}
