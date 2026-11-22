import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const MAX_PACKAGES = 500;

function readText(file: string): string | null {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

/** Patterns declared by npm/yarn/pnpm/lerna/Cargo/Go workspace manifests at the repo root. */
function collectWorkspacePatterns(root: string): string[] {
  const patterns: string[] = [];

  const pkgRaw = readText(path.join(root, "package.json"));
  if (pkgRaw) {
    try {
      const pkg = JSON.parse(pkgRaw) as { workspaces?: unknown };
      const ws = pkg.workspaces;
      const list = Array.isArray(ws)
        ? ws
        : ws && typeof ws === "object" && Array.isArray((ws as { packages?: unknown }).packages)
          ? (ws as { packages: unknown[] }).packages
          : [];
      patterns.push(...list.filter((p): p is string => typeof p === "string"));
    } catch {
      // Malformed package.json: ignore workspaces.
    }
  }

  const pnpmRaw = readText(path.join(root, "pnpm-workspace.yaml"));
  if (pnpmRaw) {
    let inPackages = false;
    for (const line of pnpmRaw.split(/\r?\n/)) {
      if (/^packages\s*:/.test(line)) {
        inPackages = true;
        continue;
      }
      if (inPackages) {
        const item = line.match(/^\s*-\s*["']?([^"'#]+?)["']?\s*(?:#.*)?$/);
        if (item?.[1]) {
          patterns.push(item[1].trim());
        } else if (/^\S/.test(line)) {
          inPackages = false;
        }
      }
    }
  }

  const lernaRaw = readText(path.join(root, "lerna.json"));
  if (lernaRaw) {
    try {
      const lerna = JSON.parse(lernaRaw) as { packages?: unknown };
      if (Array.isArray(lerna.packages)) {
        patterns.push(...lerna.packages.filter((p): p is string => typeof p === "string"));
      }
    } catch {
      // Ignore malformed lerna.json.
    }
  }

  const cargoRaw = readText(path.join(root, "Cargo.toml"));
  const cargoMembers = cargoRaw?.match(/\[workspace\][\s\S]*?members\s*=\s*\[([\s\S]*?)\]/);
  if (cargoMembers?.[1]) {
    for (const m of cargoMembers[1].matchAll(/["']([^"']+)["']/g)) {
      if (m[1]) patterns.push(m[1]);
    }
  }

  const goWork = readText(path.join(root, "go.work"));
  if (goWork) {
    const block = goWork.match(/use\s*\(([\s\S]*?)\)/);
    const entries = block?.[1] ? block[1].split(/\r?\n/) : [...goWork.matchAll(/^use\s+(\S+)/gm)].map((m) => m[1] ?? "");
    for (const entry of entries) {
      const cleaned = entry.replace(/\/\/.*$/, "").trim();
      if (cleaned) patterns.push(cleaned);
    }
  }

  return patterns;
}

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Lists workspace package directories (relative, forward slashes) declared at `root`.
 * Supports exact paths and single-segment `*` globs such as `packages/*`; `**` is treated like `*`
 * one level deep, and negated patterns are skipped. Never walks the whole tree.
 */
export function listWorkspacePackages(root: string): string[] {
  const resolved = path.resolve(root);
  const found = new Set<string>();

  for (const rawPattern of collectWorkspacePatterns(resolved)) {
    if (found.size >= MAX_PACKAGES) break;
    const pattern = rawPattern.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");
    if (!pattern || pattern === "." || pattern.startsWith("!") || pattern.includes("..")) continue;

    const segments = pattern.split("/");
    const starIdx = segments.findIndex((s) => s.includes("*"));
    if (starIdx === -1) {
      if (isDir(path.join(resolved, pattern))) found.add(pattern);
      continue;
    }

    const base = segments.slice(0, starIdx).join("/");
    const baseAbs = path.join(resolved, base);
    if (!isDir(baseAbs)) continue;
    const segRegex = new RegExp(
      `^${segments[starIdx]!.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*+/g, ".*")}$`
    );
    for (const entry of readdirSync(baseAbs, { withFileTypes: true })) {
      if (found.size >= MAX_PACKAGES) break;
      if (!entry.isDirectory() || entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      if (!segRegex.test(entry.name)) continue;
      const rel = [base, entry.name].filter(Boolean).join("/");
      found.add(rel);
    }
  }

  return [...found].sort();
}

/** True when `dir/SPEC.md` contains a `## Contract`/`## Contrato` section with at least one REQ item. */
export function hasContractFile(dir: string, contractRelPath = "SPEC.md"): boolean {
  const file = path.join(dir, contractRelPath);
  if (!existsSync(file)) return false;
  const content = readText(file) ?? "";
  return (
    /^##\s+(?:\d+\.\s*)?(?:contract|contrato)\b/im.test(content) &&
    /^-\s+(?:\*\*)?REQ-[A-Za-z0-9_-]+/im.test(content)
  );
}
