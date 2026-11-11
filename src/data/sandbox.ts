/* ===========================================================================
 * Predict and Find-the-bug - short situations on real USD.
 *
 * Two modes: "Predict" (guess the result before you run it) and "Find the bug"
 * (a scene with one silent bug of the kind that happens in studios).
 *
 * Each situation becomes one Python script: it writes the files and prints
 * the result (src/core/sandboxScript.ts). The outputs shown in the app are NOT
 * written by hand - they are the output of these scripts on USD 25.08, saved in
 * sandbox.verified.ts by the verifier (npm run verify:sandbox).
 * ======================================================================== */
import type { ExamTopic } from "../core/types.ts";

export type SandboxMode = "predict" | "bug";

export interface SandboxFile {
  name: string;
  code: string;
}

/** Replaces exactly one fragment in one file. */
export interface SandboxEdit {
  file: string;
  before: string;
  after: string;
}

export interface SandboxItem {
  id: string;
  mode: SandboxMode;
  title: string;
  topic: ExamTopic;
  layerIndex: number;
  /** Short context of the situation (inline markdown). */
  setup: string;
  files: SandboxFile[];
  /** File to open in usdview. */
  open: string;
  /** Check code (Python) - appended after the files are written. */
  check: string;
  /** Predict: the question, the options, the index of the right one. */
  question?: string;
  options?: string[];
  answer?: number;
  /** Find the bug: what you see, a ladder of hints, the fix. */
  symptom?: string;
  hints?: string[];
  fix?: SandboxEdit[];
  /** Predict: one change to check yourself after you answer. */
  tryIt?: { label: string; edits: SandboxEdit[] };
  /** Explanation after the answer or the solution (inline markdown). */
  explain: string;
}

/* =============================================================== PREDICT === */

const PREDICT: SandboxItem[] = [
  {
    id: "p-specializes",
    mode: "predict",
    title: "Reference vs specializes",
    topic: "Composition",
    layerIndex: 3,
    setup:
      "A ball takes a color from the prim `Asset` through a reference, and at the same time it specializes the class " +
      "`_Style` with a different color. Everything in one file.",
    files: [
      {
        name: "ball.usda",
        code: `#usda 1.0

class "_Style"
{
    color3f[] primvars:displayColor = [(0.9, 0.15, 0.1)]
}

def Xform "Asset"
{
    color3f[] primvars:displayColor = [(0.2, 0.45, 0.9)]
}

def Sphere "Ball" (
    prepend references = </Asset>
    prepend specializes = </_Style>
)
{
}
`,
      },
    ],
    open: "ball.usda",
    check: `stage = Usd.Stage.Open("ball.usda")
color = stage.GetPrimAtPath("/Ball").GetAttribute("primvars:displayColor").Get()
print("ball color:", color[0])`,
    question: "What color will the ball be?",
    options: ["Blue - from `Asset`", "Red - from the class `_Style`", "No color - the opinions cancel out"],
    answer: 0,
    tryIt: {
      label: "Change `specializes` to `inherits`",
      edits: [{ file: "ball.usda", before: "prepend specializes = </_Style>", after: "prepend inherits = </_Style>" }],
    },
    explain:
      "**References (R) stand higher in LIVERPS than Specializes (S)**, so the blue " +
      "from `Asset` wins. Specializes is the weakest arc: it gives a value only where nobody else " +
      "has one. After the change to `inherits` (I, second place) the class beats the reference and the ball " +
      "turns red.",
  },
  {
    id: "p-default-vs-anim",
    mode: "predict",
    title: "An animation in a weaker layer",
    topic: "Composition",
    layerIndex: 1,
    setup:
      "The animation department wrote `radius` samples at frames 10 and 20 in `anim.usda`. The shot " +
      "adds this layer as a sublayer, and it has a plain `radius = 1` on the ball itself.",
    files: [
      {
        name: "anim.usda",
        code: `#usda 1.0

over "Ball"
{
    double radius.timeSamples = {
        10: 5,
        20: 10,
    }
}
`,
      },
      {
        name: "shot.usda",
        code: `#usda 1.0
(
    subLayers = [
        @./anim.usda@
    ]
)

def Sphere "Ball"
{
    double radius = 1
}
`,
      },
    ],
    open: "shot.usda",
    check: `stage = Usd.Stage.Open("shot.usda")
radius = stage.GetPrimAtPath("/Ball").GetAttribute("radius")
print("radius at frame 15:", radius.Get(15))
print("radius with no time:", radius.Get())`,
    question: "What is `radius` at frame 15?",
    options: ["7.5 - interpolated between the samples", "5 - the first sample is held", "1 - the value from shot.usda"],
    answer: 2,
    tryIt: {
      label: "Remove the line `double radius = 1` from shot.usda",
      edits: [{ file: "shot.usda", before: "    double radius = 1\n", after: "" }],
    },
    explain:
      "First **the strongest layer that has any opinion** wins - and the root layer " +
      "stands above its sublayers. `shot.usda` has a default, so the animation from `anim.usda` is not " +
      "even considered. The rule “timeSamples beat the default” works only inside " +
      "one layer. Without the line in the shot, the animation comes back: 7.5.",
  },
  {
    id: "p-traverse",
    mode: "predict",
    title: "How many prims Traverse sees",
    topic: "Debugging",
    layerIndex: 7,
    setup: "A scene where some prims are defined, some are not, and one is deactivated.",
    files: [
      {
        name: "scene.usda",
        code: `#usda 1.0

def Xform "World"
{
    def Sphere "A"
    {
    }

    over "B"
    {
        def Sphere "B_child"
        {
        }
    }

    def Sphere "C" (
        active = false
    )
    {
    }
}

class "_Template"
{
    def Sphere "D"
    {
    }
}
`,
      },
    ],
    open: "scene.usda",
    check: `stage = Usd.Stage.Open("scene.usda")
names = [p.GetName() for p in stage.Traverse()]
print("Traverse:", len(names), names)`,
    question: "How many prims does `stage.Traverse()` return?",
    options: ["2", "3", "4", "6"],
    answer: 0,
    tryIt: {
      label: "Change `over \"B\"` to `def \"B\"`",
      edits: [{ file: "scene.usda", before: '    over "B"', after: '    def "B"' }],
    },
    explain:
      "Only `World` and `A`. `over \"B\"` is not defined, so Traverse skips it together " +
      "with its child - even the `def` below does not help. `C` has `active = false`. The class " +
      "`_Template` is abstract and is skipped too. After you change `over` to `def`, " +
      "`B` and `B_child` are added.",
  },
  {
    id: "p-variant-vs-local",
    mode: "predict",
    title: "A selected variant vs a value on the prim",
    topic: "Composition",
    layerIndex: 5,
    setup: "A ball has a variant set `size` with the variant `big` selected, and `radius = 1` written on the prim itself.",
    files: [
      {
        name: "ball.usda",
        code: `#usda 1.0

def Sphere "Ball" (
    variantSets = ["size"]
    variants = {
        string size = "big"
    }
)
{
    double radius = 1

    variantSet "size" = {
        "small" {
            double radius = 0.5
        }
        "big" {
            double radius = 3
        }
    }
}
`,
      },
    ],
    open: "ball.usda",
    check: `stage = Usd.Stage.Open("ball.usda")
print("radius:", stage.GetPrimAtPath("/Ball").GetAttribute("radius").Get())`,
    question: "What `radius` will the ball have?",
    options: ["1 - the value written on the prim", "3 - the selected variant `big`", "0.5 - the first variant in the list"],
    answer: 0,
    tryIt: {
      label: "Remove the line `double radius = 1`",
      edits: [{ file: "ball.usda", before: "    double radius = 1\n\n", after: "" }],
    },
    explain:
      "An opinion written directly on the prim is **Local**, an opinion from a variant is **Variants** - " +
      "weaker. The variant selection changes nothing while the prim has its own value. Hence " +
      "the rule from L5: keep what a variant must change only inside the variants.",
  },
  {
    id: "p-prototypes",
    mode: "predict",
    title: "How many prototypes for five trees",
    topic: "Content Aggregation",
    layerIndex: 5,
    setup:
      "Five instances of the same tree (`instanceable = true`). Three have the season `summer`, " +
      "two have `autumn`. Each one stands in a different place.",
    files: [
      {
        name: "forest.usda",
        code: `#usda 1.0

class "_Tree" (
    variantSets = ["season"]
)
{
    variantSet "season" = {
        "summer" {
            def Cone "Crown"
            {
                color3f[] primvars:displayColor = [(0.2, 0.6, 0.25)]
            }
        }
        "autumn" {
            def Cone "Crown"
            {
                color3f[] primvars:displayColor = [(0.9, 0.45, 0.1)]
            }
        }
    }
}

def "Tree_1" (
    instanceable = true
    prepend references = </_Tree>
    variants = {
        string season = "summer"
    }
)
{
    double3 xformOp:translate = (0, 0, 0)
    uniform token[] xformOpOrder = ["xformOp:translate"]
}

def "Tree_2" (
    instanceable = true
    prepend references = </_Tree>
    variants = {
        string season = "summer"
    }
)
{
    double3 xformOp:translate = (3, 0, 0)
    uniform token[] xformOpOrder = ["xformOp:translate"]
}

def "Tree_3" (
    instanceable = true
    prepend references = </_Tree>
    variants = {
        string season = "summer"
    }
)
{
    double3 xformOp:translate = (6, 0, 0)
    uniform token[] xformOpOrder = ["xformOp:translate"]
}

def "Tree_4" (
    instanceable = true
    prepend references = </_Tree>
    variants = {
        string season = "autumn"
    }
)
{
    double3 xformOp:translate = (9, 0, 0)
    uniform token[] xformOpOrder = ["xformOp:translate"]
}

def "Tree_5" (
    instanceable = true
    prepend references = </_Tree>
    variants = {
        string season = "autumn"
    }
)
{
    double3 xformOp:translate = (12, 0, 0)
    uniform token[] xformOpOrder = ["xformOp:translate"]
}
`,
      },
    ],
    open: "forest.usda",
    check: `stage = Usd.Stage.Open("forest.usda")
instances = [p for p in stage.Traverse() if p.IsInstance()]
print("instances:", len(instances), "| prototypes:", len(stage.GetPrototypes()))`,
    question: "How many prototypes will the stage create?",
    options: ["1 - it is all one tree", "5 - each tree stands somewhere else", "2 - one per season"],
    answer: 2,
    tryIt: {
      label: "Set `summer` also in `Tree_4` and `Tree_5`",
      edits: [
        {
          file: "forest.usda",
          before: 'def "Tree_4" (\n    instanceable = true\n    prepend references = </_Tree>\n    variants = {\n        string season = "autumn"',
          after: 'def "Tree_4" (\n    instanceable = true\n    prepend references = </_Tree>\n    variants = {\n        string season = "summer"',
        },
        {
          file: "forest.usda",
          before: 'def "Tree_5" (\n    instanceable = true\n    prepend references = </_Tree>\n    variants = {\n        string season = "autumn"',
          after: 'def "Tree_5" (\n    instanceable = true\n    prepend references = </_Tree>\n    variants = {\n        string season = "summer"',
        },
      ],
    },
    explain:
      "A prototype comes from a **key**: the arcs and the variant selections. The position sits on the instance " +
      "root, outside the key, so it does not count. Two different seasons are two keys, that is " +
      "two prototypes. When all trees have `summer`, one is left.",
  },
  {
    id: "p-xform-order",
    mode: "predict",
    title: "Translation and rotation - the order",
    topic: "Data Modeling",
    layerIndex: 2,
    setup: "A box is moved by 5 along X and rotated by 90° around Y. The order in `xformOpOrder` counts.",
    files: [
      {
        name: "box.usda",
        code: `#usda 1.0

def Cube "Box"
{
    double3 xformOp:translate = (5, 0, 0)
    float xformOp:rotateY = 90
    uniform token[] xformOpOrder = ["xformOp:rotateY", "xformOp:translate"]
}
`,
      },
    ],
    open: "box.usda",
    check: `stage = Usd.Stage.Open("box.usda")
m = UsdGeom.Xformable(stage.GetPrimAtPath("/Box")).ComputeLocalToWorldTransform(Usd.TimeCode.Default())
print("box center:", tuple(round(v, 3) + 0.0 for v in m.ExtractTranslation()))`,
    question: "Where in the world does the center of the box land?",
    options: ["(5, 0, 0)", "(0, 0, -5)", "(0, 0, 5)"],
    answer: 1,
    tryIt: {
      label: "Change the order to `[\"xformOp:translate\", \"xformOp:rotateY\"]`",
      edits: [
        {
          file: "box.usda",
          before: '["xformOp:rotateY", "xformOp:translate"]',
          after: '["xformOp:translate", "xformOp:rotateY"]',
        },
      ],
    },
    explain:
      "The first operation in the list is the outermost one - read from the end: first " +
      "the move by 5 along X, then the 90° rotation around Y, which takes this point to `(0, 0, -5)`. " +
      "After you swap the order, the box rotates in place and stands at `(5, 0, 0)`.",
  },
  {
    id: "p-primvar-vertex",
    mode: "predict",
    title: "A parent color with vertex interpolation",
    topic: "Data Modeling",
    layerIndex: 2,
    setup: "A group has a color in `primvars:displayColor`, but with `vertex` interpolation. The box inside has no color of its own.",
    files: [
      {
        name: "group.usda",
        code: `#usda 1.0

def Xform "Group"
{
    color3f[] primvars:displayColor = [(0.9, 0.2, 0.1)] (
        interpolation = "vertex"
    )

    def Cube "Box"
    {
    }
}
`,
      },
    ],
    open: "group.usda",
    check: `stage = Usd.Stage.Open("group.usda")
box = UsdGeom.PrimvarsAPI(stage.GetPrimAtPath("/Group/Box"))
print("the box sees displayColor:", bool(box.FindPrimvarWithInheritance("displayColor")))`,
    question: "Does the box get the color from the group?",
    options: ["Yes - primvars are inherited down", "Only at the corners, because it is vertex", "No - it stays with no color"],
    answer: 2,
    tryIt: {
      label: "Change the interpolation to `constant`",
      edits: [{ file: "group.usda", before: 'interpolation = "vertex"', after: 'interpolation = "constant"' }],
    },
    explain:
      "**Only `constant` primvars are inherited down.** A value “per point” has nothing to " +
      "refer to on a parent with no geometry, so the box gets nothing and is drawn with " +
      "the default color. With `constant` the color goes down to the box.",
  },
  {
    id: "p-payload-loadnone",
    mode: "predict",
    title: "A scene opened without payloads",
    topic: "Pipeline Development",
    layerIndex: 4,
    setup: "A chair in the shot brings in its geometry with a payload. The scene is opened with `Usd.Stage.LoadNone`.",
    files: [
      {
        name: "chair_geo.usda",
        code: `#usda 1.0
(
    defaultPrim = "Chair"
)

def Xform "Chair"
{
    def Cube "Seat"
    {
    }

    def Cube "Back"
    {
    }
}
`,
      },
      {
        name: "shot.usda",
        code: `#usda 1.0

def Xform "Chair" (
    prepend payload = @./chair_geo.usda@
)
{
}
`,
      },
    ],
    open: "shot.usda",
    check: `stage = Usd.Stage.Open("shot.usda", Usd.Stage.LoadNone)
chair = stage.GetPrimAtPath("/Chair")
print("exists:", chair.IsValid(), "| loaded:", chair.IsLoaded())
print("children:", [c.GetName() for c in chair.GetChildren()])
chair.Load()
print("after Load():", [c.GetName() for c in chair.GetChildren()])`,
    question: "What will you see under `/Chair` right after opening?",
    options: ["The prim `/Chair` does not exist at all", "`/Chair` exists, but with no children", "The children are there, the payload loads anyway"],
    answer: 1,
    explain:
      "A payload defers only the **content**. The prim that the payload is written on exists " +
      "right away - so you can browse the structure of a huge scene and load selectively " +
      "only what you need (`Load()`).",
  },
  {
    id: "p-units",
    mode: "predict",
    title: "An asset in centimeters, a scene in meters",
    topic: "Data Exchange",
    layerIndex: 6,
    setup:
      "A box from the library was written in centimeters (`metersPerUnit = 0.01`, side 100 cm). " +
      "The shot works in meters (`metersPerUnit = 1`) and brings the box in with a reference.",
    files: [
      {
        name: "box.usda",
        code: `#usda 1.0
(
    defaultPrim = "Box"
    metersPerUnit = 0.01
)

def Cube "Box"
{
    double size = 100
}
`,
      },
      {
        name: "shot.usda",
        code: `#usda 1.0
(
    metersPerUnit = 1
)

def "Box" (
    prepend references = @./box.usda@
)
{
}
`,
      },
    ],
    open: "shot.usda",
    check: `stage = Usd.Stage.Open("shot.usda")
mpu = UsdGeom.GetStageMetersPerUnit(stage)
side = UsdGeom.BBoxCache(Usd.TimeCode.Default(), ["default"]).ComputeWorldBound(stage.GetPrimAtPath("/Box")).ComputeAlignedRange().GetSize()[0]
print("shot metersPerUnit:", mpu)
print("box side in the shot:", round(side, 3), "units =", round(side * mpu, 3), "m")`,
    question: "How big will the box be in the shot?",
    options: [
      "1 m - USD converts 100 cm to meters",
      "100 m - the units are not converted",
      "The scene does not open because of a unit conflict",
    ],
    answer: 1,
    tryIt: {
      label: "Add a scale of `0.01` on `Box` in the shot",
      edits: [
        {
          file: "shot.usda",
          before: ")\n{\n}\n",
          after: ')\n{\n    double3 xformOp:scale = (0.01, 0.01, 0.01)\n    uniform token[] xformOpOrder = ["xformOp:scale"]\n}\n',
        },
      ],
    },
    explain:
      "`metersPerUnit` is **only metadata**, a description of the file. When it combines layers with different " +
      "units, USD converts nothing by itself: 100 units from the library are 100 units " +
      "in the shot, that is 100 m. The correction belongs to the pipeline - a scale on the prim that " +
      "brings in the asset, or a conversion at import. `upAxis` works the same way.",
  },
  {
    id: "p-export",
    mode: "predict",
    title: "Exporting a layer vs exporting a stage",
    topic: "Data Exchange",
    layerIndex: 6,
    setup:
      "A shot brings in a lamp with a reference. A script saves it to a new file in two ways: " +
      "`stage.GetRootLayer().Export(...)` and `stage.Export(...)`.",
    files: [
      {
        name: "lamp.usda",
        code: `#usda 1.0
(
    defaultPrim = "Lamp"
)

def Sphere "Lamp"
{
    double radius = 3
}
`,
      },
      {
        name: "shot.usda",
        code: `#usda 1.0

def "Lamp" (
    prepend references = @./lamp.usda@
)
{
}
`,
      },
    ],
    open: "shot.usda",
    check: `stage = Usd.Stage.Open("shot.usda")
stage.GetRootLayer().Export("from_layer.usda")
stage.Export("from_stage.usda")
for file in ("from_layer.usda", "from_stage.usda"):
    text = Path(file).read_text(encoding="utf-8")
    print(file, "| references:", "references" in text, "| radius = 3:", "radius = 3" in text)`,
    question: "Which of the new files still needs `lamp.usda` for the lamp to have its radius?",
    options: [
      "Both - an export always keeps the references",
      "Only `from_layer.usda`",
      "Only `from_stage.usda`",
      "Neither - both stand on their own",
    ],
    answer: 1,
    explain:
      "`Sdf.Layer.Export` writes **the layer as it is**: with its arcs, so `references` " +
      "stays and the file still depends on `lamp.usda`. `Usd.Stage.Export` writes **the result " +
      "of composition** (the same as `Flatten()`): there are no arcs any more, `radius = 3` is written " +
      "directly. You make a self-contained file for delivery from the stage, and a copy of someone's layer under a new " +
      "name from the layer.",
  },
  {
    id: "p-anchoring",
    mode: "predict",
    title: "Where USD takes a texture from",
    topic: "Data Exchange",
    layerIndex: 6,
    setup:
      "A chair lives in the folder `assets/` and points to a texture with the path `@./wood.png@`. The shot " +
      "lives one level up and brings the chair in with a reference. The file `wood.png` is in both folders " +
      "(here it is plain text, so that you can see which one was loaded).",
    files: [
      {
        name: "assets/chair.usda",
        code: `#usda 1.0
(
    defaultPrim = "Chair"
)

def Xform "Chair"
{
    asset texture = @./wood.png@
}
`,
      },
      { name: "assets/wood.png", code: "texture from the assets folder\n" },
      { name: "wood.png", code: "texture next to the shot\n" },
      {
        name: "shot.usda",
        code: `#usda 1.0

def Xform "Chair" (
    prepend references = @./assets/chair.usda@
)
{
}
`,
      },
    ],
    open: "shot.usda",
    check: `stage = Usd.Stage.Open("shot.usda")
tex = stage.GetPrimAtPath("/Chair").GetAttribute("texture").Get()
file = Path(tex.resolvedPath)
print("written :", tex.path)
print("resolved:", file.resolve().relative_to(Path.cwd().resolve()).as_posix())
print("content :", file.read_text(encoding="utf-8").strip())`,
    question: "Which file will USD load as the texture?",
    options: [
      "`wood.png` next to the shot - paths count from the opened file",
      "`assets/wood.png` - paths count from the file they are written in",
      "Neither - a relative path from a reference does not resolve",
    ],
    answer: 1,
    tryIt: {
      label: "Change the path in the chair to `@../wood.png@`",
      edits: [{ file: "assets/chair.usda", before: "@./wood.png@", after: "@../wood.png@" }],
    },
    explain:
      "A relative path is **anchored in the layer that wrote it**, not in the file " +
      "you opened. Because of this, an asset from `assets/` always finds its textures, " +
      "no matter who brings it in and from which folder. `@../wood.png@` also counts " +
      "from the chair - one folder up, that is next to the shot.",
  },
  {
    id: "p-edit-target",
    mode: "predict",
    title: "Writing to a weaker layer",
    topic: "Pipeline Development",
    layerIndex: 3,
    setup:
      "A shot has the sublayer `anim.usda`. A tool sets the edit target to `anim.usda` and writes " +
      "`radius = 5` on the ball. In the shot itself the ball has `radius = 1`.",
    files: [
      {
        name: "anim.usda",
        code: `#usda 1.0

over "Ball"
{
}
`,
      },
      {
        name: "shot.usda",
        code: `#usda 1.0
(
    subLayers = [
        @./anim.usda@
    ]
)

def Sphere "Ball"
{
    double radius = 1
}
`,
      },
    ],
    open: "shot.usda",
    check: `stage = Usd.Stage.Open("shot.usda")
anim = Sdf.Layer.FindOrOpen("anim.usda")
stage.SetEditTarget(Usd.EditTarget(anim))
ball = stage.GetPrimAtPath("/Ball")
ball.GetAttribute("radius").Set(5.0)
print("written to anim.usda:", anim.GetAttributeAtPath("/Ball.radius").default)
print("radius on the stage :", ball.GetAttribute("radius").Get())`,
    question: "What does `radius` return on the stage after `Set(5.0)`?",
    options: [
      "5 - we have just set it",
      "1 - the shot is stronger than its sublayer",
      "An error - you cannot write to a weaker layer",
    ],
    answer: 1,
    tryIt: {
      label: "Remove `double radius = 1` from shot.usda",
      edits: [{ file: "shot.usda", before: "    double radius = 1\n", after: "" }],
    },
    explain:
      "The edit target only says **where to write** an opinion - it does not make it stronger. The five " +
      "lands in `anim.usda`, but the shot (the root layer) stands above its sublayer and its " +
      "`radius = 1` still wins. A classic tool trap: the write succeeded, and on the screen " +
      "nothing changes.",
  },
  {
    id: "p-time-scale",
    mode: "predict",
    title: "A 24 fps animation in a 48 fps shot",
    topic: "Pipeline Development",
    layerIndex: 3,
    setup:
      "The animation was made at 24 fps (`timeCodesPerSecond = 24`), with a key every second: at frame " +
      "24 `radius` is 24, at frame 48 it is 48. The shot runs at 48 fps and adds it as a sublayer.",
    files: [
      {
        name: "anim.usda",
        code: `#usda 1.0
(
    timeCodesPerSecond = 24
)

over "Ball"
{
    double radius.timeSamples = {
        0: 0,
        24: 24,
        48: 48,
    }
}
`,
      },
      {
        name: "shot.usda",
        code: `#usda 1.0
(
    subLayers = [
        @./anim.usda@
    ]
    timeCodesPerSecond = 48
)

def Sphere "Ball"
{
}
`,
      },
    ],
    open: "shot.usda",
    check: `stage = Usd.Stage.Open("shot.usda")
radius = stage.GetPrimAtPath("/Ball").GetAttribute("radius")
print("radius at shot frame 48:", radius.Get(48))`,
    question: "What is `radius` at frame 48 of the shot?",
    options: [
      "48 - a frame is a frame",
      "24 - USD converts the layer time to the shot fps",
      "96 - the animation plays twice as fast",
    ],
    answer: 1,
    tryIt: {
      label: "Change `timeCodesPerSecond` in anim.usda to 48",
      edits: [{ file: "anim.usda", before: "timeCodesPerSecond = 24", after: "timeCodesPerSecond = 48" }],
    },
    explain:
      "When layers have different `timeCodesPerSecond`, USD **scales the time itself**: a second in " +
      "the shot is 48 codes, in the animation 24, so frame 48 of the shot is frame 24 of the animation. " +
      "This works for sublayers and references. Hence the rule: every file with an animation must have " +
      "its `timeCodesPerSecond` written, because the conversion depends on it.",
  },
  {
    id: "p-missing-reference",
    mode: "predict",
    title: "A reference to a file that is not there",
    topic: "Debugging",
    layerIndex: 7,
    setup: "A shot places a chair with a reference to `chair.usda`, but this file did not come from the library.",
    files: [
      {
        name: "shot.usda",
        code: `#usda 1.0

def Xform "Chair" (
    prepend references = @./chair.usda@
)
{
}
`,
      },
    ],
    open: "shot.usda",
    check: `stage = Usd.Stage.Open("shot.usda")
chair = stage.GetPrimAtPath("/Chair")
print("stage opened:", bool(stage), "| prim exists:", chair.IsValid(), "| children:", len(chair.GetChildren()))
print("composition errors:", [type(e).__name__ for e in stage.GetCompositionErrors()])`,
    question: "What happens when you open `shot.usda`?",
    options: [
      "`Stage.Open` throws an exception and there is no scene",
      "The scene opens, `/Chair` exists, but it is empty",
      "USD removes the prim with the failed reference",
    ],
    answer: 1,
    explain:
      "A missing file is **a composition error, not an exception**: USD prints the warning " +
      "“Could not open asset”, opens the scene and leaves the prim without what the reference " +
      "was supposed to give. That is why a broken scene can look as if it works. In a script you catch " +
      "it with `stage.GetCompositionErrors()` - here one `ErrorInvalidAssetPath`.",
  },
  {
    id: "p-prim-stack",
    mode: "predict",
    title: "Where a prim gets its opinions",
    topic: "Debugging",
    layerIndex: 7,
    setup:
      "The prim `/Chair` is defined in the shot with a reference to `chair.usda`, and the sublayer " +
      "`fixes.usda` adds an `over` to it with a different `size`.",
    files: [
      {
        name: "chair.usda",
        code: `#usda 1.0
(
    defaultPrim = "Chair"
)

def Cube "Chair"
{
    double size = 1
}
`,
      },
      {
        name: "fixes.usda",
        code: `#usda 1.0

over "Chair"
{
    double size = 2
}
`,
      },
      {
        name: "shot.usda",
        code: `#usda 1.0
(
    subLayers = [
        @./fixes.usda@
    ]
)

def "Chair" (
    prepend references = @./chair.usda@
)
{
}
`,
      },
    ],
    open: "shot.usda",
    check: `stage = Usd.Stage.Open("shot.usda")
chair = stage.GetPrimAtPath("/Chair")
print("prim stack:", [s.layer.GetDisplayName() + ":" + str(s.path) for s in chair.GetPrimStack()])
print("size:", chair.GetAttribute("size").Get())`,
    question: "How many specs does the prim stack of `/Chair` have, and what `size` do you get?",
    options: [
      "2 specs, `size = 1` - the reference beats the sublayer",
      "3 specs, `size = 2` - the sublayer beats the reference",
      "3 specs, `size = 1` - the definition from the reference wins",
      "1 spec - an `over` does not count",
    ],
    answer: 1,
    tryIt: {
      label: "Remove `double size = 2` from fixes.usda",
      edits: [{ file: "fixes.usda", before: "    double size = 2\n", after: "" }],
    },
    explain:
      "`GetPrimStack()` is all the specs that make up a prim, from the strongest: " +
      "the shot, its sublayer `fixes.usda` (this is still **Local** - the same layer stack), and " +
      "only then the reference `chair.usda:/Chair`. Hence `size = 2`. An empty `over` is also " +
      "a spec - after you remove the value the stack still has three entries, and `size` goes back to 1. When " +
      "a value behaves strangely, start from the stack; for an attribute there is `GetPropertyStack()`.",
  },
  {
    id: "p-codeless-schema",
    mode: "predict",
    title: "A custom schema with no compiling",
    topic: "Customizing USD",
    layerIndex: 7,
    setup:
      "A studio adds owner information to its assets. Instead of compiling a schema, it registers " +
      "a **codeless schema**: `plugInfo.json` and `generatedSchema.usda` in the folder `studioSchema/`. " +
      "The chair has this schema in `apiSchemas`, but does not write the owner itself.",
    files: [
      {
        name: "studioSchema/plugInfo.json",
        code: `{
    "Plugins": [
        {
            "Info": {
                "Types": {
                    "StudioSchemaAssetInfoAPI": {
                        "alias": {
                            "UsdSchemaBase": "StudioAssetInfoAPI"
                        },
                        "bases": ["UsdAPISchemaBase"],
                        "schemaKind": "singleApplyAPI"
                    }
                }
            },
            "LibraryPath": "",
            "Name": "studioSchema",
            "ResourcePath": ".",
            "Root": ".",
            "Type": "resource"
        }
    ]
}
`,
      },
      {
        name: "studioSchema/generatedSchema.usda",
        code: `#usda 1.0
(
    "WARNING: THIS FILE IS GENERATED BY usdGenSchema.  DO NOT EDIT."
)

class "StudioAssetInfoAPI"
{
    string studio:owner = "unknown"
}
`,
      },
      {
        name: "chair.usda",
        code: `#usda 1.0

def Xform "Chair" (
    prepend apiSchemas = ["StudioAssetInfoAPI"]
)
{
}
`,
      },
    ],
    open: "chair.usda",
    check: `from pxr import Plug

Plug.Registry().RegisterPlugins(str(Path("studioSchema").resolve()))
stage = Usd.Stage.Open("chair.usda")
chair = stage.GetPrimAtPath("/Chair")
print("HasAPI:", chair.HasAPI("StudioAssetInfoAPI"))
print("studio:owner:", chair.GetAttribute("studio:owner").Get())`,
    question: "What does `studio:owner` return on the chair?",
    options: [
      "`None` - the chair file does not have this attribute",
      "`unknown` - the default value from the schema",
      "An error - an unknown schema in `apiSchemas`",
    ],
    answer: 1,
    tryIt: {
      label: "Add `string studio:owner = \"Anna\"` on the chair",
      edits: [{ file: "chair.usda", before: ")\n{\n}\n", after: ')\n{\n    string studio:owner = "Anna"\n}\n' }],
    },
    explain:
      "A registered schema gives its attributes **default values (fallbacks)**: you do not need to " +
      "write them on every asset, and a value written in the file simply covers them. A codeless " +
      "schema is just two data files - `generatedSchema.usda` describes the attributes, " +
      "`plugInfo.json` tells USD where to look for them. Nothing is compiled. Here the registration goes " +
      "through `Plug.Registry().RegisterPlugins()` before the scene opens; in a studio it usually goes through " +
      "the variable `PXR_PLUGINPATH_NAME`, set before the tool starts.",
  },
  {
    id: "p-relocates",
    mode: "predict",
    title: "Relocates: an arm under a new path",
    topic: "Composition",
    layerIndex: 3,
    setup:
      "The asset `character.usda` has an arm under `/Character/Rig/Arm` with the attribute `length = 60`. The shot " +
      "brings the character in as `/Hero` and in the layer metadata moves the arm to `/Hero/LeftArm`. " +
      "Under `/Hero` the shot also defines its own prim `Own`.",
    files: [
      {
        name: "character.usda",
        code: `#usda 1.0
(
    defaultPrim = "Character"
)

def Xform "Character"
{
    def Xform "Rig"
    {
        def Xform "Arm"
        {
            double length = 60
        }
    }
}
`,
      },
      {
        name: "shot.usda",
        code: `#usda 1.0
(
    relocates = {
        </Hero/Rig/Arm>: </Hero/LeftArm>
    }
)

def Xform "Hero" (
    prepend references = @./character.usda@
)
{
    def Xform "Own"
    {
    }
}
`,
      },
    ],
    open: "shot.usda",
    check: `stage = Usd.Stage.Open("shot.usda")
for path in ["/Hero/Rig/Arm", "/Hero/LeftArm", "/Hero/Own"]:
    prim = stage.GetPrimAtPath(path)
    print(f"{path:14}", "found" if prim else "none ", "| length:", prim.GetAttribute("length").Get() if prim else "-")
print("composition errors:", len(stage.GetCompositionErrors()))`,
    question: "What is left under the old path `/Hero/Rig/Arm`?",
    options: [
      "The original - relocates makes a copy under the new path",
      "Nothing - the arm is now only under `/Hero/LeftArm`",
      "An empty prim, because the opinions went to the new path",
    ],
    answer: 1,
    tryIt: {
      label: "Move the prim `Own`, defined in the shot itself, instead of the arm",
      edits: [{ file: "shot.usda", before: "</Hero/Rig/Arm>: </Hero/LeftArm>", after: "</Hero/Own>: </Hero/LeftArm>" }],
    },
    explain:
      "Relocates is layer metadata: a map *old path: new path*. The arm from the reference " +
      "moved together with its opinions (`length = 60`), and there is nothing under the old path - this is " +
      "the 'E' in LIVERPS. It works only on prims brought in by an arc. After the change in **Try it**, " +
      "`Own` disappears, nothing appears under `/Hero/LeftArm` - and USD reports no error at all.",
  },
  {
    id: "p-implied-inherits",
    mode: "predict",
    title: "A class in the shot and a chair from a reference",
    topic: "Composition",
    layerIndex: 3,
    setup:
      "The asset `chair.usda` inherits its color from its own class `_Style` (brown). The shot brings " +
      "the chair in with a reference and defines a class `_Style` itself - with red. Nobody touched the asset.",
    files: [
      {
        name: "chair.usda",
        code: `#usda 1.0
(
    defaultPrim = "Chair"
)

class "_Style"
{
    color3f[] primvars:displayColor = [(0.42, 0.24, 0.11)]
}

def Cube "Chair" (
    prepend inherits = </_Style>
)
{
}
`,
      },
      {
        name: "shot.usda",
        code: `#usda 1.0

class "_Style"
{
    color3f[] primvars:displayColor = [(0.9, 0.1, 0.1)]
}

def "ChairA" (
    prepend references = @./chair.usda@
)
{
}
`,
      },
    ],
    open: "shot.usda",
    check: `stage = Usd.Stage.Open("shot.usda")
prim = stage.GetPrimAtPath("/ChairA")
print("color:", prim.GetAttribute("primvars:displayColor").Get()[0])
for arc in Usd.PrimCompositionQuery(prim).GetCompositionArcs():
    print("  arc:", arc.GetArcType(), arc.GetTargetNode().path, "| implied:", arc.IsImplicit())`,
    question: "What color will the chair be in the shot?",
    options: [
      "Brown - the inside of a reference is closed to the shot",
      "Red - the class from the shot comes in as implied",
      "Brown - nothing points to the `_Style` class in the shot",
    ],
    answer: 1,
    tryIt: {
      label: "Rename the class in the shot to `_ShotStyle`",
      edits: [{ file: "shot.usda", before: 'class "_Style"', after: 'class "_ShotStyle"' }],
    },
    explain:
      "An inherits arc from the asset is **carried over** (implied) into the layer stack that brings in " +
      "the asset. So USD looks for `/_Style` opinions also in the shot, and these are stronger than the inside " +
      "of the reference. You see this in the arc list: next to the plain inherits from the asset there is a second one, with " +
      "`implied: True`. The mechanism works by path - after you rename the class in **Try it**, " +
      "the implied arc is still in the list, but the shot no longer has any opinions under `/_Style`, " +
      "so the chair goes back to brown.",
  },
  {
    id: "p-delete-references",
    mode: "predict",
    title: "A stronger layer deletes a reference",
    topic: "Composition",
    layerIndex: 3,
    setup:
      "Layout placed two assets in a corner: a table and a lamp (`prepend references`). The layer " +
      "`cleanup.usda`, stronger in the shot, has `delete references = @./lamp.usda@`.",
    files: [
      {
        name: "table.usda",
        code: `#usda 1.0
(
    defaultPrim = "Furniture"
)

def Xform "Furniture"
{
    def Cube "Top"
    {
    }
}
`,
      },
      {
        name: "lamp.usda",
        code: `#usda 1.0
(
    defaultPrim = "Furniture"
)

def Xform "Furniture"
{
    def Sphere "Shade"
    {
    }
}
`,
      },
      {
        name: "layout.usda",
        code: `#usda 1.0

def Xform "LivingRoom"
{
    def Xform "Corner" (
        prepend references = [@./table.usda@, @./lamp.usda@]
    )
    {
    }
}
`,
      },
      {
        name: "cleanup.usda",
        code: `#usda 1.0

over "LivingRoom"
{
    over "Corner" (
        delete references = @./lamp.usda@
    )
    {
    }
}
`,
      },
      {
        name: "shot.usda",
        code: `#usda 1.0
(
    subLayers = [
        @./cleanup.usda@,
        @./layout.usda@
    ]
)
`,
      },
    ],
    open: "shot.usda",
    check: `stage = Usd.Stage.Open("shot.usda")
corner = stage.GetPrimAtPath("/LivingRoom/Corner")
print("children of Corner:", [c.GetName() for c in corner.GetChildren()])`,
    question: "What is left in `Corner`?",
    options: [
      "Top and Shade - delete works only in its own layer",
      "Only Top - the stronger layer deleted the lamp",
      "Nothing - delete clears the whole reference list",
    ],
    answer: 1,
    tryIt: {
      label: "Swap the order in `shot.usda`: `layout.usda` before `cleanup.usda`",
      edits: [
        {
          file: "shot.usda",
          before: "        @./cleanup.usda@,\n        @./layout.usda@",
          after: "        @./layout.usda@,\n        @./cleanup.usda@",
        },
      ],
    },
    explain:
      "Arc lists are composed from the weakest layer to the strongest: first `layout` " +
      "adds the table and the lamp, then the stronger `cleanup` deletes the lamp. This is how you clean up someone else's " +
      "layer without editing it. After you swap the order in **Try it**, `delete` runs " +
      "first, when the lamp is not in the list yet, and then the stronger layout adds it " +
      "back - `delete` works only on what weaker layers brought in.",
  },
  {
    id: "p-purpose-bbox",
    mode: "predict",
    title: "The bbox of a tree with no default geometry",
    topic: "Visualization",
    layerIndex: 2,
    setup:
      "A tree has two versions of its geometry: a heavy `Render` (purpose `render`, 10 units) and " +
      "a light `Proxy` (purpose `proxy`, 2 units). A layout tool computes the bbox of the tree " +
      "to place trees next to each other, and it asks only for the purpose `default`.",
    files: [
      {
        name: "tree.usda",
        code: `#usda 1.0
(
    defaultPrim = "Tree"
)

def Xform "Tree"
{
    def Cube "Render"
    {
        double size = 10
        uniform token purpose = "render"
    }

    def Cube "Proxy"
    {
        double size = 2
        uniform token purpose = "proxy"
    }
}
`,
      },
    ],
    open: "tree.usda",
    check: `stage = Usd.Stage.Open("tree.usda")
tree = stage.GetPrimAtPath("/Tree")
for label, purposes in [("default", [UsdGeom.Tokens.default_]),
                        ("default + render", [UsdGeom.Tokens.default_, UsdGeom.Tokens.render]),
                        ("default + proxy", [UsdGeom.Tokens.default_, UsdGeom.Tokens.proxy])]:
    box = UsdGeom.BBoxCache(Usd.TimeCode.Default(), purposes).ComputeWorldBound(tree).ComputeAlignedRange()
    print(f"{label:17}:", "empty" if box.IsEmpty() else f"{box.GetMin()} -> {box.GetMax()}")`,
    question: "What does `BBoxCache` give with the purpose `default` alone?",
    options: [
      "The bbox of the Render geometry - it is the final geometry",
      "An empty range - nothing has the default purpose",
      "The bbox of Proxy - the light version goes into bboxes",
    ],
    answer: 1,
    tryIt: {
      label: "Remove `purpose = \"render\"` from the `Render` geometry",
      edits: [{ file: "tree.usda", before: '        double size = 10\n        uniform token purpose = "render"\n', after: "        double size = 10\n" }],
    },
    explain:
      "`BBoxCache` counts only geometry with the purposes in the list. Here everything has " +
      "the purpose `render` or `proxy`, so with `default` alone the range is empty - and " +
      "the layout tool will stack the trees on top of each other. Hence the list `[default, render]` or " +
      "`[default, proxy]`, depending on whether you measure the final object or the preview. After " +
      "you remove the purpose in **Try it**, `Render` goes back to `default` and is in every bbox.",
  },
  {
    id: "p-stronger-binding",
    mode: "predict",
    title: "A group material vs a box material",
    topic: "Visualization",
    layerIndex: 2,
    setup:
      "The group `Scene` assigns the material `Red` to everything. The box inside has its own " +
      "binding to `Blue`. Lookdev added " +
      "`bindMaterialAs = \"strongerThanDescendants\"` on the group binding.",
    files: [
      {
        name: "scene.usda",
        code: `#usda 1.0

def Xform "Scene" (
    prepend apiSchemas = ["MaterialBindingAPI"]
)
{
    rel material:binding = </Scene/Looks/Red> (
        bindMaterialAs = "strongerThanDescendants"
    )

    def Scope "Looks"
    {
        def Material "Red"
        {
            token outputs:surface.connect = </Scene/Looks/Red/PBR.outputs:surface>

            def Shader "PBR"
            {
                uniform token info:id = "UsdPreviewSurface"
                color3f inputs:diffuseColor = (0.9, 0.1, 0.1)
                token outputs:surface
            }
        }

        def Material "Blue"
        {
            token outputs:surface.connect = </Scene/Looks/Blue/PBR.outputs:surface>

            def Shader "PBR"
            {
                uniform token info:id = "UsdPreviewSurface"
                color3f inputs:diffuseColor = (0.1, 0.3, 0.9)
                token outputs:surface
            }
        }
    }

    def Cube "Box" (
        prepend apiSchemas = ["MaterialBindingAPI"]
    )
    {
        rel material:binding = </Scene/Looks/Blue>
    }
}
`,
      },
    ],
    open: "scene.usda",
    check: `stage = Usd.Stage.Open("scene.usda")
material, binding = UsdShade.MaterialBindingAPI(stage.GetPrimAtPath("/Scene/Box")).ComputeBoundMaterial()
print("box material:", material.GetPrim().GetName())
print("winning binding from:", binding.GetPrim().GetPath())`,
    question: "Which material does the box get?",
    options: [
      "Blue - its own binding is the closest",
      "Red - the group binding beats the descendants",
      "Both - the renderer mixes them half and half",
    ],
    answer: 1,
    tryIt: {
      label: "Remove `bindMaterialAs` from the group binding",
      edits: [{ file: "scene.usda", before: ' (\n        bindMaterialAs = "strongerThanDescendants"\n    )', after: "" }],
    },
    explain:
      "By default the binding closest to the geometry wins (`weakerThanDescendants`). " +
      "`strongerThanDescendants` on the group binding reverses this rule: the group imposes " +
      "its material on the whole subtree, although the box has its own binding. `ComputeBoundMaterial` " +
      "also returns the relationship that won - here the one from `/Scene`. Without this metadata in " +
      "**Try it**, the box goes back to blue.",
  },
  {
    id: "p-make-visible",
    mode: "predict",
    title: "Show a chair in a hidden group",
    topic: "Visualization",
    layerIndex: 2,
    setup:
      "The group `Furniture` (a chair, a table, a lamp) is hidden: `visibility = \"invisible\"`. " +
      "A tool must show **only the chair**; it calls `MakeVisible()` on `Furniture/Chair` and " +
      "then saves the layer.",
    files: [
      {
        name: "room.usda",
        code: `#usda 1.0

def Xform "Furniture"
{
    token visibility = "invisible"

    def Cube "Chair"
    {
    }

    def Cube "Table"
    {
    }

    def Sphere "Lamp"
    {
    }
}
`,
      },
    ],
    open: "room.usda",
    check: `stage = Usd.Stage.Open("room.usda")
UsdGeom.Imageable(stage.GetPrimAtPath("/Furniture/Chair")).MakeVisible()
stage.GetRootLayer().Save()

layer = Sdf.Layer.FindOrOpen("room.usda")
for path in ["/Furniture", "/Furniture/Chair", "/Furniture/Table", "/Furniture/Lamp"]:
    spec = layer.GetAttributeAtPath(path + ".visibility")
    vis = UsdGeom.Imageable(stage.GetPrimAtPath(path)).ComputeVisibility()
    print(f"{path:17} in file: {spec.default if spec else '-':10} visible: {vis}")`,
    question: "What will be written in the file after `MakeVisible()` on the chair?",
    options: [
      "Only the invisible removed from the group",
      "visibility = visible on the chair and nothing more",
      "The group inherited, the table and the lamp invisible",
    ],
    answer: 2,
    tryIt: {
      label: "Instead of the group, hide only the table in the file",
      edits: [
        { file: "room.usda", before: '    token visibility = "invisible"\n\n    def Cube "Chair"', after: '    def Cube "Chair"' },
        { file: "room.usda", before: '    def Cube "Table"\n    {\n    }', after: '    def Cube "Table"\n    {\n        token visibility = "invisible"\n    }' },
      ],
    },
    explain:
      "To show the chair, `MakeVisible` must remove `invisible` from the group (it writes " +
      "`inherited`). That would also reveal the siblings, so USD writes an explicit `invisible` on the table and " +
      "the lamp. After this operation the file has more opinions than before - and " +
      "new opinions on prims that nobody touched. In **Try it** the group is visible, " +
      "so `MakeVisible` on the chair has nothing to do and writes nothing.",
  },
  {
    id: "p-light-collection",
    mode: "predict",
    title: "Who the Key light lights",
    topic: "Visualization",
    layerIndex: 2,
    setup:
      "The light `Key` must light only the furniture. Its `lightLink` collection has `includeRoot = 0`, " +
      "includes `/Room/Furniture` and excludes `/Room/Furniture/DeskLamp`, because the desk lamp has its own light.",
    files: [
      {
        name: "room.usda",
        code: `#usda 1.0

def Xform "Room"
{
    def SphereLight "Key"
    {
        uniform bool collection:lightLink:includeRoot = 0
        rel collection:lightLink:includes = </Room/Furniture>
        rel collection:lightLink:excludes = </Room/Furniture/DeskLamp>
    }

    def Cube "Floor"
    {
    }

    def Xform "Furniture"
    {
        def Cube "Chair"
        {
        }

        def Xform "DeskLamp"
        {
            def Sphere "Shade"
            {
            }
        }
    }
}
`,
      },
    ],
    open: "room.usda",
    check: `stage = Usd.Stage.Open("room.usda")
collection = Usd.CollectionAPI(stage.GetPrimAtPath("/Room/Key"), "lightLink")
query = collection.ComputeMembershipQuery()
for path in ["/Room/Floor", "/Room/Furniture/Chair", "/Room/Furniture/DeskLamp", "/Room/Furniture/DeskLamp/Shade"]:
    print(f"{path:31}", "lit" if query.IsPathIncluded(path) else "-")`,
    question: "Will `Key` light the shade of the desk lamp (`/Room/Furniture/DeskLamp/Shade`)?",
    options: [
      "Yes - the shade is not in excludes",
      "No - an exclude covers the subtree",
      "Yes - the parent's includes beat excludes",
    ],
    answer: 1,
    tryIt: {
      label: "Remove the line with `includeRoot = 0`",
      edits: [{ file: "room.usda", before: "        uniform bool collection:lightLink:includeRoot = 0\n", after: "" }],
    },
    explain:
      "`excludes` excludes a prim **together with its subtree**, so the shade of the desk lamp gets no " +
      "light, although it is not named. `includeRoot = 0` makes the collection " +
      "contain only what is in `includes` - the floor stays in the dark. Light collections " +
      "have `includeRoot = 1` by default: after you remove this line in **Try it**, `Key` " +
      "lights the whole scene except the excluded desk lamp.",
  },
];

/* =========================================================== FIND THE BUG === */

const BUGS: SandboxItem[] = [
  {
    id: "b-explicit-references",
    mode: "bug",
    title: "The chair disappeared after a lamp was added",
    topic: "Composition",
    layerIndex: 3,
    setup:
      "Layout places a chair in the living room. The lighting department, in a separate, stronger layer, " +
      "adds a lamp to the same prim.",
    symptom:
      "Since the lamp arrived, the chair is gone from the living room. Nobody deleted it, and the file opens with no warnings.",
    files: [
      {
        name: "chair.usda",
        code: `#usda 1.0
(
    defaultPrim = "Chair"
)

def Xform "Chair"
{
    def Cube "Seat"
    {
    }
}
`,
      },
      {
        name: "lamp.usda",
        code: `#usda 1.0
(
    defaultPrim = "Lamp"
)

def Xform "Lamp"
{
    def Cylinder "Pole"
    {
    }
}
`,
      },
      {
        name: "layout.usda",
        code: `#usda 1.0

def Xform "LivingRoom" (
    prepend references = @./chair.usda@
)
{
}
`,
      },
      {
        name: "lights.usda",
        code: `#usda 1.0

over "LivingRoom" (
    references = @./lamp.usda@
)
{
}
`,
      },
      {
        name: "shot.usda",
        code: `#usda 1.0
(
    subLayers = [
        @./lights.usda@,
        @./layout.usda@
    ]
)
`,
      },
    ],
    open: "shot.usda",
    check: `stage = Usd.Stage.Open("shot.usda")
print("in the living room:", [c.GetName() for c in stage.GetPrimAtPath("/LivingRoom").GetChildren()])`,
    hints: [
      "Compare how `layout.usda` and `lights.usda` write the reference list.",
      "The reference list is a list-editable field - the word in front of `references` matters.",
    ],
    fix: [{ file: "lights.usda", before: "    references = @./lamp.usda@", after: "    prepend references = @./lamp.usda@" }],
    explain:
      "A bare `references =` is an **explicit** list: it replaces everything that came from weaker " +
      "layers, including the chair from layout. `prepend` adds the lamp to the list and the chair " +
      "stays. In layers that add something to someone else's work, always use `prepend`.",
  },
  {
    id: "b-variant-trap",
    mode: "bug",
    title: "The bar stool looks like a low stool",
    topic: "Composition",
    layerIndex: 5,
    setup: "A piece of furniture has the variant set `style`. The variant `bar` raises the seat to 90 cm.",
    symptom: "`bar` is selected, and the seat still hangs at 45 cm.",
    files: [
      {
        name: "furniture.usda",
        code: `#usda 1.0

def Xform "Furniture" (
    variantSets = ["style"]
    variants = {
        string style = "bar"
    }
)
{
    variantSet "style" = {
        "stool" {
        }
        "bar" {
            over "Seat"
            {
                double3 xformOp:translate = (0, 90, 0)
            }
        }
    }

    def Cube "Seat"
    {
        double3 xformOp:translate = (0, 45, 0)
        uniform token[] xformOpOrder = ["xformOp:translate"]
    }
}
`,
      },
    ],
    open: "furniture.usda",
    check: `stage = Usd.Stage.Open("furniture.usda")
attr = stage.GetPrimAtPath("/Furniture/Seat").GetAttribute("xformOp:translate")
print("seat height:", attr.Get()[1])
for spec in attr.GetPropertyStack(Usd.TimeCode.Default()):
    print("  opinion:", spec.path, "->", spec.default)`,
    hints: [
      "Run the script and look at the list of opinions: which one is first?",
      "An opinion written directly on the prim is Local. An opinion from a variant is Variants. Which one is stronger in LIVERPS?",
    ],
    fix: [
      {
        file: "furniture.usda",
        before: `        "stool" {
        }`,
        after: `        "stool" {
            over "Seat"
            {
                double3 xformOp:translate = (0, 45, 0)
            }
        }`,
      },
      {
        file: "furniture.usda",
        before: `    def Cube "Seat"
    {
        double3 xformOp:translate = (0, 45, 0)
        uniform token[] xformOpOrder = ["xformOp:translate"]`,
        after: `    def Cube "Seat"
    {
        uniform token[] xformOpOrder = ["xformOp:translate"]`,
      },
    ],
    explain:
      "A value written directly on the prim is **Local** and beats its own variant (**Variants**). " +
      "The telltale sign is the path with `{style=bar}` in second place in the stack of opinions. " +
      "The fix: keep the height that the variant changes only inside the variants - each " +
      "variant has its own version, and there is nothing on the prim to cover them.",
  },
  {
    id: "b-kind-group",
    mode: "bug",
    title: "A component that is not a model",
    topic: "Content Aggregation",
    layerIndex: 4,
    setup: "A furniture set: `Set` is an assembly, the chair inside has `kind = \"component\"`.",
    symptom: "The publish validator reports that `/Set/Furniture/Chair` is not a model, although it has `kind = \"component\"`.",
    files: [
      {
        name: "set.usda",
        code: `#usda 1.0

def Xform "Set" (
    kind = "assembly"
)
{
    def Xform "Furniture"
    {
        def Xform "Chair" (
            kind = "component"
        )
        {
            def Cube "Seat"
            {
            }
        }
    }
}
`,
      },
    ],
    open: "set.usda",
    check: `stage = Usd.Stage.Open("set.usda")
for path in ["/Set", "/Set/Furniture", "/Set/Furniture/Chair"]:
    p = stage.GetPrimAtPath(path)
    print(f"{path:20} kind={Usd.ModelAPI(p).GetKind() or '-':10} IsModel={p.IsModel()}")`,
    hints: [
      "Check `IsModel()` not only for the chair, but for every level above it.",
      "A model is a model only when all its ancestors are a group or an assembly.",
    ],
    fix: [
      {
        file: "set.usda",
        before: '    def Xform "Furniture"\n    {',
        after: '    def Xform "Furniture" (\n        kind = "group"\n    )\n    {',
      },
    ],
    explain:
      "`Furniture` has no `kind`, so the chain of models from the root is broken, and everything under " +
      "it stops being a model - with no error and no warning. One line `kind = \"group\"` " +
      "on the prim in between makes the chair a model again.",
  },
  {
    id: "b-default-prim",
    mode: "bug",
    title: "An empty prim after a reference",
    topic: "Composition",
    layerIndex: 3,
    setup: "A shot references `chair.usda` without giving a prim path.",
    symptom: "In the shot, `/Chair` is empty. The console shows one warning about an *Unresolved reference prim path*.",
    files: [
      {
        name: "chair.usda",
        code: `#usda 1.0

def Xform "Chair"
{
    def Cube "Seat"
    {
    }
}
`,
      },
      {
        name: "shot.usda",
        code: `#usda 1.0

def Xform "Chair" (
    prepend references = @./chair.usda@
)
{
}
`,
      },
    ],
    open: "shot.usda",
    check: `stage = Usd.Stage.Open("shot.usda")
print("children of /Chair:", [c.GetName() for c in stage.GetPrimAtPath("/Chair").GetChildren()])`,
    hints: [
      "The reference `@./chair.usda@` does not say WHICH prim from the file must come in.",
      "Open `chair.usda` and look for the metadata that answers this question.",
    ],
    fix: [
      {
        file: "chair.usda",
        before: '#usda 1.0\n\ndef Xform "Chair"',
        after: '#usda 1.0\n(\n    defaultPrim = "Chair"\n)\n\ndef Xform "Chair"',
      },
    ],
    explain:
      "A reference with no prim path targets the `defaultPrim` of the file. When there is none, the prim stays " +
      "empty, and USD only warns in the console. The other correct way is an explicit path: " +
      "`@./chair.usda@</Chair>`.",
  },
  {
    id: "b-sublayer-order",
    mode: "bug",
    title: "Lighting set 2500, the stage says 9000",
    topic: "Composition",
    layerIndex: 3,
    setup: "Layout has a work light of 9000. The lighting department dims it to 2500 in its own layer.",
    symptom: "After the shot is composed, `intensity` is still 9000.",
    files: [
      {
        name: "layout.usda",
        code: `#usda 1.0

def SphereLight "Key"
{
    float inputs:intensity = 9000
}
`,
      },
      {
        name: "light.usda",
        code: `#usda 1.0

over "Key"
{
    float inputs:intensity = 2500
}
`,
      },
      {
        name: "shot.usda",
        code: `#usda 1.0
(
    subLayers = [
        @./layout.usda@,
        @./light.usda@
    ]
)
`,
      },
    ],
    open: "shot.usda",
    check: `stage = Usd.Stage.Open("shot.usda")
attr = stage.GetPrimAtPath("/Key").GetAttribute("inputs:intensity")
print("intensity:", attr.Get())
print("layers with an opinion (strongest first):", [Path(s.layer.realPath).name for s in attr.GetPropertyStack()])`,
    hints: [
      "Both layers have an opinion. Which one is stronger?",
      "In `subLayers` the order in the list is the strength: the first entry wins.",
    ],
    fix: [
      {
        file: "shot.usda",
        before: "        @./layout.usda@,\n        @./light.usda@",
        after: "        @./light.usda@,\n        @./layout.usda@",
      },
    ],
    explain:
      "Earlier in the `subLayers` list means stronger. Layout was first, so its 9000 " +
      "covered the fix from the lighting department. Department layers that override layout go into " +
      "the list before it.",
  },
  {
    id: "b-instance-edit",
    mode: "bug",
    title: "The seat in an instance does not change color",
    topic: "Content Aggregation",
    layerIndex: 5,
    setup: "Two chairs from one template, both instanceable. The second one must get a red seat.",
    symptom: "The red color is in the file, and the seat of `Chair_2` is still brown.",
    files: [
      {
        name: "chairs.usda",
        code: `#usda 1.0

class "_Chair"
{
    def Cube "Seat"
    {
        color3f[] primvars:displayColor = [(0.45, 0.3, 0.15)]
    }
}

def Xform "Chair_1" (
    instanceable = true
    prepend references = </_Chair>
)
{
}

def Xform "Chair_2" (
    instanceable = true
    prepend references = </_Chair>
)
{
    double3 xformOp:translate = (3, 0, 0)
    uniform token[] xformOpOrder = ["xformOp:translate"]

    over "Seat"
    {
        color3f[] primvars:displayColor = [(0.9, 0.1, 0.1)]
    }
}
`,
      },
    ],
    open: "chairs.usda",
    check: `stage = Usd.Stage.Open("chairs.usda")
seat = stage.GetPrimAtPath("/Chair_2/Seat")
print("instance proxy:", seat.IsInstanceProxy())
print("seat color:", seat.GetAttribute("primvars:displayColor").Get()[0])`,
    hints: [
      "Run the script: what is `/Chair_2/Seat` according to `IsInstanceProxy()`?",
      "The inside of an instance is a view of the shared prototype. Where are you allowed to write a change?",
    ],
    fix: [
      {
        file: "chairs.usda",
        before: 'def Xform "Chair_2" (\n    instanceable = true',
        after: 'def Xform "Chair_2" (\n    instanceable = false',
      },
    ],
    explain:
      "The seat in an instance is an **instance proxy** - opinions written under the instance root are " +
      "ignored. `instanceable = false` detaches this one chair from the prototype and the override " +
      "starts to work, at the memory cost of its own copy. A cheaper alternative: a color on the " +
      "root of `Chair_2` itself - then the whole chair changes, and the prototype stays shared.",
  },
  {
    id: "b-binding-api",
    mode: "bug",
    title: "The validator rejects a working material",
    topic: "Visualization",
    layerIndex: 2,
    setup:
      "A box points to the material `Red` with the relationship `material:binding`. In usdview it is red, " +
      "everything looks fine.",
    symptom:
      "Every time the scene opens, USD prints the warning *Found material bindings ... but " +
      "MaterialBindingAPI is not applied*, and validation before publishing rejects the file.",
    files: [
      {
        name: "box.usda",
        code: `#usda 1.0
(
    defaultPrim = "World"
    metersPerUnit = 0.01
    upAxis = "Y"
)

def Xform "World"
{
    def Material "Red"
    {
        token outputs:surface.connect = </World/Red/PBR.outputs:surface>

        def Shader "PBR"
        {
            uniform token info:id = "UsdPreviewSurface"
            color3f inputs:diffuseColor = (0.9, 0.1, 0.1)
            token outputs:surface
        }
    }

    def Cube "Box"
    {
        rel material:binding = </World/Red>
    }
}
`,
      },
    ],
    open: "box.usda",
    check: `stage = Usd.Stage.Open("box.usda")
material, _ = UsdShade.MaterialBindingAPI(stage.GetPrimAtPath("/World/Box")).ComputeBoundMaterial()
print("bound material:", material.GetPath() if material else "none")
checker = UsdUtils.ComplianceChecker()
checker.CheckCompliance("box.usda")
failed = checker.GetFailedChecks()
print("validation:", "OK" if not failed else "rejected")
for f in failed:
    print("  -", f)`,
    hints: [
      "The material works. Run the script and read which validator rule the file breaks.",
      "Compare with the example from L2: what is missing in the parentheses of `def Cube \"Box\"`?",
    ],
    fix: [
      {
        file: "box.usda",
        before: '    def Cube "Box"\n    {',
        after: '    def Cube "Box" (\n        prepend apiSchemas = ["MaterialBindingAPI"]\n    )\n    {',
      },
    ],
    explain:
      "The relationship `material:binding` should sit on a prim with **MaterialBindingAPI** applied. " +
      "USD 25.08 still takes such a binding into account and only warns, so on the screen everything " +
      "looks right - that is why this bug goes unnoticed until validation. `usdchecker` does the " +
      "same as the script: the rule `MaterialBindingAPIAppliedChecker` rejects the file.",
  },
  {
    id: "b-xformop-order",
    mode: "bug",
    title: "The lamp will not go up",
    topic: "Data Modeling",
    layerIndex: 2,
    setup: "The lamp was rotated by 45°. Someone added a move of 100 up.",
    symptom: "The value `xformOp:translate = (0, 100, 0)` is in the file, and the lamp still stands on the ground.",
    files: [
      {
        name: "lamp.usda",
        code: `#usda 1.0

def Xform "Lamp"
{
    float xformOp:rotateY = 45
    double3 xformOp:translate = (0, 100, 0)
    uniform token[] xformOpOrder = ["xformOp:rotateY"]

    def Sphere "Shade"
    {
    }
}
`,
      },
    ],
    open: "lamp.usda",
    check: `stage = Usd.Stage.Open("lamp.usda")
m = UsdGeom.Xformable(stage.GetPrimAtPath("/Lamp")).ComputeLocalToWorldTransform(Usd.TimeCode.Default())
print("lamp position:", tuple(round(v, 3) + 0.0 for v in m.ExtractTranslation()))`,
    hints: [
      "All the values you need are in the file. What does USD use to know which of them to apply?",
      "Compare the names of the `xformOp:` attributes with the content of the `xformOpOrder` list.",
    ],
    fix: [
      {
        file: "lamp.usda",
        before: 'uniform token[] xformOpOrder = ["xformOp:rotateY"]',
        after: 'uniform token[] xformOpOrder = ["xformOp:translate", "xformOp:rotateY"]',
      },
    ],
    explain:
      "An operation that is not in `xformOpOrder` **does not work at all** - the attribute exists, " +
      "but the transform does not use it. Adding it at the start of the list (the outermost " +
      "operation) lifts the rotated lamp to 100.",
  },
  {
    id: "b-pack-payload",
    mode: "bug",
    title: "The client got a chair with no geometry",
    topic: "Data Exchange",
    layerIndex: 6,
    setup:
      "The script `pack.py` collects the files of a shot for delivery. To run fast, it opens the scene " +
      "without payloads. The chair comes in through a payload, the lamp through a reference.",
    symptom: "The client opens the shot, and `/Chair` is empty. The script reported no error.",
    files: [
      {
        name: "pack.py",
        code: `from pxr import Usd


def files_to_send(path):
    stage = Usd.Stage.Open(path, Usd.Stage.LoadNone)
    layers = stage.GetUsedLayers()
    return sorted(layer.GetDisplayName() for layer in layers if not layer.anonymous)
`,
      },
      {
        name: "chair_geo.usda",
        code: `#usda 1.0
(
    defaultPrim = "Chair"
)

def Xform "Chair"
{
    def Cube "Seat"
    {
    }
}
`,
      },
      {
        name: "lamp.usda",
        code: `#usda 1.0
(
    defaultPrim = "Lamp"
)

def Cylinder "Lamp"
{
}
`,
      },
      {
        name: "shot.usda",
        code: `#usda 1.0

def Xform "Chair" (
    prepend payload = @./chair_geo.usda@
)
{
}

def "Lamp" (
    prepend references = @./lamp.usda@
)
{
}
`,
      },
    ],
    open: "shot.usda",
    check: `import pack

print("in the package:", pack.files_to_send("shot.usda"))`,
    hints: [
      "Compare the list in the package with the files that `shot.usda` points to. Which one is missing, and through which arc does it come in?",
      "`GetUsedLayers()` says what **this particular, opened** scene used. What did a scene opened with `LoadNone` not use?",
    ],
    fix: [
      { file: "pack.py", before: "from pxr import Usd\n", after: "from pxr import UsdUtils\n" },
      {
        file: "pack.py",
        before: "    stage = Usd.Stage.Open(path, Usd.Stage.LoadNone)\n    layers = stage.GetUsedLayers()\n",
        after: "    layers, assets, missing = UsdUtils.ComputeAllDependencies(path)\n",
      },
    ],
    explain:
      "`GetUsedLayers()` returns the layers used by the opened stage. Opened with `LoadNone`, it did not " +
      "load the payload, so `chair_geo.usda` does not exist for it and does not go into the " +
      "package. `UsdUtils.ComputeAllDependencies` walks the files, not the loaded scene: " +
      "it catches payloads, references and sublayers no matter what is loaded, and in its " +
      "second list it returns the resources, for example textures. For packing, always use the latter.",
  },
  {
    id: "b-session-save",
    mode: "bug",
    title: "The hiding disappeared after saving",
    topic: "Pipeline Development",
    layerIndex: 3,
    setup:
      "The tool `cleanup.py` hides a helper grid in the shot and saves the scene. It works " +
      "on the opened stage, like a tool in an editor.",
    symptom: "In the session the grid disappears. After `shot.usda` is reopened, it is visible again.",
    files: [
      {
        name: "cleanup.py",
        code: `from pxr import UsdGeom


def hide_and_save(stage, path):
    stage.SetEditTarget(stage.GetSessionLayer())
    UsdGeom.Imageable(stage.GetPrimAtPath(path)).MakeInvisible()
    stage.Save()
`,
      },
      {
        name: "shot.usda",
        code: `#usda 1.0

def Cube "Grid"
{
}
`,
      },
    ],
    open: "shot.usda",
    check: `import cleanup

stage = Usd.Stage.Open("shot.usda")
cleanup.hide_and_save(stage, "/Grid")
print("in the session :", UsdGeom.Imageable(stage.GetPrimAtPath("/Grid")).ComputeVisibility())
fresh = Usd.Stage.Open("shot.usda")
print("after reopening:", UsdGeom.Imageable(fresh.GetPrimAtPath("/Grid")).ComputeVisibility())`,
    hints: [
      "Which layer does `MakeInvisible()` go to? Look at the first line of the function.",
      "The session layer is the strongest on the stage, but `Save()` does not write it to disk.",
    ],
    fix: [{ file: "cleanup.py", before: "    stage.SetEditTarget(stage.GetSessionLayer())\n", after: "" }],
    explain:
      "The session layer is a temporary layer: the strongest on the stage, good for previews and " +
      "settings for the work session, **but `Save()` does not write it**. Everything that must survive " +
      "must go into a layer from a file - here the root layer, which the edit target points to " +
      "by default. After you remove the switch, the hiding lands in `shot.usda` and stays.",
  },
  {
    id: "b-variant-context",
    mode: "bug",
    title: "Every color variant looks the same",
    topic: "Pipeline Development",
    layerIndex: 5,
    setup: "The script `variants.py` builds a variant set `color` with the variants `red` and `blue` on a chair.",
    symptom: "Whichever variant is selected, the chair has the same color.",
    files: [
      {
        name: "variants.py",
        code: `from pxr import UsdGeom


def build_variants(stage):
    chair = stage.GetPrimAtPath("/Chair")
    vset = chair.GetVariantSets().AddVariantSet("color")
    colors = {"red": (0.8, 0.1, 0.1), "blue": (0.1, 0.3, 0.9)}
    for name, rgb in colors.items():
        vset.AddVariant(name)
        vset.SetVariantSelection(name)
        UsdGeom.Gprim(chair).CreateDisplayColorAttr([rgb])
`,
      },
      {
        name: "chair.usda",
        code: `#usda 1.0

def Cube "Chair"
{
}
`,
      },
    ],
    open: "chair.usda",
    check: `import variants

stage = Usd.Stage.Open("chair.usda")
variants.build_variants(stage)
chair = stage.GetPrimAtPath("/Chair")
vset = chair.GetVariantSets().GetVariantSet("color")
for name in ("red", "blue"):
    vset.SetVariantSelection(name)
    color = UsdGeom.Gprim(chair).GetDisplayColorAttr().Get()[0]
    print(name, "->", tuple(round(v, 2) for v in color))`,
    hints: [
      "Where does an opinion written right after `SetVariantSelection` land? Selecting a variant is not the same as writing into it.",
      "`VariantSet` has a method that, for the time of a `with` block, moves the edit target inside the selected variant.",
    ],
    fix: [
      {
        file: "variants.py",
        before: "        UsdGeom.Gprim(chair).CreateDisplayColorAttr([rgb])\n",
        after: "        with vset.GetVariantEditContext():\n            UsdGeom.Gprim(chair).CreateDisplayColorAttr([rgb])\n",
      },
    ],
    explain:
      "`SetVariantSelection` only selects a variant; it does not redirect the write. So both colors " +
      "land directly on the prim (**Local**), the last one overwrites the first, and the local opinion " +
      "beats every variant. `with vset.GetVariantEditContext():` moves the edit target inside " +
      "the selected variant - only then does each variant have its own color.",
  },
  {
    id: "b-plugin-alias",
    mode: "bug",
    title: "USD rejects a custom schema",
    topic: "Customizing USD",
    layerIndex: 7,
    setup:
      "The same codeless schema as in the situation “A custom schema with no compiling”, but someone wrote " +
      "`plugInfo.json` from scratch.",
    symptom: "Already the plugin registration ends with an error that a type with this name exists.",
    files: [
      {
        name: "studioSchema/plugInfo.json",
        code: `{
    "Plugins": [
        {
            "Info": {
                "Types": {
                    "StudioAssetInfoAPI": {
                        "alias": {
                            "UsdSchemaBase": "StudioAssetInfoAPI"
                        },
                        "bases": ["UsdAPISchemaBase"],
                        "schemaKind": "singleApplyAPI"
                    }
                }
            },
            "LibraryPath": "",
            "Name": "studioSchema",
            "ResourcePath": ".",
            "Root": ".",
            "Type": "resource"
        }
    ]
}
`,
      },
      {
        name: "studioSchema/generatedSchema.usda",
        code: `#usda 1.0
(
    "WARNING: THIS FILE IS GENERATED BY usdGenSchema.  DO NOT EDIT."
)

class "StudioAssetInfoAPI"
{
    string studio:owner = "unknown"
}
`,
      },
      {
        name: "chair.usda",
        code: `#usda 1.0

def Xform "Chair" (
    prepend apiSchemas = ["StudioAssetInfoAPI"]
)
{
}
`,
      },
    ],
    open: "chair.usda",
    check: `from pxr import Plug

try:
    Plug.Registry().RegisterPlugins(str(Path("studioSchema").resolve()))
    stage = Usd.Stage.Open("chair.usda")
    print("studio:owner:", stage.GetPrimAtPath("/Chair").GetAttribute("studio:owner").Get())
except Exception as error:
    text = " ".join(str(error).split())
    print("USD error:", text[text.find("There already"):].rstrip("'"))`,
    hints: [
      "Compare the key in `Types` with the value in `alias`.",
      "The key in `Types` is the type name (like a class in C++), the alias is the name you use in USD files. Can they be the same?",
    ],
    fix: [
      { file: "studioSchema/plugInfo.json", before: '"StudioAssetInfoAPI": {', after: '"StudioSchemaAssetInfoAPI": {' },
    ],
    explain:
      "In `plugInfo.json` the key in `Types` is the **type name** (a TfType, the equivalent of a C++ class), and " +
      "the `alias` under `UsdSchemaBase` is the **schema name** used in `apiSchemas` and `HasAPI`. " +
      "When they are identical, the alias clashes with the name of the type itself and USD rejects the registration. " +
      "The `usdGenSchema` convention: the library prefix in the type name " +
      "(`StudioSchemaAssetInfoAPI`), the plain schema name in the alias.",
  },
];

export const SANDBOX: SandboxItem[] = [...PREDICT, ...BUGS];
