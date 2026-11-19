import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Locates the MetaSkill package root by walking upward from the current module
 * until a directory containing both `package.json` and `SKILL.md` is found.
 * Works identically under `tsx` (cli/src/utils) and compiled `dist/utils`.
 */
export function getPackageRoot(startUrl: string = import.meta.url): string {
  let currentDir = path.dirname(fileURLToPath(startUrl));

  while (true) {
    const hasPkg = existsSync(path.join(currentDir, "package.json"));
    const hasSkill = existsSync(path.join(currentDir, "SKILL.md"));
    if (hasPkg && hasSkill) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      throw new Error(
        "Unable to locate MetaSkill package root (expected directory with package.json and SKILL.md)."
      );
    }
    currentDir = parentDir;
  }
}

/** Reads the semantic version from the MetaSkill package.json. */
export function getPackageVersion(): string {
  const pkgPath = path.join(getPackageRoot(), "package.json");
  const raw = readFileSync(pkgPath, "utf8");
  const parsed = JSON.parse(raw) as { version?: string };
  return parsed.version ?? "0.0.0";
}
