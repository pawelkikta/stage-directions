/* ===========================================================================
 * Glossary - USD terms with a short plain-English gloss and a definition.
 * USD has dense jargon - a real barrier to entry, so the glossary is rich.
 * ======================================================================== */
import type { GlossaryEntry } from "../core/types.ts";

export const GLOSSARY: GlossaryEntry[] = [
  {
    term: "Stage",
    gloss: "the composed scene",
    conceptId: "stage",
    examTopic: "Data Modeling",
    definition:
      "The runtime, composed view of a scene (UsdStage). What you 'see' after " +
      "all layers and arcs are combined - the Usd view, not the raw file.",
  },
  {
    term: "Prim",
    gloss: "a scene object",
    conceptId: "prim",
    examTopic: "Data Modeling",
    definition:
      "The basic element of the hierarchy (from 'primitive'): a name, a path, a type, " +
      "properties, children.",
  },
  {
    term: "Property",
    gloss: "a piece of prim data",
    conceptId: "property",
    examTopic: "Data Modeling",
    definition: "A named piece of data on a prim - an attribute or a relationship.",
  },
  {
    term: "Attribute",
    gloss: "a property with a value",
    conceptId: "attribute",
    examTopic: "Data Modeling",
    definition:
      "A property that carries a typed value; it can have a default and timeSamples.",
  },
  {
    term: "Relationship",
    gloss: "a pointer to other prims",
    conceptId: "relationship",
    examTopic: "Data Modeling",
    definition:
      "A property that points to other paths (targets), for example material:binding.",
  },
  {
    term: "Property namespace",
    gloss: "the prefix of a property name",
    examTopic: "Data Modeling",
    aliases: ["namespace", "inputs:", "outputs:", "primvars:", "xformOp:", "uniform", "custom"],
    definition:
      "The part of a property name before the last colon, for example inputs in inputs:diffuseColor. " +
      "Independent of the type: token outputs:surface is the type token and the name outputs:surface. " +
      "Schemas give it a meaning (primvars: - data on the geometry, inputs:/outputs: - " +
      "connectable parameters of shaders and lights, xformOp: - transforms).",
  },
  {
    term: "Path (SdfPath)",
    gloss: "an address in the namespace",
    conceptId: "path",
    examTopic: "Data Modeling",
    definition:
      "The address of a prim or property: /World/Geom/Cube and /World/Geom/Cube.size.",
  },
  {
    term: "Layer",
    gloss: "a data layer (Sdf)",
    conceptId: "layer",
    examTopic: "Composition",
    definition:
      "A single file or Sdf unit with raw opinions. 'What was written in the file'.",
  },
  {
    term: "Sdf",
    gloss: "Scene Description Foundation",
    examTopic: "Composition",
    definition:
      "The low-level data layer of USD - flat opinions in a single file or layer, " +
      "before composition. In contrast to Usd (the composed view).",
    aliases: ["Scene Description Foundation"],
  },
  {
    term: "Layer Stack",
    gloss: "the stack of layers",
    conceptId: "layerStack",
    examTopic: "Composition",
    definition:
      "The root layer + its sublayers (recursively). The root is always on top, below it " +
      "the sublayers in the order of the subLayers list (earlier = stronger).",
  },
  {
    term: "Opinion",
    gloss: "a statement about a value",
    examTopic: "Composition",
    definition:
      "A single declaration of a property value in a given layer or arc. Value resolution " +
      "picks the strongest opinion.",
  },
  {
    term: "Composition Arc",
    gloss: "a way to bring data in",
    conceptId: "compositionArc",
    examTopic: "Composition",
    definition:
      "A mechanism for combining data: sublayer, reference, payload, variantSet, inherit, specialize, relocate.",
  },
  {
    term: "Sublayer",
    gloss: "a layer added to the stack",
    conceptId: "sublayer",
    examTopic: "Composition",
    definition:
      "Adds a whole layer to the layer stack; its opinions have 'Local' strength.",
  },
  {
    term: "Reference",
    gloss: "bring in another asset",
    conceptId: "reference",
    examTopic: "Composition",
    definition:
      "Places another prim or asset under a prim, encapsulating its hierarchy. The idiom for composing assets.",
  },
  {
    term: "Payload",
    gloss: "a deferrable reference",
    conceptId: "payload",
    examTopic: "Composition",
    definition:
      "A reference that you can load/unload for performance. Weaker than a reference in LIVERPS.",
  },
  {
    term: "Variant Set",
    gloss: "a set of switchable variants",
    conceptId: "variantSet",
    examTopic: "Composition",
    definition:
      "Switchable variants on a prim; the selection swaps a subtree of opinions.",
  },
  {
    term: "Variant Selection",
    gloss: "the chosen variant",
    examTopic: "Composition",
    definition:
      "The currently selected variant in a variant set (for example 'color' = 'red'). It is itself an opinion and is subject to composition.",
  },
  {
    term: "Inherits",
    gloss: "inheritance from a class",
    conceptId: "inherit",
    examTopic: "Composition",
    definition:
      "An arc that inherits from a prim (usually a class). A change of the base propagates to the inheriting prims. Strong.",
  },
  {
    term: "Specializes",
    gloss: "a base that gives way",
    conceptId: "specialize",
    examTopic: "Composition",
    definition:
      "The WEAKEST arc - a base or fallback that anything else can override.",
  },
  {
    term: "LIVERPS",
    gloss: "the strength order of arcs",
    conceptId: "liverps",
    examTopic: "Composition",
    definition:
      "Local > Inherits > Variants > rElocates > References > Payloads > Specializes (7 arcs). " +
      "'E' = rElocates (a real arc); the old LIVRPS / '6 arcs' is out of date.",
    aliases: ["LIVRPS"],
  },
  {
    term: "Relocates",
    gloss: "remapping a path",
    conceptId: "relocate",
    examTopic: "Composition",
    definition:
      "A namespace arc ('E' in LIVERPS): changes the path or name of a prim from a reference or payload " +
      "in the local layer stack, without editing the source. Strength: between Variants and References.",
  },
  {
    term: "Value Resolution",
    gloss: "computing the final value",
    conceptId: "valueResolution",
    examTopic: "Composition",
    definition:
      "Computing the final value of a property: collect the opinions, sort them by LIVERPS, take the strongest.",
  },
  {
    term: "Specifier",
    gloss: "def, over or class",
    conceptId: "specifier",
    examTopic: "Composition",
    definition: "def (defines), over (overrides), class (an abstract template).",
  },
  {
    term: "def",
    gloss: "defines a prim",
    examTopic: "Composition",
    definition: "The specifier that defines a prim - part of the default traversal and render.",
  },
  {
    term: "over",
    gloss: "an override",
    examTopic: "Composition",
    definition:
      "The specifier that adds opinions to a prim defined somewhere else. On its own it 'creates' nothing in the render without a def below it.",
  },
  {
    term: "class",
    gloss: "an abstract class",
    examTopic: "Composition",
    definition:
      "The specifier of an abstract template - skipped in the default traversal; the target of inherits arcs.",
  },
  {
    term: "Default Prim",
    gloss: "the entry prim of a file",
    conceptId: "defaultPrim",
    examTopic: "Composition",
    definition:
      "Layer metadata: the prim used when someone references the layer without giving a path.",
  },
  {
    term: "Schema",
    gloss: "a blueprint for prims",
    conceptId: "schema",
    examTopic: "Data Modeling",
    definition: "A blueprint of the properties and meaning of a prim; typed (IsA) or API.",
  },
  {
    term: "Typed (IsA) Schema",
    gloss: "a schema that gives the type",
    conceptId: "typedSchema",
    examTopic: "Data Modeling",
    definition: "Gives a prim its typeName (Mesh, Xform...). A prim has one type.",
  },
  {
    term: "API Schema",
    gloss: "an add-on schema",
    conceptId: "apiSchema",
    examTopic: "Data Modeling",
    definition:
      "Adds properties or behavior without changing the type (XformCommonAPI, MaterialBindingAPI).",
  },
  {
    term: "Xform",
    gloss: "a transformable prim",
    conceptId: "xform",
    examTopic: "Data Modeling",
    definition: "UsdGeomXform - carries xformOps; transforms accumulate down the hierarchy.",
  },
  {
    term: "Scope",
    gloss: "a group with no transform",
    conceptId: "scope",
    examTopic: "Data Modeling",
    definition: "A prim that organizes the namespace without a transform.",
  },
  {
    term: "Primvar",
    gloss: "data spread over geometry",
    conceptId: "primvar",
    examTopic: "Visualization",
    definition:
      "An attribute with the primvars: prefix, spread over a surface - one value per object, " +
      "face, point or face corner (interpolation). Constant primvars are inherited down " +
      "the prim hierarchy.",
  },
  {
    term: "UsdGeom",
    gloss: "the geometry domain",
    conceptId: "usdGeom",
    examTopic: "Visualization",
    definition: "Mesh, Xform, Camera, PointInstancer and the geometric primvars.",
  },
  {
    term: "UsdShade",
    gloss: "the materials domain",
    conceptId: "usdShade",
    examTopic: "Visualization",
    definition: "Material, Shader, NodeGraph; inputs/outputs connections and binding.",
  },
  {
    term: "UsdLux",
    gloss: "the lights domain",
    conceptId: "usdLux",
    examTopic: "Visualization",
    definition: "SphereLight, DistantLight, DomeLight, RectLight and the light APIs.",
  },
  {
    term: "Kind",
    gloss: "the model category",
    conceptId: "kind",
    examTopic: "Content Aggregation",
    definition: "component, assembly, group, subcomponent (+ custom kinds).",
  },
  {
    term: "Model Hierarchy",
    gloss: "the tree of models",
    conceptId: "modelHierarchy",
    examTopic: "Content Aggregation",
    definition:
      "An index of models based on kind; models must form an unbroken branch from the root.",
  },
  {
    term: "TimeCode / TimeSamples",
    gloss: "frames / time samples",
    conceptId: "timeSamples",
    examTopic: "Data Modeling",
    definition:
      "TimeCode = the unit of time; timeSamples = a map timeCode→value (animation). " +
      "Syntax: `radius.timeSamples = {...}`. When the same layer has samples, a query at a time " +
      "ignores its default (a stronger layer with only a default beats an animation); outside their range the value is held.",
  },
  {
    term: "Crate (.usdc)",
    gloss: "the binary format",
    examTopic: "Data Modeling",
    definition: "The binary USD format (crate) - fast and compact, not human-readable.",
  },
  {
    term: ".usdz",
    gloss: "a USD package",
    examTopic: "Data Modeling",
    definition:
      "An uncompressed archive (zip) that packs .usd + textures and dependencies for distribution.",
  },
  {
    term: "USD",
    gloss: "Universal Scene Description",
    examTopic: "Data Modeling",
    definition:
      "A scene description system (and a family of formats), not a single file type. From Pixar; the core of OpenUSD.",
    aliases: ["Universal Scene Description"],
  },
  {
    term: "OpenUSD",
    gloss: "the open-source USD project",
    examTopic: "Data Modeling",
    definition:
      "The open-source form of USD under the Alliance for OpenUSD (AOUSD). In practice the same as 'USD'.",
  },
  {
    term: ".usda",
    gloss: "the text format",
    examTopic: "Data Modeling",
    definition:
      "Readable ASCII - editable by hand. Bigger and slower; good for debugging and overrides.",
  },
  {
    term: ".usd",
    gloss: "either format",
    examTopic: "Data Modeling",
    definition:
      "A generic extension - underneath it is ASCII (.usda) or crate (.usdc); USD detects it from the header.",
  },
  {
    term: "Scenegraph Instancing",
    gloss: "native instancing",
    conceptId: "instancing",
    examTopic: "Content Aggregation",
    definition:
      "instanceable=true → a shared prototype; the inside of an instance is read-only.",
  },
  {
    term: "PointInstancer",
    gloss: "point instancing",
    conceptId: "pointInstancer",
    examTopic: "Content Aggregation",
    definition:
      "positions + protoIndices for huge numbers of copies (forests, crowds).",
  },
  {
    term: "Prototype",
    gloss: "the shared original",
    conceptId: "prototype",
    examTopic: "Content Aggregation",
    definition: "The shared subtree for instances; you edit the prototype, not the instance.",
  },
  {
    term: "Flatten",
    gloss: "collapse into one layer",
    examTopic: "Pipeline Development",
    definition:
      "Collapses the whole composition into one layer (removes dependencies and arcs). Used in export and debugging.",
  },
  {
    term: "usdview",
    gloss: "the USD viewer",
    examTopic: "Debugging",
    definition:
      "A tool for stage introspection: hierarchy, properties, composition, a 3D preview.",
  },
];

export function searchGlossary(query: string): GlossaryEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return GLOSSARY;
  return GLOSSARY.filter((e) => {
    const hay = [e.term, e.gloss, e.definition, ...(e.aliases ?? [])]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}
