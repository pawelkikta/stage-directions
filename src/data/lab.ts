/* ===========================================================================
 * Run steps - hands-on exercises on real USD (pxr).
 *
 * Every `expect` is REAL output captured from running the script on
 * usd-core 26.8 / Python 3.14 (Windows). Nothing here is made up - if you
 * see something different on your machine, it means something differs, not
 * that the tutorial guesses.
 *
 * After every change: `npm run verify:lab` (scripts/verify-lab.ts) runs all
 * tracks and "change one thing" tasks on USD from the binaries and compares
 * the output with `expect`, together with the console commands ("$ ...").
 *
 * The exercises deliberately cover gaps that widgets cannot teach:
 * the subLayers order, the session layer and edit target, LoadNone/Load,
 * the Traverse predicate, population masks, purpose, and Save vs Export.
 * ======================================================================== */

export interface LabStep {
  id: string;
  title: string;
  /** Why you do this - one sentence. */
  goal: string;
  /** What it relates to on the exam / in the app. */
  tag: string;
  /** Code to paste (Python). */
  script: string;
  /** The exact output you should see. */
  expect: string;
  /** What this shows - an explanation with inline markdown. */
  why: string;
  /** Chapter for the "→ chapter N" link. */
  layerIndex?: number;
  /** Overrides the default label of the script block. */
  scriptLabel?: string;
  /** An extra block (for example shell commands after the Python script). */
  extraScript?: { label: string; code: string };
  /** An image of the expected result (a file from public/). */
  image?: { src: string; alt: string; caption?: string };
  /** The script is a console command, not Python. */
  shell?: boolean;
  /** A "change X" task - one change in the script and its effect. */
  tweak?: LabTweak;
}

export interface LabTweak {
  /** What to change - with inline markdown. */
  task: string;
  /** The same change for the verifier: each `find` occurs in the script once. */
  edits: { find: string; replace: string }[];
  /** The exact output after the change. */
  expect: string;
  why: string;
  image?: { src: string; alt: string; caption?: string };
  /** The change overwrites files that later exercises use. */
  rerun?: boolean;
}

export interface SetupRoute {
  id: string;
  title: string;
  /** When to pick this way. */
  when: string;
  cmd: string;
  cmdLabel: string;
  verify: string;
  verifyExpect: string;
  note: string;
}

export const LAB_SETUP = {
  intro:
    "You run everything below on **plain Python** - no Omniverse and no " +
    "graphics card. Every exercise stands on its own: the script creates the " +
    "`.usda` files it needs, so you do not have to prepare anything by hand.\n" +
    "There are **two ways** to the environment, and it is worth choosing on purpose - one gives " +
    "clearly more than the other.",

  routes: [
    {
      id: "binaries",
      title: "A. You have the OpenUSD binaries from NVIDIA (recommended)",
      when:
        "If you already downloaded the prebuilt OpenUSD binaries - the same ones that contain " +
        "usdview - **do not install anything else**. They have the full set: " +
        "their own Python, the `pxr` module and **the whole USD Toolset** (`usdcat`, " +
        "`usdchecker`, `usdtree`, `usdzip`, `usdedit`, `usddiff`, and even " +
        "`usdGenSchema`). This is strictly more than `pip install usd-core` gives.",
      cmdLabel: "Terminal (cmd) - run once per session",
      cmd:
        "REM replace with the folder you unpacked the binaries to\n" +
        "set USD_DIR=%USERPROFILE%\\Documents\\usdview\n\n" +
        "cd /d %USERPROFILE%\\usdlab\n" +
        "call %USD_DIR%\\scripts\\set_usd_env.bat",
      verify: 'python -c "from pxr import Usd; print(Usd.GetVersion())"',
      verifyExpect: "(0, 25, 8)",
      note:
        "`set_usd_env.bat` sets `PATH` and `PYTHONPATH` so that `python` in this " +
        "console is **the Python built into the package** (3.12), and the CLI tools are " +
        "available by name. The setting lives only in this console window - after you " +
        "close it, you call `set_usd_env.bat` again.\n" +
        "Note: this works in **cmd**, not in PowerShell (`call` on a `.bat` file). " +
        "Paste these lines **one at a time**, not joined with `&&` - in cmd the form " +
        "`set USD_DIR=... && ...` writes **a trailing space** into the variable and the path " +
        "stops resolving.\n" +
        "**A bonus worth knowing about:** the package has ready-made scenes to " +
        "look at, in `share/usd/tutorials/`. The most interesting is `endToEnd/assets/` - " +
        "Pixar's official mini pipeline, with a structure very similar to our " +
        "Studio track: `Ball/Ball.usd` (an asset with `defaultPrim`, `kind = component` and " +
        "two layers brought in by a reference), `Table/Table.usd` and " +
        "`shot.usd` with `/World/sets`, `/World/anim` and `/World/main_cam`. " +
        "`Ball.usd` composes to 7 prims with a real material network " +
        "(Material + 3 Shaders) - great material to practice the " +
        "Layer Stack panel before you build your own scene.",
    },
    {
      id: "pip",
      title: "B. You do not have the binaries - Python only",
      when:
        "Faster, if you only want to do the exercises and do not care about the GUI " +
        "or the CLI tools.",
      cmdLabel: "Terminal",
      cmd:
        "python -m venv usdlab\n" +
        "usdlab\\Scripts\\activate          # Windows\n" +
        "# source usdlab/bin/activate     # macOS / Linux\n" +
        "pip install usd-core",
      verify: 'python -c "from pxr import Usd; print(Usd.GetVersion())"',
      verifyExpect: "(0, 26, 8)",
      note:
        "**`pip install usd-core` does NOT include usdview** or any CLI tool " +
        "- it is only the core libraries, with no imaging. For the exercises in tracks 1-4 it is " +
        "completely enough; you will miss only the exercise about the toolchain (10), the " +
        "`usdrecord` render in exercise 13, the console commands in track 4 and the GUI preview.",
    },
  ] as SetupRoute[],

  versionNote:
    "The outputs in the green boxes are the same on **USD 26.08** (`usd-core`) and on " +
    "**USD 25.08** (the NVIDIA binaries), including the custom schema from track 3 - only " +
    "the number from `Usd.GetVersion()` differs. Track 4 and the “change one thing” tasks have output " +
    "from USD 25.08. If you see different output than in " +
    "the green box, that is real information about your USD version, not your mistake.",
};

/** An honest answer to two questions everyone doing these exercises asks. */
export const LAB_REALITY = {
  title: "Is this how people work? And can I not just edit the file?",

  editable:
    "Let us start with the second question, because the answer is **yes - and it is " +
    "a normal way to work**. `.usda` is plain text: you open it in an editor, " +
    "change `references`, add an `over`, reorder `subLayers` and " +
    "save. Nothing more is needed.\n" +
    "There is even a tool for exactly this: **`usdedit file.usd`** converts " +
    "the layer to `.usda`, opens it in your editor, and after you close it saves it " +
    "back in **the original format** - so you can hand-edit even " +
    "a binary `.usdc` crate. It takes the editor from `USD_EDITOR` or `EDITOR`, and on " +
    "Windows it falls back to Notepad. The `-n` flag only lets you " +
    "look, without saving.",

  boundary:
    "There is a boundary, though, and it explains why these exercises look the way they do. " +
    "**Some things do not exist in a file** - they are runtime behaviors, not " +
    "layer content.\n" +
    "**You can write in a file:** prims, attributes, all arcs (`references`, " +
    "`payload`, `inherits`, `specializes`, `variantSet`, `relocates`), " +
    "`subLayers`, metadata (`defaultPrim`, `kind`, `metersPerUnit`, `active`). " +
    "That is practically all the content of lessons L1-L5. You can **easily do " +
    "these exercises in an editor** - the script only saves you creating four files " +
    "before each run.\n" +
    "**You cannot write in a file:** the session layer, the edit target, opening with " +
    "`LoadNone` and `stage.Load()`, population masks, the `Traverse` predicate, " +
    "global variant fallbacks or `GetPropertyStack`. These are decisions of " +
    "**whoever opens the scene**, not of whoever wrote it. That is why exercises " +
    "4-7 cannot be done in Notepad - there is nothing to type in it.",

  jobs:
    "And the first question - do people write scripts like these at work? **Mostly " +
    "not.** Artists do not author USD in Python: layout places assets in " +
    "the viewport, the animator animates, lighting sets the lights, and a **tool** writes " +
    "the USD for them - Houdini (Solaris/LOPs), Maya, Katana, Blender, Omniverse.\n" +
    "But someone connects these tools, and that is a separate, real job. A pipeline TD " +
    "or USD developer writes exactly these things: publish scripts, " +
    "validation gates, converters, batch operations on a hundred shots, custom " +
    "resolvers and schemas. **Track 2 is exactly this work**, in " +
    "miniature.\n" +
    "There is also a third case: the same `pxr` code run **inside** " +
    "an application - a Python LOP in Houdini, the Script Editor in Omniverse, the Interpreter " +
    "in usdview. The API is identical; only where you get the stage from differs.",

  tip:
    "In practice, so that you do not create a file for every experiment: run " +
    "the exercise with **`python -i file.py`**. The script runs, and you " +
    "stay in the console with a live `stage` that you can keep querying. " +
    "After the script ends, `stage`, `prim` and the other variables are " +
    "still available.\n" +
    "For simply exploring a scene, the **Interpreter in " +
    "usdview** (the `i` key) is even more convenient: you have `usdviewApi.stage` ready and you see " +
    "the effect in the viewport right away.",
};

export const LAB_STEPS: LabStep[] = [
  /* ------------------------------------------------------------------ 1 --- */
  {
    id: "sdf-vs-usd",
    title: "Sdf vs Usd - see both layers at once",
    goal:
      "Check on the real API that a raw layer and a composed stage are two " +
      "different things - the foundation that everything else stands on.",
    tag: "L0 · foundation",
    layerIndex: 0,
    script:
      "from pxr import Usd, Sdf\n\n" +
      'chair = Sdf.Layer.CreateNew("chair.usda")\n' +
      "chair.ImportFromString('''#usda 1.0\n" +
      "(\n" +
      '    defaultPrim = "Chair"\n' +
      ")\n" +
      'def Xform "Chair"\n' +
      "{\n" +
      "    double height = 1\n" +
      "}\n" +
      "''')\n" +
      "chair.Save()\n\n" +
      'shot = Sdf.Layer.CreateNew("shot.usda")\n' +
      "shot.ImportFromString('''#usda 1.0\n" +
      'def "ChairA" (\n' +
      "    prepend references = @chair.usda@\n" +
      ")\n" +
      "{\n" +
      "    double height = 4\n" +
      "}\n" +
      "''')\n" +
      "shot.Save()\n\n" +
      '# --- the Sdf view: one file, exactly what was written ---\n' +
      'layer = Sdf.Layer.FindOrOpen("shot.usda")\n' +
      'spec = layer.GetPrimAtPath("/ChairA")\n' +
      'print("Sdf: attributes in the file :", list(spec.attributes.keys()))\n' +
      'print("Sdf: the arc as raw data    :", spec.referenceList)\n\n' +
      '# --- the Usd view: after composition ---\n' +
      'stage = Usd.Stage.Open("shot.usda")\n' +
      'attr = stage.GetPrimAtPath("/ChairA").GetAttribute("height")\n' +
      'print("Usd: value after composition:", attr.Get())',
    expect:
      "Sdf: attributes in the file : ['height']\n" +
      "Sdf: the arc as raw data    : { 'added': []'prepended': " +
      "[SdfReference(chair.usda, , SdfLayerOffset(0, 1), {})]'appended': [], " +
      "'deleted': [], 'ordered': [] }\n" +
      "Usd: value after composition: 4.0",
    why:
      "`Sdf.Layer` knows **only the content of one file**: it sees `height` and it sees the *record* " +
      "of the arc - but it knows nothing about what is in `chair.usda`. Only `Usd.Stage` " +
      "runs composition and gives 4.0.\n" +
      "Note the printout of `referenceList`: pxr shows **all list-editing " +
      "operations at once** (`prepended`, `appended`, `deleted`, `ordered`). " +
      "This is the same thing lesson L3 talks about - here you see it in raw " +
      "form, not as a single value. The reference sits in `prepended`, " +
      "because we wrote `prepend references`.",
    tweak: {
      task:
        "Remove the line `double height = 4` from `shot.usda` - only the reference is left.",
      edits: [
        {
          find: "    double height = 4\n",
          replace: "",
        },
      ],
      expect: "Sdf: attributes in the file : []\nSdf: the arc as raw data    : { 'added': []'prepended': [SdfReference(chair.usda, , SdfLayerOffset(0, 1), {})]'appended': [], 'deleted': [], 'ordered': [] }\nUsd: value after composition: 1.0",
      why:
        "Sdf now sees an empty list of attributes, because the file `shot.usda` has no " +
        "value. And Usd still returns a number: 1.0 came through the reference from `chair.usda`. " +
        "A value on the stage does not have to be written in the file you open.",
      rerun: true,
    },
  },

  /* ------------------------------------------------------------------ 2 --- */
  {
    id: "sublayer-order",
    title: "The subLayers order = strength (reverse the list and the value changes)",
    goal:
      "Prove to yourself that 'higher in the stack' means exactly 'earlier in the " +
      "subLayers list' - and that reversing the order reverses the result.",
    tag: "Composition 23% · a quiz question",
    layerIndex: 3,
    script:
      "from pxr import Usd, Sdf\n\n" +
      'base = Sdf.Layer.CreateNew("base.usda")\n' +
      "base.ImportFromString('''#usda 1.0\n" +
      'def Sphere "Ball"\n' +
      "{\n" +
      "    double radius = 1\n" +
      "}\n" +
      "''')\n" +
      "base.Save()\n\n" +
      'fix = Sdf.Layer.CreateNew("fix.usda")\n' +
      "fix.ImportFromString('''#usda 1.0\n" +
      'over "Ball"\n' +
      "{\n" +
      "    double radius = 9\n" +
      "}\n" +
      "''')\n" +
      "fix.Save()\n\n" +
      'root = Sdf.Layer.CreateNew("shot2.usda")\n' +
      'root.subLayerPaths = ["fix.usda", "base.usda"]\n' +
      "root.Save()\n\n" +
      'stage = Usd.Stage.Open("shot2.usda")\n' +
      'attr = stage.GetPrimAtPath("/Ball").GetAttribute("radius")\n' +
      'print("subLayerPaths =", list(root.subLayerPaths))\n' +
      'print("radius        =", attr.Get())\n\n' +
      "# --- now reverse the order and open again ---\n" +
      'root.subLayerPaths = ["base.usda", "fix.usda"]\n' +
      'stage2 = Usd.Stage.Open("shot2.usda")\n' +
      'attr2 = stage2.GetPrimAtPath("/Ball").GetAttribute("radius")\n' +
      'print("subLayerPaths =", list(root.subLayerPaths))\n' +
      'print("radius        =", attr2.Get())',
    expect:
      "subLayerPaths = ['fix.usda', 'base.usda']\n" +
      "radius        = 9.0\n" +
      "subLayerPaths = ['base.usda', 'fix.usda']\n" +
      "radius        = 1.0",
    why:
      "You did not change **a single value** - only the order of two strings in the " +
      "list. And the result jumped from 9 to 1.\n" +
      "The rule: **earlier in the `subLayers` list = stronger**. That is why " +
      "`layer.subLayerPaths.insert(0, \"fix.usda\")` puts the layer in the " +
      "*strongest* position, not the weakest - this is exactly a question that likes " +
      "to come back on the exam. The intuition 'higher = stronger' is right only " +
      "when you remember that 'higher' is drawn from the **start** of the list.",
    tweak: {
      task:
        "In `fix.usda`, instead of `double radius = 9` write `double radius = None` - the value " +
        "block from lesson L1.",
      edits: [
        {
          find: "    double radius = 9\n",
          replace: "    double radius = None\n",
        },
      ],
      expect: "subLayerPaths = ['fix.usda', 'base.usda']\nradius        = None\nsubLayerPaths = ['base.usda', 'fix.usda']\nradius        = 1.0",
      why:
        "When `fix.usda` is stronger, the block switches off the weaker opinions and `Get()` returns " +
        "`None`, although `base.usda` still has 1. After the order is reversed, the block lies in " +
        "the weaker layer, and the stronger `base.usda` gives 1.0. A block is also an opinion and " +
        "follows the same order as a plain value.",
    },
  },

  /* ------------------------------------------------------------------ 3 --- */
  {
    id: "property-stack",
    title: "Where this value came from - the LIVERPS tracer in real life",
    goal:
      "Instead of guessing which opinion USD chose, print the whole list of opinions " +
      "sorted from the strongest.",
    tag: "Debugging 11% · this is the tracer from the app",
    layerIndex: 7,
    script:
      "from pxr import Usd\n\n" +
      "# uses the files from exercise 1\n" +
      'stage = Usd.Stage.Open("shot.usda")\n' +
      'attr = stage.GetPrimAtPath("/ChairA").GetAttribute("height")\n\n' +
      'print("final value:", attr.Get())\n' +
      'print("all opinions, from the STRONGEST:")\n' +
      "for i, spec in enumerate(attr.GetPropertyStack(Usd.TimeCode.Default())):\n" +
      '    name = spec.layer.identifier.split("/")[-1]\n' +
      '    print(f"  {i+1}. {name:12} -> {spec.default}")',
    expect:
      "final value: 4.0\n" +
      "all opinions, from the STRONGEST:\n" +
      "  1. shot.usda    -> 4.0\n" +
      "  2. chair.usda   -> 1.0",
    why:
      "`GetPropertyStack` is the most important tool for debugging composition in " +
      "the whole of pxr, and **literally** the same as the LIVERPS tracer in this app - only on " +
      "a real scene. The list is sorted from the strongest opinion, so " +
      "the answer to the question *'where does this value come from?'* is always position number 1.\n" +
      "Here you also see that the weaker opinion (1.0 from `chair.usda`) **does not disappear** - it " +
      "is still in the composition, it just lost. Remove `height = 4` from " +
      "`shot.usda` and 1.0 wins immediately. The equivalent for a whole prim is " +
      "`prim.GetPrimStack()`.",
    tweak: {
      task:
        "Remove the `height` opinion from `shot.usda` - only in memory, without saving. Insert two lines " +
        "right after `attr = ...`.",
      edits: [
        {
          find: "attr = stage.GetPrimAtPath(\"/ChairA\").GetAttribute(\"height\")\n\n",
          replace: "attr = stage.GetPrimAtPath(\"/ChairA\").GetAttribute(\"height\")\nspec = stage.GetRootLayer().GetPrimAtPath(\"/ChairA\")\nspec.RemoveProperty(spec.properties[\"height\"])\n\n",
        },
      ],
      expect: "final value: 1.0\nall opinions, from the STRONGEST:\n  1. chair.usda   -> 1.0",
      why:
        "The opinion from `chair.usda` was waiting in the list all the time. After the stronger one was removed " +
        "it jumped to first place, with no recomputing on your side. The change is " +
        "only in memory: until you call `Save()`, the file `shot.usda` on disk stays " +
        "as it was.",
    },
  },

  /* ------------------------------------------------------------------ 4 --- */
  {
    id: "session-layer",
    title: "Session layer - an opinion stronger than the root, which is not in the file",
    goal:
      "See a layer that beats the root layer and still is not saved " +
      "to disk. This idea is in no lesson, but it is in the quiz.",
    tag: "Composition · edit target",
    layerIndex: 3,
    script:
      "from pxr import Usd, Sdf\n\n" +
      'stage = Usd.Stage.CreateNew("props.usda")\n' +
      'ball = stage.DefinePrim("/Ball", "Sphere")\n' +
      'ball.CreateAttribute("radius", Sdf.ValueTypeNames.Double).Set(1.0)\n' +
      "stage.GetRootLayer().Save()\n\n" +
      'attr = stage.GetPrimAtPath("/Ball").GetAttribute("radius")\n' +
      'print("1. from the root layer   :", attr.Get())\n\n' +
      "# --- switch the EDIT TARGET to the session layer ---\n" +
      "stage.SetEditTarget(stage.GetSessionLayer())\n" +
      "attr.Set(99.0)\n" +
      'print("2. after edit in session :", attr.Get())\n\n' +
      'print("3. where it comes from   :")\n' +
      "for spec in attr.GetPropertyStack(Usd.TimeCode.Default()):\n" +
      '    print("   -", spec.layer.identifier)\n\n' +
      "# --- save the root layer and look at what really landed in the file ---\n" +
      "stage.GetRootLayer().Save()\n" +
      'print("4. content of props.usda:")\n' +
      'print(Sdf.Layer.FindOrOpen("props.usda").ExportToString())\n\n' +
      'fresh = Usd.Stage.Open("props.usda")\n' +
      'print("5. after reopening       :",\n' +
      '      fresh.GetPrimAtPath("/Ball").GetAttribute("radius").Get())',
    expect:
      "1. from the root layer   : 1.0\n" +
      "2. after edit in session : 99.0\n" +
      "3. where it comes from   :\n" +
      "   - anon:000001F7A1B2C3D4:props-session.usda\n" +
      "   - .../props.usda\n" +
      "4. content of props.usda:\n" +
      "#usda 1.0\n\n" +
      'def Sphere "Ball"\n' +
      "{\n" +
      "    double radius = 1\n" +
      "}\n\n\n" +
      "5. after reopening       : 1.0",
    why:
      "Three things happen at once, and each one is a separate exam question.\n" +
      "The **edit target** decides *which layer* the opinion you author goes " +
      "to. By default it is the root layer; `SetEditTarget` redirects the write " +
      "elsewhere. `attr.Set()` does not change 'the attribute' - it writes an opinion into " +
      "the current edit target.\n" +
      "**The session layer beats the root layer** - you see it in step 3: it stands in " +
      "the list *before* `props.usda`. Note its identifier: it starts with " +
      "`anon:` - it is an **anonymous** layer that never had a file.\n" +
      "**And that is why `Save()` does not write it.** Step 4 shows that the file still " +
      "has `radius = 1`, and step 5 that after reopening the 99.0 is gone. " +
      "The session layer is for runtime overrides (for example what you do in " +
      "usdview or in a DCC viewport): strong for the session, not persistent.",
    tweak: {
      task:
        "Remove the line `stage.SetEditTarget(stage.GetSessionLayer())` - let `attr.Set(99.0)` " +
        "go to the default edit target.",
      edits: [
        {
          find: "stage.SetEditTarget(stage.GetSessionLayer())\n",
          replace: "",
        },
      ],
      expect: "1. from the root layer   : 1.0\n2. after edit in session : 99.0\n3. where it comes from   :\n   - .../props.usda\n4. content of props.usda:\n#usda 1.0\n\ndef Sphere \"Ball\"\n{\n    double radius = 99\n}\n\n\n5. after reopening       : 99.0",
      why:
        "The default edit target is the root layer, so 99 went to `props.usda`: the list of opinions has " +
        "one entry, the file after `Save()` contains 99, and after reopening the value stays. " +
        "The label *after edit in session* no longer tells the truth - the same line " +
        "`attr.Set(99.0)` went where the edit target pointed, not where the author " +
        "of the script thought.",
    },
  },

  /* ------------------------------------------------------------------ 5 --- */
  {
    id: "load-none",
    title: "A deferred payload - LoadNone and selective Load()",
    goal:
      "Check that an unloaded payload brings **nothing** of its content into " +
      "composition - no values, no prims - although the prim with the payload stands " +
      "on the stage.",
    tag: "Composition · Pipeline 14%",
    layerIndex: 3,
    script:
      "from pxr import Usd, Sdf\n\n" +
      'heavy = Sdf.Layer.CreateNew("heavy.usda")\n' +
      "heavy.ImportFromString('''#usda 1.0\n" +
      "(\n" +
      '    defaultPrim = "Geo"\n' +
      ")\n" +
      'def Xform "Geo"\n' +
      "{\n" +
      "    double weight = 500\n" +
      '    def Sphere "Detail_A" {}\n' +
      '    def Sphere "Detail_B" {}\n' +
      "}\n" +
      "''')\n" +
      "heavy.Save()\n\n" +
      'city = Sdf.Layer.CreateNew("city.usda")\n' +
      "city.ImportFromString('''#usda 1.0\n" +
      'def Xform "City"\n' +
      "{\n" +
      '    def Xform "D7" ( prepend payload = @heavy.usda@ ) {}\n' +
      '    def Xform "D8" ( prepend payload = @heavy.usda@ ) {}\n' +
      "}\n" +
      "''')\n" +
      "city.Save()\n\n" +
      'print("=== A. opened with LoadNone ===")\n' +
      's = Usd.Stage.Open("city.usda", Usd.Stage.LoadNone)\n' +
      'print("Traverse   :", [p.GetPath().pathString for p in s.Traverse()])\n' +
      'print("TraverseAll:", [p.GetPath().pathString for p in s.TraverseAll()])\n' +
      'd7 = s.GetPrimAtPath("/City/D7")\n' +
      'print("D7 IsValid:", d7.IsValid(), "| IsLoaded:", d7.IsLoaded())\n' +
      'print("does /City/D7.weight exist:", d7.GetAttribute("weight").IsValid())\n\n' +
      'print("=== B. after stage.Load(\'/City/D7\') ===")\n' +
      's.Load("/City/D7")\n' +
      'print("prims:", [p.GetPath().pathString for p in s.Traverse()])\n' +
      'print("weight:", s.GetPrimAtPath("/City/D7").GetAttribute("weight").Get())',
    expect:
      "=== A. opened with LoadNone ===\n" +
      "Traverse   : ['/City']\n" +
      "TraverseAll: ['/City', '/City/D7', '/City/D8']\n" +
      "D7 IsValid: True | IsLoaded: False\n" +
      "does /City/D7.weight exist: False\n" +
      "=== B. after stage.Load('/City/D7') ===\n" +
      "prims: ['/City', '/City/D7', '/City/D7/Detail_A', '/City/D7/Detail_B']\n" +
      "weight: 500.0",
    why:
      "In step A, `Traverse` returns **only `/City`** - but that does not mean " +
      "`/City/D7` disappeared. The prim is on the stage: `IsValid()` gives `True`, and " +
      "`TraverseAll` lists it, because the prim itself is plainly written in " +
      "`city.usda` as a `def Xform`. What is missing is **the payload content**: there is no " +
      "`Detail_A`, no `Detail_B` and no `weight` attribute, because an unloaded payload " +
      "**does not take part in composition**. `D7` drops out of the loop only because " +
      "the default `Traverse` predicate lets through only loaded prims " +
      "(`IsLoaded()` = `False` - see the next exercise).\n" +
      "`Usd.Stage.LoadNone` is how you open a city scene in a fraction of a " +
      "second, and then `stage.Load(path)` brings in **only** the part " +
      "you work on. Note that `/City/D8` still did not appear - " +
      "loading is selective. This is the real answer to the question " +
      "'how do I open a scene that does not fit in memory'.",
    tweak: {
      task:
        "In part B, change `s.Load(\"/City/D7\")` to `s.Load(\"/City\")` and fix the label in the " +
        "`print`.",
      edits: [
        {
          find: "s.Load(\"/City/D7\")\n",
          replace: "s.Load(\"/City\")\n",
        },
        {
          find: "=== B. after stage.Load('/City/D7') ===",
          replace: "=== B. after stage.Load('/City') ===",
        },
      ],
      expect: "=== A. opened with LoadNone ===\nTraverse   : ['/City']\nTraverseAll: ['/City', '/City/D7', '/City/D8']\nD7 IsValid: True | IsLoaded: False\ndoes /City/D7.weight exist: False\n=== B. after stage.Load('/City') ===\nprims: ['/City', '/City/D7', '/City/D7/Detail_A', '/City/D7/Detail_B', '/City/D8', '/City/D8/Detail_A', '/City/D8/Detail_B']\nweight: 500.0",
      why:
        "By default `Load` loads a prim **together with its descendants** (`Usd.LoadWithDescendants`). " +
        "`/City` itself has no payload, but its children do - so both came in, `D7` and `D8`. " +
        "If you want to load only one prim, without what is under it: `s.Load(path, " +
        "Usd.LoadWithoutDescendants)`.",
    },
  },

  /* ------------------------------------------------------------------ 6 --- */
  {
    id: "traverse",
    title: "Traverse and its default predicate - why prims 'disappear' from a loop",
    goal:
      "See that `Traverse()` does not walk everything, and learn exactly " +
      "what it skips.",
    tag: "Debugging 11% · a code question",
    layerIndex: 7,
    script:
      "from pxr import Usd\n\n" +
      "# uses the files from exercise 5\n" +
      's = Usd.Stage.Open("city.usda")      # this time WITHOUT LoadNone\n' +
      'print("everything loaded:", len(list(s.Traverse())))\n\n' +
      's.GetPrimAtPath("/City/D8").SetActive(False)\n' +
      'print("after SetActive(False) on D8:")\n' +
      'print("  Traverse   :", len(list(s.Traverse())))\n' +
      'print("  TraverseAll:", len(list(s.TraverseAll())))\n' +
      'print("  seen       :", [p.GetName() for p in s.Traverse()])',
    expect:
      "everything loaded: 7\n" +
      "after SetActive(False) on D8:\n" +
      "  Traverse   : 4\n" +
      "  TraverseAll: 5\n" +
      "  seen       : ['City', 'D7', 'Detail_A', 'Detail_B']",
    why:
      "The default `Traverse()` predicate lets through prims that are at the same time: " +
      "**active**, **defined** (that is `def`, not only `over`), **loaded** and " +
      "**not abstract** (that is not `class`). If a prim fails even one " +
      "condition, it drops out - together with its whole subtree.\n" +
      "Hence the classic symptom: the loop `for p in stage.Traverse()` 'loses' prims " +
      "that you clearly see in the file. `TraverseAll()` shows the difference - " +
      "it finds `/City/D8`, because it applies no predicate.\n" +
      "Note the numbers: `TraverseAll` gives 5, not 7. The children of a deactivated " +
      "prim **do not exist at all** - deactivation prunes the subtree from " +
      "composition, so there is nothing to show even with no predicate. This is the difference " +
      "between `active` and `visibility`, which you close in exercise 8.",
    tweak: {
      task:
        "Instead of deactivating `D8`, unload its payload: replace the line with `SetActive(False)` " +
        "with `s.Unload(\"/City/D8\")` and fix the label in the `print`.",
      edits: [
        {
          find: "s.GetPrimAtPath(\"/City/D8\").SetActive(False)\n",
          replace: "s.Unload(\"/City/D8\")\n",
        },
        {
          find: "print(\"after SetActive(False) on D8:\")",
          replace: "print(\"after Unload on D8:\")",
        },
      ],
      expect: "everything loaded: 7\nafter Unload on D8:\n  Traverse   : 4\n  TraverseAll: 5\n  seen       : ['City', 'D7', 'Detail_A', 'Detail_B']",
      why:
        "The numbers are identical to the deactivation, but the reason is different. `D8` is active - " +
        "it only has no payload content, so `IsLoaded()` gives `False` and the predicate " +
        "skips it, and `Detail_A` and `Detail_B` were never created. The difference shows when " +
        "you save: `SetActive(False)` is an opinion written in a layer, while `Unload` is a decision " +
        "of whoever opened the scene - it leaves no trace in the file.",
    },
  },

  /* ------------------------------------------------------------------ 7 --- */
  {
    id: "population-mask",
    title: "Population mask - compose only a part of the scene",
    goal:
      "Open the scene so that the rest of the world does not enter composition at all.",
    tag: "Pipeline 14% · performance",
    layerIndex: 4,
    script:
      "from pxr import Usd\n\n" +
      "# uses the files from exercise 5\n" +
      'full = Usd.Stage.Open("city.usda")\n' +
      'print("no mask  :", [p.GetPath().pathString for p in full.Traverse()])\n\n' +
      'mask = Usd.StagePopulationMask(["/City/D7"])\n' +
      'm = Usd.Stage.OpenMasked("city.usda", mask)\n' +
      'print("with mask:", [p.GetPath().pathString for p in m.Traverse()])',
    expect:
      "no mask  : ['/City', '/City/D7', '/City/D7/Detail_A', '/City/D7/Detail_B', " +
      "'/City/D8', '/City/D8/Detail_A', '/City/D8/Detail_B']\n" +
      "with mask: ['/City', '/City/D7', '/City/D7/Detail_A', '/City/D7/Detail_B']",
    why:
      "`/City/D8` **is not hidden or inactive - it simply was never created**. " +
      "A population mask works earlier than everything else: it limits what enters " +
      "composition at all.\n" +
      "Do not confuse this with three other mechanisms: `LoadNone` defers *payloads* " +
      "(the prim structure stays), `active = false` cuts a subtree out of " +
      "composition, and `visibility` only stops rendering. The mask is the " +
      "most radical of them and serves only performance - you use it when " +
      "you know in advance that you care about one district of the whole city.",
    tweak: {
      task:
        "Add a second path to the mask: `Usd.StagePopulationMask([\"/City/D7\", " +
        "\"/City/D8/Detail_B\"])`.",
      edits: [
        {
          find: "mask = Usd.StagePopulationMask([\"/City/D7\"])",
          replace: "mask = Usd.StagePopulationMask([\"/City/D7\", \"/City/D8/Detail_B\"])",
        },
      ],
      expect: "no mask  : ['/City', '/City/D7', '/City/D7/Detail_A', '/City/D7/Detail_B', '/City/D8', '/City/D8/Detail_A', '/City/D8/Detail_B']\nwith mask: ['/City', '/City/D7', '/City/D7/Detail_A', '/City/D7/Detail_B', '/City/D8', '/City/D8/Detail_B']",
      why:
        "The mask brings in a path together with its ancestors - `/City/D8` must exist so that " +
        "`Detail_B` has somewhere to hang - but without the siblings: `Detail_A` still does not exist. " +
        "This is how you open one specific object of a big scene without composing its neighbors.",
    },
  },

  /* ------------------------------------------------------------------ 8 --- */
  {
    id: "hide-three-ways",
    title: "Three ways to make a prim 'disappear' - and how they differ",
    goal:
      "Tell active, visibility and purpose apart - because the question 'the prim is in the tree, " +
      "but I cannot see it' has three different answers.",
    tag: "Debugging 11% · purpose",
    layerIndex: 7,
    script:
      "from pxr import Usd, UsdGeom\n\n" +
      "stage = Usd.Stage.CreateInMemory()\n" +
      'UsdGeom.Xform.Define(stage, "/W")\n' +
      'for name in ["A", "B", "C", "D"]:\n' +
      '    UsdGeom.Sphere.Define(stage, "/W/" + name)\n\n' +
      'a = stage.GetPrimAtPath("/W/A")   # untouched\n' +
      'b = stage.GetPrimAtPath("/W/B")\n' +
      'c = stage.GetPrimAtPath("/W/C")\n' +
      'd = stage.GetPrimAtPath("/W/D")\n\n' +
      "b.SetActive(False)                               # 1. deactivation\n" +
      "UsdGeom.Imageable(c).MakeInvisible()             # 2. visibility\n" +
      'UsdGeom.Imageable(d).CreatePurposeAttr("guide")  # 3. purpose\n\n' +
      'print("Traverse sees:", [p.GetName() for p in stage.Traverse()])\n' +
      'for p, label in [(a, "A untouched"), (c, "C invisible"), (d, "D guide")]:\n' +
      "    img = UsdGeom.Imageable(p)\n" +
      '    print(f"{label:14} visibility={img.ComputeVisibility():10} '
      + 'purpose={img.ComputePurpose()}")',
    expect:
      "Traverse sees: ['W', 'A', 'C', 'D']\n" +
      "A untouched    visibility=inherited  purpose=default\n" +
      "C invisible    visibility=invisible  purpose=default\n" +
      "D guide        visibility=inherited  purpose=guide",
    why:
      "Three different mechanisms, three different effects - and only one of them throws the prim " +
      "out of `Traverse`.\n" +
      "**active = false** (`B`): the prim dropped out of `Traverse` - it is not in the list. " +
      "`GetPrimAtPath(\"/W/B\")` still returns it (with `IsActive()` = False), but its " +
      "children are not composed.\n" +
      "**visibility = invisible** (`C`): the prim **is** on the stage and `Traverse` " +
      "sees it, but the renderer skips it. It is a render attribute, inherited down.\n" +
      "**purpose = guide** (`D`): the prim is visible (`visibility=inherited`!) and " +
      "is in `Traverse`, and still it does not appear in a normal render - because " +
      "`guide` is helper geometry. The purpose values are `default`, `render`, " +
      "`proxy` and `guide`; the pair `render`/`proxy` is used to swap heavy " +
      "geometry for light geometry in the viewport.\n" +
      "That is why for 'I cannot see anything' you check in order: is the prim in `Traverse` " +
      "(`active`, and also `class` or an `over` with no `def`), then `visibility`, and " +
      "finally `purpose` - the same as in lesson L7.",
    tweak: {
      task:
        "Hide the parent instead of `C`: replace `UsdGeom.Imageable(c).MakeInvisible()` with " +
        "`UsdGeom.Imageable(stage.GetPrimAtPath(\"/W\")).MakeInvisible()`.",
      edits: [
        {
          find: "UsdGeom.Imageable(c).MakeInvisible()",
          replace: "UsdGeom.Imageable(stage.GetPrimAtPath(\"/W\")).MakeInvisible()",
        },
      ],
      expect: "Traverse sees: ['W', 'A', 'C', 'D']\nA untouched    visibility=invisible  purpose=default\nC invisible    visibility=invisible  purpose=default\nD guide        visibility=invisible  purpose=guide",
      why:
        "`visibility` is inherited down: all children of `/W` now count as " +
        "`invisible`, although none of them has it written. That is why you ask " +
        "`ComputeVisibility()`, not the prim's own attribute. `Traverse` still sees all " +
        "prims - invisibility is a renderer matter, not a composition matter.",
    },
  },

  /* ------------------------------------------------------------------ 9 --- */
  {
    id: "save-vs-export",
    title: "Save vs Export - how saving a layer differs from saving a scene",
    goal:
      "See two files side by side: one with your opinions, the other with the " +
      "flattened result.",
    tag: "Data Exchange 15% · flatten",
    layerIndex: 6,
    script:
      "from pxr import Usd, Sdf\n\n" +
      'base = Sdf.Layer.CreateNew("m_base.usda")\n' +
      "base.ImportFromString('''#usda 1.0\n" +
      'def Sphere "Ball"\n' +
      "{\n" +
      "    double radius = 1\n" +
      "}\n" +
      "''')\n" +
      "base.Save()\n\n" +
      'root = Sdf.Layer.CreateNew("m_shot.usda")\n' +
      'root.subLayerPaths = ["m_base.usda"]\n' +
      'st = Usd.Stage.Open("m_shot.usda")\n' +
      'st.GetPrimAtPath("/Ball").GetAttribute("radius").Set(7.0)\n\n' +
      "st.GetRootLayer().Save()\n" +
      'print("--- m_shot.usda after Save() ---")\n' +
      'print(Sdf.Layer.FindOrOpen("m_shot.usda").ExportToString())\n\n' +
      'st.Export("m_delivery.usda")\n' +
      'print("--- m_delivery.usda after Export() ---")\n' +
      'print(Sdf.Layer.FindOrOpen("m_delivery.usda").ExportToString())',
    expect:
      "--- m_shot.usda after Save() ---\n" +
      "#usda 1.0\n" +
      "(\n" +
      "    subLayers = [\n" +
      "        @m_base.usda@\n" +
      "    ]\n" +
      ")\n\n" +
      'over "Ball"\n' +
      "{\n" +
      "    double radius = 7\n" +
      "}\n\n\n" +
      "--- m_delivery.usda after Export() ---\n" +
      "#usda 1.0\n" +
      "(\n" +
      '    doc = """Generated from Composed Stage of root layer .../m_shot.usda\n' +
      '"""\n' +
      ")\n\n" +
      'def Sphere "Ball"\n' +
      "{\n" +
      "    double radius = 7\n" +
      "}",
    why:
      "Compare these two files line by line - they differ in everything that " +
      "matters.\n" +
      "**Save()** wrote *only this one layer*: `subLayers` stayed, and the prim " +
      "is still an `over` - because `m_shot.usda` never defined it, it only " +
      "added an opinion. This file **does not work without `m_base.usda`**. There is no " +
      "such thing as 'save the whole scene' - a scene is a view, not a file.\n" +
      "**Export()** wrote *the result of composition*: the `over` became a `def Sphere`, " +
      "`subLayers` disappeared, the dependency is gone. This is `Flatten()` written to " +
      "disk - exactly what lesson L6 talks about: the visible values stay, the arcs disappear.\n" +
      "The practical conclusion: `Save` while you work, `Export` for delivery outside " +
      "- but deliberately, because the receiver loses the ability to swap asset versions.",
    tweak: {
      task:
        "Replace `st.Export(\"m_delivery.usda\")` with " +
        "`st.GetRootLayer().Export(\"m_delivery.usda\")` - exporting the layer instead of the stage.",
      edits: [
        {
          find: "st.Export(\"m_delivery.usda\")",
          replace: "st.GetRootLayer().Export(\"m_delivery.usda\")",
        },
      ],
      expect: "--- m_shot.usda after Save() ---\n#usda 1.0\n(\n    subLayers = [\n        @m_base.usda@\n    ]\n)\n\nover \"Ball\"\n{\n    double radius = 7\n}\n\n\n--- m_delivery.usda after Export() ---\n#usda 1.0\n(\n    subLayers = [\n        @m_base.usda@\n    ]\n)\n\nover \"Ball\"\n{\n    double radius = 7\n}",
      why:
        "`Layer.Export` is a copy of one layer under a new name - with `subLayers` and `over`, with no " +
        "composition. Only `Stage.Export` flattens. The same method name, two different " +
        "objects and two completely different files.",
    },
  },
  {
    id: "toolchain",
    title: "The CLI toolchain - usdtree, usdchecker, usdcat live",
    goal:
      "Run the tools that lesson L6 talks about, instead of only knowing their " +
      "names. Needs way A from the setup (the NVIDIA binaries).",
    tag: "Data Exchange 15% · needs the binaries",
    layerIndex: 6,
    scriptLabel: "First the file - paste into prep.py and run",
    script: `# We write the file with Python ON PURPOSE - see the explanation below.
with open("chair.usda", "w", encoding="utf-8", newline="\\n") as f:
    f.write('''#usda 1.0
(
    defaultPrim = "Chair"
    metersPerUnit = 0.01
    upAxis = "Y"
)

def Xform "Chair" (
    kind = "component"
)
{
    def Mesh "Seat"
    {
        double height = 45
    }
}
''')
print("written, first bytes:", open("chair.usda", "rb").read()[:9])`,
    extraScript: {
      label: "Then in the same console (after set_usd_env.bat)",
      code:
        "usdtree chair.usda\n" +
        "usdchecker chair.usda\n" +
        "usdcat -o chair.usdc chair.usda",
    },
    expect: `written, first bytes: b'#usda 1.0'

$ usdtree chair.usda
/
 \`--Chair [def Xform] (kind = component)
     \`--Seat [def Mesh]

$ usdchecker chair.usda
Success!

$ usdcat -o chair.usdc chair.usda
$ dir /b chair.*
chair.usda
chair.usdc`,
    why:
      "Three tools, three different roles. **`usdtree`** draws the hierarchy of " +
      "the composed stage together with metadata - note that it shows " +
      "`(kind = component)` right away. **`usdchecker`** is the validation gate from " +
      "exercise 15, only ready-made; `Success!` means the asset passed. " +
      "**`usdcat -o`** converts between encodings - here from text `.usda` to " +
      "a binary `.usdc` crate, that is the same scene, a different serialization.\n" +
      "**Why Python writes the file and not PowerShell:** `Out-File -Encoding utf8` " +
      "in Windows PowerShell adds a **BOM** at the start (the bytes `EF BB BF`). " +
      "The `.usda` parser requires `#usda 1.0` to be the first bytes of the file, so " +
      "with a BOM you get *\"is not a valid usda layer\"* - for a file that in " +
      "an editor looks perfectly fine. This is a very common trap on Windows. Hence the printout " +
      "of the first bytes in the script: a cheap check.\n" +
      "If you chose way B from the setup, these commands will not be there - `usd-core` from " +
      "PyPI does not contain the CLI tools.",
    tweak: {
      task:
        "Write the file with a BOM: in `open(...)` change `encoding=\"utf-8\"` to " +
        "`encoding=\"utf-8-sig\"`, then repeat `usdtree` and `usdcat`.",
      edits: [
        {
          find: "encoding=\"utf-8\",",
          replace: "encoding=\"utf-8-sig\",",
        },
      ],
      expect: "written, first bytes: b'\\xef\\xbb\\xbf#usda '\n\n$ usdtree chair.usda\nFailed to process \"chair.usda\" - <.../chair.usda> is not a valid usda layer\n\n$ usdcat -o chair.usdc chair.usda\nFailed to open \"chair.usda\" - <.../chair.usda> is not a valid usda layer\n\n$ dir /b chair.*\nchair.usda",
      why:
        "The file looks the same in an editor, but it starts with three BOM bytes (`EF BB BF`) " +
        "and the `.usda` parser rejects it: *not a valid usda layer*. `usdcat` did not create " +
        "`chair.usdc` - `dir` now shows only `chair.usda`. `usdchecker` refuses too, with " +
        "a longer message about the same thing. This is exactly how writing with `Out-File " +
        "-Encoding utf8` in Windows PowerShell ends.",
      rerun: true,
    },
  },
];


/* ===========================================================================
 * Track 3: CUSTOMIZING - extending USD without compiling.
 *
 * The most thinly covered area of the exam (6%), and at the same time the one
 * that is easiest to talk about in generalities. It turns out that all three key
 * mechanisms can be shown on plain usd-core - output measured.
 * ======================================================================== */

export const LAB_CUSTOM_INTRO =
  "“Extending USD” sounds like a topic that needs C++ and builds. In practice " +
  "**three of the four extension points can be done in Python alone**, on " +
  "a plain `pip install usd-core`, without compiling anything. Everything " +
  "rests on one file: `plugInfo.json`.\n" +
  "This track is short, but it closes the area that the app used to describe " +
  "in the most general terms.";

export const LAB_CUSTOM_STEPS: LabStep[] = [
  {
    id: "custom-kinds",
    title: "Custom kinds - extend the model hierarchy with your studio's ideas",
    goal:
      "Add the kinds `prop` and `setpiece`, which the standard does not have, to USD, " +
      "and check that the engine treats them as full models.",
    tag: "Customizing 6% · plugInfo",
    layerIndex: 7,
    script: `import os, json

os.makedirs("studioKinds", exist_ok=True)
with open("studioKinds/plugInfo.json", "w", encoding="utf-8") as f:
    json.dump({
        "Plugins": [{
            "Name": "studioKinds",
            "Type": "resource",
            "Info": {
                "Kinds": {
                    "prop":     {"baseKind": "component"},
                    "setpiece": {"baseKind": "assembly"}
                }
            }
        }]
    }, f, indent=4)

# NOTE: registration MUST come before the kind registry is touched for the first time
from pxr import Plug
Plug.Registry().RegisterPlugins(os.path.abspath("studioKinds"))

from pxr import Usd, Kind
print("known kinds      :", sorted(Kind.Registry.GetAllKinds()))
print("GetBaseKind      :", Kind.Registry.GetBaseKind("prop"))
print("IsA(prop, model) :", Kind.Registry.IsA("prop", "model"))

stage = Usd.Stage.CreateInMemory()
p = stage.DefinePrim("/Chair", "Xform")
Usd.ModelAPI(p).SetKind("prop")
print("prim kind        :", Usd.ModelAPI(p).GetKind())
print("prim.IsModel()   :", p.IsModel())`,
    expect: `known kinds      : ['assembly', 'component', 'group', 'model', 'prop', 'setpiece', 'subcomponent']
GetBaseKind      : component
IsA(prop, model) : True
prim kind        : prop
prim.IsModel()   : True`,
    why:
      "`prop` and `setpiece` joined the standard five, and `prop` **inherits " +
      "from `component`** - that is why `IsA(prop, model)` returns `True` and a prim with this " +
      "kind is a full model in the model hierarchy. The contiguity rules " +
      "apply to it the same way as to the built-in kinds.\n" +
      "**A common trap:** `RegisterPlugins` " +
      "must run **before** anything queries the kind registry for the first time. " +
      "The registry initializes lazily, but only once - if you call " +
      "`Kind.Registry.GetAllKinds()` earlier, your plugin is ignored with no " +
      "warning at all, and `GetBaseKind(\"prop\")` throws *Unknown kind*.\n" +
      "Why this matters in a studio: `component` and `assembly` are OpenUSD ideas, not " +
      "ideas of your pipeline. Custom kinds let tools ask about things " +
      "that make sense in your production.",
    tweak: {
      task:
        "Change the `baseKind` of `prop` from `component` to `subcomponent`.",
      edits: [
        {
          find: "\"prop\":     {\"baseKind\": \"component\"},",
          replace: "\"prop\":     {\"baseKind\": \"subcomponent\"},",
        },
      ],
      expect: "known kinds      : ['assembly', 'component', 'group', 'model', 'prop', 'setpiece', 'subcomponent']\nGetBaseKind      : subcomponent\nIsA(prop, model) : False\nprim kind        : prop\nprim.IsModel()   : False",
      why:
        "The name of a kind means nothing - what counts is what it inherits from. `subcomponent` is not " +
        "a model, so `prop` stopped being one too: `IsA(prop, model)` and `IsModel()` give " +
        "`False`, and a prim with this kind drops out of the model hierarchy.",
    },
  },
  {
    id: "custom-schema",
    title: "A custom schema without a line of C++ (codeless schema)",
    goal:
      "Define your own prim type and your own API schema, register them at " +
      "runtime and see where default values really come from.",
    tag: "Customizing 6% · schemas",
    layerIndex: 7,
    script: `import os, json

os.makedirs("studioSchema", exist_ok=True)

with open("studioSchema/plugInfo.json", "w", encoding="utf-8") as f:
    json.dump({
        "Plugins": [{
            "Name": "studioSchema",
            "Type": "resource",
            "Root": ".",
            "ResourcePath": ".",
            "Info": {
                "Types": {
                    "StudioTurntable": {
                        "alias": {"UsdSchemaBase": "Turntable"},
                        "autoGenerated": True,
                        "bases": ["UsdGeomXformable"],
                        "schemaIdentifier": "Turntable",
                        "schemaKind": "concreteTyped"
                    },
                    "StudioSpinnableAPI": {
                        "alias": {"UsdSchemaBase": "SpinnableAPI"},
                        "autoGenerated": True,
                        "bases": ["UsdAPISchemaBase"],
                        "schemaIdentifier": "SpinnableAPI",
                        "schemaKind": "singleApplyAPI"
                    }
                }
            }
        }]
    }, f, indent=4)

with open("studioSchema/generatedSchema.usda", "w", encoding="utf-8") as f:
    f.write('''#usda 1.0

class Turntable "Turntable"
{
    double studio:diameter = 30
}

class "SpinnableAPI"
{
    double studio:spin:rpm = 33.3
    token studio:spin:axis = "Y" (
        allowedTokens = ["X", "Y", "Z"]
    )
}
''')

from pxr import Plug
Plug.Registry().RegisterPlugins(os.path.abspath("studioSchema"))

from pxr import Usd
reg = Usd.SchemaRegistry()
print("registry: Turntable    :", bool(reg.FindConcretePrimDefinition("Turntable")))
print("registry: SpinnableAPI :", bool(reg.FindAppliedAPIPrimDefinition("SpinnableAPI")))

stage = Usd.Stage.CreateInMemory()
p = stage.DefinePrim("/Table", "Turntable")
p.ApplyAPI("SpinnableAPI")

print("typeName                :", p.GetTypeName())
print("apiSchemas              :", list(p.GetAppliedSchemas()))
print("diameter (from schema)  :", p.GetAttribute("studio:diameter").Get())
print("rpm (from schema)       :", p.GetAttribute("studio:spin:rpm").Get())
print("axis (from schema)      :", p.GetAttribute("studio:spin:axis").Get())
print()
print("--- and this is the FILE: ---")
print(stage.GetRootLayer().ExportToString())`,
    expect: `registry: Turntable    : True
registry: SpinnableAPI : True
typeName                : Turntable
apiSchemas              : ['SpinnableAPI']
diameter (from schema)  : 30.0
rpm (from schema)       : 33.3
axis (from schema)      : Y

--- and this is the FILE: ---
#usda 1.0

def Turntable "Table" (
    prepend apiSchemas = ["SpinnableAPI"]
)
{
}`,
    why:
      "Look at the very end - **this is the most important line of this exercise**. " +
      "The file has no `diameter`, no `rpm` and no `axis`. It has only the type " +
      "of the prim and an entry in `apiSchemas`. And still all three attributes have " +
      "values.\n" +
      "This is exactly how schemas work: **default values live in the schema, " +
      "not in the scene**. A scene stores only what differs from the defaults. " +
      "That is why a USD file with a thousand prims can be small, and why adding " +
      "an attribute to a schema works immediately for all existing scenes.\n" +
      "Note two differences in `plugInfo.json`: `concreteTyped` gives " +
      "a prim its **type** (and such a prim has exactly one), while `singleApplyAPI` only " +
      "**adds** properties and lands in the list-editable `apiSchemas` list. " +
      "This is the typed/API split from lesson L2, seen from the definition side.\n" +
      "The version with no compiling is called a **codeless schema**. Normally " +
      "`generatedSchema.usda` and `plugInfo.json` are produced by the tool " +
      "**`usdGenSchema`** from a `schema.usda` file; here we wrote them by hand " +
      "to see what they really are - two text files.\n" +
      "**If you have the NVIDIA binaries, look inside the package:** in " +
      "`lib/usd/*/resources/generatedSchema.usda` lie the **real** Pixar schema " +
      "definitions - `usdGeom`, `usdLux`, `usdShade`, `usdPhysics`. It is " +
      "exactly the same format you just wrote by hand, only " +
      "this is how `Mesh` and `SphereLight` are defined. It is worth opening and comparing. " +
      "There is also `usdGenSchema.bat`, so you can generate a schema " +
      "with the tool instead of writing it by hand.",
    tweak: {
      task:
        "Right after `p.ApplyAPI(\"SpinnableAPI\")` add " +
        "`p.GetAttribute(\"studio:spin:rpm\").Set(45.0)`.",
      edits: [
        {
          find: "p.ApplyAPI(\"SpinnableAPI\")\n",
          replace: "p.ApplyAPI(\"SpinnableAPI\")\np.GetAttribute(\"studio:spin:rpm\").Set(45.0)\n",
        },
      ],
      expect: "registry: Turntable    : True\nregistry: SpinnableAPI : True\ntypeName                : Turntable\napiSchemas              : ['SpinnableAPI']\ndiameter (from schema)  : 30.0\nrpm (from schema)       : 45.0\naxis (from schema)      : Y\n\n--- and this is the FILE: ---\n#usda 1.0\n\ndef Turntable \"Table\" (\n    prepend apiSchemas = [\"SpinnableAPI\"]\n)\n{\n    double studio:spin:rpm = 45\n}",
      why:
        "Exactly one line appeared in the file - the one that differs from the schema. " +
        "`diameter` and `axis` still live in the schema, and the label *(from schema)* next to " +
        "`rpm` no longer fits: 45 comes from the file. Every USD file looks like this - only " +
        "the differences from the default values are written.",
    },
  },
  {
    id: "custom-fallback",
    title: "Variant fallback - what applies when nobody selected a variant",
    goal:
      "See the difference between no selection, a global fallback and an explicit " +
      "variant choice.",
    tag: "Customizing 6% · variants",
    layerIndex: 7,
    script: `from pxr import Usd, Sdf

USDA = '''#usda 1.0

def Xform "Chair" (
    variantSets = "color"
)
{
    variantSet "color" = {
        "red" {
            over "Seat"
            {
                color3f primvars:displayColor = (1, 0, 0)
            }
        }
        "blue" {
            over "Seat"
            {
                color3f primvars:displayColor = (0, 0, 1)
            }
        }
    }

    def Mesh "Seat"
    {
    }
}
'''

def color_of(stage):
    a = stage.GetPrimAtPath("/Chair/Seat").GetAttribute("primvars:displayColor")
    return a.Get() if a else None

def fresh():
    l = Sdf.Layer.CreateAnonymous(".usda")
    l.ImportFromString(USDA)
    return Usd.Stage.Open(l)

print("1. no fallback, no selection  :", color_of(fresh()))

Usd.Stage.SetGlobalVariantFallbacks({"color": ["blue"]})
print("2. global fallbacks           :", dict(Usd.Stage.GetGlobalVariantFallbacks()))

s = fresh()
print("3. after setting the fallback :", color_of(s))

s.GetPrimAtPath("/Chair").GetVariantSet("color").SetVariantSelection("red")
print("4. EXPLICIT selection 'red'   :", color_of(s))`,
    expect: `1. no fallback, no selection  : None
2. global fallbacks           : {'color': ['blue']}
3. after setting the fallback : (0, 0, 1)
4. EXPLICIT selection 'red'   : (1, 0, 0)`,
    why:
      "Step 1 is instructive: the variant set exists, both variants are written, and " +
      "the attribute returns **None**. With no selection, **no** variant enters " +
      "composition - a variant set has no “first variant by default”.\n" +
      "A fallback is the answer to this problem, and you set it **outside the scene** - in " +
      "the environment configuration, not in a file. The studio says once “when nobody has chosen " +
      "a level of detail, take `proxy`”, and it applies in all " +
      "scenes, without touching the assets.\n" +
      "Step 4 shows the limit: a fallback works **only when no selection " +
      "is authored**. When someone has written a choice, the fallback does not matter - because " +
      "a variant selection is itself an opinion and goes through normal composition.",
    tweak: {
      task:
        "Set the fallback to a list of two variants: `{\"color\": [\"green\", \"blue\"]}`.",
      edits: [
        {
          find: "Usd.Stage.SetGlobalVariantFallbacks({\"color\": [\"blue\"]})",
          replace: "Usd.Stage.SetGlobalVariantFallbacks({\"color\": [\"green\", \"blue\"]})",
        },
      ],
      expect: "1. no fallback, no selection  : None\n2. global fallbacks           : {'color': ['green', 'blue']}\n3. after setting the fallback : (0, 0, 1)\n4. EXPLICIT selection 'red'   : (1, 0, 0)",
      why:
        "A fallback is a list of preferences, not one value. `green` does not exist in this " +
        "asset, so USD takes the next one in the list - `blue`. Because of this, one studio " +
        "rule, for example `[\"proxy\", \"low\"]`, also works for assets that name their variants " +
        "differently.",
    },
  },
];

/* ===========================================================================
 * Track 4: CONVERTER - Data Exchange from a source file to a .usdz package.
 *
 * One crate goes the whole way: OBJ + MTL -> UsdGeom.Mesh with UVs,
 * normals, extent and metadata -> validation with a real error ->
 * fix -> ComputeAllDependencies and .usdz. Output from USD 25.08.
 * ======================================================================== */

export const LAB_CONVERTER_INTRO =
  "Data Exchange is 15% of the exam and its most practical part: you get a file " +
  "in someone else's format, and the pipeline must produce USD that passes validation and can be " +
  "sent as one file. This track goes the whole way on one crate: **an OBJ with " +
  "an MTL material** -> `UsdGeom.Mesh` with normals, UVs, `extent` and metadata -> " +
  "validation with a real error -> fix -> a `.usdz` package.\n" +
  "The scripts work on `usd-core` alone; the console commands (`usdtree`, `usdchecker`, " +
  "`usdzip`) need way A of the setup. Work in a new, empty folder - exercises " +
  "20 and 21 use the files from exercise 19.";

export const LAB_CONVERTER_STEPS: LabStep[] = [
  {
    id: "conv-mesh",
    title: "An OBJ -> USD converter - geometry, UVs, material and metadata",
    goal:
      "Write a converter that turns an OBJ file and its MTL material into a USD asset ready " +
      "to be referenced: with normals, UVs, `extent`, units and `defaultPrim`.",
    tag: "Data Exchange 15% · converter",
    layerIndex: 6,
    script: `import os, struct, zlib
from pxr import Gf, Sdf, Usd, UsdGeom, UsdShade

# --- SOURCE: this is how you get the box from a program that knows only OBJ ---
os.makedirs("source", exist_ok=True)
with open("source/box.obj", "w", encoding="utf-8", newline="\\n") as f:
    f.write("""# box 40 x 30 x 30, Y axis up
mtllib box.mtl
v 0 0 0
v 40 0 0
v 40 30 0
v 0 30 0
v 0 0 30
v 40 0 30
v 40 30 30
v 0 30 30
vt 0 0
vt 1 0
vt 1 1
vt 0 1
vn 0 0 -1
vn 0 0 1
vn 0 -1 0
vn 0 1 0
vn -1 0 0
vn 1 0 0
usemtl Wood
f 1/1/1 4/4/1 3/3/1 2/2/1
f 5/1/2 6/2/2 7/3/2 8/4/2
f 1/1/3 2/2/3 6/3/3 5/4/3
f 4/1/4 8/4/4 7/3/4 3/2/4
f 1/1/5 5/2/5 8/3/5 4/4/5
f 2/1/6 3/4/6 7/3/6 6/2/6
""")
with open("source/box.mtl", "w", encoding="utf-8", newline="\\n") as f:
    f.write("newmtl Wood\\nKd 0.55 0.35 0.18\\nmap_Kd wood.png\\n")

def png(path, rgb, n=8):
    # the smallest valid PNG: n x n pixels in one color
    row = b"\\x00" + bytes(rgb) * n
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))
    with open(path, "wb") as f:
        f.write(b"\\x89PNG\\r\\n\\x1a\\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", n, n, 8, 2, 0, 0, 0))
                + chunk(b"IDAT", zlib.compress(row * n)) + chunk(b"IEND", b""))
png("source/wood.png", (140, 90, 46))

# --- CONVERTER: reads OBJ and MTL, writes USD ---
def read_obj(path):
    v, vt, vn, faces, mtllib = [], [], [], [], None
    for line in open(path, encoding="utf-8"):
        p = line.split()
        if not p or p[0].startswith("#"):
            continue
        if p[0] == "v":
            v.append(Gf.Vec3f(*map(float, p[1:4])))
        elif p[0] == "vt":
            vt.append(Gf.Vec2f(*map(float, p[1:3])))
        elif p[0] == "vn":
            vn.append(Gf.Vec3f(*map(float, p[1:4])))
        elif p[0] == "f":   # "v/vt/vn", numbered from 1
            faces.append([[int(i) - 1 for i in corner.split("/")] for corner in p[1:]])
        elif p[0] == "mtllib":
            mtllib = p[1]
    return v, vt, vn, faces, mtllib

def read_mtl(path):
    return {p[0]: p[1:] for p in (l.split() for l in open(path, encoding="utf-8")) if p}

def convert(obj, out_path):
    v, vt, vn, faces, mtllib = read_obj(obj)
    corners = [corner for face in faces for corner in face]

    stage = Usd.Stage.CreateNew(out_path)
    UsdGeom.SetStageUpAxis(stage, UsdGeom.Tokens.y)   # OBJ: Y up
    UsdGeom.SetStageMetersPerUnit(stage, 0.01)        # agreement with the supplier: centimeters
    root = UsdGeom.Xform.Define(stage, "/Box")
    stage.SetDefaultPrim(root.GetPrim())
    Usd.ModelAPI(root).SetKind("component")

    mesh = UsdGeom.Mesh.Define(stage, "/Box/Geo")
    mesh.CreateSubdivisionSchemeAttr("none")          # OBJ is a hard mesh
    mesh.CreatePointsAttr(v)
    mesh.CreateFaceVertexCountsAttr([len(s) for s in faces])
    mesh.CreateFaceVertexIndicesAttr([corner[0] for corner in corners])
    mesh.CreateNormalsAttr([vn[corner[2]] for corner in corners])
    mesh.SetNormalsInterpolation(UsdGeom.Tokens.faceVarying)
    st = UsdGeom.PrimvarsAPI(mesh).CreatePrimvar(
        "st", Sdf.ValueTypeNames.TexCoord2fArray, UsdGeom.Tokens.faceVarying)
    st.Set(vt)                                        # 4 values from the OBJ...
    st.SetIndices([corner[1] for corner in corners])  # ...and an index for each corner
    mesh.CreateExtentAttr(UsdGeom.Mesh.ComputeExtent(v))

    mtl = read_mtl(os.path.join(os.path.dirname(obj), mtllib))
    UsdGeom.Scope.Define(stage, "/Box/Looks")
    mat = UsdShade.Material.Define(stage, "/Box/Looks/Wood")
    pbr = UsdShade.Shader.Define(stage, "/Box/Looks/Wood/PBR")
    pbr.CreateIdAttr("UsdPreviewSurface")
    mat.CreateSurfaceOutput().ConnectToSource(pbr.CreateOutput("surface", Sdf.ValueTypeNames.Token))
    uv = UsdShade.Shader.Define(stage, "/Box/Looks/Wood/UV")
    uv.CreateIdAttr("UsdPrimvarReader_float2")
    uv.CreateInput("varname", Sdf.ValueTypeNames.String).Set("st")
    tex = UsdShade.Shader.Define(stage, "/Box/Looks/Wood/Texture")
    tex.CreateIdAttr("UsdUVTexture")
    tex.CreateInput("file", Sdf.ValueTypeNames.Asset).Set("./textures/" + mtl["map_Kd"][0])
    tex.CreateInput("fallback", Sdf.ValueTypeNames.Float4).Set(Gf.Vec4f(*map(float, mtl["Kd"]), 1))
    tex.CreateInput("st", Sdf.ValueTypeNames.Float2).ConnectToSource(uv.CreateOutput("result", Sdf.ValueTypeNames.Float2))
    pbr.CreateInput("diffuseColor", Sdf.ValueTypeNames.Color3f).ConnectToSource(tex.CreateOutput("rgb", Sdf.ValueTypeNames.Float3))
    UsdShade.MaterialBindingAPI.Apply(mesh.GetPrim()).Bind(mat)

    stage.Save()

os.makedirs("usd", exist_ok=True)
convert("source/box.obj", "usd/box.usda")

# --- what came out ---
s = Usd.Stage.Open("usd/box.usda")
m = UsdGeom.Mesh(s.GetPrimAtPath("/Box/Geo"))
st = UsdGeom.PrimvarsAPI(m).GetPrimvar("st")
print("defaultPrim :", s.GetDefaultPrim().GetPath())
print("units       :", UsdGeom.GetStageMetersPerUnit(s), "| upAxis:", UsdGeom.GetStageUpAxis(s))
print("points      :", len(m.GetPointsAttr().Get()))
print("faces       :", list(m.GetFaceVertexCountsAttr().Get()))
print("normals     :", len(m.GetNormalsAttr().Get()), m.GetNormalsInterpolation())
print("st          :", len(st.Get()), "values,", len(st.GetIndices()), "indices,", st.GetInterpolation())
print("extent      :", [tuple(p) for p in m.GetExtentAttr().Get()])
print("subdivision :", m.GetSubdivisionSchemeAttr().Get())`,
    extraScript: {
      label: "Then in the same console (after set_usd_env.bat)",
      code: "usdtree usd\\box.usda",
    },
    expect: "defaultPrim : /Box\nunits       : 0.01 | upAxis: Y\npoints      : 8\nfaces       : [4, 4, 4, 4, 4, 4]\nnormals     : 24 faceVarying\nst          : 4 values, 24 indices, faceVarying\nextent      : [(0.0, 0.0, 0.0), (40.0, 30.0, 30.0)]\nsubdivision : none\n\n$ usdtree usd\\box.usda\n/\n `--Box [def Xform] (kind = component)\n     |--Geo [def Mesh]\n     `--Looks [def Scope]\n         `--Wood [def Material]\n             |--PBR [def Shader]\n             |--UV [def Shader]\n             `--Texture [def Shader]",
    why:
      "Each line of the converter is one row of the mapping table from lesson L6. `v` goes " +
      "to `points`, `f` to `faceVertexCounts` and `faceVertexIndices` (OBJ counts from 1, " +
      "USD from 0 - hence the `- 1`), `vn` to `normals`, `vt` to `primvars:st`, `map_Kd` from " +
      "the MTL to the `UsdUVTexture` shader, and `Kd` to its `inputs:fallback`.\n" +
      "**UVs as an indexed primvar.** OBJ keeps 4 texture coordinates and, for each " +
      "face corner, gives the number of one of them. USD has the same mechanism for this: 4 values " +
      "plus 24 indices (6 faces x 4 corners). We wrote the normals directly, one per corner - " +
      "hence 24 and `faceVarying`.\n" +
      "**What OBJ does not have, the converter must add itself:** units (OBJ does not store them - " +
      "it is an agreement with the supplier, here centimeters), the axis (it does not store it either; most programs " +
      "export Y up), `defaultPrim`, `kind` and `extent`. Nothing forces them - " +
      "a file without them opens too.\n" +
      "`subdivisionScheme = \"none\"` is a deliberate decision: OBJ is a finished mesh, and the default " +
      "`catmullClark` would let the renderer smooth it (lesson L2).",
    tweak: {
      task:
        "Remove the line `mesh.CreateSubdivisionSchemeAttr(\"none\")` from the converter and run " +
        "the script again.",
      edits: [
        {
          find: '    mesh.CreateSubdivisionSchemeAttr("none")          # OBJ is a hard mesh\n',
          replace: "",
        },
      ],
      expect: "defaultPrim : /Box\nunits       : 0.01 | upAxis: Y\npoints      : 8\nfaces       : [4, 4, 4, 4, 4, 4]\nnormals     : 24 faceVarying\nst          : 4 values, 24 indices, faceVarying\nextent      : [(0.0, 0.0, 0.0), (40.0, 30.0, 30.0)]\nsubdivision : catmullClark\n\n$ usdtree usd\\box.usda\n/\n `--Box [def Xform] (kind = component)\n     |--Geo [def Mesh]\n     `--Looks [def Scope]\n         `--Wood [def Material]\n             |--PBR [def Shader]\n             |--UV [def Shader]\n             `--Texture [def Shader]",
      why:
        "Nothing warns you, and the file is still valid: `subdivisionScheme` has the default " +
        "value `catmullClark` in the `Mesh` schema, and the converter simply stopped " +
        "overriding it. You see the effect only in a render with a higher level of detail - " +
        "the box rounds off like the cube in the render in lesson L2.",
    },
  },
  {
    id: "conv-check",
    title: "Validation catches a converter bug - find the cause and fix it",
    goal:
      "Run the result of the conversion through the same rules that `usdchecker` applies, " +
      "find the cause of the error and fix it.",
    tag: "Data Exchange 15% · validation",
    layerIndex: 6,
    script: `import os, shutil
from pxr import Sdf, UsdUtils

def check(path):
    # the same as usdchecker does - only from Python
    checker = UsdUtils.ComplianceChecker()
    checker.CheckCompliance(path)
    errors = checker.GetErrors() + checker.GetFailedChecks()
    print("usdchecker:", "Success!" if not errors else "Failed!")
    for e in errors:
        print("   ", e)

print("--- 1. the conversion from exercise 19 ---")
check("usd/box.usda")

print("--- 2. what is missing? ---")
layers, files, missing = UsdUtils.ComputeAllDependencies(Sdf.AssetPath("usd/box.usda"))
for m in missing:
    print("    missing:", os.path.relpath(m).replace("\\\\", "/"))

print("--- 3. fix: the converter copies the texture next to the USD ---")
os.makedirs("usd/textures", exist_ok=True)
shutil.copy("source/wood.png", "usd/textures/wood.png")
check("usd/box.usda")`,
    extraScript: {
      label: "Confirm with the console tool (after set_usd_env.bat)",
      code: "usdchecker usd\\box.usda",
    },
    expect: "--- 1. the conversion from exercise 19 ---\nusdchecker: Failed!\n    Found unresolvable external dependency '.../usd/textures/wood.png'. (fails 'MissingReferenceChecker')\n--- 2. what is missing? ---\n    missing: usd/textures/wood.png\n--- 3. fix: the converter copies the texture next to the USD ---\nusdchecker: Success!\n\n$ usdchecker usd\\box.usda\nSuccess!",
    why:
      "`UsdUtils.ComplianceChecker` checks the same rules as `usdchecker` - the message is " +
      "identical to the one in the console. `MissingReferenceChecker` found a path that cannot be " +
      "resolved: the converter wrote `./textures/wood.png` in the material, but did not copy the texture " +
      "itself.\n" +
      "This is a common converter bug, and it is silent: the USD file opens without problems, the geometry " +
      "is in place, only the texture is missing.\n" +
      "`ComputeAllDependencies` returns three lists: layers, files and what could not be " +
      "found. The third one says directly what to fix. The warning *Failed to resolve reference* " +
      "that you see in the console comes from the same call.\n" +
      "After the texture is copied, both checks pass. In a real converter, copying " +
      "the dependencies is a separate step, right after the layer is written.",
    tweak: {
      task:
        "In the fix, copy the texture to `usd/` instead of `usd/textures/` - next to the USD file, " +
        "not in a subfolder.",
      edits: [
        {
          find: 'shutil.copy("source/wood.png", "usd/textures/wood.png")',
          replace: 'shutil.copy("source/wood.png", "usd/wood.png")',
        },
      ],
      expect: "--- 1. the conversion from exercise 19 ---\nusdchecker: Failed!\n    Found unresolvable external dependency '.../usd/textures/wood.png'. (fails 'MissingReferenceChecker')\n--- 2. what is missing? ---\n    missing: usd/textures/wood.png\n--- 3. fix: the converter copies the texture next to the USD ---\nusdchecker: Failed!\n    Found unresolvable external dependency '.../usd/textures/wood.png'. (fails 'MissingReferenceChecker')\n\n$ usdchecker usd\\box.usda\nFound unresolvable external dependency '.../usd/textures/wood.png'. (fails 'MissingReferenceChecker')\nFailed!",
      why:
        "`usdchecker` does not look for a texture by name. It resolves exactly the path written in " +
        "the attribute, relative to the layer file: `./textures/wood.png` in `usd/box.usda` is " +
        "`usd/textures/wood.png` and only there. A file next to it, in `usd/`, does not help - the fix " +
        "must match the path that the converter wrote.",
    },
  },
  {
    id: "conv-package",
    title: "One file for delivery - dependencies and .usdz",
    goal:
      "Check what the asset needs, pack it into a `.usdz` and open the package the way " +
      "the receiver will.",
    tag: "Data Exchange 15% · usdz",
    layerIndex: 6,
    script: `import os, zipfile
from pxr import Sdf, Usd, UsdUtils

layers, files, missing = UsdUtils.ComputeAllDependencies(Sdf.AssetPath("usd/box.usda"))
print("layers :", [os.path.relpath(l.realPath).replace("\\\\", "/") for l in layers])
print("files  :", [os.path.relpath(p).replace("\\\\", "/") for p in files])
print("missing:", missing)

UsdUtils.CreateNewUsdzPackage(Sdf.AssetPath("usd/box.usda"), "box.usdz")
print()
print("in the package box.usdz:")
for info in zipfile.ZipFile("box.usdz").infolist():
    print(f"    {info.filename:20} compression={info.compress_type}")

s = Usd.Stage.Open("box.usdz")
tex = s.GetPrimAtPath("/Box/Looks/Wood/Texture").GetAttribute("inputs:file").Get()
print()
print("texture from the package:", tex.resolvedPath)`,
    extraScript: {
      label: "The same with the console tools",
      code: "usdzip -l box.usdz\nusdchecker box.usdz",
    },
    expect: "layers : ['usd/box.usda']\nfiles  : ['usd/textures/wood.png']\nmissing: []\n\nin the package box.usdz:\n    box.usda             compression=0\n    textures/wood.png    compression=0\n\ntexture from the package: .../box.usdz[textures/wood.png]\n\n$ usdzip -l box.usdz\nbox.usda\ntextures/wood.png\n\n$ usdchecker box.usdz\nSuccess!",
    why:
      "`ComputeAllDependencies` is the list of things to send: one layer and one texture, nothing " +
      "missing. `CreateNewUsdzPackage` (in the console `usdzip`) packs exactly this list and " +
      "keeps the relative paths - hence `textures/wood.png` inside.\n" +
      "`compression=0` is not an accident: a `.usdz` is a zip **with no compression**, with the data aligned " +
      "to 64 bytes, so USD reads the files directly from the archive. You see it in the line with the texture: " +
      "the path resolves to `box.usdz[textures/wood.png]`, that is to the inside of the package, " +
      "without unpacking.\n" +
      "`usdzip -l` shows the content of the package, and `usdchecker` checks it the same way as a plain " +
      "file. The receiver gets one file and everything the asset needs.",
    tweak: {
      task: "Replace `UsdUtils.CreateNewUsdzPackage(` with `UsdUtils.CreateNewARKitUsdzPackage(`.",
      edits: [
        {
          find: "UsdUtils.CreateNewUsdzPackage(",
          replace: "UsdUtils.CreateNewARKitUsdzPackage(",
        },
      ],
      expect: "layers : ['usd/box.usda']\nfiles  : ['usd/textures/wood.png']\nmissing: []\n\nin the package box.usdz:\n    box.usdc             compression=0\n    textures/wood.png    compression=0\n\ntexture from the package: .../box.usdz[textures/wood.png]\n\n$ usdzip -l box.usdz\nbox.usdc\ntextures/wood.png\n\n$ usdchecker box.usdz\nSuccess!",
      why:
        "The ARKit version (AR Quick Look on an iPhone) has stricter rules: the package can hold " +
        "only one USD file, and it must be a binary `.usdc`. Here there was one layer, so only its format " +
        "changed. An asset with several layers would be flattened into one, and USD " +
        "then warns directly that, among other things, the variant sets are lost.",
    },
  },
];

/* ===========================================================================
 * GUI section - tools with a graphical interface.
 *
 * NOTE on the level of certainty: the exercises above have MEASURED output. This
 * section describes other people's applications based on their documentation - that is why
 * each track has a `verified` flag and the app says plainly what was not checked.
 * ======================================================================== */

export interface GuiTrack {
  id: string;
  tool: string;
  /** A one-sentence answer: what it is for. */
  pitch: string;
  /** Whether the content of this track was verified by running it. */
  verified: boolean;
  /** How to get it - the real state today. */
  install: string;
  /** Panels you should be able to name. */
  panels: { name: string; what: string }[];
  /** What this tool is best for in the context of this app. */
  best: string;
  /** Optional section "one stage, not one file". */
  oneStage?: string;
  oneStageCode?: string;
  oneStageWhy?: string;
  /** What it does NOT give - so that you do not look for it. */
  limits: string;
}

export const LAB_GUI_INTRO =
  "The exercises above deliberately need no GUI - and that is their strength, because " +
  "a list of opinions reads more precisely than a picture. But two questions come back: " +
  "*is it worth seeing this in an interface* and *is usdview the same as Omniverse*. " +
  "The answer to the second one is **no** - and below you have how they differ.";

export const LAB_GUI_TRACKS: GuiTrack[] = [
  {
    id: "usdview",
    tool: "usdview",
    pitch:
      "A scene viewer and debugger. The closest to what this app teaches - it has " +
      "a panel that shows the **composition arcs** of the selected prim.",
    verified: false,
    install:
      "**It is not in `pip install usd-core`** (see the setup above). " +
      "The simplest way: NVIDIA publishes prebuilt OpenUSD binaries that contain " +
      "the whole USD Toolset together with usdview. You download the archive from the *OpenUSD " +
      "Developer Resources* page, unpack it and run " +
      "`.\\scripts\\usdview_gui.bat` (Windows). No compiling, no RTX card.",
    panels: [
      {
        name: "Tree view",
        what: "The prim hierarchy of the composed stage - the equivalent of our scenegraph.",
      },
      {
        name: "Properties",
        what: "The properties of the selected prim with their values AFTER composition.",
      },
      {
        name: "Composition Details (tabs: Value / Meta Data / Layer Stack / Composition)",
        what:
          "The most important panel, and in practice four views of the same thing. " +
          "**Value** - the value after composition. **Meta Data** - the metadata. " +
          "**Layer Stack** - the list of layers that add an opinion to the selected " +
          "element, with a column for the time offset and scale. **Composition** - the composition " +
          "arcs. Together this is literally the LIVERPS tracer from this app, only on " +
          "a real scene: Layer Stack answers *\"which layers had " +
          "a say\"*, and Composition answers *\"through which arcs they got here\"*.\n" +
          "**Note:** these tabs fill only when you select a specific " +
          "**property**, not the prim itself. If Layer Stack is empty although something is " +
          "selected, it usually means that the selected property **has not a single " +
          "authored opinion** - its value comes from the schema fallback " +
          "(see track 3, the exercise about a custom schema).",
      },
      {
        name: "Viewport (Hydra)",
        what: "The 3D preview - here you see the effect of visibility and purpose from exercise 8.",
      },
      {
        name: "Interpreter",
        what:
          "A built-in Python console - you open it with the `i` key or through " +
          "Window ‣ Interpreter. It has a ready `usdviewApi` object (among others " +
          "`usdviewApi.stage` and `usdviewApi.prim`).",
      },
    ],
    best:
      "For **debugging composition**, that is for what makes up 23% of the exam. " +
      "Open `shot.usda` from exercise 1, click `/ChairA` and look into Composition " +
      "Details - you see the reference arc and both layers that add an opinion about " +
      "`height`. It is the same picture as `GetPropertyStack` from exercise 3, only " +
      "drawn.\n" +
      "A bonus: the exercises that **read an existing scene** - 3 (`shot.usda`), 6 " +
      "(`city.usda`) and 14 (`sh010.usda`) - you can paste directly into the Interpreter " +
      "in usdview, with that scene open. Instead of `Usd.Stage.Open(...)` " +
      "use `usdviewApi.stage` and watch the effect in the viewport live. The other " +
      "exercises create their own files or an in-memory stage, so you run " +
      "them in the console as usual and open the result in usdview.",
    oneStage:
      "**“Can usdview open two files at once?” - this question comes from the wrong " +
      "side.** True, `usdview` takes **one** file per process (you can " +
      "of course start two windows). But in USD you do not “open files” - " +
      "**you compose layers**. One stage is made of many files anyway: " +
      "when you open `sh010.usda` you already have seven layers at once.\n" +
      "Want to see two assets in one scene? Do not look for a switch - " +
      "write a five-line file that brings both in with references, and open **that one** " +
      "in usdview:",
    oneStageCode:
      '#usda 1.0\n' +
      '(\n' +
      '    defaultPrim = "World"\n' +
      ')\n\n' +
      'def Xform "World"\n{\n' +
      '    def "Table" (\n' +
      '        prepend references = @.../Table/Table.usd@\n' +
      '    )\n    {\n    }\n\n' +
      '    def "Ball" (\n' +
      '        prepend references = @.../Ball/Ball.usd@\n' +
      '    )\n    {\n' +
      '        double3 xformOp:translate = (0, 10, 0)\n' +
      '        uniform token[] xformOpOrder = ["xformOp:translate"]\n' +
      '    }\n}',
    oneStageWhy:
      "On the assets from `tutorials/endToEnd` such a file composes to " +
      "**15 prims from 7 layers** - the table and the ball, each with its own material network " +
      "(Mesh + Material + 3 Shaders). This is exactly the work of the layout department from " +
      "track 2, exercise 12.\n" +
      "Useful flags when the scene is big: `--unloaded` (open without payloads), " +
      "`--mask /path` (compose only a subtree), `--mute` (mute layers), " +
      "`--select /path` (select a prim right away). These are the same mechanisms as " +
      "exercises 5-7, only from the command line.",
    limits:
      "This tool is mainly **for looking**, not for authoring - and here it is easy to " +
      "misunderstand. usdview **shows** the layer stack (the Layer Stack tab), " +
      "but read-only: it tells you where a value came from. What it does not give is " +
      "**choosing which layer your edits go to** - that is, " +
      "switching the edit target with a click. The Layer panel in Omniverse can do that.\n" +
      "The second thing: you will not work with materials and lights here the way " +
      "an artist does.",
  },
  {
    id: "omniverse",
    tool: "Omniverse (USD Composer / Kit)",
    pitch:
      "A full DCC environment: an RTX viewport, authoring, layers, materials. It has a GUI, " +
      "a stage tree and a Python console - everything you ask about.",
    verified: false,
    install:
      "Here is the catch that changes the math. **The Omniverse Launcher was " +
      "retired on 1 October 2025** - USD Composer is no longer a " +
      "'download and click' application. Today you take the `kit-app-template` from the " +
      "NVIDIA-Omniverse GitHub, you need **Git + Git LFS**, you clone the repo and " +
      "**build the application** yourself. Plus an **RTX** card.\n" +
      "If you installed the Launcher before that date, it keeps working as before.",
    panels: [
      {
        name: "Stage",
        what: "The prim tree - the equivalent of the Tree view in usdview.",
      },
      {
        name: "Property",
        what: "The properties of the selected prim, editable.",
      },
      {
        name: "Layer",
        what:
          "This is the reason to look here: you see the layer stack and " +
          "**click which layer is the target layer for authoring**. That is the edit target " +
          "from exercise 4 - visible with your own eyes, instead of called through " +
          "`SetEditTarget`.",
      },
      {
        name: "Script Editor",
        what:
          "A Python console inside the application. You get the stage through " +
          "`omni.usd.get_context().get_stage()` - and then you work with normal `pxr`.",
      },
      {
        name: "Viewport (RTX)",
        what:
          "Real-time rendering - here the materials and lights from lesson L2 " +
          "finally mean something visually.",
      },
    ],
    best:
      "For two things that usdview does not show well. First, " +
      "**layered authoring**: you switch the target layer in the Layer panel, change " +
      "something and see which layer the opinion went to - this is the edit target " +
      "and the session layer shown without a single line of code. Second, " +
      "**Visualization (8% of the exam)**: UsdShade materials, UsdLux lights and " +
      "variants switched with a click.",
    limits:
      "**It is not required for the exam.** NCP-OUSD tests OpenUSD, not " +
      "the use of a specific NVIDIA application. If you must choose where to invest " +
      "an evening: Composition Details in usdview pays off on the exam faster than " +
      "building Kit.",
  },
];

export const LAB_GUI_VERDICT =
  "**Does usdview give the same as Omniverse? No - but for what this app teaches, " +
  "it is closer to the goal.** usdview shows *composition* (arcs, layers, where " +
  "a value came from), and that is the core of the exam. Omniverse shows *the scene* (render, " +
  "materials, working in layers) and wins where look and authoring matter.\n" +
  "In practice: start with usdview, because it costs only unpacking an archive. Reach for " +
  "Omniverse when you want to see the Layer window and materials - " +
  "keeping in mind that since the Launcher was retired, it is a build, not an install.";

/* ===========================================================================
 * Track 2: STUDIO - a simulation of a real pipeline.
 *
 * This is not about learning another API, but about practicing what is
 * really done at work: departments publish their own layers, a shot combines
 * assets with references, someone overrides another person's decision, and before
 * publishing there is a validation gate. The output of every step - as above - is measured.
 * ======================================================================== */

export const LAB_STUDIO_INTRO =
  "Exercises 1-10 teach **mechanisms**. This track teaches **the way work is organized**: you build " +
  "from scratch a miniature production with the structure you will really see in a studio, " +
  "and you go through five situations that happen in this work " +
  "every day - publishing an asset, assembling a shot, rendering, *\"who broke this\"* " +
  "and the gate before publishing.\n" +
  "**These are not empty prims.** The chair has real geometry (six shapes, " +
  "46 x 88 x 46 cm) and a real `UsdPreviewSurface` material bound through " +
  "`material:binding`. After the third exercise you see it with your own eyes in " +
  "a rendered PNG.\n" +
  "Work in one folder; the scripts create the `show/` tree themselves. After each " +
  "step, **open the new files in an editor** - they are readable, and that is " +
  "half of the learning.";

export const LAB_STUDIO_TREE =
  "show/\n" +
  "  assets/\n" +
  "    chair/\n" +
  "      chair.usd            <- INTERFACE: what the rest of the studio sees\n" +
  "      chair_payload.usda   <- glue for the department layers\n" +
  "      chair_model.usda     <- modeling department\n" +
  "      chair_look.usda      <- lookdev department\n" +
  "  shots/\n" +
  "    sh010/\n" +
  "      sh010.usda           <- SHOT: combines the department layers\n" +
  "      sh010_layout.usda    <- layout department\n" +
  "      sh010_anim.usda      <- animation department\n" +
  "      sh010_light.usda     <- lighting department";

export const LAB_STUDIO_STEPS: LabStep[] = [
  {
    id: "studio-publish",
    title: "Publishing an asset - two departments, one asset, zero collisions",
    goal:
      "Build an asset the way a studio does: modeling and lookdev in separate " +
      "files, a thin interface layer on top. With real geometry " +
      "and a real material - it will not be an empty prim.",
    tag: "Pipeline 14% · L4 in practice",
    layerIndex: 4,
    script: `import os
from pxr import Usd, UsdGeom

def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\\n") as f:
        f.write(text)

# --- MODELING: a chair from six shapes. Cube is a gprim - it renders by itself,
#     without points/faceVertexIndices arrays. Dimensions in centimeters.
def shape(name, tx, ty, tz, sx, sy, sz):
    return f'''    def Cube "{name}"
    {{
        double size = 1
        double3 xformOp:translate = ({tx}, {ty}, {tz})
        double3 xformOp:scale = ({sx}, {sy}, {sz})
        uniform token[] xformOpOrder = ["xformOp:translate", "xformOp:scale"]
    }}
'''

parts = (
    shape("Seat",    0,  45,   0,   46,  5, 46) +
    shape("Back",    0,  68, -20,   46, 40,  5) +
    shape("Leg_FL", -20, 22,  20,    4, 45,  4) +
    shape("Leg_FR",  20, 22,  20,    4, 45,  4) +
    shape("Leg_BL", -20, 22, -20,    4, 45,  4) +
    shape("Leg_BR",  20, 22, -20,    4, 45,  4)
)

write("show/assets/chair/chair_model.usda", f'''#usda 1.0

def Xform "Chair"
{{
{parts}}}
''')

# --- LOOKDEV: a real UsdPreviewSurface network. Zero geometry.
write("show/assets/chair/chair_look.usda", '''#usda 1.0

over "Chair" (
    prepend apiSchemas = ["MaterialBindingAPI"]
)
{
    rel material:binding = </Chair/Looks/Wood>

    def Scope "Looks"
    {
        def Material "Wood"
        {
            token outputs:surface.connect = </Chair/Looks/Wood/PBR.outputs:surface>

            def Shader "PBR"
            {
                uniform token info:id = "UsdPreviewSurface"
                color3f inputs:diffuseColor = (0.42, 0.24, 0.11)
                float inputs:roughness = 0.55
                float inputs:metallic = 0
                token outputs:surface
            }
        }
    }
}
''')

# --- PAYLOAD: combines the department layers. Look is stronger = earlier in the list.
write("show/assets/chair/chair_payload.usda", '''#usda 1.0
(
    defaultPrim = "Chair"
    subLayers = [
        @./chair_look.usda@,
        @./chair_model.usda@
    ]
)
''')

# --- INTERFACE: the thin layer that the rest of the studio sees.
write("show/assets/chair/chair.usd", '''#usda 1.0
(
    defaultPrim = "Chair"
    metersPerUnit = 0.01
    upAxis = "Y"
)

def Xform "Chair" (
    kind = "component"
    prepend payload = @./chair_payload.usda@
)
{
}
''')

stage = Usd.Stage.Open("show/assets/chair/chair.usd")
print("published:", sorted(os.listdir("show/assets/chair")))
print("prims:", [p.GetName() for p in stage.Traverse()])
print("kind :", Usd.ModelAPI(stage.GetPrimAtPath("/Chair")).GetKind())
color = stage.GetPrimAtPath("/Chair/Looks/Wood/PBR").GetAttribute("inputs:diffuseColor")
print("color (lookdev):", color.Get())
bb = UsdGeom.BBoxCache(Usd.TimeCode.Default(), [UsdGeom.Tokens.default_])
r = bb.ComputeWorldBound(stage.GetPrimAtPath("/Chair")).ComputeAlignedRange()
print("size (cm):", r.GetMin(), "->", r.GetMax())`,
    expect: `published: ['chair.usd', 'chair_look.usda', 'chair_model.usda', 'chair_payload.usda']
prims: ['Chair', 'Seat', 'Back', 'Leg_FL', 'Leg_FR', 'Leg_BL', 'Leg_BR', 'Looks', 'Wood', 'PBR']
kind : component
color (lookdev): (0.42, 0.24, 0.11)
size (cm): (-23, -0.5, -23) -> (23, 88, 23)`,
    why:
      "Note what is **not** there: nobody edited someone else's file. Modeling " +
      "knows only the geometry, lookdev writes only an `over` with the material, and " +
      "`subLayers` in the payload layer joins them. Two departments work in parallel on the " +
      "same asset and never get into each other's file.\n" +
      "The size **46 x 88 x 46 cm** is not an accident - with `metersPerUnit = 0.01` " +
      "you get a chair the size of a chair. If someone forgot this metadata, " +
      "it would be a hundred times smaller (lesson L6).\n" +
      "The material is the full network from lesson L2: a `Material` with `outputs:surface.connect` " +
      "to a `UsdPreviewSurface` shader, and the geometry points to the material with **the relationship** " +
      "`material:binding` through `MaterialBindingAPI`. Not `displayColor` as a " +
      "shortcut - a real material that a renderer takes seriously.\n" +
      "**A common trap:** the layer " +
      "`chair_payload.usda` must have **its own** `defaultPrim`. Metadata is not " +
      "inherited from sublayers - without it you get *Unresolved payload " +
      "prim path*, although the prim `/Chair` exists in the layer below.",
    tweak: {
      task:
        "In `chair_payload.usda` reverse the order of `subLayers`: first `chair_model.usda`, " +
        "then `chair_look.usda`.",
      edits: [
        {
          find: "        @./chair_look.usda@,\n        @./chair_model.usda@\n",
          replace: "        @./chair_model.usda@,\n        @./chair_look.usda@\n",
        },
      ],
      expect: "published: ['chair.usd', 'chair_look.usda', 'chair_model.usda', 'chair_payload.usda']\nprims: ['Chair', 'Looks', 'Wood', 'PBR', 'Seat', 'Back', 'Leg_FL', 'Leg_FR', 'Leg_BL', 'Leg_BR']\nkind : component\ncolor (lookdev): (0.42, 0.24, 0.11)\nsize (cm): (-23, -0.5, -23) -> (23, 88, 23)",
      why:
        "The values did not change, because the departments do not disagree: modeling writes the geometry, " +
        "lookdev the material and the binding, no attribute has two opinions. The order of `subLayers` " +
        "decides only conflicts.\nSomething else changed - the order of the prims. Children from " +
        "the weaker layer come first, and the names that the stronger one brings are added after " +
        "them. Now lookdev is weaker, so `Looks` jumped ahead of `Seat`.",
      rerun: true,
    },
  },
  {
    id: "studio-shot",
    title: "Assembling a shot - layout, animation and lighting in separate layers",
    goal:
      "Build a shot from the published asset. Each department changes something that will be " +
      "clearly visible in the render: layout sets up the scene, animation rotates a chair, " +
      "lighting changes the light and repaints the second chair.",
    tag: "Pipeline 14% · Composition 23%",
    layerIndex: 4,
    script: `import os
from pxr import Usd

def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\\n") as f:
        f.write(text)

# --- floor: a checkerboard from ONE mesh. The color per face is a primvar
#     with interpolation "uniform", and the material reads it with UsdPrimvarReader_float3.
def floor(n=10, tile=25):
    half = n * tile / 2
    pts, idx, cols = [], [], []
    for j in range(n + 1):
        for i in range(n + 1):
            pts.append(f"({i * tile - half:g}, 0, {j * tile - half:g})")
    for j in range(n):
        for i in range(n):
            a = j * (n + 1) + i
            idx.append(f"{a}, {a + n + 1}, {a + n + 2}, {a + 1}")
            cols.append("(0.8, 0.8, 0.82)" if (i + j) % 2 else "(0.3, 0.3, 0.34)")
    return f'''    def Mesh "Floor" (
        prepend apiSchemas = ["MaterialBindingAPI"]
    )
    {{
        uniform bool doubleSided = true
        point3f[] points = [{", ".join(pts)}]
        int[] faceVertexCounts = [{", ".join(["4"] * (n * n))}]
        int[] faceVertexIndices = [{", ".join(idx)}]
        color3f[] primvars:displayColor = [{", ".join(cols)}] (
            interpolation = "uniform"
        )
        rel material:binding = </World/FloorLook>
    }}

    def Material "FloorLook"
    {{
        token outputs:surface.connect = </World/FloorLook/PBR.outputs:surface>

        def Shader "PBR"
        {{
            uniform token info:id = "UsdPreviewSurface"
            color3f inputs:diffuseColor.connect = </World/FloorLook/Color.outputs:result>
            float inputs:roughness = 0.8
            token outputs:surface
        }}

        def Shader "Color"
        {{
            uniform token info:id = "UsdPrimvarReader_float3"
            string inputs:varname = "displayColor"
            float3 outputs:result
        }}
    }}
'''

# --- LAYOUT: the floor, two chairs from ONE asset, a work light and a camera ---
write("show/shots/sh010/sh010_layout.usda", f'''#usda 1.0

def Xform "World"
{{
{floor()}
    def "ChairA" (
        prepend references = @../../assets/chair/chair.usd@
    )
    {{
        double3 xformOp:translate = (-45, 0, 0)
        uniform token[] xformOpOrder = ["xformOp:translate"]
    }}

    def "ChairB" (
        prepend references = @../../assets/chair/chair.usd@
    )
    {{
        double3 xformOp:translate = (45, 0, 0)
        uniform token[] xformOpOrder = ["xformOp:translate"]
    }}

    def DistantLight "Key"
    {{
        float inputs:intensity = 9000
        double3 xformOp:rotateXYZ = (-50, 30, 0)
        uniform token[] xformOpOrder = ["xformOp:rotateXYZ"]
    }}

    def DomeLight "Fill"
    {{
        float inputs:intensity = 4000
    }}

    def Camera "Cam"
    {{
        float focalLength = 35
        float2 clippingRange = (1, 5000)
        double3 xformOp:translate = (0, 230, 370)
        float xformOp:rotateX = -28
        uniform token[] xformOpOrder = ["xformOp:translate", "xformOp:rotateX"]
    }}
}}
''')

# --- ANIM: rotates ChairA - adds rotateY to the order of operations ---
write("show/shots/sh010/sh010_anim.usda", '''#usda 1.0

over "World"
{
    over "ChairA"
    {
        float xformOp:rotateY.timeSamples = {
            1: 50,
            24: 230,
        }
        uniform token[] xformOpOrder = ["xformOp:translate", "xformOp:rotateY"]
    }
}
''')

# --- LIGHT: dims the work light, hangs a lamp, repaints ChairB ---
write("show/shots/sh010/sh010_light.usda", '''#usda 1.0

over "World"
{
    over "ChairB"
    {
        over "Looks"
        {
            over "Wood"
            {
                over "PBR"
                {
                    color3f inputs:diffuseColor = (0.05, 0.05, 0.06)
                }
            }
        }
    }

    over "Key"
    {
        float inputs:intensity = 2500
    }

    over "Fill"
    {
        float inputs:intensity = 1200
    }

    def SphereLight "Lamp"
    {
        float inputs:intensity = 1500
        float inputs:radius = 3
        color3f inputs:color = (1, 0.78, 0.45)
        double3 xformOp:translate = (-110, 60, 40)
        uniform token[] xformOpOrder = ["xformOp:translate"]
    }
}
''')

# --- SHOT: combines the department layers. STRONGEST FIRST. ---
write("show/shots/sh010/sh010.usda", '''#usda 1.0
(
    defaultPrim = "World"
    metersPerUnit = 0.01
    upAxis = "Y"
    subLayers = [
        @./sh010_light.usda@,
        @./sh010_anim.usda@,
        @./sh010_layout.usda@
    ]
)
''')

s = Usd.Stage.Open("show/shots/sh010/sh010.usda")
print("prims on the stage:", len(list(s.Traverse())))
def color_of(ch):
    return s.GetPrimAtPath(f"/World/{ch}/Looks/Wood/PBR").GetAttribute("inputs:diffuseColor").Get()
print("ChairA color       :", color_of("ChairA"))
print("ChairB color       :", color_of("ChairB"))
rot = s.GetPrimAtPath("/World/ChairA").GetAttribute("xformOp:rotateY")
print("ChairA rotY at 1   :", rot.Get(1))
print("ChairA rotY at 12  :", rot.Get(12))
print("Key intensity      :", s.GetPrimAtPath("/World/Key").GetAttribute("inputs:intensity").Get())
print("ChairA xformOpOrder:", list(s.GetPrimAtPath("/World/ChairA").GetAttribute("xformOpOrder").Get()))`,
    expect: `prims on the stage: 29
ChairA color       : (0.42, 0.24, 0.11)
ChairB color       : (0.05, 0.05, 0.06)
ChairA rotY at 1   : 50.0
ChairA rotY at 12  : 136.0869598388672
Key intensity      : 2500.0
ChairA xformOpOrder: ['xformOp:translate', 'xformOp:rotateY']`,
    why:
      "Two chairs come from **one** asset file, and still they differ in " +
      "color, because the lighting department overrode one of them in its layer. Nobody " +
      "copied the asset and nobody touched `chair_look.usda`.\n" +
      "Note **how deep** this override reaches: " +
      "`/World/ChairB/Looks/Wood/PBR.inputs:diffuseColor`, that is into the inside of " +
      "a shader brought in by a reference. Through a reference you may reach " +
      "values at any depth - this is encapsulation from lesson L3, from the side of " +
      "what **is allowed**.\n" +
      "`Key intensity` is **2500**, although layout wrote 9000 - the lighting department " +
      "stands higher in `subLayers`, so its opinion wins. This is exactly the attribute " +
      "that the Layer stack widget in lesson L3 works on.\n" +
      "The animation does not only give the rotation values, it also **adds " +
      "`xformOp:rotateY` to `xformOpOrder`** - without this the attribute alone would rotate " +
      "nothing. The value at frame 12 is not written anywhere: it is interpolated " +
      "between the samples at frames 1 and 24 (lesson L1).\n" +
      "The floor is one mesh in which each face has a color from a `uniform` " +
      "primvar, and the material reads it through `UsdPrimvarReader_float3` - two things " +
      "from lesson L2 in one object.",
    tweak: {
      task:
        "In `sh010.usda` move layout to the start of the `subLayers` list, that is make it " +
        "the strongest.",
      edits: [
        {
          find: "        @./sh010_light.usda@,\n        @./sh010_anim.usda@,\n        @./sh010_layout.usda@\n",
          replace: "        @./sh010_layout.usda@,\n        @./sh010_light.usda@,\n        @./sh010_anim.usda@\n",
        },
      ],
      expect: "prims on the stage: 29\nChairA color       : (0.42, 0.24, 0.11)\nChairB color       : (0.05, 0.05, 0.06)\nChairA rotY at 1   : 50.0\nChairA rotY at 12  : 136.0869598388672\nKey intensity      : 9000.0\nChairA xformOpOrder: ['xformOp:translate']",
      why:
        "`Key` goes back to 9000, because layout is now stronger than the lighting department. " +
        "The `xformOpOrder` from layout (translate only) wins over the one from animation: the rotation samples " +
        "are still in the scene, but nothing uses them, so the chair stops rotating.\nAnd " +
        "`ChairB` stays black: layout says nothing about color, so the lighting department's override " +
        "has nobody to lose to. The layer order in the shot decides who wins " +
        "a dispute - that is why a studio sets it once, for all shots.",
      rerun: true,
    },
  },
  {
    id: "studio-render",
    title: "See your scene - render to PNG",
    goal:
      "Render the shot with one command and check in the image what each " +
      "department changed.",
    tag: "Visualization 8% · needs the binaries",
    layerIndex: 2,
    scriptLabel: "In the same console (after set_usd_env.bat)",
    shell: true,
    script: `usdrecord --disableCameraLight --camera /World/Cam --imageWidth 720 show\\shots\\sh010\\sh010.usda sh010.png`,
    expect: `Camera: /World/Cam
Renderer plugin: HdStormRendererPlugin
Recording time code: 0.000000`,
    image: {
      src: "renders/lab-sh010.png",
      alt:
        "A checkerboard with a brown chair turned diagonally on it, a warm spot of " +
        "light next to it, and on the right a black chair in the dim light.",
      caption: "This is how `sh010.png` should look.",
    },
    why:
      "In `sh010.png` you see the work of three departments at once. The left chair is " +
      "**rotated** - that is animation. Next to it lies a **warm spot of light** from " +
      "the lamp, and the rest of the scene is dimmed - that is lighting. The right chair " +
      "is **black** - that is the material override from the lighting layer.\n" +
      "The flag `--disableCameraLight` switches off the light attached to the camera that " +
      "`usdrecord` adds by default. Without it the scene would be lit evenly from " +
      "the front and the lighting department's work would be lost - only the lights written in " +
      "the files remain. `--camera /World/Cam` takes the camera that layout placed.\n" +
      "The warning *\"Dome light has no texture asset path\"* is normal - " +
      "a `DomeLight` with no HDRI map shines evenly.\n" +
      "You open the same scene in usdview: `usdview show/shots/sh010/sh010.usda`. " +
      "Move the time slider to frame 24, and the left chair turns another 180°.",
    tweak: {
      task:
        "Remove the flag `--disableCameraLight` from the command.",
      edits: [
        {
          find: "--disableCameraLight ",
          replace: "",
        },
      ],
      expect: "Camera: /World/Cam\nRenderer plugin: HdStormRendererPlugin\nRecording time code: 0.000000",
      why:
        "The console prints the same; the difference is in the image. Without the flag, `usdrecord` adds " +
        "a light attached to the camera and lights the scene evenly from the front: the black chair turns " +
        "gray, the floor gets brighter in the whole frame, and the warm spot of the lamp is barely " +
        "visible. To judge lighting you therefore render with `--disableCameraLight` - then " +
        "you see only the lights written in the files.",
      image: {
        src: "renders/lab-sh010-headlight.png",
        alt:
          "The same scene lit evenly from the front: the chair on the right is gray instead of " +
          "black, the floor is bright in the whole frame, the warm spot of the lamp is almost invisible.",
        caption: "The same shot without `--disableCameraLight`.",
      },
    },
  },
  {
    id: "studio-debug",
    title: "\"Who broke this?\" - track down the layer and the department",
    goal:
      "A classic ticket: *\"this chair is black, it was supposed to be brown\"*. " +
      "Find the culprit in a few seconds, without opening the files one by one.",
    tag: "Debugging 11% · everyday work",
    layerIndex: 7,
    script: `from pxr import Usd

s = Usd.Stage.Open("show/shots/sh010/sh010.usda")
path = "/World/ChairB/Looks/Wood/PBR"
attr = s.GetPrimAtPath(path).GetAttribute("inputs:diffuseColor")

print("value on the stage:", attr.Get())
print("who had a say (STRONGEST first):")
for i, spec in enumerate(attr.GetPropertyStack(Usd.TimeCode.Default())):
    file = spec.layer.identifier.split("/")[-1]
    print(f"  {i+1}. {file:22} -> {spec.default}")

print()
print("and for ChairA (nobody in the shot touched it):")
a = s.GetPrimAtPath("/World/ChairA/Looks/Wood/PBR").GetAttribute("inputs:diffuseColor")
for i, spec in enumerate(a.GetPropertyStack(Usd.TimeCode.Default())):
    file = spec.layer.identifier.split("/")[-1]
    print(f"  {i+1}. {file:22} -> {spec.default}")`,
    expect: `value on the stage: (0.05, 0.05, 0.06)
who had a say (STRONGEST first):
  1. sh010_light.usda       -> (0.05, 0.05, 0.06)
  2. chair_look.usda        -> (0.42, 0.24, 0.11)

and for ChairA (nobody in the shot touched it):
  1. chair_look.usda        -> (0.42, 0.24, 0.11)`,
    why:
      "This is the answer you really type on Slack: *\"the lighting department " +
      "overrode `inputs:diffuseColor` on ChairB, see `sh010_light.usda`\"*. " +
      "You do not guess and you do not look through six files - you get a list of opinions " +
      "with a file name next to each.\n" +
      "The comparison with `ChairA` is key: there is **one** opinion there, straight from " +
      "the asset. The difference between one and two entries tells you right away whether someone in " +
      "the shot interfered.\n" +
      "And most important: the lookdev opinion **did not disappear** - it still sits in " +
      "the list, it only lost. Remove the override from `sh010_light.usda`, run " +
      "the render again, and the brown comes back by itself. This is non-destructive editing in one " +
      "sentence.",
    tweak: {
      task:
        "In the first `GetAttribute` (for `ChairB`) ask for `inputs:roughness` instead of " +
        "`inputs:diffuseColor`.",
      edits: [
        {
          find: "attr = s.GetPrimAtPath(path).GetAttribute(\"inputs:diffuseColor\")",
          replace: "attr = s.GetPrimAtPath(path).GetAttribute(\"inputs:roughness\")",
        },
      ],
      expect: "value on the stage: 0.550000011920929\nwho had a say (STRONGEST first):\n  1. chair_look.usda        -> 0.550000011920929\n\nand for ChairA (nobody in the shot touched it):\n  1. chair_look.usda        -> (0.42, 0.24, 0.11)",
      why:
        "The lighting department overrode only the color on `ChairB` - the roughness still has one opinion, " +
        "straight from lookdev. An override works on a single attribute, not on the whole material: " +
        "everything you did not touch still flows from the asset and will change together with it. " +
        "The number 0.550000011920929 is 0.55 stored as a `float` - Python prints it with full " +
        "precision.",
    },
  },
  {
    id: "studio-validate",
    title: "A validation gate - catch the error before it reaches a hundred shots",
    goal:
      "Write a minimal validator for the asset contract and see how it rejects " +
      "the publish of a colleague who was in a hurry.",
    tag: "Data Exchange 15% · publishing",
    layerIndex: 6,
    script: `import os
from pxr import Usd

def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\\n") as f:
        f.write(text)

# A colleague published a table in a hurry - with no defaultPrim and no units.
write("show/assets/table/table.usd", '''#usda 1.0

def Xform "Table"
{
    def Cube "Top"
    {
        double size = 1
        double3 xformOp:scale = (120, 4, 80)
        uniform token[] xformOpOrder = ["xformOp:scale"]
    }
}
''')

def check(path):
    errors = []
    stage = Usd.Stage.Open(path)
    root = stage.GetDefaultPrim()

    if not root:
        errors.append("no defaultPrim - a reference with no path will not work")
    elif not Usd.ModelAPI(root).GetKind():
        errors.append("defaultPrim with no kind - it will not enter the model hierarchy")

    if not stage.HasAuthoredMetadata("metersPerUnit"):
        errors.append("no metersPerUnit - default 0.01, the asset may be 100x too small")
    if not stage.HasAuthoredMetadata("upAxis"):
        errors.append("no upAxis - default Y, the model may lie on its side")
    return errors

for asset in ["show/assets/chair/chair.usd", "show/assets/table/table.usd"]:
    errors = check(asset)
    status = "OK" if not errors else "REJECTED"
    print(f"[{status}] {asset}")
    for e in errors:
        print("        -", e)`,
    expect: `[OK] show/assets/chair/chair.usd
[REJECTED] show/assets/table/table.usd
        - no defaultPrim - a reference with no path will not work
        - no metersPerUnit - default 0.01, the asset may be 100x too small
        - no upAxis - default Y, the model may lie on its side`,
    why:
      "All three errors of the table are **silent**: the file opens, the geometry is there, " +
      "nobody gets an exception. You see them only when the table turns out " +
      "a hundred times too small or lying on its side - in fifteen shots at once.\n" +
      "That is why every studio has a gate before publishing. In a real pipeline " +
      "you call `usdchecker` for this (you have it if you chose way A of the setup), " +
      "but the idea is exactly the same as here: you check the **contract** " +
      "(`defaultPrim`, `kind`, units, axis) before anyone else sees the asset.\n" +
      "This validator has twenty lines and already catches the three most common publishing " +
      "errors. Extending it with more rules is a very typical first " +
      "task for a junior in a pipeline department.",
    tweak: {
      task:
        "Give the table a `defaultPrim`: in the file `table.usd`, add the header " +
        "`(defaultPrim = \"Table\")` under `#usda 1.0`.",
      edits: [
        {
          find: "write(\"show/assets/table/table.usd\", '''#usda 1.0\n\ndef Xform \"Table\"",
          replace: "write(\"show/assets/table/table.usd\", '''#usda 1.0\n(\n    defaultPrim = \"Table\"\n)\n\ndef Xform \"Table\"",
        },
      ],
      expect: "[OK] show/assets/chair/chair.usd\n[REJECTED] show/assets/table/table.usd\n        - defaultPrim with no kind - it will not enter the model hierarchy\n        - no metersPerUnit - default 0.01, the asset may be 100x too small\n        - no upAxis - default Y, the model may lie on its side",
      why:
        "One error fewer, and a new one appeared in the list: `defaultPrim with no kind`. The validator " +
        "checks `kind` only when there is a `defaultPrim` - fixing one error " +
        "revealed the next. That is why validation runs after every fix, not once at " +
        "the end.",
    },
  },
];
