import { useState } from "react";
import { Highlight } from "../Highlight.tsx";

/* Dedicated data: a prim with two independent variant sets. */
interface VariantOpt {
  name: string;
  /** Properties put on the host prim. */
  props: { name: string; value: string }[];
  /** Child prims added in this variant. */
  childPrims?: string[];
}
interface VSet {
  name: string;
  variants: VariantOpt[];
}

const PRIM = "/World/Car";
const VSETS: VSet[] = [
  {
    name: "paint",
    variants: [
      { name: "red", props: [{ name: "primvars:displayColor", value: "[(0.80, 0.10, 0.10)]" }] },
      { name: "blue", props: [{ name: "primvars:displayColor", value: "[(0.15, 0.35, 0.85)]" }] },
      { name: "yellow", props: [{ name: "primvars:displayColor", value: "[(0.90, 0.78, 0.10)]" }] },
    ],
  },
  {
    name: "body",
    variants: [
      { name: "coupe", props: [{ name: "string class", value: '"sport"' }], childPrims: ["Spoiler"] },
      { name: "suv", props: [{ name: "string class", value: '"family"' }], childPrims: ["RoofRack", "ThirdRow"] },
    ],
  },
];

export function VariantSwitcher() {
  const [sel, setSel] = useState<Record<string, string>>({
    paint: "red",
    body: "coupe",
  });

  const resolvedProps = VSETS.flatMap((vs) => {
    const v = vs.variants.find((x) => x.name === sel[vs.name])!;
    return v.props;
  });
  const resolvedChildren = VSETS.flatMap((vs) => {
    const v = vs.variants.find((x) => x.name === sel[vs.name])!;
    return v.childPrims ?? [];
  });

  // .usda with the current selection
  const usda = [
    `def "Car" (`,
    `    variantSets = ["paint", "body"]`,
    `    variants = {`,
    `        string paint = "${sel.paint}"`,
    `        string body = "${sel.body}"`,
    `    }`,
    `)`,
    `{`,
    ...VSETS.map((vs) =>
      [
        `    variantSet "${vs.name}" = {`,
        ...vs.variants.map(
          (v) =>
            `        "${v.name}"${v.name === sel[vs.name] ? "  # ← selected" : ""} { … }`,
        ),
        `    }`,
      ].join("\n"),
    ),
    `}`,
  ].join("\n");

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3">
        {VSETS.map((vs) => (
          <div key={vs.name} className="flex items-center gap-2">
            <span className="w-16 font-mono text-xs text-copper-bright">
              {vs.name}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {vs.variants.map((v) => (
                <button
                  key={v.name}
                  onClick={() => setSel((s) => ({ ...s, [vs.name]: v.name }))}
                  className={`rounded-md border px-2.5 py-1 text-sm transition-colors ${
                    sel[vs.name] === v.name
                      ? "border-copper/50 bg-copper/15 text-gold-soft"
                      : "border-border text-ink-muted hover:text-ink hover:bg-bg-elev"
                  }`}
                >
                  {v.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <pre className="overflow-auto rounded-lg border border-border bg-code p-3 font-mono text-[12px] leading-relaxed text-ink">
          <Highlight code={usda} lang="usda" />
        </pre>
        <div className="rounded-lg border border-border bg-bg-panel p-3">
          <p className="mb-2 text-xs uppercase tracking-wider text-ink-faint">
            Composed prim <code className="text-copper-bright">{PRIM}</code>
          </p>
          <ul className="space-y-1 text-[13px]">
            {resolvedProps.map((p, i) => (
              <li key={i} className="font-mono text-ink">
                <span className="text-ink-faint">{p.name}</span> ={" "}
                <span className="text-gold-soft">{p.value}</span>
              </li>
            ))}
          </ul>
          <p className="mb-1 mt-3 text-xs uppercase tracking-wider text-ink-faint">
            Children
          </p>
          {resolvedChildren.length === 0 ? (
            <span className="text-xs text-ink-faint">none</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {resolvedChildren.map((c) => (
                <span
                  key={c}
                  className="rounded bg-emerald-900/20 px-2 py-0.5 font-mono text-[12px] text-emerald-300"
                >
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="mt-3 text-[11px] text-ink-faint">
        A variant selection is itself an opinion and is subject to composition (the Variants arc, the V in
        LIVERPS). Switching it swaps a subtree of opinions - properties and children.
      </p>
    </div>
  );
}
