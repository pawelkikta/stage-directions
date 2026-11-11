import { useState } from "react";

interface TypedSchema {
  name: string;
  domain: "UsdGeom" | "UsdShade" | "UsdLux";
  props: string[];
}
interface ApiSchema {
  name: string;
  multi: boolean;
  props: string[];
  note: string;
}

const TYPED: TypedSchema[] = [
  {
    name: "Xform",
    domain: "UsdGeom",
    props: ["matrix4d xformOp:transform", "token[] xformOpOrder"],
  },
  {
    name: "Mesh",
    domain: "UsdGeom",
    props: [
      "point3f[] points",
      "int[] faceVertexCounts",
      "int[] faceVertexIndices",
      "normal3f[] normals",
      "token subdivisionScheme",
    ],
  },
  {
    name: "SphereLight",
    domain: "UsdLux",
    props: [
      "float inputs:intensity",
      "float inputs:radius",
      "color3f inputs:color",
      "float inputs:exposure",
    ],
  },
  {
    name: "Material",
    domain: "UsdShade",
    props: ["token outputs:surface", "token outputs:displacement"],
  },
];

const API: ApiSchema[] = [
  {
    name: "MaterialBindingAPI",
    multi: false,
    props: ["rel material:binding"],
    note: "material binding",
  },
  {
    name: "GeomModelAPI",
    multi: false,
    props: ["token model:drawMode", "bool model:applyDrawMode"],
    note: "draw mode for models",
  },
  {
    name: "ShadowAPI",
    multi: false,
    props: ["bool inputs:shadow:enable", "color3f inputs:shadow:color"],
    note: "control of light shadows",
  },
  {
    name: "CollectionAPI",
    multi: true,
    props: ["rel collection:<name>:includes", "rel collection:<name>:excludes"],
    note: "multi-apply - you can apply many instances",
  },
];

const DOMAIN_COLOR = {
  UsdGeom: "text-sky-300",
  UsdShade: "text-violet-300",
  UsdLux: "text-amber-300",
};

export function SchemaInspector() {
  const [typedIdx, setTypedIdx] = useState(1); // Mesh
  const [apiOn, setApiOn] = useState<Record<string, boolean>>({});
  const typed = TYPED[typedIdx];
  const enabledApi = API.filter((a) => apiOn[a.name]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wider text-ink-faint">
          Typed (IsA):
        </span>
        {TYPED.map((t, i) => (
          <button
            key={t.name}
            onClick={() => setTypedIdx(i)}
            className={`rounded-md border px-2.5 py-1 text-sm transition-colors ${
              i === typedIdx
                ? "border-copper/50 bg-copper/15 text-gold-soft"
                : "border-border text-ink-muted hover:text-ink hover:bg-bg-elev"
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wider text-ink-faint">
          API (additive):
        </span>
        {API.map((a) => (
          <label
            key={a.name}
            className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-ink-muted"
          >
            <input
              type="checkbox"
              checked={!!apiOn[a.name]}
              onChange={() => setApiOn((s) => ({ ...s, [a.name]: !s[a.name] }))}
              className="accent-copper"
            />
            {a.name}
            {a.multi && (
              <span className="rounded bg-bg-elev px-1 text-[10px] text-emerald-300">
                multi
              </span>
            )}
          </label>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-bg-panel p-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="font-mono text-sm text-ink">def</span>
          <span className="font-mono text-sm text-copper-bright">{typed.name}</span>
          <span className="font-mono text-sm text-ink">"Prim"</span>
          <span className={`text-xs ${DOMAIN_COLOR[typed.domain]}`}>
            {typed.domain}
          </span>
          {enabledApi.length > 0 && (
            <span className="font-mono text-[11px] text-ink-faint">
              (apiSchemas = [{enabledApi.map((a) => a.name).join(", ")}])
            </span>
          )}
        </div>
        <ul className="space-y-1 font-mono text-[13px]">
          {typed.props.map((p) => (
            <li key={p} className="flex items-center gap-2">
              <span className="text-ink">{p}</span>
              <span className="rounded bg-copper/15 px-1 text-[10px] text-copper-bright">
                {typed.name}
              </span>
            </li>
          ))}
          {enabledApi.flatMap((a) =>
            a.props.map((p) => (
              <li key={a.name + p} className="flex items-center gap-2">
                <span className="text-ink">{p}</span>
                <span className="rounded bg-emerald-900/30 px-1 text-[10px] text-emerald-300">
                  {a.name}
                </span>
              </li>
            )),
          )}
        </ul>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 text-[12px] text-ink-muted sm:grid-cols-2">
        <p className="rounded border border-border bg-bg-elev/50 p-2">
          <strong className="text-copper-bright">Typed (IsA)</strong> gives the type -
          a prim has <em>exactly one</em> typeName (for example Mesh). It defines what the prim
          “is”.
        </p>
        <p className="rounded border border-border bg-bg-elev/50 p-2">
          <strong className="text-emerald-300">API</strong> adds properties or behavior
          without changing the type. You can apply <em>many</em>; a multi-apply schema (for example CollectionAPI)
          even several times, with an instance name.
        </p>
      </div>
    </div>
  );
}
