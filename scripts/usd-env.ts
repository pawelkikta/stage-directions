/* The shared USD environment for the verifiers (verify:lab, verify:factory).
 * Default: unpacked binaries in ~/Documents/usdview, another path through USD_ROOT.
 * The same as scripts/set_usd_env.bat from the package sets. */
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";

export const usdRoot = process.env.USD_ROOT ?? join(homedir(), "Documents", "usdview");
export const isWin = process.platform === "win32";
export const python = isWin ? join(usdRoot, "python", "python.exe") : join(usdRoot, "python", "bin", "python3");

export function requirePython(): void {
  if (!existsSync(python)) {
    console.error(`No Python with USD: ${python}\nSet USD_ROOT (the folder with the USD binaries).`);
    process.exit(1);
  }
}

export const env = {
  ...process.env,
  PATH: [
    join(usdRoot, "python"),
    join(usdRoot, "pip-packages", "bin"),
    join(usdRoot, "lib"),
    join(usdRoot, "plugin", "usd"),
    join(usdRoot, "bin"),
    process.env.PATH ?? "",
  ].join(delimiter),
  PYTHONPATH: [join(usdRoot, "lib", "python"), join(usdRoot, "pip-packages")].join(delimiter),
  PXR_MTLX_STDLIB_SEARCH_PATHS: join(usdRoot, "libraries"),
  PYTHONIOENCODING: "utf-8",
  // No buffering: output and error messages in the same order as in the console.
  PYTHONUNBUFFERED: "1",
};
