/* ===========================================================================
 * Composition engine (23% of the exam).
 *
 * Value resolution: "strongest opinion wins". We scan the opinions in LIVERPS
 * order (Local > Inherits > Variants > rElocates > References > Payloads >
 * Specializes); the first arc that HAS an opinion wins. Inside the same arc
 * the order in the list decides (references, inherits, subLayers...).
 *
 * Source of the semantics: docs.nvidia.com/learn-openusd (strength ordering),
 * openusd.org/release/glossary.html (LIVRPS/value resolution). Checked.
 * ======================================================================== */
import type { ArcType, AttributeValue, ValueType } from "./types.ts";
import { liverpsRank } from "./types.ts";

export interface Opinion {
  id: string;
  arc: ArcType;
  value: AttributeValue;
  /** The source, for example "shot.usda (root)", "@chair.usd@", "class _ChairStyle". */
  source: string;
  /** A word for the value in the UI, for example "red". */
  label?: string;
  /** A fixed name in the file (class, reference file, variant set) - it does not change when moved. */
  name?: string;
  /** Tie-break inside the same arc (sublayer position; 0 = stronger). */
  subStrength?: number;
  enabled: boolean;
}

export interface ResolutionScenario {
  id: string;
  title: string;
  description: string;
  attributePath: string;
  valueType: ValueType;
  opinions: Opinion[];
  /** The prim in shot.usda that carries all the arcs. */
  prim: { type: string; name: string };
  /** The attribute as written in .usda. */
  attr: { type: "float" | "color3f[]"; name: string };
  /** Names in the files for the seed opinions, per arc. */
  names: Record<ArcType, string>;
  /** The selected variant of the first variant set. */
  variantSelection: string;
  /** What Get() returns when there is no opinion at all (a schema fallback or nothing). */
  schemaDefault: { value: AttributeValue; note: string } | null;
}

export interface ResolutionResult {
  /** All ENABLED opinions, sorted from the strongest. */
  ordered: Opinion[];
  /** The strongest (winning) opinion, or null. */
  winner: Opinion | null;
}

/** Sorts the opinions by LIVERPS and returns the winner (the strongest enabled one).
 *  Inside an arc the order in the array counts (the sort is stable) - like
 *  the position in the references / inherits / subLayers list. An opinion with no
 *  valid value (null) is not an opinion. */
export function resolve(opinions: Opinion[]): ResolutionResult {
  const ordered = opinions
    .filter((o) => o.enabled && o.value !== null)
    .sort((a, b) => {
      const r = liverpsRank(a.arc) - liverpsRank(b.arc);
      return r !== 0 ? r : (a.subStrength ?? 0) - (b.subStrength ?? 0);
    });
  return { ordered, winner: ordered[0] ?? null };
}

/** Formats a value for display. */
export function fmtVal(v: AttributeValue): string {
  if (v === null || v === undefined) return "-";
  if (Array.isArray(v)) return `(${v.join(", ")})`;
  return String(v);
}

/* --- Seed scenarios for the tracer and the value resolution calculator ---- */

let oid = 0;
const op = (
  arc: ArcType,
  value: AttributeValue,
  source: string,
  enabled = true,
  subStrength = 0,
): Opinion => ({ id: `op${oid++}`, arc, value, source, enabled, subStrength });

export const SCENARIOS: ResolutionScenario[] = [
  {
    id: "lamp-intensity",
    title: "Lamp intensity - all arcs",
    description:
      "One prim Lamp in shot.usda carries all arcs at once, and each one brings " +
      "a different inputs:intensity value. Switch opinions off and watch the winner move " +
      "down LIVERPS, while the file below changes with them.",
    attributePath: "/Lamp.inputs:intensity",
    valueType: "float",
    prim: { type: "SphereLight", name: "Lamp" },
    attr: { type: "float", name: "inputs:intensity" },
    names: {
      local: "shot.usda",
      inherit: "_StudioLight",
      variant: "quality",
      relocate: "",
      reference: "lamp.usd",
      payload: "lamp_geo.usd",
      specialize: "_BaseLight",
    },
    variantSelection: "high",
    schemaDefault: { value: 1, note: "the default value from the SphereLight schema" },
    opinions: [
      op("local", 1200, "shot.usda (root layer)"),
      op("inherit", 900, "class _StudioLight"),
      op("variant", 800, 'variantSet "quality" = "high"'),
      op("reference", 500, "@lamp.usd@"),
      op("payload", 450, "@lamp_geo.usd@"),
      op("specialize", 100, "class _BaseLight"),
    ],
  },
  {
    id: "chair-color",
    title: "Chair color - reference vs local override",
    description:
      "The chair from the reference has its own color, and the shot writes its own on the prim. Switch " +
      "the local one off to see the color from the reference, then from the base (specializes).",
    attributePath: "/Chair.primvars:displayColor",
    valueType: "color3f[]",
    prim: { type: "Xform", name: "Chair" },
    attr: { type: "color3f[]", name: "primvars:displayColor" },
    names: {
      local: "shot.usda",
      inherit: "_ChairStyle",
      variant: "look",
      relocate: "",
      reference: "chair.usd",
      payload: "chair_geo.usd",
      specialize: "_BaseChair",
    },
    variantSelection: "default",
    schemaDefault: null,
    opinions: [
      { ...op("local", [0.8, 0.1, 0.1], "shot.usda (root layer)"), label: "red" },
      { ...op("reference", [0.2, 0.45, 0.9], "@chair.usd@"), label: "blue" },
      { ...op("specialize", [0.5, 0.5, 0.5], "class _BaseChair"), label: "gray" },
    ],
  },
];

export function getScenario(id: string): ResolutionScenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

/* --- Model for the Layer stack widget ------------------------------------ */

export interface StackLayer {
  id: string;
  file: string;
  /** Who authors this layer in the studio. */
  owner: string;
  /** The opinion of this layer about the attribute (null = no opinion). */
  value: AttributeValue | null;
}

export interface StackState {
  attributePath: string;
  /** The root layer is always on top of its own stack - it cannot be moved. */
  root: StackLayer;
  /** Order = the order in the subLayers list of the root layer (first is strongest). */
  sublayers: StackLayer[];
}

export const STACK_SEED: StackState = {
  attributePath: "/World/Key.inputs:intensity",
  root: { id: "root", file: "sh010.usda", owner: "the shot - combines the departments", value: null },
  sublayers: [
    { id: "light", file: "sh010_light.usda", owner: "lighting department", value: 2500 },
    { id: "anim", file: "sh010_anim.usda", owner: "animation department", value: null },
    { id: "layout", file: "sh010_layout.usda", owner: "layout - the work light", value: 9000 },
  ],
};

/** The root, then the sublayers in order - the first layer that HAS an opinion wins. */
export function resolveStack(s: StackState): {
  winnerId: string | null;
  value: AttributeValue | null;
} {
  // typed text that is not a number is not an opinion
  const w = [s.root, ...s.sublayers].find((l) => typeof l.value === "number");
  return { winnerId: w?.id ?? null, value: w?.value ?? null };
}

/* --- Data for the Arc playground ----------------------------------------- */

export interface ArcInfo {
  arc: ArcType;
  name_en: string;
  oneLiner: string;
  whenUse: string[];
  whenAvoid: string[];
  /** The name of the file shown in the BEFORE panel. */
  beforeFile: string;
  /** The name of the file shown in the AFTER panel - with a note on whether it is the same file. */
  afterFile: string;
  before: string;
  after: string;
}

/**
 * All arcs tell ONE story, the same as lessons L3/L4 and the Run steps:
 * the studio publishes the asset `chair.usd` and builds the shot `sh010` from it.
 * Because of this the file names do not change from arc to arc.
 */
export const ARC_INFO: ArcInfo[] = [
  {
    arc: "local",
    name_en: "Sublayers (Local)",
    oneLiner:
      "Adds a whole layer to the layer stack. The strongest level of opinions.",
    whenUse: [
      "Combining the work of departments in one file (modeling + look, layout + anim + light).",
      "An override without touching the source - a stronger sublayer is enough.",
    ],
    whenAvoid: [
      "For placing a shared asset many times - that is the job of a reference.",
    ],
    beforeFile: "chair_model.usda - the modeling department layer",
    before: `#usda 1.0

def Xform "Chair"
{
    def Mesh "Seat"
    {
        double height = 45
    }
}`,
    afterFile: "chair_payload.usda - ANOTHER, NEW file that brings the first one in",
    after: `#usda 1.0
(
    defaultPrim = "Chair"
    subLayers = [
        @./chair_look.usda@,    # stronger - earlier in the list
        @./chair_model.usda@    # weaker
    ]
)

# This file has NO content of its own.
# The ( ... ) block at the top IS the whole arc.
# The stage sees Chair from modeling, painted by lookdev.
# If this file itself wrote height = 99, 99 would win:
# the root layer is stronger than its sublayers.`,
  },
  {
    arc: "inherit",
    name_en: "Inherits",
    oneLiner:
      "Inheriting from a class prim. STRONG - a change of the class propagates and wins.",
    whenUse: [
      "Broadcasting: one edit of a class must change all chairs at once.",
      "A shared style or behavior for many prims.",
    ],
    whenAvoid: [
      "When the base must be overridable by anything - that is the role of specializes.",
    ],
    beforeFile: "sh010.usda - the shot, the style class stands next to it",
    before: `#usda 1.0

class "_Style"
{
    color3f primvars:displayColor = (1, 0, 0)
}

def "ChairA" (
    prepend references = @chair.usd@
)
{
}`,
    afterFile: "sh010.usda - THE SAME file, one line added",
    after: `#usda 1.0

class "_Style"
{
    color3f primvars:displayColor = (1, 0, 0)
}

def "ChairA" (
    prepend references = @chair.usd@
    prepend inherits   = </_Style>
)
{
    # Inherits (strength 2) beats References (strength 5),
    # so ChairA is RED - although chair.usd says: brown.
    # An edit of the class _Style repaints all chairs at once.
}`,
  },
  {
    arc: "variant",
    name_en: "Variant Sets",
    oneLiner:
      "Switchable variants on a prim. The selection swaps a subtree of opinions.",
    whenUse: [
      "One asset, many versions (color, LOD) chosen by a selection.",
      "Parameterizing an asset without duplicating files.",
    ],
    whenAvoid: [
      "When the options are independent assets assembled together - use references.",
    ],
    beforeFile: "chair.usd - an asset with no parameters",
    before: `#usda 1.0
(
    defaultPrim = "Chair"
)

def Xform "Chair"
{
}`,
    afterFile: "chair.usd - THE SAME file, a variant set added",
    after: `#usda 1.0
(
    defaultPrim = "Chair"
)

def Xform "Chair" (
    variantSets = "color"
    variants = { string color = "brown" }
)
{
    variantSet "color" = {
        "brown" {
            color3f primvars:displayColor = (0.35, 0.2, 0.1)
        }
        "red" {
            color3f primvars:displayColor = (1, 0, 0)
        }
    }
}

# Without the line "variants = { ... }" NOTHING is selected:
# a variant set with no selection contributes nothing to composition.`,
  },
  {
    arc: "relocate",
    name_en: "Relocates",
    oneLiner:
      "Namespace: changes the path or name of a prim from a reference or payload without editing the source. The 'E' in LIVERPS.",
    whenUse: [
      "Renaming a prim brought in by a reference.",
      "Adapting the namespace to local conventions without touching the asset.",
    ],
    whenAvoid: [
      "For changing a VALUE - relocates is about paths, not about value opinions.",
      "Expecting the old path to keep working: after relocation USD puts " +
        "a “tombstone” on it, and you may NOT author opinions there any more (one path = one place).",
    ],
    beforeFile: "sh010_layout.usda - the layout department layer",
    before: `#usda 1.0

def "Set" (
    prepend references = @chairs.usd@
)
{
    # the asset brings </Set/Chair_01>
}`,
    afterFile: "sh010_layout.usda - THE SAME file + layer metadata",
    after: `#usda 1.0
(
    relocates = {
        </Set/Chair_01>: </Set/HeroChair>
    }
)

def "Set" (
    prepend references = @chairs.usd@
)
{
    # Chair_01 is now visible as HeroChair.
    # On the old path USD puts a tombstone -
    # you may not author any opinions there any more.
}`,
  },
  {
    arc: "reference",
    name_en: "References",
    oneLiner:
      "Places another prim or asset under a prim, encapsulating its hierarchy. The composing idiom.",
    whenUse: [
      "Using the same asset many times (chairs, trees).",
      "Building complex scenes from modular components.",
    ],
    whenAvoid: [
      "For heavy content that you want to load on demand - use a payload.",
    ],
    beforeFile: "sh010_layout.usda - empty places for the chairs",
    before: `#usda 1.0

def Xform "World"
{
    def "ChairA"
    {
    }

    def "ChairB"
    {
    }
}`,
    afterFile: "sh010_layout.usda - THE SAME file, an arc added",
    after: `#usda 1.0

def Xform "World"
{
    def "ChairA" (
        prepend references = @../../assets/chair/chair.usd@
    )
    {
    }

    def "ChairB" (
        prepend references = @../../assets/chair/chair.usd@
    )
    {
        # The same asset file, two independent chairs.
        # "prepend" ADDS to the list; a bare "references ="
        # would REPLACE everything weaker.
    }
}`,
  },
  {
    arc: "payload",
    name_en: "Payloads",
    oneLiner:
      "A reference that you can DEFER (load/unload). Weaker than a reference.",
    whenUse: [
      "Heavy geometry that you load only when needed (performance).",
      "Huge scenes - you open with LoadNone and bring in parts.",
    ],
    whenAvoid: [
      "When the content must always be present and strong - then a reference.",
    ],
    beforeFile: "chair.usd - only the contract, no content",
    before: `#usda 1.0
(
    defaultPrim = "Chair"
)

def Xform "Chair" (
    kind = "component"
)
{
}`,
    afterFile: "chair.usd - THE SAME file, an arc added",
    after: `#usda 1.0
(
    defaultPrim = "Chair"
)

def Xform "Chair" (
    kind = "component"
    prepend payload = @./chair_payload.usda@
)
{
    # The heavy content comes in through a payload,
    # so it can be unloaded for performance.
    # This is exactly the interface file from lesson L4.
}`,
  },
  {
    arc: "specialize",
    name_en: "Specializes",
    oneLiner:
      "The WEAKEST arc - a base or fallback. Anything else overrides specialized values.",
    whenUse: [
      "A base material or preset that variants and references fine-tune.",
      "Default values that always give way to stronger opinions.",
    ],
    whenAvoid: [
      "When the base must WIN after an edit - that is the opposite; use inherits.",
    ],
    beforeFile: "chair_look.usda - the lookdev department layer",
    before: `#usda 1.0

def "BaseMetal"
{
    float roughness = 0.5
    float ior = 1.5
}

def "ChromeLeg"
{
    float roughness = 0.2
}`,
    afterFile: "chair_look.usda - THE SAME file, an arc added",
    after: `#usda 1.0

def "BaseMetal"
{
    float roughness = 0.5
    float ior = 1.5
}

def "ChromeLeg" (
    prepend specializes = </BaseMetal>
)
{
    float roughness = 0.2   # ChromeLeg has its own -> 0.2 wins
    # ior not set -> fallback from BaseMetal = 1.5

    # The opposite of inherits: here the base only FILLS GAPS,
    # it never beats what the asset set itself.
}`,
  },
];
