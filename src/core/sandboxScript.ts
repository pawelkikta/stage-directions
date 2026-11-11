/* ===========================================================================
 * One script per Predict / Find-the-bug situation: it writes the files and
 * prints the result. The user copies the same text that the verifier runs, so
 * the output shown in the app is exactly what they will see in the console.
 * ======================================================================== */
import type { SandboxEdit, SandboxFile, SandboxItem } from "../data/sandbox.ts";

/** Git on Windows can turn line endings into CRLF - the script and its hash always use LF. */
const lf = (text: string) => text.replace(/\r\n/g, "\n");

/** Applies the edits to the files. Each `before` fragment must occur exactly once. */
export function applyEdits(files: SandboxFile[], edits: SandboxEdit[] = []): SandboxFile[] {
  return files.map((f) => {
    let code = lf(f.code);
    for (const e of edits.filter((x) => x.file === f.name)) {
      const before = lf(e.before);
      const count = code.split(before).length - 1;
      if (count !== 1) throw new Error(`${f.name}: the fragment occurs ${count} times: ${e.before}`);
      code = code.replace(before, lf(e.after));
    }
    return { ...f, code };
  });
}

/** A short hash of the script text - a verified output matches only the same script. */
export function scriptHash(text: string): string {
  let h = 5381;
  const t = lf(text);
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export function buildScript(item: SandboxItem, edits: SandboxEdit[] = [], variant = ""): string {
  const files = applyEdits(item.files, edits);
  const file = item.mode === "bug" ? "bug" : "situation";
  const lines = [
    `# Stage Directions: ${item.title}${variant ? ` (${variant})` : ""}`,
    "# Run it in an empty folder, in a console with USD (see Set up OpenUSD):",
    `#   python ${file}.py`,
    "# The script writes the situation files next to itself and prints the result.",
    `# Then you can look at them: usdview ${item.open}`,
    "from pathlib import Path",
    "",
    "from pxr import Sdf, Usd, UsdGeom, UsdShade, UsdUtils",
    "",
    "FILES = {",
    ...files.map((f) => `    "${f.name}": r'''${f.code}''',`),
    "}",
    "for name, text in FILES.items():",
    // Only when needed: an extra line would change the hash of every other situation.
    ...(files.some((f) => f.name.includes("/")) ? ["    Path(name).parent.mkdir(parents=True, exist_ok=True)"] : []),
    '    Path(name).write_text(text, encoding="utf-8")',
    "",
    "# --- check ---",
    lf(item.check),
    "",
  ];
  return lines.join("\n");
}
