"""Snapshot of the composed factory for the 3D view (the Drone Factory page).

Usage: python factory_snapshot.py <step_folder> <output.json>

Opens factory.usda in the step folder and writes what USD composed:
the prim tree with local matrices, shapes with their parameters and the color
from the bound material (or displayColor), PointInstancers, lights, the camera,
the robot joint limits, the factory:* attributes with the layer that gave them,
the colors of the paint variants, and the tree of the drone asset on its own.
scripts/verify-factory.ts runs it.
"""
import json
import os
import sys

from pxr import Plug, Usd, UsdGeom, UsdLux, UsdPhysics, UsdShade

FOLDER, OUTPUT = sys.argv[1], sys.argv[2]
os.chdir(FOLDER)
if os.path.isdir("factory_schema"):
    Plug.Registry().RegisterPlugins(os.path.abspath("factory_schema"))

SHAPES = {"Cube", "Sphere", "Cylinder", "Cone", "Capsule"}


def r(x, n=4):
    return round(float(x), n)


def matrix(m):
    return [r(m[i][j], 5) for i in range(4) for j in range(4)]


def surface(prim):
    """Color and the rest of the look: from a UsdPreviewSurface material or from displayColor."""
    out = {}
    material, _ = UsdShade.MaterialBindingAPI(prim).ComputeBoundMaterial()
    if material:
        shader, _, _ = material.ComputeSurfaceSource()
        if shader:
            for name, key in [("diffuseColor", "c"), ("emissiveColor", "e")]:
                inp = shader.GetInput(name)
                if inp and inp.Get() is not None:
                    out[key] = [r(x, 3) for x in inp.Get()]
            for name, key in [("opacity", "o"), ("roughness", "ro"), ("metallic", "me")]:
                inp = shader.GetInput(name)
                if inp and inp.Get() is not None:
                    out[key] = r(inp.Get(), 3)
        out["mat"] = str(material.GetPath())
        return out
    primvars = UsdGeom.PrimvarsAPI(prim)
    color = primvars.GetPrimvar("displayColor")
    if color and color.HasValue():
        out["c"] = [r(x, 3) for x in color.ComputeFlattened()[0]]
    opacity = primvars.GetPrimvar("displayOpacity")
    if opacity and opacity.HasValue():
        out["o"] = r(opacity.ComputeFlattened()[0], 3)
    return out


def shape(prim):
    kind = prim.GetTypeName()
    g = {}
    if kind == "Cube":
        g["size"] = r(prim.GetAttribute("size").Get())
    elif kind == "Sphere":
        g["radius"] = r(prim.GetAttribute("radius").Get())
    else:
        g["radius"] = r(prim.GetAttribute("radius").Get())
        g["height"] = r(prim.GetAttribute("height").Get())
        g["axis"] = prim.GetAttribute("axis").Get()
    return g


def ops(xformable):
    """Translate + one rotation around an axis - the twin can turn such nodes."""
    t, axis, angle = [0, 0, 0], None, 0
    for op in xformable.GetOrderedXformOps():
        kind = op.GetOpType()
        if kind == UsdGeom.XformOp.TypeTranslate:
            t = [r(x) for x in op.Get()]
        elif kind in (UsdGeom.XformOp.TypeRotateX, UsdGeom.XformOp.TypeRotateY, UsdGeom.XformOp.TypeRotateZ) and axis is None:
            axis = {UsdGeom.XformOp.TypeRotateX: "X", UsdGeom.XformOp.TypeRotateY: "Y", UsdGeom.XformOp.TypeRotateZ: "Z"}[kind]
            angle = r(op.Get())
        else:
            return None
    return {"t": t, "ax": axis, "a": angle} if axis else None


def export(root, lights=None, camera=None):
    """The prim tree under the root (with instance proxies). PointInstancers separately."""
    nodes, index, instancers = [], {}, []
    prims = iter(Usd.PrimRange(root, Usd.TraverseInstanceProxies(Usd.PrimDefaultPredicate)))
    for prim in prims:
        path = prim.GetPath()
        parent = path.GetParentPath()
        while parent not in index and parent != root.GetPath().GetParentPath() and not parent.isEmpty:
            parent = parent.GetParentPath()
        u = index.get(parent, -1)

        if prim.IsA(UsdLux.DistantLight) or prim.IsA(UsdLux.DomeLight):
            if lights is not None:
                light = UsdLux.LightAPI(prim)
                lights.append({
                    "k": prim.GetTypeName(),
                    "m": matrix(UsdGeom.Xformable(prim).ComputeLocalToWorldTransform(Usd.TimeCode.Default())),
                    "i": r(light.GetIntensityAttr().Get()),
                    "c": [r(x, 3) for x in light.GetColorAttr().Get()],
                })
            continue
        if prim.IsA(UsdGeom.Camera):
            if camera is not None:
                cam = UsdGeom.Camera(prim)
                camera.update({
                    "m": matrix(cam.ComputeLocalToWorldTransform(Usd.TimeCode.Default())),
                    "focal": r(cam.GetFocalLengthAttr().Get()),
                    "hAp": r(cam.GetHorizontalApertureAttr().Get()),
                    "vAp": r(cam.GetVerticalApertureAttr().Get()),
                    "clip": [r(x) for x in cam.GetClippingRangeAttr().Get()],
                })
            continue
        if not prim.IsA(UsdGeom.Xformable):
            continue
        imageable = UsdGeom.Imageable(prim)
        if imageable.ComputeVisibility() == UsdGeom.Tokens.invisible or imageable.ComputePurpose() == UsdGeom.Tokens.guide:
            prims.PruneChildren()
            continue

        xformable = UsdGeom.Xformable(prim)
        node = {"p": str(path), "u": u, "k": prim.GetTypeName() or "Xform", "m": matrix(xformable.GetLocalTransformation())}
        turn = ops(xformable)
        if turn:
            node["x"] = turn
        if prim.GetTypeName() in SHAPES:
            node["g"] = shape(prim)
            node.update(surface(prim))
        index[path] = len(nodes)
        nodes.append(node)

        if prim.IsA(UsdGeom.PointInstancer):
            pi = UsdGeom.PointInstancer(prim)
            prototypes = [export(prim.GetStage().GetPrimAtPath(p))["nodes"] for p in pi.GetPrototypesRel().GetTargets()]
            matrices = pi.ComputeInstanceTransformsAtTime(Usd.TimeCode.Default(), Usd.TimeCode.Default())
            instancers.append({
                "w": len(nodes) - 1,
                "proto": prototypes,
                "inst": [{"i": int(i), "m": matrix(m)} for i, m in zip(pi.GetProtoIndicesAttr().Get(), matrices)],
            })
            prims.PruneChildren()
    return {"nodes": nodes, "instancers": instancers}


stage = Usd.Stage.Open("factory.usda")
lights, camera = [], {}
scene = export(stage.GetPrimAtPath("/Factory"), lights, camera)
result = {"scene": scene, "lights": lights, "camera": camera}

# robot joint limits - as the UsdPhysics parser sees them
robot = stage.GetPrimAtPath("/Factory/Stations/Robot")
if robot:
    descs = UsdPhysics.LoadUsdPhysicsFromRange(stage, [str(robot.GetPath())])
    result["limits"] = {
        str(p.name): [r(d.limit.lower), r(d.limit.upper)]
        for p, d in zip(*descs.get(UsdPhysics.ObjectType.RevoluteJoint, ([], [])))
    }

# factory parameters: the value and the layer it came from (or the schema)
params = {}
for path, names in [
    ("/Factory/Line", ["factory:taktTime", "factory:beltSpeed"]),
    ("/Factory/Stations/Robot", ["factory:speed", "factory:state", "factory:temperature", "factory:count"]),
    ("/Factory/Stations/PaintShop", ["factory:speed"]),
]:
    prim = stage.GetPrimAtPath(path)
    for name in names:
        attr = prim.GetAttribute(name) if prim else None
        if not attr or attr.Get() is None:
            continue
        stack = attr.GetPropertyStack(Usd.TimeCode.Default())
        value = attr.Get()
        params[f"{prim.GetName()}.{name}"] = {
            "v": value if isinstance(value, str) else r(value),
            "z": [os.path.basename(s.layer.realPath) for s in stack] or ["schema"],
            # the value in each layer of the stack - for example process.usda under night_shift.usda
            "w": [s.default if isinstance(s.default, str) else r(s.default) for s in stack],
        }
result["params"] = params

# colors of the paint variants, read from the sample on the pedestal
sample = stage.GetPrimAtPath("/Factory/Showcase/Sample")
if sample and sample.GetVariantSets().HasVariantSet("paint"):
    vset = sample.GetVariantSets().GetVariantSet("paint")
    stage.SetEditTarget(stage.GetSessionLayer())
    colors = {}
    for name in vset.GetVariantNames():
        vset.SetVariantSelection(name)
        colors[name] = surface(stage.GetPrimAtPath(str(sample.GetPath()) + "/Body"))["c"]
    vset.ClearVariantSelection()
    result["paints"] = colors

# the drone asset on its own - the twin makes the drones on the belt from it
if os.path.exists("assets/drone.usda"):
    drone = Usd.Stage.Open("assets/drone.usda")
    result["drone"] = export(drone.GetPrimAtPath("/Drone"))["nodes"]

json.dump(result, open(OUTPUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
