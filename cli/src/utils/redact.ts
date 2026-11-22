import os from "node:os";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Builds a pattern matching `dir` with either slash style (as seen in Windows stack traces and file:// URLs). */
function dirPattern(dir: string): RegExp | null {
  const trimmed = dir.replace(/[\\/]+$/, "");
  if (trimmed.length < 3) return null;
  const parts = trimmed.split(/[\\/]+/).map(escapeRegExp);
  return new RegExp(parts.join("[\\\\/]+"), "gi");
}

const GENERIC_HOME_PATTERNS: RegExp[] = [
  /\b[A-Za-z]:[\\/]+Users[\\/]+[^\\/\s"'`]+/g,
  /\/Users\/[^/\s"'`]+/g,
  /\/home\/[^/\s"'`]+/g,
];

/** Replaces the local temp dir, home dir, and user-named profile paths with neutral placeholders. */
export function redactLocalPaths(text: string): string {
  let out = text;
  const tmp = dirPattern(os.tmpdir());
  if (tmp) out = out.replace(tmp, "<TMP>");
  const home = dirPattern(os.homedir());
  if (home) out = out.replace(home, "<HOME>");
  for (const pattern of GENERIC_HOME_PATTERNS) {
    out = out.replace(pattern, "<HOME>");
  }
  return out;
}

/** Recursively applies {@link redactLocalPaths} to every string inside a JSON-like value. */
export function redactDeep<T>(value: T): T {
  if (typeof value === "string") return redactLocalPaths(value) as T;
  if (Array.isArray(value)) return value.map((v) => redactDeep(v)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = redactDeep(v);
    }
    return out as T;
  }
  return value;
}
