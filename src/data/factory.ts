/* ===========================================================================
 * Drone Factory - a digital twin built step by step from USD.
 *
 * Each step adds files to the factory folder (src/core/factory/usd.ts) and
 * has a check script. npm run verify:factory runs it on real USD and saves
 * the output and a scene snapshot for the 3D view
 * (src/data/factory.verified.ts). The browser computes the motion in the twin.
 * ======================================================================== */

export interface FactoryStep {
  title: string;
  /** Short label on the step bar. */
  short: string;
  /** The USD idea that the step teaches. */
  concept: string;
  /** What we build and why - paragraphs with inline markdown. */
  md: string[];
  /** What you see in the twin and what to try. */
  twin: string;
  /** Check script (Python, run in the factory folder). */
  check: string;
  /** After the output: what it tells you. */
  why: string;
}

export const FACTORY_INTRO =
  "We build a hall that makes drones: from an empty stage to a line that moves, " +
  "paints, tests and reacts to what you set. This is how a **digital twin** works - a " +
  "model of the factory described in USD, where you see what will happen before you " +
  "change something in the real hall. Each step adds `.usda` files and teaches one USD idea.\n" +
  "The 3D view draws what USD composed from the files of that step - from the same " +
  "matrices, materials and instances. The browser computes the motion (belt, robot, test flight) " +
  "from the parameters written in the scene. In Omniverse you can open the same folder " +
  "as a scene, and at the end you get it packed into one `.usdz`.";

/** The common start of the scripts from step 6 - the plugin with the schema must come first. */
const PLUGIN = `import os
from pxr import Plug
Plug.Registry().RegisterPlugins(os.path.abspath("factory_schema"))

`;

export const FACTORY_STEPS: FactoryStep[] = [
  {
    title: "The hall: an empty stage that already knows things",
    short: "Hall",
    concept: "Stage metadata, kind, camera and lights",
    md: [
      "We start with one file, `factory.usda`. Before the first machine goes in, we set " +
        "three things that are expensive to change later: the **units** " +
        "(`metersPerUnit = 1` - we work in meters), the **up axis** (`upAxis = \"Y\"`) and " +
        "the **defaultPrim**, the prim that anyone gets when they reference the factory without a path.",
      "The prim `Factory` has `kind = \"assembly\"`, and `Hall` has `kind = \"group\"`. This is the " +
        "start of the model hierarchy: tools will know where the hall ends and the machines " +
        "begin. Then a sun (`DistantLight`), a sky (`DomeLight`) and a camera - the 3D view " +
        "starts exactly from its frame.",
    ],
    twin: "An empty hall with a floor, safety lines, a wall and columns. Turn the view with the mouse, zoom with the wheel.",
    check: `from pxr import Usd, UsdGeom

stage = Usd.Stage.Open("factory.usda")
print("defaultPrim  :", stage.GetDefaultPrim().GetPath())
print("units        :", UsdGeom.GetStageMetersPerUnit(stage), "| upAxis:", UsdGeom.GetStageUpAxis(stage))
print("Factory kind :", Usd.ModelAPI(stage.GetDefaultPrim()).GetKind())

bbox = UsdGeom.BBoxCache(Usd.TimeCode.Default(), [UsdGeom.Tokens.default_])
hall = bbox.ComputeWorldBound(stage.GetPrimAtPath("/Factory/Hall")).ComputeAlignedRange()
print("hall (m)     :", [round(x, 2) for x in hall.GetSize()])

camera = UsdGeom.Camera(stage.GetPrimAtPath("/Factory/Camera")).GetCamera(Usd.TimeCode.Default())
print("camera looks :", [round(x, 2) for x in camera.frustum.ComputeViewDirection()])`,
    why:
      "The hall is 28 x 14 m, and the back wall and the columns are 4.5 m high - the unit is the meter. The camera looks " +
      "down, along -Z (like every USD camera with no rotation around Y) - that is the frame you see in 3D at the start. All the next steps " +
      "add prims under `/Factory`, so `defaultPrim` points to the whole thing from the start.",
  },
  {
    title: "The drone as an asset: a reference, not a copy",
    short: "Drone",
    concept: "Reference, the asset's defaultPrim, kind component, nested references",
    md: [
      "The drone is made in its own file, `assets/drone.usda`: body, arms, motors, skids and " +
        "`UsdPreviewSurface` materials. It has its own `defaultPrim` and `kind = \"component\"` - " +
        "it is a complete, self-contained asset.",
      "The rotor is an even smaller asset, `assets/rotor.usda`, and the drone pulls it in four " +
        "times with a reference. The factory does not copy the drone either: the prim `Sample` on the pedestal has " +
        "`prepend references = @./assets/drone.usda@`. A fix in the drone file changes every " +
        "drone in the hall.",
    ],
    twin: "At the entrance, the sample drone stands on a turning pedestal. It is the only drone in the hall - for now.",
    check: `from pxr import Usd, UsdGeom

stage = Usd.Stage.Open("factory.usda")
sample = stage.GetPrimAtPath("/Factory/Showcase/Sample")
for path in [sample.GetPath(), sample.GetPath().AppendPath("Rotors/Rotor_1")]:
    prim = stage.GetPrimAtPath(path)
    for arc in Usd.PrimCompositionQuery(prim).GetCompositionArcs():
        file = arc.GetTargetNode().layerStack.identifier.rootLayer.identifier.split("/")[-1]
        print(f"{prim.GetName():9} {str(arc.GetArcType()):22} -> {file}")

print("kind:", Usd.ModelAPI(sample).GetKind(), "| IsModel:", sample.IsModel())
bbox = UsdGeom.BBoxCache(Usd.TimeCode.Default(), [UsdGeom.Tokens.default_])
print("size (m):", [round(x, 3) for x in bbox.ComputeUntransformedBound(sample).ComputeAlignedRange().GetSize()])`,
    why:
      "The list of arcs tells you where a prim gets its content: `Sample` has the root and a reference to " +
      "`drone.usda`, and the rotor under it has one more, to `rotor.usda`. References " +
      "nest, and all the paths in the assets are relative, so you can move the factory folder " +
      "as a whole. The drone is about 61 x 42 cm with the rotor blades, and 14.5 cm high.",
  },
  {
    title: "The belt: 18 segments from one prototype",
    short: "Belt",
    concept: "PointInstancer and prototypes",
    md: [
      "The belt is 18 identical segments of one meter. Instead of 18 copies of prims there is one " +
        "`PointInstancer`: a prototype (`assets/segment.usda`), a list of positions and a list of " +
        "prototype indices, one for each instance. In the file these are three attributes, and the renderer draws 18 " +
        "segments from one geometry.",
      "From this step the line is alive: the feeder releases drone bodies every **takt time** in seconds, and " +
        "the belt carries them at the speed you set. For now they ride to the end and go straight to " +
        "pickup - nobody assembles them yet.",
    ],
    twin:
      "Bodies ride on the belt. Change the takt time and the belt speed: with a short takt and a slow " +
      "belt you will see the feeder wait, because there is no room for a new body.",
    check: `from pxr import Usd, UsdGeom

stage = Usd.Stage.Open("factory.usda")
belt = UsdGeom.PointInstancer(stage.GetPrimAtPath("/Factory/Line/Belt"))
matrices = belt.ComputeInstanceTransformsAtTime(Usd.TimeCode.Default(), Usd.TimeCode.Default())
print("segments  :", len(matrices), "| prototypes:", len(belt.GetPrototypesRel().GetTargets()))
print("from x =", matrices[0].ExtractTranslation()[0], "to x =", matrices[-1].ExtractTranslation()[0])

bbox = UsdGeom.BBoxCache(Usd.TimeCode.Default(), [UsdGeom.Tokens.default_])
band = stage.GetPrimAtPath("/Factory/Line/Belt/Prototypes/Segment/Band")
print("top of the band (m):", round(bbox.ComputeWorldBound(band).ComputeAlignedRange().GetMax()[1], 3))
print("prims in the scene:", len(list(stage.Traverse())))`,
    why:
      "18 instances, one prototype. The number of prims in the scene does not grow with the number of segments - " +
      "`Traverse` sees only the instancer and its prototype. The height of the band (0.795 m) is the same " +
      "number the twin uses to place the drones.",
  },
  {
    title: "The robot: joints with limits",
    short: "Robot",
    concept: "xformOps as joint angles, UsdPhysics RevoluteJoint, kinematic bodies",
    md: [
      "The robot mounts four rotors on each drone. Its links are nested: `Swivel` " +
        "(around Y), and in it `Arm`, `Elbow` and `Gripper` (around Z). Each link has " +
        "`xformOp:translate` and one rotation - the joint angle is simply the value of " +
        "`xformOp:rotateY` or `xformOp:rotateZ`.",
      "UsdPhysics describes the joints too: a `PhysicsRevoluteJoint` connects two links and gives the axis and " +
        "the limits in degrees. The links are **kinematic** bodies (`kinematicEnabled = 1`) - " +
        "in a digital twin the angles come from the robot controller, not from a force simulation. The twin " +
        "keeps to the same limits that you wrote in the file.",
    ],
    twin:
      "The robot takes a rotor from the rack and screws it onto the drone. Change the robot speed: when " +
      "assembly takes longer than the takt time, a queue grows in front of the station.",
    check: `from pxr import Usd, UsdGeom, UsdPhysics

stage = Usd.Stage.Open("factory.usda")
result = UsdPhysics.LoadUsdPhysicsFromRange(stage, ["/Factory/Stations/Robot"])
for path, desc in zip(*result[UsdPhysics.ObjectType.RevoluteJoint]):
    print(f"{path.name:10} axis {desc.axis} | limit {desc.limit.lower:5.0f} .. {desc.limit.upper:4.0f} | {desc.body0.name} -> {desc.body1.name}")
kinematic = [str(p.name) for p, d in zip(*result[UsdPhysics.ObjectType.RigidBody]) if d.kinematicBody]
print("kinematic links:", kinematic)
arm = UsdGeom.Xformable(stage.GetPrimAtPath("/Factory/Stations/Robot/Swivel/Arm"))
print("xformOpOrder Arm:", list(arm.GetXformOpOrderAttr().Get()))`,
    why:
      "The parser read four joints with axes and limits, and four kinematic links. " +
      "The link's `xformOpOrder` is translate, then the rotation: first the link turns in its " +
      "joint, then it moves into place. The controller changes only the angle - the rest of the " +
      "hierarchy follows it by itself.",
  },
  {
    title: "Paint shop and warehouse: variants, payload, instancing",
    short: "Paint",
    concept: "variantSet, the Local > Variants trap, payload, native instancing",
    md: [
      "The drone gets `variantSet \"paint\"` with four variants: gray, red, blue and " +
        "yellow. Each variant overrides `inputs:diffuseColor` of the `Shell` material. " +
        "**The trap:** if the gray color were in the material's base, it would win against every " +
        "variant - a local opinion is stronger than a variant (LIVERPS). So every variant writes the color, " +
        "gray too, and the base has none.",
      "The paint shop comes in through a **payload**: a heavy model that you can open without " +
        "loading it (`LoadNone`). The warehouse holds 8 finished drones as `instanceable` references, " +
        "each with its chosen paint. USD makes one prototype for each combination - " +
        "here, four.",
    ],
    twin:
      "Drones go into the paint shop and come out in the color of the order. Change the mix of " +
      "orders. Finished drones go onto the pallets in the warehouse.",
    check: `from pxr import Usd, UsdShade

stage = Usd.Stage.Open("factory.usda")
sample = stage.GetPrimAtPath("/Factory/Showcase/Sample")
paint = sample.GetVariantSets().GetVariantSet("paint")
print("variants:", paint.GetVariantNames(), "| selected:", paint.GetVariantSelection())
body = stage.GetPrimAtPath("/Factory/Showcase/Sample/Body")
for name in paint.GetVariantNames():
    paint.SetVariantSelection(name)
    material, _ = UsdShade.MaterialBindingAPI(body).ComputeBoundMaterial()
    color = material.ComputeSurfaceSource()[0].GetInput("diffuseColor").Get()
    print(f"  {name:9} -> {tuple(round(c, 2) for c in color)}")

unloaded = Usd.Stage.Open("factory.usda", Usd.Stage.LoadNone)
shop = unloaded.GetPrimAtPath("/Factory/Stations/PaintShop")
print("paint shop with LoadNone: loaded", shop.IsLoaded(), "| children:", len(shop.GetChildren()))
print("drones in the warehouse: 8 | prototypes:", len(stage.GetPrototypes()))`,
    why:
      "Four variants give four colors of the same shell - there is only one drone file. " +
      "Opened with `LoadNone`, the paint shop exists as a prim, but without content: this is how you open " +
      "a large hall when you work on one station. 8 instances in 4 paints give 4 " +
      "prototypes - the variant is part of what instances must have in common.",
  },
  {
    title: "Sensors: a custom schema, not loose attributes",
    short: "Sensors",
    concept: "Codeless API schema, default values, allowedTokens",
    md: [
      "The machines start to report their state. Instead of adding loose attributes to each one, " +
        "we define the schema `FactoryMachineAPI` (speed, state, temperature, count) and " +
        "`FactoryLineAPI` (takt time, belt speed) - without compiling, through `plugInfo.json` " +
        "and `generatedSchema.usda` (as in the Customizing track of the Lab).",
      "The robot and the paint shop get `prepend apiSchemas = [\"FactoryMachineAPI\"]`, the line gets " +
        "`FactoryLineAPI`. The factory file has not a single value: everything comes from the " +
        "schema, and `factory:state` can only be `running`, `idle` or `fault`.",
    ],
    twin:
      "Status lamps glow above the robot and the paint shop, and the panel shows the sensor readings. " +
      "The twin's parameters start from the schema's default values.",
    check:
      PLUGIN +
      `from pxr import Usd

stage = Usd.Stage.Open("factory.usda")
robot = stage.GetPrimAtPath("/Factory/Stations/Robot")
print("robot schemas:", list(robot.GetAppliedSchemas()))
for name in ["factory:speed", "factory:state", "factory:temperature", "factory:count"]:
    attr = robot.GetAttribute(name)
    print(f"  {name:20} = {attr.Get()!s:7} | authored in the file: {attr.HasAuthoredValue()}")
print("allowed states:", list(robot.GetAttribute("factory:state").GetMetadata("allowedTokens")))
line = stage.GetPrimAtPath("/Factory/Line")
print("takt:", line.GetAttribute("factory:taktTime").Get(), "s | belt:", line.GetAttribute("factory:beltSpeed").Get(), "m/s")`,
    why:
      "Every attribute has a value, although `HasAuthoredValue()` returns `False` - these are the default " +
      "values from the schema. A change to the default takt time in the schema works at once in every " +
      "hall. `allowedTokens` is a contract: a tool knows which states to expect.",
  },
  {
    title: "Departments and live data: layers",
    short: "Layers",
    concept: "subLayers, department layers, a session layer for telemetry",
    md: [
      "The factory has grown, and several people work on it. `factory.usda` is now only a list of " +
        "layers: `layout.usda` (what stands where - the layout department) and `process.usda` (takt times and " +
        "speeds - the process engineer). The process engineer changes their numbers without touching the layout.",
      "Sensor data is a third kind: it changes every second and should not go " +
        "into the files. The twin writes it to the **session layer** - the strongest one, but " +
        "never saved. From this step the twin's sliders write to `process.usda`, and the sensor " +
        "readings go to the session. You see both layers live below.",
    ],
    twin:
      "Move the takt slider and watch `process.usda`, then the session - the readings change " +
      "by themselves, and the file has no trace of them.",
    check:
      PLUGIN +
      `from pxr import Usd

stage = Usd.Stage.Open("factory.usda")
print("layers:", [os.path.basename(l.realPath) for l in stage.GetLayerStack(includeSessionLayers=False)])
robot = stage.GetPrimAtPath("/Factory/Stations/Robot")
speed = robot.GetAttribute("factory:speed")
print("robot speed:", speed.Get(), "from", [os.path.basename(s.layer.realPath) for s in speed.GetPropertyStack()])

stage.SetEditTarget(stage.GetSessionLayer())
robot.GetAttribute("factory:state").Set("running")
robot.GetAttribute("factory:temperature").Set(41.5)
print("live:", robot.GetAttribute("factory:state").Get(), robot.GetAttribute("factory:temperature").Get())
stage.Save()

again = Usd.Stage.Open("factory.usda")
r2 = again.GetPrimAtPath("/Factory/Stations/Robot")
print("after save and reopen:", r2.GetAttribute("factory:state").Get(), r2.GetAttribute("factory:temperature").Get())`,
    why:
      "The robot speed (1.25) comes from `process.usda` - the schema would give 1. The readings written to the " +
      "session work while the stage is open, and after you open it again the default values come " +
      "back: `Save()` saves the file layers, not the session. This way the twin does not fill " +
      "the department layers with sensor data.",
  },
  {
    title: "A fault: who slowed the robot down?",
    short: "Fault",
    concept: "Debugging: GetPropertyStack, MuteLayer, the order of subLayers",
    md: [
      "In the morning, output dropped by half. The process engineer swears that in `process.usda` the robot has " +
        "speed 1.25 - and they are right. But someone from the night shift added, at the start of " +
        "`subLayers`, the layer `night_shift.usda` with `factory:speed = 0.4`.",
      "This is a classic twin situation: you move the speed slider in the twin, and the robot is still " +
        "slow, because the stronger layer wins. `GetPropertyStack` shows the guilty layer " +
        "at once, and `MuteLayer` lets you test a fix without touching the files.",
    ],
    twin:
      "The robot is slow, and a queue grows in front of assembly. Try to speed it up with the slider - " +
      "nothing happens. Mute `night_shift.usda` with the switch and watch the line go back to " +
      "its pace. The fault button writes `factory:state = \"fault\"` to the session.",
    check:
      PLUGIN +
      `from pxr import Usd

stage = Usd.Stage.Open("factory.usda")
speed = stage.GetPrimAtPath("/Factory/Stations/Robot").GetAttribute("factory:speed")
print("robot speed:", round(speed.Get(), 2))
for spec in speed.GetPropertyStack():
    print("   ", os.path.basename(spec.layer.realPath), "->", round(spec.default, 2))

night = [l for l in stage.GetLayerStack() if l.realPath.endswith("night_shift.usda")][0]
print("layer doc:", night.documentation)
stage.MuteLayer(night.identifier)
print("after MuteLayer:", round(speed.Get(), 2))`,
    why:
      "The opinion stack tells you everything: `night_shift.usda` stands before `process.usda`, so its " +
      "0.4 wins. Muting the layer brings back 1.25 without editing files - only when " +
      "you know that this helps do you remove the layer from `subLayers` (in step 9 it is gone). " +
      "The layer's `doc` metadata says why it was added - it is worth filling in.",
  },
  {
    title: "Test flight and shipping: physics and .usdz",
    short: "Test",
    concept: "UsdPhysics in an asset, collision shapes, dependencies and .usdz",
    md: [
      "The last station: the test cage. Each drone takes off, hovers, and only then goes " +
        "to the warehouse. A drone with a missing rotor tilts and falls into the reject bin. " +
        "For the test to be a simulation, the drone asset gets physics: `PhysicsRigidBodyAPI`, " +
        "`PhysicsMassAPI` with a mass of 1.2 kg, and collision shapes on the body and the skids.",
      "**The trap:** physics added to an asset works in **every** copy - the sample on the " +
        "pedestal and the drones in the warehouse also become bodies that will fall if there is no " +
        "collision under them. So the floor, the pedestal and the pallets get `PhysicsCollisionAPI`. At the end " +
        "the whole factory goes into one `.usdz` file.",
    ],
    twin:
      "Drones take off in the cage. Set the defect rate: sometimes the robot drops a rotor, and a drone without " +
      "it will not pass the test. You can download the factory file below and open it in usdview.",
    check:
      PLUGIN +
      `import zipfile
from pxr import Sdf, Usd, UsdPhysics, UsdUtils

stage = Usd.Stage.Open("factory.usda")
result = UsdPhysics.LoadUsdPhysicsFromRange(stage, ["/Factory"])
paths, descs = result[UsdPhysics.ObjectType.RigidBody]
dynamic = [str(p) for p, d in zip(paths, descs) if not d.kinematicBody]
print("dynamic bodies:", len(dynamic), "| for example", dynamic[0], "and", dynamic[-1])
print("robot links (kinematic):", sum(d.kinematicBody for d in descs))
static = set()
for kind in (UsdPhysics.ObjectType.CubeShape, UsdPhysics.ObjectType.CylinderShape):
    for p, d in zip(*result.get(kind, ([], []))):
        if d.rigidBody.isEmpty:
            static.add(p.name)
print("static shapes:", sorted(static))

layers, assets, missing = UsdUtils.ComputeAllDependencies(Sdf.AssetPath("factory.usda"))
print("layers to ship:", len(layers), "| missing:", missing)
UsdUtils.CreateNewUsdzPackage(Sdf.AssetPath("factory.usda"), "factory.usdz")
print("in factory.usdz:", zipfile.ZipFile("factory.usdz").namelist())`,
    why:
      "The sample and the eight drones from the warehouse are nine dynamic bodies - as many as there are " +
      "copies of the asset. The robot is four kinematic bodies. The shapes without a body " +
      "(floor, pallets, pedestal, the pad in the cage, the bottom of the bin, the robot base) are " +
      "walls where everything stops. The `.usdz` package has all the layers and assets, but not the plugin with the " +
      "schema - outside this app `FactoryMachineAPI` stays in the file as an unknown " +
      "schema, and the values are still readable.",
  },
];
