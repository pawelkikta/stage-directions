/* ===========================================================================
 * Lessons - the teaching content.
 * Structure: blocks (prose/heading/code/callout/widget) + self-check.
 * Light inline formatting: **bold**, `code`. No full markdown.
 * ======================================================================== */

export type Callout = "key" | "myth" | "tip" | "exam";

export type LessonBlock =
  | { kind: "prose"; md: string }
  | { kind: "heading"; text: string }
  | { kind: "code"; caption?: string; code: string }
  /** Image from the public/ folder - src without a leading slash. */
  | { kind: "image"; src: string; alt: string; caption?: string }
  | { kind: "callout"; tone: Callout; title: string; md: string }
  | {
      kind: "widget";
      widget:
        | "sdf-vs-usd"
        | "scenegraph"
        | "liverps-tracer"
        | "layer-stack"
        | "arc-playground"
        | "value-resolution"
        | "variant-switcher"
        | "instancing"
        | "model-hierarchy"
        | "schema-inspector"
        | "editable-usda"
        | "file-formats"
        | "list-editing"
        | "pxr-bridge"
        | "usdview-tour";
      caption?: string;
    };

export interface SelfCheck {
  q: string;
  options: string[];
  answer: number; // index of the right option
  explanation: string;
}

export interface Lesson {
  id: string;
  layerIndex: number;
  title: string;
  blocks: LessonBlock[];
  selfCheck: SelfCheck[];
}

/* ------------------------------------------------------------------ L0 --- */
const L0: Lesson = {
  id: "l0-big-picture",
  layerIndex: 0,
  title: "Big Picture - why USD, and the two-layer model",
  blocks: [
    {
      kind: "prose",
      md:
        "OpenUSD (Universal Scene Description) is not a 3D file format of the " +
        "'save the scene' kind. It is a **scene description system**. It lets many " +
        "people and departments work on the same scene **non-destructively**: each " +
        "one adds their opinions in a separate layer, and USD composes them into one " +
        "consistent view.",
    },
    {
      kind: "prose",
      md:
        "The problems USD solves: sharing and versioning assets, combining work from " +
        "many tools, overriding without breaking the original, and scaling to huge " +
        "scenes (loading on demand).",
    },
    { kind: "heading", text: "The key intuition: Sdf vs Usd" },
    {
      kind: "callout",
      tone: "key",
      title: "Two mental layers",
      md:
        "**Sdf** = *what you wrote* in one file or layer (flat opinions, raw data). " +
        "**Usd** = *what the runtime sees* after it composes all layers and arcs. " +
        "The exam likes to ask 'what will you see on the stage'. The answer is always " +
        "the **Usd** view (composed), not the raw file.",
    },
    {
      kind: "prose",
      md:
        "Without this model, composition, value resolution and LIVERPS look like magic. " +
        "With it, everything becomes one question: *'which opinions win, and why'*.",
    },
    { kind: "heading", text: "How to read .usda" },
    {
      kind: "prose",
      md:
        "`.usda` is the human-readable text of an Sdf layer. It starts with " +
        "`#usda 1.0`, then an optional block of layer metadata `( ... )`, then the " +
        "prims. Each prim has a **specifier** (`def`/`over`/`class`), an optional **type**, " +
        "a name in quotes, and a `{ ... }` block with its properties and children.",
    },
    {
      kind: "code",
      caption: "A minimal .usda layer",
      code:
        '#usda 1.0\n(\n    defaultPrim = "World"\n)\n\n' +
        'def Xform "World"\n{\n    def Sphere "Ball"\n    {\n        double radius = 1.0\n    }\n}',
    },
    { kind: "heading", text: "At signs in paths: @...@" },
    {
      kind: "prose",
      md:
        "In `.usda` files you will often see values between at signs: " +
        "`@./chair_look.usda@`, `@chair.usd@`, `@textures/wood.png@`. This is not " +
        "decoration and not a kind of quote. **The at signs mark a value of type `asset`**, " +
        "that is, a reference to an external resource.",
    },
    {
      kind: "code",
      caption: "The same text, two very different types",
      code:
        'def Shader "Tex"\n{\n' +
        '    asset  inputs:file = @textures/wood.png@   # asset - USD resolves it\n' +
        '    string inputs:note = "textures/wood.png"   # a plain string\n}',
    },
    {
      kind: "callout",
      tone: "key",
      title: "Two things worth knowing right away",
      md:
        "**First: it is a separate type.** The first line gives an `Sdf.AssetPath` " +
        "value with the fields `path` (what was written) and `resolvedPath` (what was " +
        "found on disk). The second line gives a plain string that USD never tries to " +
        "resolve. Because of the at signs, the engine **knows** this is a resource and " +
        "passes it through the **ArResolver**. This is what makes it possible to version " +
        "assets without touching the scenes (lesson L6).\n" +
        "**Second, and this is where people trip: `./` is relative to the file that " +
        "contains the line**, not to the folder you ran the script from, and not to the " +
        "root layer. If `chair_payload.usda` lives in `show/assets/chair/` and says " +
        "`@./chair_look.usda@`, USD looks for `show/assets/chair/chair_look.usda`, even " +
        "if you started everything from a completely different place. That is why an " +
        "asset can move together with its folder and still work.",
    },
    {
      kind: "widget",
      widget: "sdf-vs-usd",
      caption:
        "The same layer as .usda text (Sdf) and as a scenegraph tree - one model, two views.",
    },
    {
      kind: "callout",
      tone: "exam",
      title: "Why this is the foundation",
      md:
        "Reading `.usda` and telling Sdf from Usd is not a topic area of its own, " +
        "but it comes back in **every** question about composition, debugging and data modeling.",
    },
  ],
  selfCheck: [
    {
      q: "The question 'what radius value will you see on the stage?' is about which view…",
      options: ["Sdf (the raw file)", "Usd (the composed view)", "both - they give the same result"],
      answer: 1,
      explanation:
        "The stage is the Usd view, after composition. The raw file (Sdf) can hold a different opinion than the final result.",
    },
    {
      q: "What is .usda?",
      options: [
        "A binary format for performance",
        "The text form of an Sdf layer",
        "A compressed package with textures",
      ],
      answer: 1,
      explanation:
        ".usda is the text form of a layer. The binary form is .usdc (crate), the package is .usdz.",
    },
    {
      q: "What does USD mainly give a pipeline?",
      options: [
        "A real-time renderer for many DCCs",
        "A non-destructive scene description in layers",
        "A compression format for geometry and textures",
      ],
      answer: 1,
      explanation:
        "USD is a scene description system: layers, composition, overrides that do not break the original.",
    },
  ],
};

/* ------------------------------------------------------------------ L1 --- */
const L1: Lesson = {
  id: "l1-fundamentals",
  layerIndex: 1,
  title: "Scene Description Fundamentals",
  blocks: [
    {
      kind: "prose",
      md:
        "The USD data layer has a few building blocks that come back everywhere: **stage**, " +
        "**prim**, **property** (a property is either an **attribute** or a " +
        "**relationship**), **paths**, **time** and **metadata**.",
    },
    { kind: "heading", text: "Stage, Prim, Property" },
    {
      kind: "prose",
      md:
        "A **stage** is the composed view of a scene (the entry point). A **prim** is " +
        "a container in the hierarchy: it has a name, a path, an optional **type** (for example `Mesh`, " +
        "`Xform`) and children. A **property** is a named piece of data on a prim.",
    },
    {
      kind: "callout",
      tone: "key",
      title: "Attribute vs Relationship",
      md:
        "An **attribute** *carries a value* (for example `double size = 2`). It has a type and can be " +
        "animated (timeSamples). A **relationship** *points* to other paths " +
        "(targets), for example `rel material:binding = </World/Looks/Metal>`. These are two different " +
        "kinds of property - do not mix them up.",
    },
    { kind: "heading", text: "Anatomy of a line: type, namespace, name" },
    {
      kind: "prose",
      md:
        "Attribute declarations look like chaos: once `float`, once " +
        "`primvars:displayColor`, once `inputs:diffuseColor`, once `token outputs:surface`. " +
        "In fact every line has the same skeleton, and one thing confuses people most: " +
        "**the type and the namespace are two independent things**. `token outputs:surface` is " +
        "not some type called “token:outputs”. It is the type `token` plus the name `outputs:surface`.",
    },
    {
      kind: "code",
      caption: "Skeleton: [uniform | custom]  TYPE  [namespace:]name  = value",
      code:
        'def Sphere "Ball" (\n' +
        '    prepend apiSchemas = ["MaterialBindingAPI"]\n' +
        ')\n{\n' +
        '    double radius = 2\n' +
        '    color3f[] primvars:displayColor = [(0.42, 0.24, 0.11)]\n' +
        '    double3 xformOp:translate = (0, 10, 0)\n' +
        '    uniform token[] xformOpOrder = ["xformOp:translate"]\n' +
        '    custom float studio:spin:rpm = 33.3\n' +
        '    rel material:binding = </Wood>\n' +
        '}\n\n' +
        'def Material "Wood"\n{\n' +
        '    def Shader "PBR"\n    {\n' +
        '        uniform token info:id = "UsdPreviewSurface"\n' +
        '        color3f inputs:diffuseColor = (0.42, 0.24, 0.11)\n' +
        '        token outputs:surface\n' +
        '    }\n' +
        '}',
    },
    {
      kind: "code",
      caption:
        "How USD itself splits these lines - the result of `GetTypeName`, `GetNamespace` and `GetBaseName`",
      code:
        'name in the file         type        namespace     base name\n' +
        '-----------------------  ----------  ------------  ------------\n' +
        'radius                   double      -             radius\n' +
        'primvars:displayColor    color3f[]   primvars      displayColor\n' +
        'xformOp:translate        double3     xformOp       translate\n' +
        'xformOpOrder             token[]     -             xformOpOrder\n' +
        'studio:spin:rpm          float       studio:spin   rpm\n' +
        'material:binding         (rel)       material      binding\n' +
        'info:id                  token       info          id\n' +
        'inputs:diffuseColor      color3f     inputs        diffuseColor\n' +
        'outputs:surface          token       outputs       surface',
    },
    {
      kind: "callout",
      tone: "key",
      title: "Namespaces you see in this app",
      md:
        "The namespace is everything **before the last colon**. For the parser it is just " +
        "part of the name: `CreateAttribute(\"inputs:anything\", Int)` works without " +
        "complaint. **Only schemas give it a meaning**, because they agree on what " +
        "lives in a given namespace:\n" +
        "`primvars:` - data “on the geometry”, for example color (UsdGeom). Some of them are inherited " +
        "down the hierarchy - lesson L2 explains which ones.\n" +
        "`inputs:` / `outputs:` - parameters and outputs of shaders, materials and also " +
        "lights (`inputs:intensity` in UsdLux). These are the attributes you can wire " +
        "together with `.connect`.\n" +
        "`xformOp:` - transform operations; `xformOpOrder` sets the order in which they " +
        "run.\n" +
        "`info:` - information about a shader, for example `info:id` says which shader it is.\n" +
        "`material:binding` - this is the name of a **relationship**, not an attribute.\n" +
        "`studio:spin:` - your own namespace. You can create your own, even with several levels.",
    },
    {
      kind: "callout",
      tone: "tip",
      title: "Types that come back often",
      md:
        "`float`, `double` - a number (`double` is more precise). `int`, `bool` - as " +
        "everywhere.\n" +
        "`float3`, `double3`, `color3f` - three numbers. `color3f` is also three floats, " +
        "only marked with the color role.\n" +
        "`token` - a short string from a fixed set, like an enum: `\"Y\"`, " +
        "`\"UsdPreviewSurface\"`. `string` - any text.\n" +
        "`asset` - a path between at signs `@...@` (lesson L0).\n" +
        "`[]` at the end of a type - an array, for example `color3f[]`, `token[]`.\n" +
        "`rel` - this is **not a type** but a relationship: it points to paths and carries no value.",
    },
    {
      kind: "callout",
      tone: "myth",
      title: "Words in front and suffixes at the end",
      md:
        "`uniform` - a **declaration** that the value does not change over time. It is an intent, " +
        "not a lock: USD accepts a time sample on a `uniform` attribute too, " +
        "without any error. Schemas mark this way the things that by definition should not " +
        "be animated, like `xformOpOrder` or `info:id`.\n" +
        "`custom` - an attribute outside the schema. It changes nothing in behavior (reading " +
        "is the same); it is information for people and tools.\n" +
        "`.timeSamples` - an animation instead of one value (below, in the part about time). " +
        "`.connect` - a wire to another attribute instead of a value (lesson L2).\n" +
        "Do not mix up the dots: in the path `/Ball.radius` the dot separates the prim from the property, " +
        "while in the file `radius.timeSamples` the dot adds a suffix to the same property.",
    },
    { kind: "heading", text: "Type roles: the same numbers, a different meaning" },
    {
      kind: "prose",
      md: "`point3f`, `vector3f`, `normal3f` and `color3f` store exactly the same thing - three floats. They differ in **role**: information for tools on how to treat these numbers. A point moves with the object, a vector only rotates, a normal must stay perpendicular to the surface, and a color can go through color management. `texCoord2f` is two floats in the role of texture coordinates.",
    },
    {
      kind: "code",
      caption: "Type and role straight from `Sdf.ValueTypeNames`",
      code: "from pxr import Sdf\n\nfor name in [\"Float3\", \"Point3f\", \"Vector3f\", \"Normal3f\", \"Color3f\", \"TexCoord2f\"]:\n    t = getattr(Sdf.ValueTypeNames, name)\n    print(f\"{str(t):11} stores {t.type.typeName}  role: {t.role or '-'}\")",
    },
    {
      kind: "code",
      caption: "What it prints",
      code: "float3      stores GfVec3f  role: -\npoint3f     stores GfVec3f  role: Point\nvector3f    stores GfVec3f  role: Vector\nnormal3f    stores GfVec3f  role: Normal\ncolor3f     stores GfVec3f  role: Color\ntexCoord2f  stores GfVec2f  role: TextureCoordinate",
    },
    {
      kind: "callout",
      tone: "myth",
      title: "The role is not decoration",
      md: "A converter that writes positions as `float3[] points` produces a file that opens, but tools do not know these are points. The UsdGeom schemas declare the roles directly: `points` is `point3f[]`, `normals` is `normal3f[]`, and UVs are `texCoord2f[] primvars:st`.",
    },
    { kind: "heading", text: "Paths" },
    {
      kind: "prose",
      md:
        "A path addresses an element in the namespace. A prim: `/World/Geom/Cube`. A property: " +
        "`/World/Geom/Cube.size` - the **dot** separates the property part from the prim path.",
    },
    {
      kind: "widget",
      widget: "scenegraph",
      caption:
        "Click a prim or property and see how the path is built live from the hierarchy.",
    },
    { kind: "heading", text: "Time: TimeCodes & TimeSamples" },
    {
      kind: "prose",
      md:
        "An attribute has **two separate channels** of values: **default** (one value, no time) " +
        "and **timeSamples** (a map `timeCode → value`). They are not variants of the same thing: " +
        "an attribute can have both at once, and USD picks the channel based on what you ask for.",
    },
    {
      kind: "code",
      caption: "Correct syntax: default + timeSamples (note the `.timeSamples`)",
      code:
        'def Sphere "Ball"\n{\n' +
        '    double radius = 1.0              # default channel\n' +
        '    double radius.timeSamples = {    # time channel\n' +
        '        10: 5.0,\n' +
        '        20: 10.0,\n' +
        '    }\n}',
    },
    {
      kind: "callout",
      tone: "key",
      title: "What this attribute really returns",
      md:
        "For the code above: `Get(5)` → **5.0** (before the first sample the value is " +
        "*held* - NOT 1.0!). `Get(15)` → **7.5** (linear interpolation " +
        "between 5.0 and 10.0). `Get(25)` → **10.0** (held after the last sample). " +
        "`Get()` with no time → **1.0** (only this reads the default).",
    },
    {
      kind: "image",
      src: "renders/timesamples.png",
      alt:
        "Six frames of the same ball on a checkerboard. Frames 5 and 10: a medium ball. " +
        "Frame 15: bigger. Frames 20 and 25: the biggest. The frame with no time: a tiny ball.",
      caption:
        "The images in the lessons are `usdrecord` renders - you can make them yourself with the same tool in the " +
        "Run steps. Here: the same `Ball` at five frames and with no time (one floor tile = 5 units). " +
        "Up to frame 10 the ball stays the same, between 10 and 20 it grows, after 20 it stays again. " +
        "The tiny ball from the default channel does not appear on any animation frame.",
    },
    {
      kind: "prose",
      md:
        "Hence the rule: **if the same layer has timeSamples, a query at a time ignores " +
        "its default** - the default only counts when there are no samples. Interpolation is " +
        "linear only for types that can be interpolated; `token`, `string` and `asset` " +
        "are always *held* (they jump at the next sample).",
    },
    {
      kind: "callout",
      tone: "myth",
      title: "Across layers, a default can hide an animation",
      md:
        "The rule “timeSamples beat the default” works **inside one layer**. When " +
        "the opinions are in different layers, first **the strongest layer that has " +
        "any opinion** wins - and only inside that layer is the channel chosen.\n" +
        "If a weaker layer has an animation of `radius` and a stronger one has only `radius = 1.0`, " +
        "then `Get(15)` returns **1.0**: the animation from the weaker layer is not " +
        "considered at all. You will learn the layer order in L3 - here it is enough to remember that " +
        "a default alone in a stronger layer “freezes” the attribute.",
    },
    { kind: "heading", text: "Value blocking" },
    {
      kind: "prose",
      md: "Sometimes a stronger layer does not want to override a value but to **switch it off**, so that weaker opinions stop counting. This is what a block does: instead of a value you write `None`.",
    },
    {
      kind: "code",
      caption: "`shot.usda` - below it, `base.usda` has `double radius = 5`",
      code: "#usda 1.0\n(\n    subLayers = [\n        @./base.usda@\n    ]\n)\n\nover \"Ball\"\n{\n    double radius = None    # block - weaker opinions stop counting\n}",
    },
    {
      kind: "callout",
      tone: "key",
      title: "A block is not the same as no line",
      md: "Without the `radius` line in `shot.usda`, the 5 from `base.usda` would win. With the block, `HasAuthoredValue()` returns `False`, and `Get()` in USD 25.08 returns `None` - for weaker layers the attribute looks as if nobody ever wrote a value.\nThe trap: `radius` has a default value of 1 in the `Sphere` schema, and still `Get()` does not return it, although `GetResolveInfo()` reports the source as *fallback*. Do not assume that a block brings back the schema value.\nIn Python, `attr.Block()` authors the block - it writes exactly `double radius = None` into the layer.",
    },
    { kind: "heading", text: "File formats" },
    {
      kind: "callout",
      tone: "tip",
      title: ".usda / .usdc / .usd / .usdz",
      md:
        "`.usda` - human-readable text. `.usdc` - binary **crate** " +
        "(fast, compact). `.usd` - can be either one. `.usdz` - " +
        "an **uncompressed package** (archive) with the .usd and its dependencies, for distribution.",
    },
    {
      kind: "widget",
      widget: "file-formats",
      caption:
        "USD vs .usda / .usdc / .usd / .usdz - one system, different encodings.",
    },
    { kind: "heading", text: "Metadata and USD modules" },
    {
      kind: "prose",
      md:
        "**Metadata** is 'data about data' (for example `kind`, `documentation`, `active`, " +
        "`defaultPrim`). The set of keys is fixed, but plugins can extend it. " +
        "**USD modules**: `Sdf` (the data layer), `Usd` (composition and runtime), and " +
        "the domains `UsdGeom`, `UsdShade`, `UsdLux`.",
    },
    { kind: "heading", text: "The Sdf API: authoring without a stage" },
    {
      kind: "prose",
      md: "So far everything went through `Usd`: the stage, prims, attributes after composition. Below it there is a lower level, **Sdf** - you work directly on one layer, with no composition. Converters and tools for bulk changes use it, because they do not recompute composition after every change.",
    },
    {
      kind: "code",
      caption: "A layer built with Sdf only",
      code: "from pxr import Sdf\n\nlayer = Sdf.Layer.CreateAnonymous(\".usda\")\nwith Sdf.ChangeBlock():  # one change notification instead of many\n    prim = Sdf.CreatePrimInLayer(layer, \"/Chair\")\n    prim.specifier = Sdf.SpecifierDef\n    prim.typeName = \"Xform\"\n    height = Sdf.AttributeSpec(prim, \"height\", Sdf.ValueTypeNames.Double)\n    height.default = 88.0\n\nprint(layer.ExportToString())",
    },
    {
      kind: "code",
      caption: "What it prints",
      code: "#usda 1.0\n\ndef Xform \"Chair\"\n{\n    double height = 88\n}",
    },
    {
      kind: "callout",
      tone: "tip",
      title: "When Sdf, when Usd",
      md: "`Usd` - when you want to see the result of composition and use schemas (`UsdGeom.Mesh`, `GetPropertyStack`). `Sdf` - when you write one specific layer and you know what must be in it.\n`Sdf.ChangeBlock` collects many changes into one notification - with thousands of prims this is a big difference. You set the specifier yourself: `Sdf.CreatePrimInLayer` creates the prim as an `over`, which is why the example has `prim.specifier = Sdf.SpecifierDef`.",
    },
    {
      kind: "callout",
      tone: "exam",
      title: "This is 13% of the exam",
      md:
        "Data Modeling tests exactly these building blocks: types (float/token/matrix4d…), " +
        "prims, properties, primvars, timeSamples and the built-in schemas.",
    },
  ],
  selfCheck: [
    {
      q: "An attribute has `radius = 1` and `radius.timeSamples = {10: 5, 20: 10}` in the same layer. What does `Get(5)` return?",
      options: [
        "5.0 - before the first sample the value is held",
        "1.0 - before the first sample the default applies",
        "2.5 - interpolation from zero to the first sample",
      ],
      answer: 0,
      explanation:
        "When a layer has timeSamples, a query at a time ignores its default. Before the first sample the value is *held*, and after the last one too. You only see the default with `Get()` with no time.",
    },
    {
      q: "A weaker layer has an animation of `radius` {10: 5, 20: 10}, a stronger one has only `radius = 1`. What does `Get(15)` return?",
      options: [
        "7.5 - interpolated samples from the weaker layer",
        "1.0 - the stronger layer has an opinion",
        "5.0 - the first animation sample, held",
      ],
      answer: 1,
      explanation:
        "First the strongest layer that has any opinion wins - and only inside it is the channel chosen. The stronger layer has only a default, so the animation from the weaker one is not considered at all.",
    },
    {
      q: "In the line `token outputs:surface`, what is the type and what is the property name?",
      options: [
        "Type token:outputs, name surface",
        "Type outputs, name surface, token is a modifier",
        "Type token, name outputs:surface",
      ],
      answer: 2,
      explanation:
        "The type and the namespace are two independent things. `outputs` is the namespace, the part of the name before the last colon - `GetTypeName()` returns `token`, `GetBaseName()` returns `surface`.",
    },
    {
      q: "An attribute of type `token` has the samples `{1: \"A\", 10: \"B\"}`. What does `Get(5)` return?",
      options: [
        "\"A\" - a token is not interpolated, it is held",
        "\"B\" - it takes the nearest sample",
        "An empty token - there is no value between samples",
      ],
      answer: 0,
      explanation:
        "Linear interpolation works only for types that can be interpolated. `token`, `string` and `asset` are always held: the value from sample 1 applies until frame 10.",
    },
  ],
};

/* ------------------------------------------------------------------ L3 --- */
const L3: Lesson = {
  id: "l3-composition",
  layerIndex: 3,
  title: "Composition - the heart of USD",
  blocks: [
    {
      kind: "prose",
      md:
        "This is **23% of the exam** and the core of USD. Composition is the set of rules by which " +
        "USD combines many layers and sources into one composed stage. Everything " +
        "comes down to one question: **which opinion wins, and why**.",
    },
    { kind: "heading", text: "Layers and the layer stack" },
    {
      kind: "prose",
      md:
        "A **layer** is a unit of Sdf data. A **layer stack** is the ordered set of the " +
        "root layer and its **sublayers**. The **root layer** is always on top, " +
        "and below it the sublayers in the order of the `subLayers` list - earlier in the list " +
        "means stronger. All of this is the **Local** arc - the strongest level of opinions.",
    },
    {
      kind: "widget",
      widget: "layer-stack",
      caption:
        "Shot sh010 from the Run steps: reorder the sublayers, add and remove opinions. The strongest layer that HAS an opinion wins.",
    },
    {
      kind: "callout",
      tone: "key",
      title: "An empty layer does not win",
      md:
        "A stronger layer wins only if it **has** an opinion about the property. " +
        "If it has none, USD moves down to the next one. A weaker layer with an opinion beats " +
        "a stronger one without an opinion.",
    },
    {
      kind: "prose",
      md:
        "Here is the same thing as a picture. `sh010.usda` combines three department files: " +
        "**layout** places the floor, two chairs, the lights and the camera, **animation** " +
        "rotates `ChairA`, and **lighting** dims the work light, hangs a warm lamp " +
        "to the side and repaints `ChairB` black. Each file alone, then the whole shot:",
    },
    {
      kind: "image",
      src: "renders/layers-alone-vs-composed.png",
      alt: "Four frames: layout alone with two brown chairs on a checkerboard, an empty animation frame, an empty lighting frame, and the composed shot with a rotated chair, a warm spot of light and a black second chair",
      caption:
        "Opened alone, animation and lighting give nothing to draw. The rotation, the spot of light and the black chair exist only in the composition.",
    },
    {
      kind: "callout",
      tone: "key",
      title: "A file with content, and an empty frame",
      md:
        "`sh010_light.usda` has a lot of content, even `def SphereLight \"Lamp\"`. Still, " +
        "opened alone it draws nothing: everything sits under `over \"World\"`. Such a prim " +
        "**is** on the stage - `GetPrimAtPath` returns it and you can read its " +
        "values - but it is **undefined** (`IsDefined()` = False). Traversal and " +
        "the renderer skip undefined prims together with their whole subtree, so they " +
        "do not visit the lamp either. Only `def \"World\"` from layout gives these opinions a place " +
        "where they can take effect.",
    },
    { kind: "heading", text: "Layer offsets: shifting and scaling time" },
    {
      kind: "prose",
      md: "A sublayer and a reference can shift and scale the time of the layer they bring in. The animation file stays untouched:",
    },
    {
      kind: "code",
      caption: "`shot.usda` - in `anim.usda` the `radius` samples are at frames 1 and 10",
      code: "#usda 1.0\n(\n    subLayers = [\n        @./anim.usda@ (offset = 100; scale = 2)\n    ]\n)\n\ndef Sphere \"Ball\"\n{\n}",
    },
    {
      kind: "callout",
      tone: "key",
      title: "Layer time x scale + offset",
      md: "The samples from frames 1 and 10 land on the stage at frames 102 and 120 (1 x 2 + 100 = 102). At frame 111 `radius` is 5.5 - interpolation already works in scene time. A reference accepts the same: `prepend references = @./anim.usda@ (offset = 24)` moves the samples from 1 and 10 to 25 and 34. This is how one animation is placed in several spots with a different start.",
    },
    { kind: "heading", text: "Edit target and session layer: where a write goes" },
    {
      kind: "prose",
      md: "The stage combines many layers, but every `Set()` must go to one of them. The **edit target** decides which - by default the root layer. Above the root layer there is also the **session layer**: the strongest one, but it is never saved to a file.",
    },
    {
      kind: "code",
      caption: "Two writes, two different targets",
      code: "from pxr import Sdf, Usd\n\nbase = Sdf.Layer.CreateNew(\"base.usda\")\nbase.ImportFromString('#usda 1.0\\ndef Sphere \"Ball\"\\n{\\n    double radius = 1\\n}\\n')\nbase.Save()\nshot = Sdf.Layer.CreateNew(\"shot.usda\")\nshot.subLayerPaths.append(\"./base.usda\")\nshot.Save()\n\nstage = Usd.Stage.Open(\"shot.usda\")\nradius = stage.GetPrimAtPath(\"/Ball\").GetAttribute(\"radius\")\n\nstage.SetEditTarget(Usd.EditTarget(base))     # 1. the write goes to base.usda\nradius.Set(2.0)\nstage.SetEditTarget(stage.GetSessionLayer())  # 2. the write goes to the session layer\nradius.Set(99.0)\n\nprint(\"on the stage   :\", radius.Get())\nprint(\"opinions       :\", [spec.layer.GetDisplayName() for spec in radius.GetPropertyStack()])\nbase.Save()\nshot.Save()\n\nagain = Usd.Stage.Open(\"shot.usda\")\nprint(\"after reopening:\", again.GetPrimAtPath(\"/Ball\").GetAttribute(\"radius\").Get())",
    },
    {
      kind: "code",
      caption: "What it prints",
      code: "on the stage   : 99.0\nopinions       : ['shot-session.usda', 'base.usda']\nafter reopening: 2.0",
    },
    {
      kind: "callout",
      tone: "key",
      title: "The session layer wins, but it disappears",
      md: "The first `Set` went to `base.usda` and was saved - after reopening it is 2.0. The second went to the session layer: it wins on the stage (99) and stands first in `GetPropertyStack`, but it disappears with the session. Preview tools use this so that changes in the GUI do not dirty the files.",
    },
    { kind: "heading", text: "Specifiers: def / over / class" },
    {
      kind: "callout",
      tone: "myth",
      title: "over ≠ def",
      md:
        "**def** defines a prim (part of the default traversal and render). **over** only " +
        "puts opinions on a prim defined somewhere else - if no layer has a `def`, " +
        "the prim exists, but as undefined, and adds nothing to the " +
        "render. **class** is an abstract template: defined, but **skipped** in " +
        "the default traversal (the usual target of inherits and specializes arcs).",
    },
    { kind: "heading", text: "Composition arcs" },
    {
      kind: "prose",
      md:
        "An arc is a way to bring in data from another place. There are 7 of them: " +
        "**sublayer (Local)**, **inherits**, **variant sets**, **relocates**, " +
        "**references**, **payloads**, **specializes**. Pick an arc and see what it does " +
        "and when (not) to use it:",
    },
    {
      kind: "widget",
      widget: "arc-playground",
      caption: "Before and after for each arc, plus when to use it and when not to.",
    },
    {
      kind: "callout",
      tone: "tip",
      title: "Reference vs Payload",
      md:
        "**A payload is a reference that you can defer** (load/unload) - for heavy " +
        "content. Mechanically they do the same; they differ in when they load and in their position " +
        "in LIVERPS (References are stronger than Payloads).",
    },
    { kind: "heading", text: "Relocates: move a prim from a reference without editing the asset" },
    {
      kind: "prose",
      md: "The asset `char.usda` has an arm under `/Char/Rig/Arm`. The shot wants it under `/Hero/LeftArm` - without touching the asset:",
    },
    {
      kind: "code",
      caption: "`shot.usda` - relocates sits in the layer metadata",
      code: "#usda 1.0\n(\n    relocates = {\n        </Hero/Rig/Arm>: </Hero/LeftArm>\n    }\n)\n\ndef Xform \"Hero\" (\n    prepend references = @./char.usda@    # in the asset: /Char/Rig/Arm\n)\n{\n}",
    },
    {
      kind: "callout",
      tone: "key",
      title: "The old path disappears, the opinions follow the prim",
      md: "After composition `/Hero/Rig/Arm` does not exist, and `/Hero/LeftArm` has all the opinions from the asset (for example `length = 60`). Relocates is a map *old path: new path* in the layer metadata - this is the 'E' in LIVERPS.\nIt moves only prims brought in by an arc. An entry for a prim defined in the same layer stack does not move it: in USD 25.08 the prim disappears from the old path, nothing appears under the new one, and `GetCompositionErrors()` is empty.",
    },
    { kind: "heading", text: "Inherits vs Specializes - on a concrete case" },
    {
      kind: "prose",
      md:
        "This is the most common mistake in USD, and “inherits is strong, specializes is weak” " +
        "explains nothing on its own. The difference only shows when an opinion comes through an arc " +
        "that sits **between** them in LIVERPS - most often a **reference**. " +
        "Take the asset `chair.usd`, which sets its own color to brown, and a shot that " +
        "wants to repaint all chairs **with one edit**:",
    },
    {
      kind: "code",
      caption: "shot.usda - a local class + the asset brought in by a reference",
      code:
        '#usda 1.0\n\n' +
        'class "_Style"\n{\n' +
        '    color3f[] primvars:displayColor = [(0.85, 0.12, 0.1)]   # red - the edit in the shot\n}\n\n' +
        'def "ChairA" (\n' +
        '    prepend references = @chair.usd@   # the asset says: brown\n' +
        '    prepend inherits   = </_Style>     # ...or specializes - see below\n' +
        ')\n{\n}',
    },
    {
      kind: "callout",
      tone: "key",
      title: "The same setup, two different results",
      md:
        "`/ChairA.primvars:displayColor` gets **two** opinions: brown (through " +
        "**References**) and red (through the arc to `_Style`). The stronger arc wins:\n" +
        "**inherits** → Inherits (2nd place) beats References (5th) → **red**. " +
        "Your edit of the class *overrides* the asset - this is broadcasting.\n" +
        "**specializes** → References (5th) beats Specializes (7th, last) → **brown**. " +
        "The asset wins, and the class works only as a fallback where the asset says nothing.",
    },
    {
      kind: "image",
      src: "renders/inherits-specializes.png",
      alt: "Four frames with a chair: references brown, references + inherits red, references + specializes brown, no color + specializes red.",
      caption:
        "The same asset in four arc setups (the label is above each frame). A reference alone gives brown. With `inherits`, the red of the class overrides the asset. With `specializes`, the brown of the asset wins. An asset **with no color** + `specializes` - red, because the base fills the gap.",
    },
    {
      kind: "callout",
      tone: "tip",
      title: "The fourth chair is the whole secret of specializes",
      md:
        "The third chair looks as if `specializes` **did nothing** - and this is " +
        "true, because the asset has its own color. Only the fourth one shows why this arc " +
        "exists: the asset says nothing about color, so the weakest opinion - the one from the base - is " +
        "the only one, and it wins. **Specializes is a default value that never overrides " +
        "anything that someone has set.**",
    },
    {
      kind: "prose",
      md:
        "So the choice is simple: **inherits** when the base must *impose* (“repaint " +
        "all my chairs”); **specializes** when the base must only *fill the gaps* " +
        "(“give a default roughness, but do not touch what the asset set itself”).",
    },
    { kind: "heading", text: "Implied inherits: a class in the shot reaches inside a reference" },
    {
      kind: "prose",
      md: "The asset `chair.usda` itself inherits from its class `_Style` with brown. The shot that references it defines **its own** class at the same path - with red:",
    },
    {
      kind: "code",
      caption: "Two files",
      code: "# chair.usda\nclass \"_Style\"\n{\n    color3f[] primvars:displayColor = [(0.42, 0.24, 0.11)]   # brown\n}\n\ndef Xform \"Chair\" (\n    prepend inherits = </_Style>\n)\n{\n}\n\n# shot.usda\nclass \"_Style\"\n{\n    color3f[] primvars:displayColor = [(0.9, 0.1, 0.1)]      # red\n}\n\ndef Xform \"ChairA\" (\n    prepend references = @./chair.usda@\n)\n{\n}",
    },
    {
      kind: "callout",
      tone: "key",
      title: "The chair is red",
      md: "An inherits arc authored in the asset is **carried over** (implied) into the layer stack of the shot: USD looks for `/_Style` opinions also in `shot.usda`, and that one is stronger than the inside of the reference. `PrimCompositionQuery` shows this directly - the arc list of `ChairA` has `inherit /_Style` with `IsImplicit()` equal to `True`, next to the plain inherits from `chair.usda`.\nThanks to this, one class in the shot repaints all chairs from references without touching the asset. Specializes behaves the same way: `class \"_Base\"` in the shot fills the gaps in an asset that specializes `/_Base`.",
    },
    { kind: "heading", text: "LIVERPS - the strength order" },
    {
      kind: "callout",
      tone: "myth",
      title: "LIVERPS is 7 arcs, 'E' = rElocates",
      md:
        "Older materials say **LIVRPS** (6 arcs) and that the 'E' is only there to make it pronounceable - " +
        "that is **out of date**. OpenUSD added the **Relocates** arc, so today it is " +
        "**LIVERPS = 7 arcs**: **L**ocal > **I**nherits > **V**ariants > r**E**locates " +
        "> **R**eferences > **P**ayloads > **S**pecializes. Lower position = weaker.",
    },
    {
      kind: "prose",
      md:
        "Local is the **strongest**, Specializes the **weakest** (on purpose - it is the base). " +
        "Below is one prim with all the arcs at once. Switch opinions off and watch " +
        "the winner move down LIVERPS - and under the lanes, the file `shot.usda` that gives " +
        "exactly these opinions:",
    },
    {
      kind: "widget",
      widget: "liverps-tracer",
      caption:
        "A scan from Local downward: the first arc with an opinion wins.",
    },
    { kind: "heading", text: "Value resolution" },
    {
      kind: "prose",
      md:
        "What the tracer does has a name: **value resolution** - computing the final " +
        "value of a property. Collect all opinions, sort them by LIVERPS, and inside " +
        "one arc by the order in the list, then take the strongest one **that has an opinion**. When " +
        "nobody has an opinion, the default value from the schema remains. LIVERPS works " +
        "**recursively** - inside a reference, Local is again the strongest, and so on.",
    },
    {
      kind: "callout",
      tone: "myth",
      title: "Not everything is winner-take-all",
      md:
        "“Strongest opinion wins” applies to **attribute values**. But " +
        "**list-editable** fields - references, payloads, inherits, specializes, apiSchemas " +
        "and relationship targets - **compose** (prepend/append/delete/order) instead of " +
        "overriding. A common mistake: thinking that *all* of composition is one winning opinion.\n" +
        "Watch the syntax: `prepend references = @a.usd@` **adds** to the list, but a bare " +
        "`references = @a.usd@` is the *explicit* form, which **erases everything weaker** " +
        "and keeps only `@a.usd@`. In real files you will almost always see `prepend`.",
    },
    {
      kind: "widget",
      widget: "list-editing",
      caption: "A scalar attribute (winner-take-all) vs a list of references (list editing).",
    },
    {
      kind: "prose",
      md:
        "How much this hurts in practice shows in a render. Layout places a chair on " +
        "two prims. A stronger layer wants to **add** a lamp to both - the difference is " +
        "one word:",
    },
    {
      kind: "code",
      caption: "fix.usda - a stronger layer; layout below it already has the chair",
      code:
        '#usda 1.0\n\n' +
        'over "Set_Prepend" (\n' +
        '    prepend references = @./lamp.usda@   # add to the list\n' +
        ')\n{\n}\n\n' +
        'over "Set_Explicit" (\n' +
        '    references = @./lamp.usda@           # no prepend: REPLACE the list\n' +
        ')\n{\n}',
    },
    {
      kind: "image",
      src: "renders/list-editing-explicit.png",
      alt: "Two frames. With prepend references, the chair and a lamp next to it. With a bare references, only the lamp, no chair.",
      caption:
        "`prepend` - the chair from layout and the lamp from the fix. A bare `references =` - the chair **disappeared**, only the lamp is left.",
    },
    {
      kind: "callout",
      tone: "myth",
      title: "One word less and an asset quietly disappears",
      md:
        "Nobody deleted the chair. The stronger layer wrote the reference list in the " +
        "*explicit* form, and such a list **replaces everything that came from weaker " +
        "layers** - including the chair from layout. `Usd.PrimCompositionQuery` shows " +
        "this directly: after composition the right prim has one reference " +
        "(`lamp.usda`), the left one has two (`lamp.usda`, `chair.usda`).\n" +
        "The file opens, there is no warning, `usdchecker` does not complain. You notice " +
        "only when someone asks where the chair is. That is why layers that " +
        "**add** something to someone else's work always use `prepend`.",
    },
    { kind: "heading", text: "Default prim and encapsulation" },
    {
      kind: "prose",
      md:
        "The **default prim** is layer metadata: the prim that a reference targets when " +
        "you give only the file, with no path. So `prepend references = @chair.usd@` works " +
        "only because `chair.usd` has `defaultPrim = \"Chair\"` - without it " +
        "you would have to write `@chair.usd@</Chair>`.",
    },
    {
      kind: "code",
      caption: "`furniture.usda` - one file, two prims at the top level",
      code:
        '#usda 1.0\n' +
        '(\n' +
        '    defaultPrim = "Chair"   # the "front door" of this file\n' +
        ')\n\n' +
        'def Xform "Chair"\n{\n    double height = 88\n}\n\n' +
        'def Xform "Table"\n{\n    double height = 75\n}',
    },
    {
      kind: "image",
      src: "renders/defaultprim.png",
      alt:
        "Four frames. The file opened directly: a chair and a table. A reference with defaultPrim " +
        "Chair: only the chair. With defaultPrim Table: only the table. Without defaultPrim: an empty floor.",
      caption:
        "`furniture.usda` opened directly, and the same file brought into a shot by a reference " +
        "with no prim path - three times, with a different `defaultPrim`.",
    },
    {
      kind: "callout",
      tone: "key",
      title: "What defaultPrim changes, and what it does not",
      md:
        "**It does nothing to the file itself.** Open the file directly as a stage - with " +
        "`defaultPrim` and without it you see exactly the same prims, `Chair` and " +
        "`Table`. This line creates nothing, hides nothing and changes no value.\n" +
        "**It works only for someone who references the file with no prim path.** " +
        "`@file@` with `defaultPrim = \"Chair\"` brings the chair (`height` = 88). The " +
        "same file with `defaultPrim = \"Table\"` brings the table (75) - the content is the same, " +
        "only the front door changed.\n" +
        "**Without `defaultPrim`, the reference `@file@` brings nothing** - the prim " +
        "stays empty, and USD prints only a warning *Unresolved reference prim " +
        "path ... <defaultPrim>*. The scene opens and nothing throws an exception - it is easy to " +
        "miss. An explicit path `@file@</Chair>` still works, because it does not need " +
        "a door - it points to a room.\n" +
        "This is why `defaultPrim` is part of the **asset contract** (lesson L4): " +
        "change it in a published file, and every shot that references this file with no " +
        "path gets a different prim - or, if you remove it, an empty one.",
    },
    { kind: "heading", text: "Encapsulation - what you can really override" },
    {
      kind: "prose",
      md:
        "Encapsulation means this: **arcs authored inside an asset belong to the asset, " +
        "not to you**. Say `chair.usd` itself does " +
        "`prepend references = @legs.usd@` on `/Chair/Legs`, and you reference `chair.usd` " +
        "in your shot:",
    },
    {
      kind: "code",
      caption: "shot.usda - what is allowed and what is not",
      code:
        '#usda 1.0\n\n' +
        'def "Chair" (\n' +
        '    prepend references = @chair.usd@\n' +
        ')\n{\n' +
        '    over "Legs" (\n' +
        '        delete references = @legs.usd@   # does NOT work: this reference belongs\n' +
        '    )                                    # to the layer stack of chair.usd\n' +
        '    {\n' +
        '        double height = 2                # OK - you override a VALUE inside\n' +
        '    }\n' +
        '}',
    },
    {
      kind: "callout",
      tone: "key",
      title: "The practical conclusion",
      md:
        "Through a reference you **reach values** at any depth, but you **cannot " +
        "take apart someone else's composition** - you cannot remove or reorder arcs " +
        "that the asset authored for itself. Want a different structure? Change the asset or build " +
        "the scene differently. This is on purpose: it makes the asset predictable for everyone who " +
        "uses it.\n" +
        "One important distinction: you can change the **variant selection** from outside without " +
        "trouble (`variants = { string style = \"bar\" }` on your prim). The variant " +
        "set itself is an arc and belongs to the asset, but the **selection** is a plain opinion - " +
        "the one from the stronger layer wins. You do not rebuild the asset, you only choose " +
        "which of its branches applies.",
    },
    {
      kind: "callout",
      tone: "exam",
      title: "This is where the exam is won",
      md:
        "Composition is 23% directly, and it comes back in questions about debugging, " +
        "aggregation and pipelines. If you read LIVERPS confidently in any scenario, " +
        "you have the base for a large part of the exam.",
    },
  ],
  selfCheck: [
    {
      q: "The correct LIVERPS order, from the strongest?",
      options: [
        "Local > Inherits > Variants > rElocates > References > Payloads > Specializes",
        "Local > Variants > Inherits > rElocates > References > Specializes > Payloads",
        "Local > References > Inherits > Variants > rElocates > Payloads > Specializes",
      ],
      answer: 0,
      explanation:
        "L-I-V-E-R-P-S. Local is the strongest, Specializes the weakest. 'E' = rElocates.",
    },
    {
      q: "What does the 'E' in LIVERPS stand for?",
      options: [
        "Nothing - it only helps pronunciation",
        "rElocates - a real namespace arc",
        "Encapsulation",
      ],
      answer: 1,
      explanation:
        "Newer OpenUSD added the Relocates arc; 'E' is rElocates. The old LIVRPS (6 arcs) is out of date.",
    },
    {
      q: "Which arc is the WEAKEST?",
      options: ["Local", "Inherits (through a class)", "Specializes"],
      answer: 2,
      explanation:
        "Specializes is the weakest - on purpose, as a base or fallback that everything else can override.",
    },
    {
      q: "How does a payload differ from a reference?",
      options: [
        "A payload is stronger than a reference in LIVERPS",
        "A payload can be deferred (load/unload) and is weaker",
        "A payload works only for geometry",
      ],
      answer: 1,
      explanation:
        "Payload = a deferrable reference (performance). Mechanically similar, but weaker and loaded on demand.",
    },
    {
      q: "A stronger layer has no opinion about an attribute, a weaker one has. Which one wins?",
      options: [
        "The stronger one (it returns no value)",
        "The weaker one - because it has an opinion",
        "Neither - it is a composition error",
      ],
      answer: 1,
      explanation:
        "The scan goes down until it finds the first opinion. An empty layer is skipped.",
    },
  ],
};

/* ------------------------------------------------------------------ L2 --- */
const L2: Lesson = {
  id: "l2-schemas",
  layerIndex: 2,
  title: "Schemas - blueprints of the scene",
  blocks: [
    {
      kind: "prose",
      md:
        "A schema is a **blueprint** that defines the properties and the meaning of a prim and " +
        "generates an API. There are two kinds: **typed (IsA)** and **API**.",
    },
    {
      kind: "callout",
      tone: "key",
      title: "Typed (IsA) vs API",
      md:
        "**Typed** gives a prim its type (typeName, for example `Mesh`) - the prim *is* that type " +
        "and has **exactly one** type. **API** adds properties or behavior without " +
        "changing the type (for example `MaterialBindingAPI`) - you can apply **many** of them, and a " +
        "multi-apply schema (for example `CollectionAPI`) even several times.",
    },
    {
      kind: "prose",
      md:
        "**Scope** is the simplest grouping prim (no transform). **Xform** is " +
        "a transformable prim. **XformCommonAPI** is a convenient API for the usual " +
        "operations (translate/rotate/scale/pivot) on top of `xformOpOrder`.",
    },
    { kind: "heading", text: "xformOpOrder: the order changes the result" },
    {
      kind: "prose",
      md:
        "A prim's transform is a list of operations: `xformOp:translate`, `xformOp:rotateZ`, " +
        "`xformOp:scale`… The values alone are not everything - **the order decides**, " +
        "and it is written in `xformOpOrder`. Below are two boxes with identical values " +
        "that differ only in the order of this list:",
    },
    {
      kind: "code",
      caption: "The same three values, two different orders",
      code:
        'def Cube "Box"\n{\n' +
        '    double3 xformOp:translate = (2.5, 0, 0)\n' +
        '    float xformOp:rotateZ = 45\n' +
        '    double3 xformOp:scale = (2, 0.35, 0.35)\n\n' +
        '    # left:  translate before rotateZ in the list -> the box rotates in place\n' +
        '    uniform token[] xformOpOrder = ["xformOp:translate", "xformOp:rotateZ", "xformOp:scale"]\n\n' +
        '    # right: rotateZ before translate in the list -> the rotation swings the box along an arc\n' +
        '    # uniform token[] xformOpOrder = ["xformOp:rotateZ", "xformOp:translate", "xformOp:scale"]\n' +
        '}',
    },
    {
      kind: "image",
      src: "renders/xform-op-order.png",
      alt: "Two frames labeled with the xformOpOrder. With translate, rotateZ, scale the blue box is rotated in place above the gray one. With rotateZ, translate, scale the box flew up along an arc, the gray one stayed below.",
      caption:
        "Above each frame, the order from `xformOpOrder`. The white ball is the origin, the gray box is the position with no rotation. With `[translate, rotateZ, scale]` the box rotates **in place**, with `[rotateZ, translate, scale]` it rotates **around the origin** and lands somewhere else entirely.",
    },
    {
      kind: "callout",
      tone: "key",
      title: "How to read xformOpOrder",
      md:
        "The first operation in the list is the **outermost** one; on the geometry points " +
        "it acts last. The easiest way is to read the list **from the end**: the left box " +
        "is scaled, rotated around its own center, and only then moved. The right one " +
        "is first scaled, then moved by 2.5, and finally rotated - so " +
        "the rotation swings it along an arc around the origin. The center " +
        "of the left box is `(2.5, 0, 0)`, of the right one `(1.77, 1.77, 0)`.\n" +
        "A value that is not listed in `xformOpOrder` **does not work at all** - " +
        "an `xformOp:translate` attribute with no entry in the list moves nothing.",
    },
    { kind: "heading", text: "matrix4d and xformOp:transform" },
    {
      kind: "prose",
      md: "Exporters often do not split a transform into translate, rotate and scale; they write one 4x4 matrix. A matrix in USD is written row by row, and the translation sits in the **last row**.",
    },
    {
      kind: "code",
      caption: "One operation instead of three",
      code: "def Xform \"Box\"\n{\n    matrix4d xformOp:transform = ( (1, 0, 0, 0), (0, 1, 0, 0), (0, 0, 1, 0), (5, 2, 0, 1) )\n    uniform token[] xformOpOrder = [\"xformOp:transform\"]\n}",
    },
    {
      kind: "callout",
      tone: "key",
      title: "The translation is in the fourth row",
      md: "`ComputeLocalToWorldTransform` for this box gives the translation `(5, 2, 0)`. This operation must also be in `xformOpOrder` - the same rule as for translate. The upside: the whole transform in one attribute. The downside: an animator has no separate rotation channel that is easy to override.",
    },
    {
      kind: "widget",
      widget: "schema-inspector",
      caption: "Pick a typed schema, add API schemas and watch the set of properties grow.",
    },
    {
      kind: "callout",
      tone: "exam",
      title: "Domains: UsdGeom / UsdShade / UsdLux",
      md:
        "**UsdGeom** - geometry and transforms (Mesh, Xform, Camera, PointInstancer). " +
        "**UsdShade** - materials and shaders (Material, Shader, NodeGraph). **UsdLux** - " +
        "lights (SphereLight, DistantLight, DomeLight). This is 8% of the exam (Visualization).",
    },
    { kind: "heading", text: "Mesh: subdivisionScheme" },
    {
      kind: "prose",
      md: "A Mesh in USD has `subdivisionScheme = \"catmullClark\"` by default: a renderer can treat the mesh as the cage of a subdivision surface and smooth it. For organic models this is an advantage; for hard models from CAD or low-poly models it is a trap.",
    },
    {
      kind: "code",
      caption: "The same cube from 8 points - they differ in one line",
      code: "def Mesh \"Hard\"\n{\n    uniform token subdivisionScheme = \"none\"    # without this line: catmullClark\n    point3f[] points = [(-1, -1, -1), (1, -1, -1), (1, 1, -1), (-1, 1, -1),\n                        (-1, -1, 1), (1, -1, 1), (1, 1, 1), (-1, 1, 1)]\n    int[] faceVertexCounts = [4, 4, 4, 4, 4, 4]\n    int[] faceVertexIndices = [0, 3, 2, 1,  4, 5, 6, 7,  0, 1, 5, 4,\n                               1, 2, 6, 5,  2, 3, 7, 6,  3, 0, 4, 7]\n}",
    },
    {
      kind: "image",
      src: "renders/subdivision-scheme.png",
      alt: "Two frames: a cube without subdivisionScheme smoothed into a ball, and the same cube with subdivisionScheme none with sharp edges.",
      caption: "A render with `usdrecord --complexity high`. With the default `--complexity low` both cubes look like cubes - the smoothing appears only when the renderer raises the level of detail.",
    },
    {
      kind: "callout",
      tone: "myth",
      title: "A converter must write none",
      md: "The schemes are `catmullClark`, `loop`, `bilinear` and `none`. A file without the attribute is valid and nothing warns you - a CAD model turns into a shape with rounded corners only in the final render. That is why converters from formats without subdivision surfaces write `none` explicitly.",
    },
    { kind: "heading", text: "Primvars: what “interpolated over the geometry” means" },
    {
      kind: "prose",
      md:
        "A plain attribute, like `radius`, has **one value for the whole object**. A primvar - " +
        "an attribute with the `primvars:` prefix - is data spread **over the surface**. " +
        "You can give one value for the whole object, one for each face, one for " +
        "each point, or one for each face corner. The renderer must know how to " +
        "spread these values over the surface - and that is all “interpolated over the geometry” means. " +
        "You set the way with the `interpolation` metadata.",
    },
    {
      kind: "code",
      caption: "Two faces side by side: 6 points, 2 faces, 8 face corners. One color per point.",
      code:
        'def Mesh "Vertex"\n{\n' +
        '    point3f[] points = [(0,0,0), (1,0,0), (2,0,0), (0,1,0), (1,1,0), (2,1,0)]\n' +
        '    int[] faceVertexCounts = [4, 4]\n' +
        '    int[] faceVertexIndices = [0, 1, 4, 3,   1, 2, 5, 4]\n\n' +
        '    color3f[] primvars:displayColor = [\n' +
        '        (0.9, 0.1, 0.1), (0.1, 0.8, 0.1), (0.1, 0.2, 0.9),\n' +
        '        (0.95, 0.85, 0.1), (0.9, 0.1, 0.1), (0.1, 0.8, 0.1)\n' +
        '    ] (\n' +
        '        interpolation = "vertex"    # one value per point -> 6 colors\n' +
        '    )\n' +
        '}',
    },
    {
      kind: "image",
      src: "renders/primvar-interpolation.png",
      alt: "Four frames of the same two-face mesh: constant solid red, uniform two flat faces red and blue, vertex a smooth gradient with no seam, faceVarying a gradient with a seam in the middle.",
      caption:
        "The same mesh as in the code above, four `interpolation` modes (the label is above each frame). With `vertex` the colors are exactly the ones from the code.",
    },
    {
      kind: "callout",
      tone: "key",
      title: "The interpolation mode = how many values you give",
      md:
        "**`constant`** - 1 value for the whole object. Top left: solid red.\n" +
        "**`uniform`** - 1 value per face, here 2. Top right: each face is flat, " +
        "in its own color.\n" +
        "**`vertex`** - 1 value per point, here 6. Bottom left: the colors **blend " +
        "smoothly** over the surface, also across the shared edge. This is literally " +
        "“interpolated over the geometry”.\n" +
        "**`faceVarying`** - 1 value per face corner, here 8. Bottom right: neighboring " +
        "faces do not have to agree on the shared edge, hence the visible **seam** in the " +
        "middle. This is how, for example, UVs are written, because they must have seams.\n" +
        "The diagonal bands are not a bug: the renderer splits each face into two triangles and " +
        "interpolates in each one separately. There is one more mode, `varying` - like `vertex`, " +
        "and the difference only shows on subdivision surfaces.",
    },
    {
      kind: "callout",
      tone: "myth",
      title: "Two different “uniform”s",
      md:
        "`interpolation = \"uniform\"` (one value per face) and the word `uniform` at the " +
        "start of a line (a declaration that the value does not change over time - lesson L1) " +
        "are **two completely different things** with the same name. The first is about " +
        "space, the second about time.",
    },
    { kind: "heading", text: "The second half of the sentence: “inherited down”" },
    {
      kind: "prose",
      md:
        "A primvar written on a **parent** also applies to its children, until one of them " +
        "has its own. You set the color once on the group, not on each shape separately.",
    },
    {
      kind: "code",
      caption: "A color on the group, one child with its own",
      code:
        'def Xform "Chairs"\n{\n' +
        '    # the color is on the PARENT - the Xform itself is not a shape and renders nothing\n' +
        '    color3f[] primvars:displayColor = [(0.85, 0.45, 0.1)]\n\n' +
        '    def Cube "A"\n    {\n    }\n\n' +
        '    def Cube "B"\n    {\n' +
        '        color3f[] primvars:displayColor = [(0.15, 0.35, 0.9)]\n' +
        '    }\n\n' +
        '    def Cube "C"\n    {\n    }\n' +
        '}',
    },
    {
      kind: "image",
      src: "renders/primvar-inheritance.png",
      alt: "Three cubes: A orange, B blue, C orange.",
      caption:
        "`A` and `C` have no color of their own and take it from the parent. `B` has its own.",
    },
    {
      kind: "callout",
      tone: "key",
      title: "What is inherited, and what is not",
      md:
        "**Only `constant` primvars are inherited.** A primvar with " +
        "`interpolation = \"vertex\"` written on a parent does **not** reach the children, and " +
        "`FindInheritablePrimvars()` returns only `constant` primvars. The intuition: the parent has " +
        "no points or faces of its own, so “a value per point” would have nothing to " +
        "refer to.\n" +
        "**Your own always wins** - `B` has its own color, so the parent does not apply to it.\n" +
        "This is **not composition** from LIVERPS; it is a rule for reading primvars in " +
        "the prim hierarchy. And “down” means down the prim tree - it has nothing to do with " +
        "the property namespace from lesson L1, even though both things are called namespace.",
    },
    { kind: "heading", text: "UsdShade: the material network" },
    {
      kind: "prose",
      md:
        "A material is a **network**: a `Material` has outputs (`outputs:surface`, `displacement`, " +
        "`volume`), and `Shader`s have `inputs:`/`outputs:` and are **connected** (connections) - " +
        "a shader output plugs into an input of another one or into a material output. A `NodeGraph` groups " +
        "shaders into a reusable block.",
    },
    {
      kind: "prose",
      md:
        "You see this whole 'network' in one piece of syntax: `.connect`. This is **not** a value " +
        "assignment - it is a wire. Below is a minimal but truly complete network: a reader " +
        "reads the UVs from the geometry, a texture takes them and gives a color, the color plugs into " +
        "the shader, the shader into the material output, and the mesh points to the material.",
    },
    {
      kind: "code",
      caption:
        "`board.usda` - the full chain: UVs from the geometry → texture → shader → material → geometry",
      code:
        '#usda 1.0\n' +
        '\n' +
        'def Material "Checker"\n' +
        '{\n' +
        '    # 4. material output = a wire from the shader output\n' +
        '    token outputs:surface.connect = </Checker/PBR.outputs:surface>\n' +
        '\n' +
        '    def Shader "PBR"\n' +
        '    {\n' +
        '        uniform token info:id = "UsdPreviewSurface"\n' +
        '        # 3. shader color = a wire from the texture output\n' +
        '        color3f inputs:diffuseColor.connect = </Checker/Tex.outputs:rgb>\n' +
        '        float   inputs:roughness = 0.9      # a plain value, not a wire\n' +
        '        token   outputs:surface\n' +
        '    }\n' +
        '\n' +
        '    def Shader "Tex"\n' +
        '    {\n' +
        '        uniform token info:id = "UsdUVTexture"\n' +
        '        asset  inputs:file = @./textures/checker.png@\n' +
        '        # 2. WITHOUT this wire the texture does not know which pixel goes where\n' +
        '        float2 inputs:st.connect = </Checker/UV.outputs:result>\n' +
        '        float3 outputs:rgb\n' +
        '    }\n' +
        '\n' +
        '    def Shader "UV"\n' +
        '    {\n' +
        '        uniform token info:id = "UsdPrimvarReader_float2"\n' +
        '        # 1. reads the primvar "st" from the geometry - the chain starts here\n' +
        '        string inputs:varname = "st"\n' +
        '        float2 outputs:result\n' +
        '    }\n' +
        '}\n' +
        '\n' +
        'def Mesh "Board" (\n' +
        '    prepend apiSchemas = ["MaterialBindingAPI"]\n' +
        ')\n' +
        '{\n' +
        '    point3f[] points = [(-1, -1, 0), (1, -1, 0), (1, 1, 0), (-1, 1, 0)]\n' +
        '    int[] faceVertexCounts = [4]\n' +
        '    int[] faceVertexIndices = [0, 1, 2, 3]\n' +
        '    texCoord2f[] primvars:st = [(0, 0), (1, 0), (1, 1), (0, 1)] (\n' +
        '        interpolation = "faceVarying"      # the UVs: step 1 reads them from here\n' +
        '    )\n' +
        '    rel material:binding = </Checker>   # 5. the geometry points to the material\n' +
        '}',
    },
    {
      kind: "image",
      src: "renders/texture-st.png",
      alt:
        "Two squares. Left: a checkerboard with a red field in the bottom left corner. " +
        "Right: all in one dark red color.",
      caption:
        "Left: exactly `board.usda` from the code above - `Board` is this square, and " +
        "the checkerboard is `textures/checker.png` applied through the material `Checker`. Right: " +
        "the same file with only line 2 removed (`inputs:st.connect`).",
    },
    {
      kind: "callout",
      tone: "myth",
      title: "The missing link: how the texture knows which pixel goes where",
      md:
        "`inputs:file` alone is not enough. `UsdUVTexture` must get **UV coordinates** " +
        "through `inputs:st`, and these live on the geometry as the primvar `primvars:st`. " +
        "The bridge between them is the shader `UsdPrimvarReader_float2`, which reads the primvar " +
        "named in `inputs:varname`.\n" +
        "How to read the left square: the first point of the mesh, `(-1, -1, 0)`, is the bottom left " +
        "corner and gets the first UV, `(0, 0)`. The red field in the texture sits exactly at " +
        "`(0, 0)` - that is why it lands in the bottom left corner of the board.\n" +
        "The right square: without the wire, `inputs:st` has the default value `(0, 0)` for " +
        "**every** pixel. The whole surface asks the texture for the same point and gets " +
        "the color of the red corner. It is darker than the field itself, because `(0, 0)` is the edge " +
        "of the image, and with the default wrapping the sample mixes with the black outside it.\n" +
        "There is no warning and no error: the file is valid, the network composes, " +
        "`usdchecker` does not complain. This is exactly the kind of bug that you see " +
        "only in a render.\n" +
        "Note the shape of the whole: **the chain starts and ends on the " +
        "geometry**. The UVs leave the mesh through the reader, and the finished material comes back " +
        "to the mesh through `material:binding`. `primvars:st` has the interpolation " +
        "`faceVarying` - these are the UVs with seams from the section on primvars.",
    },
    {
      kind: "callout",
      tone: "key",
      title: "How to read `.connect` (the direction is the opposite of intuition)",
      md:
        "Read `inputs:diffuseColor.connect = </Checker/Tex.outputs:rgb>` as " +
        "*\"my input color **comes from** the rgb output of the texture\"*. It is written on " +
        "the **receiver's** side and points to the **source** - the data flows in the opposite " +
        "direction to the path.\n" +
        "Note the difference between two lines in the `PBR` shader: `inputs:roughness = 0.9` is " +
        "a fixed value, and `inputs:diffuseColor.connect = ...` is a wire. " +
        "The same `inputs:` prefix, a completely different mechanism.\n" +
        "And one more thing: `material:binding` is a **relationship** (`rel`), not an attribute - which is why " +
        "it has no `.connect` and no value type. Connections (`.connect`) link shaders, " +
        "relationships (`rel`) bind geometry to a material.",
    },
    {
      kind: "callout",
      tone: "tip",
      title: "Binding and render context",
      md:
        "Geometry points to a material with the `material:binding` relationship (through `MaterialBindingAPI`). " +
        "A Material can have separate outputs per **render context**, for example `outputs:mtlx:surface` " +
        "(MaterialX) or `outputs:surface` (universal) - the renderer takes the one that matches.",
    },
    { kind: "heading", text: "Material binding: strength and purpose" },
    {
      kind: "prose",
      md: "By default the binding **closest** to the geometry wins: the cube's own `material:binding` would beat the one from the group. Two things change this picture - the binding strength and its purpose:",
    },
    {
      kind: "code",
      caption: "`binding.usda`",
      code: "#usda 1.0\n\ndef Scope \"Looks\"\n{\n    def Material \"Red\"\n    {\n    }\n\n    def Material \"Blue\"\n    {\n    }\n\n    def Material \"Proxy\"\n    {\n    }\n}\n\ndef Xform \"Set\" (\n    prepend apiSchemas = [\"MaterialBindingAPI\"]\n)\n{\n    rel material:binding = </Looks/Red> (\n        bindMaterialAs = \"strongerThanDescendants\"\n    )\n\n    def Cube \"Box\" (\n        prepend apiSchemas = [\"MaterialBindingAPI\"]\n    )\n    {\n        rel material:binding = </Looks/Blue>\n        rel material:binding:preview = </Looks/Proxy>\n    }\n}",
    },
    {
      kind: "code",
      caption: "Which materials `/Set/Box` gets",
      code: "from pxr import Usd, UsdShade\n\nstage = Usd.Stage.Open(\"binding.usda\")\nbox = UsdShade.MaterialBindingAPI(stage.GetPrimAtPath(\"/Set/Box\"))\nfor purpose in [UsdShade.Tokens.allPurpose, UsdShade.Tokens.preview, UsdShade.Tokens.full]:\n    material, _ = box.ComputeBoundMaterial(purpose)\n    print(f\"{purpose or 'allPurpose':10} -> {material.GetPath()}\")",
    },
    {
      kind: "code",
      caption: "What it prints",
      code: "allPurpose -> /Looks/Red\npreview    -> /Looks/Proxy\nfull       -> /Looks/Red",
    },
    {
      kind: "callout",
      tone: "key",
      title: "A parent can beat a child",
      md: "`bindMaterialAs = \"strongerThanDescendants\"` on `Set` reverses the default rule - `Box` gets `Red`, although it points to `Blue` itself. With `weakerThanDescendants` (the default value) it is `Blue` again.\n**Material purpose**: `material:binding:preview` and `material:binding:full` are separate bindings for preview and for the final render. The renderer asks for its purpose, and when it does not find one, it takes the plain `material:binding` - that is why `full` gives `Red`.",
    },
    { kind: "heading", text: "UsdLux: light types" },
    {
      kind: "prose",
      md:
        "Types: **SphereLight** (point or area), **DistantLight** (the sun, directional), " +
        "**DomeLight** (environment/HDRI), **RectLight**, **DiskLight**, **CylinderLight**. " +
        "Each light is a prim with a transform, and its parameters sit in `inputs:`:",
    },
    {
      kind: "code",
      caption: "A light with exposure, color temperature and an exclusion",
      code: "#usda 1.0\n\ndef Xform \"World\"\n{\n    def SphereLight \"Key\"\n    {\n        float inputs:intensity = 500\n        float inputs:exposure = 2             # brightness x 2^2 = x4\n        bool inputs:enableColorTemperature = true\n        float inputs:colorTemperature = 3200  # warm light of a light bulb\n        rel collection:lightLink:excludes = </World/ChairB>\n    }\n\n    def Xform \"ChairA\"\n    {\n    }\n\n    def Xform \"ChairB\"\n    {\n    }\n}",
    },
    {
      kind: "code",
      caption: "Who `Key` lights",
      code: "from pxr import Usd, UsdLux\n\nstage = Usd.Stage.Open(\"lux.usda\")\nkey = UsdLux.LightAPI(stage.GetPrimAtPath(\"/World/Key\"))\nquery = key.GetLightLinkCollectionAPI().ComputeMembershipQuery()\nfor chair in [\"/World/ChairA\", \"/World/ChairB\"]:\n    print(chair, \"lit by Key:\", query.IsPathIncluded(chair))",
    },
    {
      kind: "code",
      caption: "What it prints",
      code: "/World/ChairA lit by Key: True\n/World/ChairB lit by Key: False",
    },
    {
      kind: "callout",
      tone: "key",
      title: "What is worth knowing about lights",
      md: "**Brightness** is `inputs:intensity` x 2^`inputs:exposure`: intensity 2000 with exposure 0, 1000 with exposure 1 and 500 with exposure 2 give an identical pixel in Storm. By default `intensity = 1`, `exposure = 0`.\n**Color temperature** works only with `enableColorTemperature = true` (default `false`, 6500 K).\n**Direction**: a `DistantLight` shines along -Z of its transform - you set the direction with a rotation.\n**Light linking**: each light has the collections `lightLink` and `shadowLink` with `includeRoot = true`, so by default it lights everything. `collection:lightLink:excludes` switches off the listed prims - above, `ChairB`.\n**Spotlight**: `ShapingAPI` gives the cone (`inputs:shaping:cone:angle`), `ShadowAPI` gives the shadows.",
    },
    { kind: "heading", text: "UsdGeomCamera: what really sets the frame" },
    {
      kind: "prose",
      md: "A camera is a plain prim with a transform; with no rotation it looks along -Z. The frame is set by the focal length, the sensor size, the clipping range and the projection:",
    },
    {
      kind: "code",
      caption: "A camera with the full set of frame attributes - `usdrecord --camera` uses them",
      code: "def Camera \"Cam\"\n{\n    float focalLength = 35               # focal length\n    float horizontalAperture = 20.955    # sensor width\n    float verticalAperture = 15.2908     # sensor height\n    float2 clippingRange = (1, 10000)    # near and far\n    token projection = \"perspective\"     # or \"orthographic\"\n    double3 xformOp:translate = (0, 150, 600)\n    uniform token[] xformOpOrder = [\"xformOp:translate\"]\n}",
    },
    {
      kind: "callout",
      tone: "key",
      title: "Field of view and units",
      md: "The field of view comes from the focal length and the sensor: with 35 and 20.955 the horizontal FOV is 33.33°. The schema documentation gives the focal length and the sensor in **tenths of a scene unit** - in a scene in centimeters that is millimeters, as in a real camera.\nDefault values when you write nothing: `focalLength` 50, sensor 20.955 x 15.2908, `clippingRange` (1, 1000000), `projection` `\"perspective\"`.",
    },
  ],
  selfCheck: [
    {
      q: "A box has `translate = (2.5, 0, 0)` and `rotateZ = 45`, and `xformOpOrder = [\"xformOp:rotateZ\", \"xformOp:translate\", \"xformOp:scale\"]`. Where does its center land?",
      options: [
        "(2.5, 0, 0) - it rotates in place",
        "(1.77, 1.77, 0) - the rotation swings it along an arc",
        "(0, 2.5, 0) - a 90° rotation around the origin",
      ],
      answer: 1,
      explanation:
        "Read the list from the end: first the scale, then the move by 2.5, and finally the 45° rotation around the origin, which swings the box along an arc. For a rotation in place (center at (2.5, 0, 0)), translate would have to come first.",
    },
    {
      q: "A prim has `xformOp:translate = (0, 100, 0)`, but `xformOpOrder = [\"xformOp:rotateY\"]`. Where is it?",
      options: [
        "At (0, 100, 0) - the translate attribute always works",
        "At the origin - translate is ignored",
        "USD rejects the file as invalid",
      ],
      answer: 1,
      explanation:
        "An operation that is not in `xformOpOrder` does not work at all. The attribute exists and you can read it, but the transform does not use it - the file is valid and nothing warns you.",
    },
    {
      q: "A mesh has 6 points, 2 faces and 8 face corners. How many `primvars:displayColor` values do you need with `interpolation = \"uniform\"`?",
      options: [
        "2 - one per face",
        "6 - one per point",
        "8 - one per face corner",
      ],
      answer: 0,
      explanation:
        "The interpolation mode says how many values you give: `constant` 1, `uniform` one per face, `vertex` one per point, `faceVarying` one per face corner.",
    },
    {
      q: "A shader has `inputs:diffuseColor.connect = </Mat/Tex.outputs:rgb>`. Which way does the data flow?",
      options: [
        "From inputs:diffuseColor to Tex - the line points to the target",
        "From Tex.outputs:rgb to inputs:diffuseColor",
        "Nowhere - it is a default color written as a path",
      ],
      answer: 1,
      explanation:
        "A connection is written on the receiver's side and points to the source - the data flows opposite to the path. `.connect` is a wire, not a value.",
    },
  ],
};

/* ------------------------------------------------------------------ L4 --- */
const L4: Lesson = {
  id: "l4-asset-structure",
  layerIndex: 4,
  title: "Asset Structure & Aggregation",
  blocks: [
    {
      kind: "prose",
      md:
        "How to build assets that combine well in a pipeline. The **asset interface** " +
        "is the public contract of an asset: a stable **default prim**, parameterization " +
        "(variant sets, attributes) and the layer structure that everything else relies on.",
    },
    {
      kind: "prose",
      md:
        "'Contract' sounds abstract, so look at it literally. Below is the file " +
        "`chair.usd` - this is the whole interface that a shot sees from outside:",
    },
    {
      kind: "code",
      caption: "`chair.usd` - the interface layer (thin, no geometry)",
      code:
        '#usda 1.0\n' +
        '(\n' +
        '    defaultPrim = "Chair"     # CONTRACT 1: @chair.usd@ with no path lands here\n' +
        ')\n\n' +
        'def Xform "Chair" (\n' +
        '    kind = "component"                    # CONTRACT 2: this is a leaf model\n' +
        '    prepend payload = @./chair_geo.usd@   # heavy content - can be unloaded\n' +
        '    variantSets = "color"                 # CONTRACT 3: a public parameter\n' +
        ')\n{\n' +
        '    variantSet "color" = {\n' +
        '        "red" {\n' +
        '            over "Mat"\n' +
        '            {\n' +
        '                color3f inputs:diffuseColor = (1, 0, 0)\n' +
        '            }\n' +
        '        }\n' +
        '        "blue" {\n' +
        '            over "Mat"\n' +
        '            {\n' +
        '                color3f inputs:diffuseColor = (0, 0, 1)\n' +
        '            }\n' +
        '        }\n' +
        '    }\n}',
    },
    {
      kind: "code",
      caption: "`shot.usda` - the whole shot uses only these three things",
      code:
        'def "ChairA" (\n' +
        '    prepend references = @chair.usd@   # no /Chair - works thanks to defaultPrim\n' +
        '    variants = { string color = "red" }\n' +
        ')\n{\n}',
    },
    {
      kind: "callout",
      tone: "key",
      title: "What it means that this is a contract",
      md:
        "The shot wrote three things: **the file name**, **the variant set name** (`color`) and " +
        "**the variant name** (`red`). Nothing more. As long as these three names do not change, " +
        "the modeler can rebuild `chair_geo.usd` from scratch - add prims, change the " +
        "topology, move `/Chair/Seat` somewhere else - and **this shot does not " +
        "break**.\n" +
        "The catch: this works because the shot does not reach inside. If it had an `over \"Seat\"` with " +
        "its own color, the path `/Chair/Seat` would also become part of the contract - after " +
        "the seat moved, the override would hit nothing, with no error. The less " +
        "shots override inside an asset, the more freely you can rebuild it.\n" +
        "What breaks the contract: changing `defaultPrim` (references with no path land on a different " +
        "prim or on nothing), renaming the variant set from `color` to `colour`, removing " +
        "the variant `red`, changing `kind` from `component` to `assembly`.\n" +
        "*That is why* the interface lives in a separate, thin layer: so that you can " +
        "replace the content without touching the contract.",
    },
    {
      kind: "callout",
      tone: "tip",
      title: "The reference/payload pattern and workstreams",
      md:
        "A production idiom: the asset references its heavy content through a **payload**, so that " +
        "it can be loaded and unloaded. **Workstreams** are layers per department (modeling, look, " +
        "anim…) sublayered together - each department works non-destructively.",
    },
    {
      kind: "prose",
      md:
        "The **model hierarchy** organizes the 'models' in a scene by **kind**: " +
        "`component` (a leaf), `assembly`/`group` (aggregates), `subcomponent` (a part of a " +
        "component). The **contiguity** rule: models must form an unbroken branch from the root.",
    },
    {
      kind: "widget",
      widget: "model-hierarchy",
      caption: "Set the kinds and watch the model hierarchy rules being checked.",
    },
    {
      kind: "callout",
      tone: "myth",
      title: "A component is a LEAF",
      md:
        "A `component` cannot contain another model - only a `subcomponent`. When " +
        "a component brings in another published model by a reference, you must **override** " +
        "its kind to `subcomponent` - it does not change by itself. A common trap: a `component` under " +
        "a `component` gives no error; it just quietly stops being a model " +
        "(`IsModel()` = False). You can see the same mechanism in the render below.",
    },
    { kind: "heading", text: "Kind is not a label - tools read it" },
    {
      kind: "prose",
      md:
        "It is easy to treat `kind` as a description for people. But tools ask about " +
        "models through `IsModel()`, and the answer depends on **the whole branch**, not on " +
        "one prim. The easiest way to see this is `model:drawMode = \"bounds\"`: " +
        "the viewport draws the model as a box instead of the full geometry. Three " +
        "chairs, all with the same line:",
    },
    {
      kind: "code",
      caption: "Three chairs with `drawMode = \"bounds\"` - the geometry is skipped",
      code:
        '#usda 1.0\n\n' +
        'def Xform "Set" (\n' +
        '    kind = "assembly"\n' +
        ')\n{\n' +
        '    def Xform "A_Component" (\n' +
        '        kind = "component"\n' +
        '        prepend apiSchemas = ["GeomModelAPI"]\n' +
        '    )\n    {\n' +
        '        uniform token model:drawMode = "bounds"\n' +
        '    }\n\n' +
        '    def Xform "B_NoKind" (                   # no kind\n' +
        '        prepend apiSchemas = ["GeomModelAPI"]\n' +
        '    )\n    {\n' +
        '        uniform token model:drawMode = "bounds"\n' +
        '    }\n\n' +
        '    def Xform "Group"                        # a plain Xform, also no kind\n' +
        '    {\n' +
        '        def Xform "C_Component" (\n' +
        '            kind = "component"\n' +
        '            prepend apiSchemas = ["GeomModelAPI"]\n' +
        '        )\n        {\n' +
        '            uniform token model:drawMode = "bounds"\n' +
        '        }\n' +
        '    }\n' +
        '}',
    },
    {
      kind: "image",
      src: "renders/kind-drawmode.png",
      alt: "Three frames: A_Component as an orange wireframe box, B_NoKind and Group/C_Component as full chairs.",
      caption:
        "`A_Component` is drawn as a box, `B_NoKind` and `Group/C_Component` with full geometry. A `usdrecord` render, which - like the usdview viewport - respects `drawMode` by default.",
    },
    {
      kind: "callout",
      tone: "key",
      title: "The third chair has kind = component, and it is not a model",
      md:
        "`B_NoKind` is obvious: with no `kind` there is no model, so `drawMode` is " +
        "ignored.\n" +
        "`C_Component` has exactly the same as `A`, and still `IsModel()` returns " +
        "**False**. The reason sits one level up: `Group` has no `kind`, so the chain " +
        "of models from the root is broken (contiguity from the widget above). Everything " +
        "under such a gap stops being a model, and the stage opens with no warning.\n" +
        "The fix is one line: `kind = \"group\"` on `Group`. Then `C` becomes " +
        "a model and is drawn like `A`. Traversals over models and publish validators ask " +
        "the same `IsModel()` question - that is why `kind` is part of " +
        "the asset contract, not a description.",
    },
  ],
  selfCheck: [
    {
      q: "What can a prim with kind = component contain?",
      options: ["Other components as parts", "Only subcomponents", "An assembly with smaller models"],
      answer: 1,
      explanation: "A component is a leaf of the model hierarchy - below it, only subcomponents.",
    },
    {
      q: "Why a payload in the reference/payload pattern?",
      options: [
        "So that the content always loads, also in shots",
        "So that heavy content can be deferred (load/unload)",
        "So that the prim type can change at load time",
      ],
      answer: 1,
      explanation: "A payload allows load/unload - this is how huge scenes scale.",
    },
    {
      q: "What is 'contiguity' in the model hierarchy?",
      options: [
        "A model can only sit under a group or assembly",
        "Every prim in the scene must have a kind set",
        "Every asset must fit in a single file",
      ],
      answer: 0,
      explanation:
        "A prim is a model only when all its ancestors are group models (group/assembly). A component or a prim with no kind breaks the chain.",
    },
  ],
};

/* ------------------------------------------------------------------ L5 --- */
const L5: Lesson = {
  id: "l5-instancing",
  layerIndex: 5,
  title: "Modularity & Instancing",
  blocks: [
    {
      kind: "prose",
      md:
        "This lesson has two halves. **Modularity**: one asset, many versions - " +
        "variants instead of copies of files. **Instancing**: many copies of the same thing for " +
        "the memory cost of one. The order is not random - in the second half " +
        "variants come back as a way to build a forest where not every tree is the same.",
    },
    {
      kind: "widget",
      widget: "variant-switcher",
      caption: "A variant set as a way to vary an asset without duplicating files.",
    },
    { kind: "heading", text: "Variants in a render - and the trap that breaks them" },
    {
      kind: "prose",
      md:
        "A variant does not have to change only a color. It can **add whole prims** or " +
        "change dimensions. One asset `chair.usd` with the variant set `style`, three " +
        "chairs in the shot, three different selections:",
    },
    {
      kind: "image",
      src: "renders/variants.png",
      alt: "Three frames: style classic, a chair with a back; stool, a low stool; bar, a tall bar stool.",
      caption:
        "`\"classic\"` has the prim `Back`, `\"stool\"` does not, `\"bar\"` makes the legs longer and raises the seat to 90 cm. One asset file, three selections.",
    },
    {
      kind: "code",
      caption: "Wrong: geometry written directly on the prim, the variant tries to override it",
      code:
        'def Xform "Chair" (\n' +
        '    variantSets = "style"\n' +
        ')\n{\n' +
        '    variantSet "style" = {\n' +
        '        "bar" {\n' +
        '            over "Seat"\n' +
        '            {\n' +
        '                double3 xformOp:translate = (0, 90, 0)   # an attempt to raise it\n' +
        '            }\n' +
        '        }\n' +
        '    }\n\n' +
        '    def Cube "Seat"\n' +
        '    {\n' +
        '        double3 xformOp:translate = (0, 45, 0)           # this one wins\n' +
        '        uniform token[] xformOpOrder = ["xformOp:translate"]\n' +
        '    }\n' +
        '}',
    },
    {
      kind: "image",
      src: "renders/variant-trap.png",
      alt: "Two frames with style bar selected: from chair_bad.usda a low stool, from chair.usda a tall bar stool.",
      caption:
        "Both have `style = \"bar\"` selected. `chair_bad.usda` is the “wrong” version above - instead of a bar stool you get a low stool. `chair.usda` has all its geometry moved into the variants.",
    },
    {
      kind: "callout",
      tone: "myth",
      title: "An opinion written directly on a prim beats its own variant",
      md:
        "This is not a bug, it is LIVERPS: opinions written directly on a prim are " +
        "**Local**, opinions from a variant are **Variants** - weaker. `GetPropertyStack` " +
        "on the seat of the left chair shows this directly:\n" +
        "`/Chair/Seat.xformOp:translate` → **(0, 45, 0)** - first, it wins\n" +
        "`/Chair{style=bar}Seat.xformOp:translate` → **(0, 90, 0)** - it loses\n" +
        "The `{style=bar}` in the path is the mark of an opinion from a variant - " +
        "you also see it in usdview.\n" +
        "**The rule:** if a variant is meant to change something, that value **must not** be " +
        "written directly on the prim. Keep it only inside the variants - each " +
        "variant defines its own version.",
    },
    { kind: "heading", text: "Instancing: native and point" },
    {
      kind: "prose",
      md:
        "**Native**: prims with `instanceable = true` (with a reference or payload arc) share " +
        "a **prototype** - one for each different combination of arcs and variant selections, which you will count on " +
        "the forest below. **Point**: one `PointInstancer` with the arrays " +
        "`positions`, `protoIndices`, `orientations`, `scales` maps points to prototypes.",
    },
    {
      kind: "widget",
      widget: "instancing",
      caption: "Change N and the mode - see the memory intuition and how the mechanisms differ.",
    },
    {
      kind: "callout",
      tone: "myth",
      title: "The inside of an instance is read-only",
      md:
        "In native instancing you do not edit prims inside the prototype per instance. " +
        "You override on the **instance root** (outside the prototype) or you " +
        "**de-instance** (instanceable = false → the instance becomes editable).",
    },
    {
      kind: "code",
      caption:
        "Four instances of the same chair, three different attempts at a change in a stronger layer",
      code:
        '#usda 1.0\n\n' +
        'over "B_OverInside"            # attempt 1: repaint the seat inside the instance\n' +
        '{\n' +
        '    over "Seat"\n    {\n' +
        '        color3f[] primvars:displayColor = [(0.85, 0.12, 0.1)]\n' +
        '    }\n' +
        '}\n\n' +
        'over "C_OverRoot"              # attempt 2: a color on the instance root\n' +
        '{\n' +
        '    color3f[] primvars:displayColor = [(0.2, 0.45, 0.9)]\n' +
        '}\n\n' +
        'over "D_Deinstancing" (        # attempt 3: first detach it from the prototype\n' +
        '    instanceable = false\n' +
        ')\n{\n' +
        '    over "Seat"\n    {\n' +
        '        color3f[] primvars:displayColor = [(0.85, 0.12, 0.1)]\n' +
        '    }\n' +
        '}',
    },
    {
      kind: "image",
      src: "renders/instance-readonly.png",
      alt: "Four frames with a chair: unchanged brown, attempt 1 brown, attempt 2 all blue, attempt 3 brown with a red seat.",
      caption:
        "Above each frame, the attempt number from the code above. Attempt 1 changes nothing, attempt 2 colors the whole chair blue, attempt 3 gives a red seat.",
    },
    {
      kind: "callout",
      tone: "key",
      title: "The second chair is the whole lesson",
      md:
        "Attempt 1 is a valid file that **does nothing**. The seat in an instance " +
        "is only an *instance proxy* - a view of the shared prototype - and opinions " +
        "written under the instance root are ignored. In the API, " +
        "`IsInstanceProxy()` gives it away: it returns `True` for this seat.\n" +
        "Attempt 2 works, because the instance root **does not belong to the prototype** - it " +
        "decides where and how the prototype stands. `primvars:displayColor` from the root " +
        "is inherited down to the whole chair (lesson L2), and the first three chairs " +
        "**still share one prototype**.\n" +
        "Attempt 3 works, but it has a cost: `instanceable = false` unpacks this chair " +
        "into a full copy of its own. With one chair it does not matter; with a thousand, " +
        "the whole benefit of instancing is lost.",
    },
    {
      kind: "prose",
      md:
        "If you cannot touch the inside, how do you make a forest where not all trees are " +
        "identical - without losing instancing? This is what **refinement** is about.",
    },
    { kind: "heading", text: "Native refinement: the number of prototypes counts" },
    {
      kind: "prose",
      md:
        "The stage groups instanceable prims by a **key** (what exactly makes them up: " +
        "arcs, variant selections). One key = one prototype. Adding an arc or " +
        "a different variant selection **changes the key**, so a *new* prototype appears - but " +
        "all instances with the same key share it.",
    },
    {
      kind: "code",
      caption: "100 trees, 2 variant selections - count the prototypes",
      code:
        'def "Tree_001" (\n' +
        '    instanceable = true\n' +
        '    prepend references = @tree.usd@\n' +
        '    variants = { string season = "summer" }\n' +
        ')\n{\n}\n\n' +
        'def "Tree_002" (\n' +
        '    instanceable = true\n' +
        '    prepend references = @tree.usd@\n' +
        '    variants = { string season = "autumn" }   # a different selection = a different key\n' +
        ')\n{\n}\n\n' +
        '# ...Tree_003 .. Tree_100, each summer or autumn',
    },
    {
      kind: "callout",
      tone: "key",
      title: "The result: 100 instances, but only 2 prototypes",
      md:
        "Not 100 copies of the tree in memory and not 1 - exactly **2**, because there are two " +
        "different keys (`summer`, `autumn`). Add a third variant `winter`, select it " +
        "on even one tree, and you have 3 prototypes - a variant that nobody " +
        "selected costs nothing. This is the whole mechanism of 'ad-hoc arcs': *you add an arc or " +
        "a selection on the instance root, and you pay with one new prototype, not with a hundred " +
        "unpacked trees*.\n" +
        "Compare this with de-instancing: `instanceable = false` on these 100 trees gives " +
        "100 full, editable subtrees in memory. Refinement is a compromise " +
        "between one prototype and giving up instancing completely.",
    },
    {
      kind: "image",
      src: "renders/instancing-prototypes.png",
      alt: "A forest of a hundred cone-shaped trees, green, with an orange grove in the middle.",
      caption:
        "100 instances of `tree.usd`: 79 with `season = \"summer\"`, 21 with " +
        "`\"autumn\"`. `stage.GetPrototypes()` returns **2** prototypes, one " +
        "for each color you see.",
    },
    {
      kind: "callout",
      tone: "tip",
      title: "Count the colors and you count the prototypes",
      md:
        "This image is the simplest way to remember the rule: **each distinct " +
        "combination of arcs and variant selections is one prototype** - no matter " +
        "how many instances share it. Two seasons in the image, two prototypes in memory. " +
        "**Where** a tree stands does not matter, because the transform lives on the instance " +
        "root, outside the key.\n" +
        "One practical note: the color here is set inside the variant on " +
        "`Crown`, not written directly on the prim. Otherwise the variant would lose to " +
        "the local opinion - the same trap as with the variants at the start of the lesson.",
    },
    { kind: "heading", text: "Point instancer refinement: three other levers" },
    {
      kind: "prose",
      md:
        "A PointInstancer has no 'instance roots' that you could override - it has " +
        "**arrays**. That is why you make variation on the arrays:",
    },
    {
      kind: "code",
      caption: "Prune (`invisibleIds`) + shading variety (a primvar)",
      code:
        'def PointInstancer "Forest"\n{\n' +
        '    rel        prototypes  = [ </Forest/Proto/TreeA>, </Forest/Proto/TreeB> ]\n' +
        '    int[]      protoIndices = [0, 1, 0, 0, 1]      # which prototype per point\n' +
        '    point3f[]  positions    = [(0,0,0), (5,0,0), (10,0,0), (0,0,5), (5,0,5)]\n\n' +
        '    # PRUNE: you cut out instances 1 and 3 - without touching positions\n' +
        '    int64[]    invisibleIds = [1, 3]\n\n' +
        '    # SHADING: each instance gets its own color, there are still 2 prototypes\n' +
        '    color3f[]  primvars:displayColor = [\n' +
        '        (0.2,0.6,0.1), (0.3,0.5,0.1), (0.1,0.7,0.2), (0.2,0.4,0.1), (0.3,0.6,0.2)\n' +
        '    ] (interpolation = "varying")\n}',
    },
    {
      kind: "callout",
      tone: "exam",
      title: "Three levers of a point instancer - and how they differ",
      md:
        "**Prune** (`invisibleIds`) - a list of indices to hide. The instance is still in " +
        "the arrays; it just does not render. Cheap and reversible.\n" +
        "**Promotion** - one tree must be different (broken, with a nest). You take it out of " +
        "the instancer: you hide it with `invisibleIds` and place a plain, editable " +
        "prim next to it. You pay the full memory cost, but only for this one tree.\n" +
        "**Primvars** - `primvars:` with `varying` interpolation give a value per instance. " +
        "The key point: primvars **do not change the key** and **do not create new prototypes** - " +
        "that is why 1000 trees in 1000 shades of green cost as much as one prototype. " +
        "This is exactly the opposite of a variant selection in native instancing.",
    },
    {
      kind: "image",
      src: "renders/pointinstancer-prune.png",
      alt: "Two top views of a forest: the full forest of 96 trees, and the same forest cut by a winding path with no trees.",
      caption:
        "The same `PointInstancer`: 96 instances, **two** prototypes (a cone and a sphere). 16 indices in `invisibleIds` cut out a winding path, and the `positions` array does not change. Each instance has its own shade from `primvars:displayColor` in `varying` mode.",
    },
    {
      kind: "callout",
      tone: "key",
      title: "Two levers in one image",
      md:
        "**The path** is pruning: the `positions` array still has 96 points, " +
        "`ComputeMaskAtTime` returns 80 visible ones. Nothing was deleted - " +
        "clear `invisibleIds` and the forest closes again.\n" +
        "**The shades** are a primvar per instance, and there are still only two prototypes. The trunks " +
        "stayed brown, because they have their own `displayColor`, and your own value wins over what " +
        "comes from the instancer.\n" +
        "Careful not to mix this up with L2: there, only `constant` primvars are inherited. " +
        "Here the color is `varying`, and it still reaches the prototypes - because this is **a different " +
        "mechanism**. The instancer itself hands out its primvars to the instances, one value per " +
        "point. The only shared rule is that the prototype's own primvar takes priority.",
    },
    {
      kind: "image",
      src: "renders/pointinstancer-uniform.png",
      alt: "Three small forests from above: uniform with 96 values gray, uniform with one value gray, constant with one value purple.",
      caption:
        "The same instancer with a different interpolation of `primvars:displayColor` (the label is above each frame). Both `uniform` versions leave the trees gray; `constant` with one value colors the whole forest.",
    },
    {
      kind: "callout",
      tone: "myth",
      title: "uniform on an instancer does nothing - silently",
      md:
        "After the section on primvars it is easy to think: `uniform` is “one value per " +
        "face”, so on an instancer it is probably “one per instance”. But with " +
        "`uniform` the color **does not appear at all** - neither with 96 values nor with " +
        "one. The trees stay gray, with no warning.\n" +
        "Two modes work on an instancer: **`varying`** (or `vertex`) gives a value " +
        "per instance, **`constant`** gives one value for all instances - " +
        "the purple forest on the right. This is how Hydra Storm behaves - the same engine " +
        "that draws the viewport in usdview.",
    },
  ],
  selfCheck: [
    {
      q: "100 instanceable trees reference the same asset: 79 have `season = \"summer\"`, 21 have `\"autumn\"`. How many prototypes does the stage create?",
      options: [
        "1 - they all point to the same file",
        "2 - one per variant selection",
        "100 - each one stands in a different place",
      ],
      answer: 1,
      explanation:
        "A prototype comes from a key: the arcs and the variant selections. Two selections are two keys. The position sits on the instance root, outside the key, so it does not count.",
    },
    {
      q: "You add a variant `winter` to this asset, but no tree selects it. How many prototypes now?",
      options: [
        "Still 2 - a variant with no selection creates no key",
        "3 - one for each variant in the set",
        "101 - every new variant breaks instancing",
      ],
      answer: 0,
      explanation:
        "What counts are the selections that are really set on the instances. A variant that nobody selected creates no key - it costs something only when at least one tree selects it.",
    },
    {
      q: "The variant `bar` moves `Seat` to a height of 90, but the prim itself has 45 written directly. `bar` is selected. At what height is the seat?",
      options: [
        "90 - the selected variant",
        "45 - the value written directly on the prim",
        "67.5 - the average of the two opinions",
      ],
      answer: 1,
      explanation:
        "An opinion written directly on the prim is Local, an opinion from a variant is Variants - weaker. `GetPropertyStack` shows both, with `/Chair/Seat` in first place. Keep the values that a variant must change only inside the variants.",
    },
    {
      q: "Under an instance root you write `over \"Seat\"` with a red color. What will you see?",
      options: [
        "Nothing changes - Seat is an instance proxy",
        "A red seat only in this instance",
        "Red seats in all instances",
      ],
      answer: 0,
      explanation:
        "The inside of an instance is a view of the shared prototype, and opinions written under the instance root are ignored. A color on the root itself works (it is inherited down), or `instanceable = false` on this one instance.",
    },
  ],
};

/* ------------------------------------------------------------------ L6 --- */
const L6: Lesson = {
  id: "l6-data-exchange",
  layerIndex: 6,
  title: "Data Exchange Pipelines",
  blocks: [
    {
      kind: "prose",
      md:
        "Data exchange is **15% + 14%** of the exam (Data Exchange + Pipeline). Its heart " +
        "is the **converter**: it reads the source data and maps it to USD prims and attributes.",
    },
    {
      kind: "callout",
      tone: "key",
      title: "Anatomy of a converter",
      md:
        "**Data extraction** - getting the geometry and materials out of the source. " +
        "**Data transformation** - mapping them to USD schemas (UsdGeom/UsdShade). " +
        "**Export hooks** - extension points in the export. **Validation** - checking " +
        "the asset (for example with usdchecker) before publishing.",
    },
    { kind: "heading", text: "Mapping source -> USD" },
    {
      kind: "prose",
      md: "A converter is largely a table: what in the source matches what in USD.",
    },
    {
      kind: "code",
      caption: "A typical mapping from exchange formats (OBJ, FBX, glTF)",
      code: "source                     USD\n-------------------------  ----------------------------------------------------\nvertices                   Mesh.points                      point3f[]\nfaces                      faceVertexCounts + faceVertexIndices\nnormals                    Mesh.normals                     normal3f[]\nUV                         primvars:st (faceVarying)        texCoord2f[]\nvertex colors              primvars:displayColor            color3f[]\nobject hierarchy           Xform / Scope\nobject transform           xformOp:* + xformOpOrder\nmaterial                   Material + Shader (UsdPreviewSurface)\nmaterial assignment        material:binding (GeomSubset for some faces)\nunits and up axis          metersPerUnit, upAxis (layer metadata)\nmain object of the file    defaultPrim\nbounding box               extent",
    },
    { kind: "heading", text: "Export hooks by example" },
    {
      kind: "prose",
      md: "A converter does only what follows from the source. Everything the studio requires - units, axis, `defaultPrim`, `extent` - is added by **hooks**: functions called after the export. A new rule is a new function in the list, without touching the converter:",
    },
    {
      kind: "code",
      caption: "`export.py` - a converter with a list of hooks",
      code: "from pxr import Usd, UsdGeom\n\n# Source: a made-up format - points and faces, in meters, Z axis up.\nSOURCE = {\n    \"name\": \"Table\",\n    \"meters_per_unit\": 1.0,\n    \"up_axis\": \"Z\",\n    \"points\": [(0, 0, 0), (1, 0, 0), (1, 1, 0), (0, 1, 0)],\n    \"faces\": [[0, 1, 2, 3]],\n}\n\n\ndef export(src, path):\n    stage = Usd.Stage.CreateNew(path)\n    mesh = UsdGeom.Mesh.Define(stage, \"/\" + src[\"name\"])\n    mesh.CreatePointsAttr(src[\"points\"])\n    mesh.CreateFaceVertexCountsAttr([len(f) for f in src[\"faces\"]])\n    mesh.CreateFaceVertexIndicesAttr([i for f in src[\"faces\"] for i in f])\n    for hook in POST_EXPORT:  # extension points: the studio adds its own rules here\n        hook(stage, src)\n    stage.Save()\n    return stage\n\n\ndef units_hook(stage, src):\n    UsdGeom.SetStageMetersPerUnit(stage, src[\"meters_per_unit\"])\n    UsdGeom.SetStageUpAxis(stage, src[\"up_axis\"])\n\n\ndef default_prim_hook(stage, src):\n    stage.SetDefaultPrim(stage.GetPrimAtPath(\"/\" + src[\"name\"]))\n\n\ndef extent_hook(stage, src):\n    for prim in stage.Traverse():\n        if prim.IsA(UsdGeom.Mesh):\n            mesh = UsdGeom.Mesh(prim)\n            mesh.CreateExtentAttr(UsdGeom.Mesh.ComputeExtent(mesh.GetPointsAttr().Get()))\n\n\nPOST_EXPORT = [units_hook, default_prim_hook, extent_hook]\nstage = export(SOURCE, \"table.usda\")\nprint(stage.GetRootLayer().ExportToString())",
    },
    {
      kind: "code",
      caption: "What it prints",
      code: "#usda 1.0\n(\n    defaultPrim = \"Table\"\n    metersPerUnit = 1\n    upAxis = \"Z\"\n)\n\ndef Mesh \"Table\"\n{\n    float3[] extent = [(0, 0, 0), (1, 1, 0)]\n    int[] faceVertexCounts = [4]\n    int[] faceVertexIndices = [0, 1, 2, 3]\n    point3f[] points = [(0, 0, 0), (1, 0, 0), (1, 1, 0), (0, 1, 0)]\n}",
    },
    {
      kind: "callout",
      tone: "tip",
      title: "The hook writes metadata, it does not rotate geometry",
      md: "`units_hook` writes `metersPerUnit = 1` and `upAxis = \"Z\"`, because that is what the source says. This is half the work from the trap *Loss 1* described below: the metadata is there, but if the studio works in Y-up, you also need a hook that recomputes the points. Exporter extensions in DCCs rest on the same idea, for example *export chasers* in mayaUSD.",
    },
    { kind: "heading", text: "extent: a box stored next to the geometry" },
    {
      kind: "prose",
      md: "`extent` is two points: the smallest and the largest corner of the box that surrounds the geometry. Renderers and tools use it for culling and framing without reading all the points. `UsdGeom.Mesh.ComputeExtent(points)` computes it - for the points `(0, 0, 0)`, `(2, 0, 0)`, `(2, 1, 0)`, `(0, 1, 3)` the result is `[(0, 0, 0), (2, 1, 3)]`.",
    },
    {
      kind: "callout",
      tone: "myth",
      title: "usdchecker does not remind you about extent",
      md: "A Mesh with no `extent` passes `usdchecker` with `Success!`. The file works, but every tool then has to compute the box itself, and an extent that is out of date after you edit the points gives a wrong frame. That is why the converter computes it itself - like `extent_hook` above.",
    },
    { kind: "heading", text: "Asset Resolver" },
    {
      kind: "prose",
      md:
        "In USD you write paths as **asset paths** in `@...@` (for example `@chair.usd@`). The " +
        "**ArResolver** turns them into real locations when the scene opens. Because of " +
        "this you can **version** and **swap** assets without touching the scenes that " +
        "use them - a studio plugs in its own resolver (for example the scheme `asset://chair?v=3`).",
    },
    {
      kind: "callout",
      tone: "tip",
      title: "The toolchain (CLI) you must know",
      md:
        "`usdcat` - print or convert a layer (for example crate → ascii). `usdchecker` - validate " +
        "an asset before publishing. `usdedit` - quick editing in a text editor. `usdzip` - packing " +
        "into `.usdz`. `usdview` - introspection and preview. These are real tools from the exam.",
    },
    { kind: "heading", text: "Round-trips and data fidelity" },
    {
      kind: "prose",
      md:
        "A conversion can be **lossy** - not every feature of the source has a match in USD, and " +
        "the other way around. But 'lossy' is not enough: it is worth knowing *what exactly* is lost, because " +
        "it is usually not the geometry. Three classic cases:",
    },
    { kind: "heading", text: "Loss 1: units and the up axis (the most common)" },
    {
      kind: "prose",
      md:
        "The numbers in the geometry do not say whether `100` is centimeters or meters, or which axis " +
        "is up. The **layer metadata** says this - but it only *says* it: nothing " +
        "converts it automatically. So the converter must do two things: write " +
        "the metadata and convert the geometry to the standard of the scene the asset will go into. Without " +
        "the metadata, tools misread the numbers; without the conversion, the asset enters " +
        "the scene at the wrong size or lying on its side.",
    },
    {
      kind: "code",
      caption: "Two lines of metadata that decide everything",
      code:
        '#usda 1.0\n' +
        '(\n' +
        '    metersPerUnit = 0.01      # 1 unit = 1 cm  (this is the USD DEFAULT)\n' +
        '    upAxis = "Y"              # the up axis      (this is the USD DEFAULT)\n' +
        ')\n\n' +
        'def Sphere "Ball"\n{\n' +
        '    double radius = 100       # 100 units = 1 meter\n' +
        '}',
    },
    {
      kind: "callout",
      tone: "myth",
      title: "USD will NOT rescale this for you",
      md:
        "You export from an app where 1 unit = 1 meter, but the converter does not write " +
        "`metersPerUnit = 1`. The file gets the default **0.01**, so a ball with `radius = 100` " +
        "is now **1 meter** instead of 100 meters - a hundred times too small, although not one " +
        "number in the geometry changed.\n" +
        "Most important: when it combines layers with different `metersPerUnit`, USD **does not " +
        "auto-scale** anything. An asset in centimeters placed in a scene in meters " +
        "is simply 100x too big. This is the job of the converter and validation, not of the engine.",
    },
    {
      kind: "image",
      src: "renders/units-scale.png",
      alt: "A tiny brown chair next to a huge blue chair.",
      caption:
        "A shot in centimeters. The brown chair: an asset in cm. The blue one: the same " +
        "shape written in **millimeters** - and with a **correctly written** " +
        "`metersPerUnit = 0.001`. Still it is 10x bigger: 885 cm tall. " +
        "One floor tile is 50 cm.",
    },
    {
      kind: "callout",
      tone: "key",
      title: "Correct metadata is not enough",
      md:
        "This is the image worth remembering. The blue asset **does not lie** about " +
        "its units - `metersPerUnit = 0.001` is in the file. But a reference does not " +
        "read this metadata and converts nothing: it carries the raw numbers `460`, " +
        "`885`, and the shot interprets them its own way, in centimeters.\n" +
        "So the metadata only says **how to understand** the numbers in a given file. For the asset " +
        "to fit the scene, someone must **actually rescale** it - the converter at " +
        "export, or a transform where it is used.",
    },
    {
      kind: "image",
      src: "renders/units-upaxis.png",
      alt: "Three frames: a Y-up asset stands, an asset with upAxis Z lies tipped over, half in the floor, the same asset with rotateX -90 stands.",
      caption:
        "The shot is Y-up. The Y-up asset stands. The asset modeled Z-up, with a **correctly written** `upAxis = \"Z\"`, is still tipped over: its “up” points toward the camera, and its front went under the floor. The same asset with a rotation `xformOp:rotateX = -90` in the shot stands like the first one.",
    },
    {
      kind: "callout",
      tone: "myth",
      title: "upAxis works the same way as metersPerUnit",
      md:
        "It is easy to think that writing `upAxis = \"Z\"` is enough and USD will stand the model up. " +
        "It will not - when layers are combined nothing is rotated, just as nothing " +
        "is scaled. A model built along the Z axis (CAD, Blender) lands in a " +
        "Y-up scene on its side **no matter what its metadata says**.\n" +
        "The fix is always on the pipeline side: the converter rotates the geometry at " +
        "export, or the shot adds a -90° rotation around X (the right chair). After " +
        "the rotation, the dimensions and the position of the backrest match the Y-up chair to " +
        "the centimeter. And a publish validator should reject an asset whose `upAxis` " +
        "does not match the studio standard.",
    },
    { kind: "heading", text: "Loss 2: shaders with no match in USD" },
    {
      kind: "prose",
      md:
        "A procedural material from a specific renderer (for example a 'noise' node with shading " +
        "specific to that engine) has no universal match. The converter has two " +
        "ways out: **bake** it into a texture and plug it into `UsdPreviewSurface` (you lose " +
        "the procedural nature, you gain portability), or write it under **its own render " +
        "context** (`outputs:renderer:surface`) - then it survives a round-trip to the " +
        "same engine, but every other renderer ignores it and uses a fallback.",
    },
    { kind: "heading", text: "Loss 3: a round-trip loses the composition, not the data" },
    {
      kind: "prose",
      md:
        "Export a scene to a DCC and back to USD, and you get one flat " +
        "layer: the geometry is the same, but the references, payloads, variant sets and " +
        "sublayers are gone - because the DCC imported **the result of composition**, not its " +
        "structure. This is the same loss as with `flatten`. That is why pipelines avoid " +
        "a round-trip through a DCC as a way to edit an asset; you edit an override layer " +
        "instead of exporting the whole thing again.",
    },
    {
      kind: "callout",
      tone: "tip",
      title: "That is why usdchecker sits in the pipeline",
      md:
        "All three losses are **silent** - the file opens, the geometry is there, nobody " +
        "gets an error. `usdchecker` catches some of them (missing metadata, " +
        "broken asset paths, schema mismatches) **before publishing**, that is, " +
        "before the asset goes into a hundred shots. This is the whole point of the *validation* step in " +
        "the anatomy of a converter above.",
    },
    {
      kind: "prose",
      md:
        "So a good converter maps to the **right schemas** (UsdGeom/UsdShade), " +
        "keeps the names and the hierarchy structure, writes the layer metadata and is " +
        "**validated**. Below, see a round-trip between Sdf and the tree, live:",
    },
    {
      kind: "widget",
      widget: "editable-usda",
      caption: "Authoring: edit the model; the .usda and the tree are derived side by side.",
    },
    {
      kind: "prose",
      md:
        "Pipeline operations: **flatten** (collapsing the composition into one layer - it removes " +
        "the arcs and dependencies), dependency management and versioning through the resolver.",
    },
    {
      kind: "callout",
      tone: "exam",
      title: "Flatten writes what you see - and nothing more",
      md:
        "Flatten collapses the **result** of composition into one layer. All " +
        "values that you see on the stage at this moment stay. Everything the stage " +
        "does not show at this moment is lost: the arc structure, **unselected variants** (only the selected " +
        "branch stays, the variant set goes) and the content of **unloaded payloads**.\n" +
        "That is why flatten is good for debugging, export and cutting dependencies, but " +
        "not as an “asset backup”. This is the same loss as with a round-trip " +
        "through a DCC.",
    },
    { kind: "heading", text: "Dependencies: not only flatten" },
    {
      kind: "prose",
      md: "Flatten cuts dependencies, but it also flattens the whole structure. `UsdUtils` has more precise tools:",
    },
    {
      kind: "code",
      caption: "An asset with a sublayer, a reference and a texture",
      code: "import os\n\nfrom pxr import Sdf, Usd, UsdUtils\n\n\ndef write(name, text):\n    layer = Sdf.Layer.CreateNew(name)\n    layer.ImportFromString(text)\n    layer.Save()\n\n\nos.makedirs(\"textures\", exist_ok=True)\nopen(\"textures/wood.png\", \"wb\").write(b\"\\x89PNG\\r\\n\\x1a\\n\")  # a fake texture\nwrite(\"chair_geo.usda\", '#usda 1.0\\ndef Xform \"Geo\"\\n{\\n    double height = 88\\n}\\n')\nwrite(\"chair_look.usda\", '#usda 1.0\\nover \"Chair\"\\n{\\n    asset studio:tex = @./textures/wood.png@\\n}\\n')\nwrite(\"asset.usda\", \"\"\"#usda 1.0\n(\n    defaultPrim = \"Chair\"\n    subLayers = [@./chair_look.usda@]\n)\n\ndef Xform \"Chair\" (\n    prepend references = @./chair_geo.usda@</Geo>\n)\n{\n}\n\"\"\")\n\nlayers, assets, missing = UsdUtils.ComputeAllDependencies(Sdf.AssetPath(\"asset.usda\"))\nprint(\"layers :\", sorted(os.path.basename(layer.realPath) for layer in layers))\nprint(\"files  :\", [os.path.relpath(a).replace(os.sep, \"/\") for a in assets])\nprint(\"missing:\", missing)\n\nmerged = UsdUtils.FlattenLayerStack(Usd.Stage.Open(\"asset.usda\")).ExportToString()\nprint(\"FlattenLayerStack: subLayers?\", \"subLayers\" in merged, \"| references?\", \"references\" in merged)\n\nUsdUtils.CreateNewUsdzPackage(Sdf.AssetPath(\"asset.usda\"), \"asset.usdz\")\npackage = Sdf.ZipFile.Open(\"asset.usdz\")\nfor name in package.GetFileNames():\n    info = package.GetFileInfo(name)\n    print(f\"usdz: {name:18} offset {info.dataOffset:4}  compression {info.compressionMethod}\")",
    },
    {
      kind: "code",
      caption: "What it prints",
      code: "layers : ['asset.usda', 'chair_geo.usda', 'chair_look.usda']\nfiles  : ['textures/wood.png']\nmissing: []\nFlattenLayerStack: subLayers? False | references? True\nusdz: asset.usda         offset   64  compression 0\nusdz: chair_geo.usda     offset  320  compression 0\nusdz: chair_look.usda    offset  448  compression 0\nusdz: textures/wood.png  offset  576  compression 0",
    },
    {
      kind: "callout",
      tone: "key",
      title: "Four tools, four jobs",
      md: "`ComputeAllDependencies` lists everything the asset needs: the layers from `subLayers` and references, and the files from attributes of type `asset`.\n`FlattenLayerStack` merges only the layer stack - the sublayers disappear, and the references **stay**.\n`ModifyAssetPaths` rewrites the paths in a layer (for example when you move textures). It changes the layer in memory, so saving is a separate `Save()`. `LocalizeAsset` copies the asset together with its dependencies into a new folder.\n`CreateNewUsdzPackage` (or the CLI `usdzip`) packs everything into one file.",
    },
    {
      kind: "callout",
      tone: "tip",
      title: "Why you do not have to unpack a .usdz",
      md: "A `.usdz` is a zip archive **with no compression** (`compression 0`), and the data of each file starts at an offset divisible by 64 (64, 320, 448, 576). USD reads them directly from the archive: `Usd.Stage.Open(\"asset.usdz\")` works right away, and `@./textures/wood.png@` resolves to `asset.usdz[textures/wood.png]` - inside the package.",
    },
  ],
  selfCheck: [
    {
      q: "An asset written in millimeters, with a correct `metersPerUnit = 0.001`, has a chair 885 tall. You place it by a reference into a shot in centimeters. What height do you get on the stage?",
      options: [
        "88.5 cm - USD converts the units",
        "885 cm - a chair ten times too big",
        "0.885 m - as the converter wrote it",
      ],
      answer: 1,
      explanation:
        "A reference does not read metersPerUnit and converts nothing: it carries the raw numbers, and the shot interprets them its own way. The metadata only says how to understand the numbers in a given file.",
    },
    {
      q: "An asset modeled Z-up, with a correctly written `upAxis = \"Z\"`, goes into a Y-up shot. What does USD do?",
      options: [
        "It rotates it -90° around X when composing",
        "Nothing - the asset lies on its side",
        "It rejects the reference as incompatible",
      ],
      answer: 1,
      explanation:
        "upAxis works like metersPerUnit: nothing is rotated when layers are combined. The fix is on the pipeline side - the converter rotates the geometry, or the shot adds `xformOp:rotateX = -90`.",
    },
    {
      q: "A scene has a variant set `color` with `red` selected and a second variant `blue`. What is left after `stage.Flatten()`?",
      options: [
        "The whole variant set with both variants",
        "Only the values from the red variant, with no variant set",
        "Nothing from the variants - flatten skips them",
      ],
      answer: 1,
      explanation:
        "Flatten writes what you see on the stage at this moment. The selected branch stays as plain opinions, and the variant set and the unselected variants are lost - it is not an asset backup.",
    },
    {
      q: "A file has neither `metersPerUnit` nor `upAxis` in its metadata. What does `usdchecker` say?",
      options: [
        "Success - both values have the defaults 0.01 and Y",
        "Failed - the stage metadata is missing",
        "A warning, but the file passes validation",
      ],
      answer: 1,
      explanation:
        "The stage reads the defaults 0.01 and Y, but `usdchecker` requires the asset to declare them: the `StageMetadataChecker` rule reports both as missing and ends with `Failed!`.",
    },
  ],
};

/* ------------------------------------------------------------------ L7 --- */
const L7: Lesson = {
  id: "l7-customizing-debugging",
  layerIndex: 7,
  title: "Customizing & Debugging",
  blocks: [
    {
      kind: "prose",
      md:
        "A cross-cutting layer: how to extend USD and how to debug composition. " +
        "**Customizing** (6%) + **Debugging** (11%).",
    },
    {
      kind: "callout",
      tone: "key",
      title: "Extension points",
      md:
        "**Custom schemas** (your own typed or API schemas), **file format plugins** (reading " +
        "your own formats as USD layers), **custom kinds** (registered in the " +
        "kindRegistry), **variant fallbacks** (the default variant choice when no " +
        "selection was authored). Everything goes through the plugin system (plugInfo).",
    },
    { kind: "heading", text: "plugInfo.json - one file under everything" },
    {
      kind: "prose",
      md:
        "These four extension points sound like four different technologies, but " +
        "they all enter USD through the same door: a folder with a " +
        "`plugInfo.json` file, which you register with `Plug.Registry().RegisterPlugins()`. " +
        "Below is a minimal plugin that adds two custom kinds:",
    },
    {
      kind: "code",
      caption: "`studioKinds/plugInfo.json` - custom kinds, zero code",
      code:
        '{\n' +
        '    "Plugins": [{\n' +
        '        "Name": "studioKinds",\n' +
        '        "Type": "resource",\n' +
        '        "Info": {\n' +
        '            "Kinds": {\n' +
        '                "prop":     { "baseKind": "component" },\n' +
        '                "setpiece": { "baseKind": "assembly"  }\n' +
        '            }\n' +
        '        }\n' +
        '    }]\n' +
        '}',
    },
    {
      kind: "callout",
      tone: "myth",
      title: "Register the plugin BEFORE anything queries the registry",
      md:
        "USD registries (of kinds, of schemas) initialize **lazily, but only " +
        "once**. If you first call `Kind.Registry.GetAllKinds()` and only " +
        "then register the plugin, your kinds are **silently " +
        "ignored**. The registration itself passes with no warning - the error shows " +
        "only later, for example `Kind.Registry.GetBaseKind(\"prop\")` throws *Unknown kind*. " +
        "Plugin registration goes at the very top of the script.",
    },
    {
      kind: "prose",
      md: "In a studio nobody calls `RegisterPlugins` in every script. The plugin folders are given once, in the environment variable **`PXR_PLUGINPATH_NAME`** - USD searches them at startup:",
    },
    {
      kind: "code",
      caption: "Windows console - without a single line of code",
      code: "set PXR_PLUGINPATH_NAME=D:\\studio\\usd_plugins\\studioKinds\npython -c \"from pxr import Kind; print('prop known:', Kind.Registry.HasKind('prop'))\"",
    },
    {
      kind: "callout",
      tone: "tip",
      title: "Environment configuration is part of the pipeline",
      md: "Without the variable, the same line prints `prop known: False`; with it, `prop known: True`. You separate several folders with a semicolon (Windows) or a colon (Linux, macOS). This is how the studio's applications and tools get the same kinds and schemas with no code changes.",
    },
    { kind: "heading", text: "Schemas: where default values really come from" },
    {
      kind: "prose",
      md:
        "You define your own schema in a `schema.usda` file, and the tool " +
        "**`usdGenSchema`** generates `generatedSchema.usda` from it, plus entries in " +
        "`plugInfo.json`. When you set `skipCodeGeneration`, you get " +
        "a **codeless schema** - it works without compiling anything, because it is " +
        "only two text files.",
    },
    {
      kind: "code",
      caption: "`generatedSchema.usda` - definitions with default values (an exercise in the Run steps)",
      code:
        '#usda 1.0\n\n' +
        'class Turntable "Turntable"\n{\n' +
        '    double studio:diameter = 30\n}\n\n' +
        'class "SpinnableAPI"\n{\n' +
        '    double studio:spin:rpm = 33.3\n' +
        '    token studio:spin:axis = "Y" (\n' +
        '        allowedTokens = ["X", "Y", "Z"]\n' +
        '    )\n}',
    },
    {
      kind: "code",
      caption: "A prim with a custom type and a custom API - this is what the SAVED file looks like",
      code:
        '#usda 1.0\n\n' +
        'def Turntable "Table" (\n' +
        '    prepend apiSchemas = ["SpinnableAPI"]\n' +
        ')\n{\n}',
    },
    {
      kind: "callout",
      tone: "key",
      title: "Default values live in the schema, not in the scene",
      md:
        "The prim above answers `studio:diameter` → **30.0**, " +
        "`studio:spin:rpm` → **33.3**, `studio:spin:axis` → **Y** - although " +
        "**the file has none of these attributes**. A scene stores " +
        "only what differs from the schema's default values.\n" +
        "This has two consequences the exam likes to ask about: a file with a thousand " +
        "prims can be tiny, and adding an attribute to a schema **works " +
        "immediately for all existing scenes**, with no data migration.\n" +
        "You also see the split from L2 from the definition side: `concreteTyped` gives " +
        "a prim its **type** (one), and `singleApplyAPI` only **adds** properties " +
        "and lands in the list-editable `apiSchemas` list.",
    },
    {
      kind: "callout",
      tone: "tip",
      title: "A variant fallback works outside the scene",
      md:
        "A variant set with no authored selection **contributes nothing** - there is no " +
        "such thing as “the first variant by default”. You set a fallback in the environment " +
        "configuration, not in the scene file: with the `UsdVariantFallbacks` key in " +
        "`plugInfo.json`, or in code with `Usd.Stage.SetGlobalVariantFallbacks` " +
        "(before the stage opens). The studio says once *\"when nobody has chosen, take " +
        "proxy\"*, and it applies in all scenes. An explicit selection always " +
        "beats the fallback.",
    },
    {
      kind: "prose",
      md:
        "Debugging: **usdview** and stage introspection (hierarchy, properties, " +
        "composition), **load and render optimization** (payloads, instancing, " +
        "activation), and **fixing composition** - that is, reading which opinion wins " +
        "and why. This is exactly LIVERPS in practice:",
    },
    {
      kind: "widget",
      widget: "value-resolution",
      caption: "Debugging composition = tracing value resolution. Switch opinions off and find the source of the value.",
    },
    { kind: "heading", text: "usdview - what is where" },
    {
      kind: "prose",
      md:
        "usdview is the main introspection tool. It is worth recognizing its panels - " +
        "especially **Composition / Layer Stack**, which shows where a value " +
        "came from (the same as the LIVERPS tracer, but on a real scene):",
    },
    {
      kind: "widget",
      widget: "usdview-tour",
      caption: "A map of the usdview panels + a workflow for debugging composition.",
    },
    { kind: "heading", text: "From the model to real USD (pxr)" },
    {
      kind: "prose",
      md:
        "The exam and real work need the real API. Here the ideas from this app are translated into " +
        "**pxr** (USD Python) - including `GetPropertyStack`, our tracer in real life:",
    },
    {
      kind: "widget",
      widget: "pxr-bridge",
      caption: "Mapping: an idea from the app → a real pxr call.",
    },
    {
      kind: "callout",
      tone: "tip",
      title: "Typical fixes",
      md:
        "An attribute has the 'wrong' value → find the strongest opinion (LIVERPS). A prim " +
        "'disappears' → see the section below: first, is it in `Traverse`, then `visibility`, " +
        "and finally `purpose`. Slow loading → payloads + instancing.",
    },
    { kind: "heading", text: "A toolbox for debugging composition" },
    {
      kind: "prose",
      md: "Four tools you reach for when a value or a prim is not what it should be. The first three in one script:",
    },
    {
      kind: "code",
      caption: "A shot with two department layers and a typo in a reference",
      code: "from pxr import Sdf, Usd\n\n\ndef write(name, text):\n    layer = Sdf.Layer.CreateNew(name)\n    layer.ImportFromString(text)\n    layer.Save()\n\n\nwrite(\"chair.usda\", '#usda 1.0\\n(\\n    defaultPrim = \"Chair\"\\n)\\ndef Xform \"Chair\"\\n{\\n    double height = 88\\n}\\n')\nwrite(\"layout.usda\", '#usda 1.0\\ndef SphereLight \"Key\"\\n{\\n    float inputs:intensity = 9000\\n}\\n')\nwrite(\"light.usda\", '#usda 1.0\\nover \"Key\"\\n{\\n    float inputs:intensity = 2500\\n}\\n')\nwrite(\"shot.usda\", \"\"\"#usda 1.0\n(\n    subLayers = [@./light.usda@, @./layout.usda@]\n)\n\ndef Xform \"ChairA\" (\n    prepend references = @./chair.usda@\n)\n{\n    double height = 90\n}\n\ndef Xform \"ChairB\" (\n    prepend references = @./chiar.usda@\n)\n{\n}\n\"\"\")\n\nstage = Usd.Stage.Open(\"shot.usda\")\n\nprint(\"1. MuteLayer - switch a layer off without touching files\")\nkey = stage.GetPrimAtPath(\"/Key\").GetAttribute(\"inputs:intensity\")\nlight = Sdf.Layer.Find(\"light.usda\").identifier\nprint(\"   with light.usda   :\", key.Get())\nstage.MuteLayer(light)\nprint(\"   without light.usda:\", key.Get())\nstage.UnmuteLayer(light)\n\nprint(\"2. GetCompositionErrors - silent composition errors\")\nfor error in stage.GetCompositionErrors():\n    print(\"  \", type(error).__name__)\n\nprint(\"3. PrimCompositionQuery - what a prim is made of\")\nfor arc in Usd.PrimCompositionQuery(stage.GetPrimAtPath(\"/ChairA\")).GetCompositionArcs():\n    print(\"  \", arc.GetArcType(), \"->\", arc.GetTargetNode().path)",
    },
    {
      kind: "code",
      caption: "What it prints",
      code: "1. MuteLayer - switch a layer off without touching files\n   with light.usda   : 2500.0\n   without light.usda: 9000.0\n2. GetCompositionErrors - silent composition errors\n   ErrorInvalidAssetPath\n3. PrimCompositionQuery - what a prim is made of\n   Pcp.ArcTypeRoot -> /ChairA\n   Pcp.ArcTypeReference -> /Chair",
    },
    {
      kind: "callout",
      tone: "key",
      title: "What each of them tells you",
      md: "**MuteLayer** switches a layer off for the session - the value drops from 2500 to 9000, and the file `light.usda` stays untouched. The fastest test of 'is it this layer that breaks things'.\n**GetCompositionErrors** collects the errors that at open time appear only as a warning in the console: the typo `chiar.usda` gives `ErrorInvalidAssetPath`, and `/ChairB` stays empty.\n**PrimCompositionQuery** lists the arcs a prim is made of: here the root and the reference to `/Chair`.",
    },
    {
      kind: "code",
      caption: "The fourth: TF_DEBUG - diagnostics with no code change",
      code: "set TF_DEBUG=USD_STAGE_OPEN\npython -c \"from pxr import Usd; Usd.Stage.Open('chair.usda')\"",
    },
    {
      kind: "code",
      caption: "What it prints",
      code: "UsdStage::Open(rootLayer=@chair.usda@, load=LoadAll)\nUsdStage::_InstantiateStage: Creating new UsdStage",
    },
    {
      kind: "callout",
      tone: "tip",
      title: "TF_DEBUG symbols",
      md: "`Tf.Debug.GetDebugSymbolNames()` gives the full list - in USD 25.08 there are 57 symbols. For composition, `PCP_PRIM_INDEX` is useful, for the resolver `AR_RESOLVER_INIT`, for tracking edits `USD_CHANGES`.",
    },
    {
      kind: "code",
      caption: "usdchecker with a real error - the asset points to a texture that does not exist",
      code: "usdchecker prop.usda",
    },
    {
      kind: "code",
      caption: "What it prints (path shortened)",
      code: "Found unresolvable external dependency '.../textures/missing.png'. (fails 'MissingReferenceChecker')\nFailed!",
    },
    { kind: "heading", text: "“I cannot see the prim” - four balls, three different reasons" },
    {
      kind: "prose",
      md:
        "Four identical balls on stands. Each one except the first has one changed " +
        "line: `visibility = \"invisible\"`, `purpose = \"guide\"` or `active = false`. " +
        "The same file rendered twice - normally and with the `guide` purpose included:",
    },
    {
      kind: "image",
      src: "renders/purpose-visibility.png",
      alt: "A 2 by 4 grid of frames with a ball on a stand. Top row, the default render: a ball only with the plain one. Bottom row, with the guide purpose: balls with the plain one and with purpose guide.",
      caption:
        "Four identical balls, each with one changed line (the label is above each frame). The top row is the default render, the bottom row `usdrecord --purposes guide`.",
    },
    {
      kind: "callout",
      tone: "key",
      title: "Three mechanisms, three different behaviors",
      md:
        "**`visibility = \"invisible\"`** (the second) - you do not see it in any render, but " +
        "the prim **exists**: it is in `Traverse`, it has properties, you can query it.\n" +
        "**`purpose = \"guide\"`** (the third) - it disappears in a normal render, but **comes back** " +
        "when the renderer includes the `guide` purpose. This is not hiding, it is a category: " +
        "helper geometry that a tool shows on request. In usdview " +
        "you switch it in the menu Display › Display Purposes › Guide.\n" +
        "**`active = false`** (the fourth) - it does not come back in any render. The prim itself " +
        "stays on the stage as an empty shell (`GetPrimAtPath` returns it, " +
        "`IsActive()` = False), but **its children are not composed**, and `Traverse` " +
        "skips it. Set `active = true` and it comes back with its whole subtree.\n" +
        "Hence the order of checks when you cannot see something - from the most " +
        "radical: first, is the prim in `Traverse` at all (`active`, an `over` with no " +
        "`def`, `class`), then `ComputeVisibility()` (it is inherited from ancestors), and " +
        "finally `purpose` against what the renderer draws.",
    },
  ],
  selfCheck: [
    {
      q: "A prim is not in Traverse and not in the render. The least likely cause?",
      options: [
        "active = false",
        "specifier = class (skipped in traversal)",
        "it has too many properties",
      ],
      answer: 2,
      explanation: "The number of properties does not hide a prim. These do: active=false, class, an over with no def.",
    },
    {
      q: "What is a variant fallback?",
      options: [
        "The variant choice when nobody has chosen one",
        "Removing a variant set from an asset",
        "The weakest arc in LIVERPS",
      ],
      answer: 0,
      explanation: "A variant fallback decides which variant applies when no selection was authored.",
    },
    {
      q: "The main tool for stage introspection is…",
      options: ["usdview", "flatten", "usdcat"],
      answer: 0,
      explanation: "usdview shows the hierarchy, properties, composition and a preview - the heart of debugging.",
    },
  ],
};

export const LESSONS: Lesson[] = [L0, L1, L2, L3, L4, L5, L6, L7];

export function getLessonForLayer(layerIndex: number): Lesson | undefined {
  return LESSONS.find((l) => l.layerIndex === layerIndex);
}
