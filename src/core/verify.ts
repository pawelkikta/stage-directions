/* ===========================================================================
 * A quick test of the derivers (no test framework).
 * Runs in dev (main.tsx) and logs PASS/FAIL to the console.
 * It returns the result, so the UI can show it too.
 * ======================================================================== */
import { deriveSceneUsda, deriveUsda, getLayer } from "./deriveUsda.ts";
import { deriveSceneTree, flattenPrims } from "./deriveTree.ts";
import { helloStage, layerStackDemo } from "./seedScenes.ts";

export interface CheckResult {
  name: string;
  pass: boolean;
  detail?: string;
}

function check(name: string, cond: boolean, detail?: string): CheckResult {
  return { name, pass: cond, detail };
}

export function runDeriverChecks(): CheckResult[] {
  const results: CheckResult[] = [];

  // --- deriveUsda: hello-stage ---
  const usda = deriveSceneUsda(helloStage);
  results.push(check("usda: header #usda 1.0", usda.startsWith("#usda 1.0")));
  results.push(
    check('usda: defaultPrim = "World"', usda.includes('defaultPrim = "World"')),
  );
  results.push(
    check('usda: def Xform "World"', usda.includes('def Xform "World"')),
  );
  results.push(
    check("usda: double size = 2", /double size = 2\b/.test(usda)),
  );
  results.push(
    check(
      "usda: primvar color3f[] z nawiasami",
      usda.includes("color3f[] primvars:displayColor = [(0.72, 0.45, 0.2)]"),
    ),
  );
  results.push(
    check('usda: kind = "group"', usda.includes('kind = "group"')),
  );

  // --- deriveUsda: layer-stack subLayers + over ---
  const baseLayer = getLayer(layerStackDemo, "base")!;
  const shotLayer = getLayer(layerStackDemo, "shot")!;
  const baseUsda = deriveUsda(baseLayer);
  const shotUsda = deriveUsda(shotLayer);
  results.push(
    check("usda: base ma radius = 1", /double radius = 1\b/.test(baseUsda)),
  );
  results.push(
    check("usda: shot ma radius = 3 (override)", /double radius = 3\b/.test(shotUsda)),
  );
  results.push(check("usda: the shot uses over", shotUsda.includes('over "Ball"')));
  results.push(
    check("usda: shot.subLayers -> @base.usda@", shotUsda.includes("@base.usda@")),
  );

  // --- deriveTree: paths ---
  const tree = deriveSceneTree(helloStage);
  const flat = flattenPrims(tree);
  const paths = flat.map((n) => n.path);
  results.push(check("tree: /World istnieje", paths.includes("/World")));
  results.push(check("tree: /World/Box istnieje", paths.includes("/World/Box")));
  results.push(
    check("tree: /World/KeyLight istnieje", paths.includes("/World/KeyLight")),
  );

  const box = flat.find((n) => n.path === "/World/Box")!;
  results.push(
    check(
      "tree: property path /World/Box.size",
      box.properties.some((p) => p.path === "/World/Box.size"),
    ),
  );
  results.push(check("tree: Box typeName=Cube", box.typeName === "Cube"));

  return results;
}

/** Logs the results to the console; returns true if everything passed. */
export function logDeriverChecks(): boolean {
  const results = runDeriverChecks();
  const passed = results.filter((r) => r.pass).length;
  const all = results.length;
  // eslint-disable-next-line no-console
  console.log(
    `%c[Stage Directions] Deriver checks: ${passed}/${all} PASS`,
    `color:${passed === all ? "#7bd88f" : "#e86b6b"};font-weight:bold`,
  );
  for (const r of results) {
    if (!r.pass) {
      // eslint-disable-next-line no-console
      console.error(`  ✗ FAIL: ${r.name}${r.detail ? ` - ${r.detail}` : ""}`);
    }
  }
  return passed === all;
}
