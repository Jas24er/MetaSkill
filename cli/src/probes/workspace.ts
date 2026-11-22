import { existsSync } from "node:fs";
import type { Dirent } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import type { AgentId } from "../schemas/probe.js";

const BOILERPLATE_NAMES = new Set([
  ".git",
  ".DS_Store",
  "Thumbs.db",
  "LICENSE",
  "LICENSE.md",
  "README.md",
  "README.es.md",
  ".gitignore",
  ".agents",
]);

const METASKILL_ROOT_SCAFFOLD_FILES = new Set([
  "AGENTS.md",
  "SPEC.md",
  "PROJECT_STATE.md",
  "CLAUDE.md",
]);

async function listRelativeFiles(dirPath: string, baseDir: string = dirPath): Promise<string[]> {
  if (!existsSync(dirPath)) {
    return [];
  }
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listRelativeFiles(full, baseDir)));
    } else if (entry.isFile()) {
      files.push(path.relative(baseDir, full).replaceAll("\\", "/"));
    }
  }
  return files;
}

const scaffoldContents = new Map<string, RegExp>([
  ["inputs", /^README\.txt$/],
  ["preview", /^\.gitkeep$/],
  [".cursor", /^rules\/metaskill-[^/]+\.mdc$/],
  [".claude", /^skills\/metaskill\/SKILL\.md$/],
  [".windsurf", /^rules\/metaskill\.md$/],
  [".gemini", /^GEMINI\.md$/],
  [".clinerules", /^metaskill\.md$/],
]);

async function isMetaSkillScaffoldEntry(resolvedCwd: string, entry: Dirent): Promise<boolean> {
  if (entry.isFile()) return METASKILL_ROOT_SCAFFOLD_FILES.has(entry.name);
  const pattern = scaffoldContents.get(entry.name);
  if (!entry.isDirectory() || !pattern) return false;
  const files = await listRelativeFiles(path.join(resolvedCwd, entry.name));
  return files.every((rel) => pattern.test(rel));
}

function detectAgents(cwd: string): AgentId[] {
  const detected: AgentId[] = [];
  if (existsSync(path.join(cwd, ".claude")) || existsSync(path.join(cwd, "CLAUDE.md"))) {
    detected.push("claude-code");
  }
  if (existsSync(path.join(cwd, ".cursor")) || existsSync(path.join(cwd, ".cursorrules"))) {
    detected.push("cursor");
  }
  if (existsSync(path.join(cwd, ".windsurf")) || existsSync(path.join(cwd, ".windsurfrules"))) {
    detected.push("windsurf");
  }
  if (existsSync(path.join(cwd, ".gemini"))) {
    detected.push("antigravity");
  }
  if (existsSync(path.join(cwd, ".codex"))) {
    detected.push("codex");
  }
  if (existsSync(path.join(cwd, ".clinerules"))) {
    detected.push("cline");
  }
  return detected;
}

function detectLanguages(cwd: string, topLevelNames: string[]): string[] {
  const langs = new Set<string>();
  const has = (name: string) => existsSync(path.join(cwd, name));

  if (has("tsconfig.json")) {
    langs.add("typescript");
  } else if (has("package.json")) {
    langs.add("javascript");
  }
  if (has("pyproject.toml") || has("requirements.txt") || has("setup.py")) {
    langs.add("python");
  }
  if (has("Dockerfile") || has("docker-compose.yml") || has("docker-compose.yaml")) {
    langs.add("docker");
  }
  if (
    has("prisma") ||
    has("drizzle.config.ts") ||
    has("drizzle.config.js") ||
    topLevelNames.some((n) => n.endsWith(".sql"))
  ) {
    langs.add("database");
  }
  if (has("Cargo.toml")) {
    langs.add("rust");
  }
  if (has("go.mod")) {
    langs.add("go");
  }
  return [...langs];
}

/** Inspects a target project directory to determine Greenfield/Brownfield mode, Git state, and IDEs. */
export async function probeWorkspace(cwd: string): Promise<{
  cwd: string;
  isGitRepo: boolean;
  mode: "greenfield" | "brownfield";
  existingFileCount: number;
  detectedLanguages: string[];
  agentsDetected: AgentId[];
}> {
  const resolvedCwd = path.resolve(cwd);
  const isGitRepo = existsSync(path.join(resolvedCwd, ".git"));
  const entries = existsSync(resolvedCwd) ? await readdir(resolvedCwd, { withFileTypes: true }) : [];
  const hasExistingConfig = existsSync(
    path.join(resolvedCwd, ".agents", "metaskill.config.json")
  );

  const meaningfulEntries: string[] = [];
  for (const entry of entries) {
    if (BOILERPLATE_NAMES.has(entry.name)) {
      continue;
    }
    if (hasExistingConfig && (await isMetaSkillScaffoldEntry(resolvedCwd, entry))) {
      continue;
    }
    meaningfulEntries.push(entry.name);
  }

  return {
    cwd: resolvedCwd,
    isGitRepo,
    mode: meaningfulEntries.length > 0 ? "brownfield" : "greenfield",
    existingFileCount: meaningfulEntries.length,
    detectedLanguages: detectLanguages(resolvedCwd, entries.map((entry) => entry.name)),
    agentsDetected: detectAgents(resolvedCwd),
  };
}
