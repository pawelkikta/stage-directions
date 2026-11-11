import { scriptHash } from "../sandboxScript.ts";

/** Fingerprint of a factory step: all the files in a fixed order, and the check script. */
export function stepHash(files: Record<string, string>, check: string): string {
  const text = Object.keys(files)
    .sort()
    .map((name) => `== ${name}\n${files[name]}`)
    .join("\n");
  return scriptHash(`${text}\n== check\n${check}`);
}
