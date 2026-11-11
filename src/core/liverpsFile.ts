/* ===========================================================================
 * .usda files that give exactly the opinions shown in the LIVERPS tracer.
 *
 * Each opinion from a lane is a real arc on one prim in shot.usda. A switched-off
 * opinion keeps its arc, but without a value - like the "empty layer" from the lesson.
 * Within one arc, the order in the list = strength (the first is the strongest).
 * The winning line gets the comment `# <- wins`.
 * Checked in pxr on files made by this function.
 * ======================================================================== */
import type { ArcType, AttributeValue } from "./types.ts";
import type { Opinion, ResolutionScenario } from "./composition.ts";

export interface UsdFile {
  name: string;
  text: string;
}

/** The name in the file for the n-th opinion of an arc (0 = from the seed). */
export function arcItemName(s: ResolutionScenario, arc: ArcType, index: number): string {
  const base = s.names[arc];
  if (index === 0) return base;
  switch (arc) {
    case "local":
      return `shot_layer${index}.usda`;
    case "reference":
    case "payload":
      return base.replace(/\.usd$/, `_${index + 1}.usd`);
    case "variant":
      return `extra${index}`;
    default:
      return `${base}${index + 1}`;
  }
}

export function isValidValue(s: ResolutionScenario, v: AttributeValue): boolean {
  if (s.attr.type === "float") return typeof v === "number" && Number.isFinite(v);
  return Array.isArray(v) && v.length === 3 && v.every((x) => typeof x === "number" && Number.isFinite(x));
}

/** Text from an edit field -> value (or null when it is not valid). */
export function parseValue(s: ResolutionScenario, text: string): AttributeValue {
  const nums = text.split(/[\s,()[\]]+/).filter(Boolean).map(Number);
  if (s.attr.type === "float") return nums.length === 1 && Number.isFinite(nums[0]) ? nums[0] : null;
  return nums.length === 3 && nums.every(Number.isFinite) ? nums : null;
}

function usdaValue(s: ResolutionScenario, v: AttributeValue): string {
  if (s.attr.type === "float") return String(v);
  const [r, g, b] = v as number[];
  return `[(${r}, ${g}, ${b})]`;
}

/** An opinion takes part in resolution only when it is on and has a valid value. */
export function counts(s: ResolutionScenario, o: Opinion): boolean {
  return o.enabled && isValidValue(s, o.value);
}

function attrLines(s: ResolutionScenario, o: Opinion, indent: string, winnerId?: string): string {
  const mark = o.id === winnerId ? "   # <- wins" : "";
  if (counts(s, o)) return `${indent}${s.attr.type} ${s.attr.name} = ${usdaValue(s, o.value)}${mark}`;
  return `${indent}# no opinion about ${s.attr.name}`;
}

function listOp(key: string, items: string[]): string {
  const body = items.length === 1 ? items[0] : `[${items.join(", ")}]`;
  return `    prepend ${key} = ${body}`;
}

export function buildFiles(s: ResolutionScenario, opinions: Opinion[], winnerId?: string): UsdFile[] {
  const line = (o: Opinion, indent: string) => attrLines(s, o, indent, winnerId);
  const lane = (arc: ArcType) => opinions.filter((o) => o.arc === arc);
  const named = (arc: ArcType) => lane(arc).map((o, i) => ({ o, name: o.name ?? arcItemName(s, arc, i) }));
  const selection = (name: string) => (name === s.names.variant ? s.variantSelection : "on");

  const local = named("local");
  const inherits = named("inherit");
  const variants = named("variant");
  const refs = named("reference");
  const pays = named("payload");
  const specs = named("specialize");

  const out: string[] = ["#usda 1.0"];
  const sublayers = local.slice(1);
  if (sublayers.length) {
    out.push("(", "    subLayers = [");
    sublayers.forEach(({ name }, i) =>
      out.push(`        @./${name}@${i < sublayers.length - 1 ? "," : ""}`),
    );
    out.push("    ]", ")");
  }

  for (const { o, name } of [...inherits, ...specs]) {
    out.push("", `class "${name}"`, "{", line(o, "    "), "}");
  }

  const meta: string[] = [];
  if (inherits.length) meta.push(listOp("inherits", inherits.map((x) => `</${x.name}>`)));
  if (variants.length) {
    const setNames = variants.map((x) => x.name);
    meta.push(`    variantSets = [${setNames.map((n) => `"${n}"`).join(", ")}]`);
    meta.push("    variants = {");
    variants.forEach(({ name }) => meta.push(`        string ${name} = "${selection(name)}"`));
    meta.push("    }");
  }
  if (refs.length) meta.push(listOp("references", refs.map((x) => `@./${x.name}@`)));
  if (pays.length) meta.push(listOp("payload", pays.map((x) => `@./${x.name}@`)));
  if (specs.length) meta.push(listOp("specializes", specs.map((x) => `</${x.name}>`)));

  out.push("", `def ${s.prim.type} "${s.prim.name}"${meta.length ? " (" : ""}`);
  if (meta.length) out.push(...meta, ")");
  out.push("{");
  if (local.length) out.push(line(local[0].o, "    "));
  variants.forEach(({ o, name }) => {
    const sel = selection(name);
    out.push("", `    variantSet "${name}" = {`, `        "${sel}" {`, line(o, "            "), "        }", "    }");
  });
  out.push("}");

  const files: UsdFile[] = [{ name: "shot.usda", text: out.join("\n") }];
  for (const { o, name } of sublayers) {
    files.push({
      name,
      text: ["#usda 1.0", "", `over "${s.prim.name}"`, "{", line(o, "    "), "}"].join("\n"),
    });
  }
  for (const { o, name } of [...refs, ...pays]) {
    files.push({
      name,
      text: [
        "#usda 1.0",
        "(",
        `    defaultPrim = "${s.prim.name}"`,
        ")",
        "",
        `def ${s.prim.type} "${s.prim.name}"`,
        "{",
        line(o, "    "),
        "}",
      ].join("\n"),
    });
  }
  return files;
}
