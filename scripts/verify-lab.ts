/* ===========================================================================
 * Verifier for the Run steps (lab exercises).
 *
 * Runs the exercises the way a user will: track by track, one empty folder per
 * track, each script in its own Python process. The "$ command" lines in
 * `expect` are run in a console (cmd) in the same folder, after the script.
 * The output is compared with `expect`. A "change X" task (`tweak`) runs on a
 * copy of the folder from before the exercise, so it does not change files for
 * later steps.
 *
 *   npm run verify:lab                    all tracks
 *   npm run verify:lab -- studio          only the given tracks
 *
 * What is compared is what the console shows (stdout and stderr together),
 * without the USD warnings "Warning: in ...", which depend on the package
 * version. Machine-specific things are normalized: the working folder becomes
 * "...", the number of an anonymous layer becomes "anon:...:".
 *
 * USD: unpacked binaries as in verify:sandbox - default ~/Documents/usdview,
 * another path through USD_ROOT. Console commands work only on Windows.
 * ======================================================================== */
import { spawnSync } from "node:child_process";
import { closeSync, cpSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  LAB_CONVERTER_STEPS,
  LAB_CUSTOM_STEPS,
  LAB_STEPS,
  LAB_STUDIO_STEPS,
  type LabStep,
} from "../src/data/lab.ts";
import { env, isWin, python, requirePython } from "./usd-env.ts";

const TRACKS: Record<string, LabStep[]> = {
  mechanisms: LAB_STEPS,
  studio: LAB_STUDIO_STEPS,
  custom: LAB_CUSTOM_STEPS,
  converter: LAB_CONVERTER_STEPS,
};

requirePython();

/** Normalizes what depends on the machine, and trailing whitespace. */
function normalize(text: string, dir = ""): string {
  let t = text.replace(/\r\n/g, "\n");
  if (dir) {
    for (const form of [dir.replace(/\\/g, "\\\\"), dir, dir.replace(/\\/g, "/")]) {
      t = t.split(form).join("...");
    }
    t = t.replace(/\.\.\.((?:\\\\|\\|\/)[^\s'"]*)/g, (_, rest: string) => "..." + rest.replace(/\\\\|\\/g, "/"));
  }
  t = t.replace(/anon:[0-9A-Fa-fx]+:/g, "anon:...:");
  return t
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trimEnd();
}

/** Splits `expect` into the script output and "$ command" blocks with their output. */
function splitExpect(expect: string): { script: string; commands: { cmd: string; out: string }[] } {
  const lines = expect.split("\n");
  const first = lines.findIndex((l) => l.startsWith("$ "));
  const scriptLines = first < 0 ? lines : lines.slice(0, first);
  const commands: { cmd: string; out: string }[] = [];
  for (const line of first < 0 ? [] : lines.slice(first)) {
    if (line.startsWith("$ ")) {
      commands.push({ cmd: line.slice(2), out: "" });
    } else {
      const c = commands[commands.length - 1];
      c.out += (c.out ? "\n" : "") + line;
    }
  }
  return { script: scriptLines.join("\n"), commands };
}

/**
 * stdout and stderr go to one file, in the order they are printed - the way
 * the console shows them. USD warnings ("Warning: in ...", with a source line
 * number) stay in `warnings`, because they depend on the package version.
 */
function run(
  command: string,
  args: string[],
  dir: string,
  verbatim = false,
): { out: string; warnings: string; code: number | null } {
  const logDir = mkdtempSync(join(tmpdir(), "lab-log-"));
  const log = join(logDir, "out.txt");
  const fd = openSync(log, "w");
  try {
    const r = spawnSync(command, args, {
      cwd: dir,
      env,
      stdio: ["ignore", fd, fd],
      windowsVerbatimArguments: verbatim,
    });
    closeSync(fd);
    const lines = readFileSync(log, "utf8").replace(/\r\n/g, "\n").split("\n");
    return {
      out: lines.filter((l) => !l.startsWith("Warning: in ")).join("\n"),
      warnings: lines.filter((l) => l.startsWith("Warning: in ")).join("\n"),
      code: r.status,
    };
  } finally {
    rmSync(logDir, { recursive: true, force: true });
  }
}

function runPython(script: string, dir: string, name: string) {
  const scriptDir = mkdtempSync(join(tmpdir(), "lab-script-"));
  try {
    const file = join(scriptDir, `${name}.py`);
    writeFileSync(file, script, "utf8");
    return run(python, [file], dir);
  } finally {
    rmSync(scriptDir, { recursive: true, force: true });
  }
}

function runShell(cmd: string, dir: string) {
  if (!isWin) {
    return { out: "", warnings: "console commands are checked only on Windows", code: 0 };
  }
  return run("cmd.exe", ["/d", "/s", "/c", `"${cmd}"`], dir, true);
}

function applyEdits(script: string, edits: { find: string; replace: string }[], where: string): string {
  let out = script;
  for (const { find, replace } of edits) {
    const count = out.split(find).length - 1;
    if (count !== 1) {
      throw new Error(`${where}: the fragment to change occurs ${count} times instead of 1:\n${find}`);
    }
    out = out.replace(find, () => replace);
  }
  return out;
}

let failures = 0;

/** One run: the script (or the commands, when step.shell) plus the "$ ..." lines. */
function check(label: string, step: LabStep, script: string, expect: string, dir: string) {
  const parts = splitExpect(expect);
  const got: string[] = [];
  let warnings = "";

  if (step.shell) {
    for (const cmd of script.split("\n").filter((l) => l.trim() && !l.startsWith("REM"))) {
      const r = runShell(cmd, dir);
      got.push(r.out);
      warnings += r.warnings;
    }
  } else {
    const r = runPython(script, dir, step.id);
    got.push(r.out);
    warnings += r.warnings;
    if (r.code !== 0) {
      warnings += `\n(Python exited with code ${r.code})`;
    }
  }
  const scriptOut = normalize(got.join(""), dir);

  const cmdOut = parts.commands.map(({ cmd }) => {
    const r = runShell(cmd, dir);
    warnings += r.warnings;
    return `$ ${cmd}\n${normalize(r.out, dir)}`.trimEnd();
  });

  const want = [normalize(parts.script), ...parts.commands.map((c) => `$ ${c.cmd}\n${normalize(c.out)}`.trimEnd())]
    .filter((s) => s !== "")
    .join("\n\n");
  const have = [scriptOut, ...cmdOut].filter((s) => s !== "").join("\n\n");

  if (want === have) {
    console.log(`  ok    ${label}`);
    return;
  }
  failures++;
  console.log(`  DIFF  ${label}`);
  console.log("--- expected:\n" + want + "\n--- got:\n" + have);
  if (warnings.trim()) {
    console.log("--- warnings:\n" + normalize(warnings, dir).split("\n").slice(0, 15).join("\n"));
  }
}

const only = new Set(process.argv.slice(2));
for (const name of only) {
  if (!TRACKS[name]) {
    console.error(`There is no track "${name}". Tracks: ${Object.keys(TRACKS).join(", ")}`);
    process.exit(1);
  }
}

const version = spawnSync(python, ["-c", "from pxr import Usd; v = Usd.GetVersion(); print(f'{v[1]}.{v[2]:02d}')"], {
  env,
  encoding: "utf8",
}).stdout.trim();
console.log(`USD ${version} (${python})`);

for (const [name, steps] of Object.entries(TRACKS)) {
  if (only.size > 0 && !only.has(name)) continue;
  console.log(`\n[${name}]`);
  const dir = mkdtempSync(join(tmpdir(), `lab-${name}-`));
  try {
    for (const step of steps) {
      // The extraScript lines are the same commands that the verifier takes from expect.
      if (step.extraScript) {
        const shown = new Set(splitExpect(step.expect).commands.map((c) => c.cmd));
        for (const line of step.extraScript.code.split("\n").filter((l) => l.trim() && !l.startsWith("REM"))) {
          if (!shown.has(line)) {
            failures++;
            console.log(`  MISSING ${step.id}: the command "${line}" has no "$ ${line}" in expect`);
          }
        }
      }

      if (step.tweak) {
        const copy = mkdtempSync(join(tmpdir(), `lab-${name}-change-`));
        try {
          cpSync(dir, copy, { recursive: true });
          const script = applyEdits(step.script, step.tweak.edits, `${step.id} (change)`);
          check(`${step.id} (change)`, step, script, step.tweak.expect, copy);
        } finally {
          rmSync(copy, { recursive: true, force: true });
        }
      }
      check(step.id, step, step.script, step.expect, dir);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

console.log(failures ? `\n${failures} mismatches` : "\nAll outputs match.");
process.exit(failures ? 1 : 0);
