/* ===========================================================================
 * ConceptGraph seed - a map of USD concepts and their connections.
 * Goal: show HOW the concepts connect, not only what they are.
 * USD semantics based on the official model (Pixar/OpenUSD, Learn OpenUSD).
 * ======================================================================== */
import type { ConceptGraph, ConceptNode, ConceptEdge } from "../core/types.ts";

const nodes: ConceptNode[] = [
  /* --- core ---------------------------------------------------------- */
  {
    id: "stage",
    name_en: "Stage",
    gloss: "the composed scene",
    group: "core",
    module: "Module 1",
    examTopic: "Data Modeling",
    definition:
      "The composed, runtime view of a scene - the entry point to USD (UsdStage). It comes from opening the root layer and composing all layers and arcs. It is the Usd view, not the raw file.",
  },
  {
    id: "prim",
    name_en: "Prim",
    gloss: "a scene object",
    group: "core",
    module: "Module 1",
    examTopic: "Data Modeling",
    definition:
      "The basic container in the stage hierarchy (from 'primitive'). It has a name, a path, an optional type (typeName), properties and child prims.",
  },
  {
    id: "property",
    name_en: "Property",
    gloss: "a piece of prim data",
    group: "core",
    module: "Module 1",
    examTopic: "Data Modeling",
    definition:
      "A named piece of data that belongs to a prim. Two kinds: an attribute (carries a value) or a relationship (points to other paths).",
  },
  {
    id: "path",
    name_en: "Path (SdfPath)",
    gloss: "an address",
    group: "core",
    module: "Module 1",
    examTopic: "Data Modeling",
    definition:
      "The address of a prim or property in the namespace, for example /World/Geom/Cube and /World/Geom/Cube.size (the dot separates the property).",
  },

  /* --- data ---------------------------------------------------------- */
  {
    id: "attribute",
    name_en: "Attribute",
    gloss: "a property with a value",
    group: "data",
    module: "Module 1",
    examTopic: "Data Modeling",
    definition:
      "A property that carries a typed value (valueType, for example float, token, matrix4d). It can have a default value and/or timeSamples (animation).",
  },
  {
    id: "relationship",
    name_en: "Relationship",
    gloss: "a pointer to other prims",
    group: "data",
    module: "Module 1",
    examTopic: "Data Modeling",
    definition:
      "A property that points to other prims or properties (targets). For example the material binding (material:binding) points to a material prim.",
  },
  {
    id: "valueType",
    name_en: "Value Type",
    gloss: "the data type",
    group: "data",
    module: "Module 1",
    examTopic: "Data Modeling",
    definition:
      "The data type of an attribute: scalars (bool, int, float, double, token, string), vectors (float3, double3), color3f, point3f[], matrix4d, asset and so on.",
  },
  {
    id: "timeSamples",
    name_en: "Time Samples",
    gloss: "animation samples",
    group: "data",
    module: "Module 1",
    examTopic: "Data Modeling",
    definition:
      "A map timeCode → value. It gives an attribute its animation. The stage interpolates between samples; the default value applies when there are no timeSamples.",
  },
  {
    id: "primvar",
    name_en: "Primvar",
    gloss: "data spread over geometry",
    group: "data",
    module: "Module 2",
    examTopic: "Visualization",
    definition:
      "An attribute with the primvars: prefix, spread over the geometry surface: one value per object, face, point or face corner (the interpolation metadata). Constant values are inherited down the prim hierarchy. For example primvars:displayColor.",
  },
  {
    id: "metadata",
    name_en: "Metadata",
    gloss: "data about data",
    group: "data",
    module: "Module 1",
    examTopic: "Data Modeling",
    definition:
      "Data about data on a prim, property or layer (for example kind, documentation, active, instanceable, defaultPrim). The set of keys is fixed (plugins can extend it).",
  },
  {
    id: "fileFormats",
    name_en: ".usda / .usdc / .usd / .usdz",
    gloss: "file formats",
    group: "data",
    module: "Module 1",
    examTopic: "Data Modeling",
    definition:
      ".usda = human-readable text; .usdc = binary crate; .usd = either of the two; .usdz = an uncompressed package (archive) for distribution.",
  },

  /* --- schema -------------------------------------------------------- */
  {
    id: "schema",
    name_en: "Schema",
    gloss: "a blueprint for prims",
    group: "schema",
    module: "Module 2",
    examTopic: "Data Modeling",
    definition:
      "A blueprint that defines the properties and meaning of a prim. It generates a C++/Python API. Two kinds: typed (IsA) and API.",
  },
  {
    id: "typedSchema",
    name_en: "Typed (IsA) Schema",
    gloss: "gives the prim type",
    group: "schema",
    module: "Module 2",
    examTopic: "Data Modeling",
    definition:
      "Gives a prim its type (typeName), for example Mesh, Xform, Sphere. The prim 'is' (IsA) this type. A prim has exactly one type.",
  },
  {
    id: "apiSchema",
    name_en: "API Schema",
    gloss: "an add-on schema",
    group: "schema",
    module: "Module 2",
    examTopic: "Data Modeling",
    definition:
      "Adds properties or behavior to an existing prim without changing its type (for example XformCommonAPI, MaterialBindingAPI). You can apply many.",
  },
  {
    id: "xform",
    name_en: "Xform",
    gloss: "a transformable prim",
    group: "schema",
    module: "Module 2",
    examTopic: "Data Modeling",
    definition:
      "A transformable prim (UsdGeomXform). It carries xformOps (translate/rotate/scale). Transforms accumulate down the hierarchy.",
  },
  {
    id: "scope",
    name_en: "Scope",
    gloss: "a group with no transform",
    group: "schema",
    module: "Module 2",
    examTopic: "Data Modeling",
    definition:
      "The simplest grouping prim - with no transform. Used to organize the namespace (for example /World/Geometry, /World/Materials).",
  },
  {
    id: "usdGeom",
    name_en: "UsdGeom",
    gloss: "the geometry domain",
    group: "schema",
    module: "Module 2",
    examTopic: "Visualization",
    definition:
      "The domain of geometry and transforms: Mesh, Xform, Camera, PointInstancer, the geometric primvars.",
  },
  {
    id: "usdShade",
    name_en: "UsdShade",
    gloss: "the materials domain",
    group: "schema",
    module: "Module 2",
    examTopic: "Visualization",
    definition:
      "The domain of materials and shaders: Material, Shader, NodeGraph, inputs/outputs connections and material binding.",
  },
  {
    id: "usdLux",
    name_en: "UsdLux",
    gloss: "the lights domain",
    group: "schema",
    module: "Module 2",
    examTopic: "Visualization",
    definition:
      "The domain of lights: SphereLight, DistantLight, DomeLight, RectLight and so on, plus the light APIs (for example ShadowAPI).",
  },

  /* --- composition --------------------------------------------------- */
  {
    id: "layer",
    name_en: "Layer (Sdf)",
    gloss: "one file of opinions",
    group: "composition",
    module: "Module 3",
    examTopic: "Composition",
    definition:
      "A single file or unit of Sdf data with raw opinions. 'What was written in one file' - the Sdf layer, not the composed view.",
  },
  {
    id: "layerStack",
    name_en: "Layer Stack",
    gloss: "the stack of layers",
    group: "composition",
    module: "Module 3",
    examTopic: "Composition",
    definition:
      "The ordered set of the root layer and its sublayers (recursively). The root layer is on top, below it the sublayers in the order of the subLayers list (earlier = stronger). The strongest layer that has an opinion wins.",
  },
  {
    id: "specifier",
    name_en: "Specifier (def/over/class)",
    gloss: "def, over or class",
    group: "composition",
    module: "Module 3",
    examTopic: "Composition",
    definition:
      "States the intent of a prim spec: def (defines), over (only overrides), class (an abstract template, skipped in the default traversal).",
  },
  {
    id: "compositionArc",
    name_en: "Composition Arc",
    gloss: "a way to bring data in",
    group: "composition",
    module: "Module 3",
    examTopic: "Composition",
    definition:
      "A mechanism for combining data from other places: sublayer, reference, payload, variantSet, inherit, specialize, relocate. Each one has its strength (LIVERPS).",
  },
  {
    id: "sublayer",
    name_en: "Sublayer",
    gloss: "a layer added to the stack",
    group: "composition",
    module: "Module 3",
    examTopic: "Composition",
    definition:
      "Adds a whole layer to the layer stack. Opinions from sublayers have the 'Local' strength in LIVERPS - the strongest.",
  },
  {
    id: "reference",
    name_en: "Reference",
    gloss: "bring in another asset",
    group: "composition",
    module: "Module 3",
    examTopic: "Composition",
    definition:
      "Places another prim or asset under the chosen prim (encapsulating its hierarchy). The basic idiom for composing assets. Stronger than a payload.",
  },
  {
    id: "payload",
    name_en: "Payload",
    gloss: "a deferrable reference",
    group: "composition",
    module: "Module 3",
    examTopic: "Composition",
    definition:
      "A reference that you can DEFER (load/unload) for performance. Mechanically like a reference, but weaker in LIVERPS and loaded on demand.",
  },
  {
    id: "variantSet",
    name_en: "Variant Set",
    gloss: "switchable variants",
    group: "composition",
    module: "Module 3",
    examTopic: "Composition",
    definition:
      "A named set of switchable variants on a prim (for example 'color' = red/blue). The choice (variant selection) swaps a subtree of opinions.",
  },
  {
    id: "inherit",
    name_en: "Inherits",
    gloss: "inheritance from a class",
    group: "composition",
    module: "Module 5",
    examTopic: "Composition",
    definition:
      "An arc that inherits from a prim (usually a class). A change in the base class propagates to all inheriting prims. Strong - right after Local.",
  },
  {
    id: "specialize",
    name_en: "Specializes",
    gloss: "a base that gives way",
    group: "composition",
    module: "Module 5",
    examTopic: "Composition",
    definition:
      "The 'base or fallback' arc - the WEAKEST in LIVERPS. Anything else overrides specialized values. On purpose, so that it works as a default base.",
  },
  {
    id: "liverps",
    name_en: "LIVERPS",
    gloss: "the strength order",
    group: "composition",
    module: "Module 3",
    examTopic: "Composition",
    definition:
      "The strength order of the arcs (7): Local > Inherits > Variants > rElocates > References > Payloads > Specializes. Lower position = weaker. NOTE: 'E' is rElocates - a real arc; the older LIVRPS (6 arcs) is out of date.",
  },
  {
    id: "relocate",
    name_en: "Relocates",
    gloss: "remapping a path",
    group: "composition",
    module: "Module 3",
    examTopic: "Composition",
    definition:
      "A namespace arc: changes the path or name of a prim brought in by a reference or payload, in the local layer stack, without editing the source. It is the 'E' in LIVERPS - between Variants and References.",
  },
  {
    id: "valueResolution",
    name_en: "Value Resolution",
    gloss: "computing the final value",
    group: "composition",
    module: "Module 3",
    examTopic: "Composition",
    definition:
      "The process of computing the final value of a property: it collects all opinions, sorts them by strength (LIVERPS) and takes the strongest one.",
  },
  {
    id: "defaultPrim",
    name_en: "Default Prim",
    gloss: "the entry prim of a file",
    group: "composition",
    module: "Module 3",
    examTopic: "Composition",
    definition:
      "Layer metadata that names the default prim - used when someone references the layer without giving a specific prim path.",
  },

  /* --- aggregation --------------------------------------------------- */
  {
    id: "kind",
    name_en: "Kind",
    gloss: "the model category",
    group: "aggregation",
    module: "Module 6",
    examTopic: "Content Aggregation",
    definition:
      "Metadata that classifies the role of a prim in the model hierarchy: component, assembly, group, subcomponent. Can be extended with custom kinds.",
  },
  {
    id: "modelHierarchy",
    name_en: "Model Hierarchy",
    gloss: "the tree of models",
    group: "aggregation",
    module: "Module 6",
    examTopic: "Content Aggregation",
    definition:
      "An index of 'models' in the scene based on kind. The contiguity rule: models must form an unbroken branch from the root (group/assembly above component).",
  },
  {
    id: "assetInterface",
    name_en: "Asset Interface",
    gloss: "the asset contract",
    group: "aggregation",
    module: "Module 6",
    examTopic: "Pipeline Development",
    definition:
      "The public 'contract' of an asset: a stable default prim, parameterization (variant sets, attributes) and the layer structure that the pipeline relies on.",
  },
  {
    id: "referencePayloadPattern",
    name_en: "Reference/Payload Pattern",
    gloss: "the reference/payload pattern",
    group: "aggregation",
    module: "Module 6",
    examTopic: "Content Aggregation",
    definition:
      "A production idiom: the asset references its heavy content through a payload, so that it can be loaded and unloaded and big scenes can scale.",
  },

  /* --- instancing ---------------------------------------------------- */
  {
    id: "instancing",
    name_en: "Scenegraph Instancing",
    gloss: "native instancing",
    group: "instancing",
    module: "Module 8",
    examTopic: "Content Aggregation",
    definition:
      "Native instancing: prims marked instanceable=true share one prototype. The inside of an instance is read-only.",
  },
  {
    id: "prototype",
    name_en: "Prototype",
    gloss: "the shared original",
    group: "instancing",
    module: "Module 8",
    examTopic: "Content Aggregation",
    definition:
      "A shared, implicit copy of a subtree that USD generates for instanceable prims. You edit the prototype, not a single instance.",
  },
  {
    id: "pointInstancer",
    name_en: "PointInstancer",
    gloss: "point instancing",
    group: "instancing",
    module: "Module 8",
    examTopic: "Content Aggregation",
    definition:
      "Efficient instancing of huge numbers (forests, crowds): the arrays positions + protoIndices point to prototypes. A different mechanism from native instancing.",
  },
];

const edges: ConceptEdge[] = [
  { source: "stage", target: "prim", relation: "has", label: "contains" },
  { source: "prim", target: "property", relation: "has", label: "has" },
  { source: "prim", target: "path", relation: "has", label: "has an address" },
  { source: "property", target: "attribute", relation: "is-a" },
  { source: "property", target: "relationship", relation: "is-a" },
  { source: "attribute", target: "valueType", relation: "has", label: "has a type" },
  { source: "attribute", target: "timeSamples", relation: "has", label: "can have" },
  { source: "attribute", target: "primvar", relation: "related", label: "a primvar is an attr." },
  { source: "prim", target: "metadata", relation: "has" },
  { source: "prim", target: "specifier", relation: "has", label: "has a specifier" },
  { source: "schema", target: "prim", relation: "describes", label: "describes" },
  { source: "schema", target: "typedSchema", relation: "is-a" },
  { source: "schema", target: "apiSchema", relation: "is-a" },
  { source: "typedSchema", target: "xform", relation: "describes" },
  { source: "typedSchema", target: "scope", relation: "describes" },
  { source: "usdGeom", target: "xform", relation: "has" },
  { source: "usdGeom", target: "prim", relation: "describes", label: "geometry" },
  { source: "usdShade", target: "prim", relation: "describes", label: "materials" },
  { source: "usdLux", target: "prim", relation: "describes", label: "lights" },
  { source: "layer", target: "layerStack", relation: "composes", label: "forms" },
  { source: "layerStack", target: "stage", relation: "composes", label: "composes" },
  { source: "layer", target: "defaultPrim", relation: "has" },
  { source: "specifier", target: "prim", relation: "describes" },
  { source: "compositionArc", target: "sublayer", relation: "is-a" },
  { source: "compositionArc", target: "reference", relation: "is-a" },
  { source: "compositionArc", target: "payload", relation: "is-a" },
  { source: "compositionArc", target: "variantSet", relation: "is-a" },
  { source: "compositionArc", target: "inherit", relation: "is-a" },
  { source: "compositionArc", target: "specialize", relation: "is-a" },
  { source: "compositionArc", target: "relocate", relation: "is-a" },
  { source: "payload", target: "reference", relation: "related", label: "deferred ref" },
  { source: "liverps", target: "compositionArc", relation: "describes", label: "orders strength" },
  { source: "valueResolution", target: "liverps", relation: "describes", label: "uses" },
  { source: "valueResolution", target: "property", relation: "describes", label: "computes the value" },
  { source: "compositionArc", target: "stage", relation: "composes" },
  { source: "kind", target: "prim", relation: "describes", label: "classifies" },
  { source: "modelHierarchy", target: "kind", relation: "composes", label: "based on" },
  { source: "assetInterface", target: "referencePayloadPattern", relation: "related" },
  { source: "referencePayloadPattern", target: "payload", relation: "related" },
  { source: "instancing", target: "prototype", relation: "has", label: "shares" },
  { source: "instancing", target: "prim", relation: "describes" },
  { source: "pointInstancer", target: "prototype", relation: "has", label: "points to" },
  { source: "pointInstancer", target: "instancing", relation: "related", label: "another mechanism" },
];

// drop edges to nodes that do not exist (for example placeholders)
const nodeIds = new Set(nodes.map((n) => n.id));
export const CONCEPT_GRAPH: ConceptGraph = {
  nodes,
  edges: edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target)),
};

export function getConcept(id: string): ConceptNode | undefined {
  return CONCEPT_GRAPH.nodes.find((n) => n.id === id);
}

export function relatedConcepts(id: string): ConceptNode[] {
  const ids = new Set<string>();
  for (const e of CONCEPT_GRAPH.edges) {
    if (e.source === id) ids.add(e.target);
    if (e.target === id) ids.add(e.source);
  }
  return CONCEPT_GRAPH.nodes.filter((n) => ids.has(n.id));
}
