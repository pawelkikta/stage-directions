import { Highlight } from "../Highlight.tsx";

interface Bridge {
  concept: string;
  code: string;
  note: string;
  star?: boolean;
}

/* Mapping the ideas of the app to real pxr calls (USD Python API). Read-only. */
const BRIDGES: Bridge[] = [
  {
    concept: "Sdf vs Usd - a raw layer vs a composed stage",
    code:
      'from pxr import Usd, Sdf\n' +
      'stage = Usd.Stage.Open("shot.usda")      # the Usd view (composed)\n' +
      'layer = Sdf.Layer.FindOrOpen("shot.usda") # the Sdf layer (raw)',
    note: "Exactly the split used in the app: Stage = after composition, Layer = one file.",
    star: true,
  },
  {
    concept: "Prim and path",
    code:
      'prim = stage.GetPrimAtPath("/World/Ball")\n' +
      'for p in stage.Traverse():\n' +
      '    print(p.GetPath(), p.GetTypeName())',
    note: "Traverse walks the composed scenegraph (by default it skips inactive prims and classes).",
  },
  {
    concept: "Attribute value = value resolution",
    code:
      'attr = prim.GetAttribute("radius")\n' +
      'attr.Get()                  # the final, composed value\n' +
      'attr.Get(Usd.TimeCode(10))  # at a given time (timeSamples)',
    note: "Get() returns the result of LIVERPS - the resolved value, not a raw opinion.",
  },
  {
    concept: "The LIVERPS tracer in real life - where does this value come from?",
    code:
      'attr.GetPropertyStack(Usd.TimeCode.Default())\n' +
      '# -> the list of opinions (SdfPropertySpec) from the STRONGEST\n' +
      'prim.GetPrimStack()\n' +
      '# -> a PrimSpec from every layer that contributes to the prim',
    note: "This is literally our tracer and value resolution: a list of opinions in order of strength.",
    star: true,
  },
  {
    concept: "Kind / model hierarchy",
    code:
      'Usd.ModelAPI(prim).GetKind()        # "component" / "assembly" ...\n' +
      'prim.IsModel(); prim.IsGroup()',
    note: "You read kind through ModelAPI; the contiguity rules are as in the model hierarchy widget.",
  },
  {
    concept: "Active / visibility (debugging: the prim disappeared)",
    code:
      'prim.IsActive()                     # False = deactivated (pruned)\n' +
      'from pxr import UsdGeom\n' +
      'UsdGeom.Imageable(prim).ComputeVisibility()',
    note: "The prim is in the tree, but does not render? Check active and visibility.",
  },
  {
    concept: "Variants and references (list editing)",
    code:
      'prim.GetVariantSet("color").SetVariantSelection("red")\n' +
      'prim.GetReferences().AddReference("@chair.usd@")  # adds to the list',
    note: "References are a list (Add/Set/Remove), not a single opinion - see list editing.",
  },
  {
    concept: "Flatten / export",
    code:
      'flat = stage.Flatten()      # an Sdf.Layer with no arcs\n' +
      'stage.Export("flat.usda")   # writes the composed result',
    note: "Flatten collapses the composition into one layer - the values stay, the arcs disappear.",
  },
];

export function PxrBridge() {
  return (
    <div>
      <p className="mb-3 text-[13px] leading-relaxed text-ink-muted">
        The app teaches the model. Here the model is translated into{" "}
        <span className="text-ink">real</span>{" "}
        <code className="text-copper-bright">pxr</code> (USD Python) calls - so that in front of
        usdview or a prompt you do not think “I know this, but not how to do it”.
      </p>
      <div className="flex flex-col gap-3">
        {BRIDGES.map((b, i) => (
          <div
            key={i}
            className={`overflow-hidden rounded-lg border ${
              b.star ? "border-copper/40" : "border-border"
            } bg-bg-panel`}
          >
            <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
              {b.star && <span className="text-gold-soft">⭐</span>}
              <span className="text-[13px] font-medium text-ink">{b.concept}</span>
            </div>
            <pre className="overflow-auto bg-code p-3 font-mono text-[12px] leading-relaxed text-ink">
              <Highlight code={b.code} />
            </pre>
            <p className="px-3 py-1.5 text-[11px] text-ink-faint">{b.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
