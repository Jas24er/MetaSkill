import { readdir } from "node:fs/promises";
import path from "node:path";

// These are leads for a conversation. The contents and behavior of a team's
// tools can only be verified during the actual task.
const sources = {
  rules: {
    files: ["AGENTS.md", "CLAUDE.md", "CONTRIBUTING.md", ".github/copilot-instructions.md"],
    directories: [".agents/skills", ".claude/skills", ".cursor/rules", ".windsurf/rules", ".clinerules"],
  },
  scope: {
    files: ["SPEC.md", "ROADMAP.md", "README.md", "docs/roadmap.md", "docs/spec.md"],
    directories: ["docs/adr", "docs/decisions"],
  },
  state: {
    files: ["PROJECT_STATE.md", "MEMORY.md", "TODO.md", "HANDOFF.md", "docs/handoff.md"],
    directories: [],
  },
  checks: {
    files: ["Makefile", "justfile", "Taskfile.yml", "package.json", "pyproject.toml", "tox.ini", "pytest.ini", ".gitlab-ci.yml", "Jenkinsfile"],
    directories: ["tests", "test", "spec", ".github/workflows"],
  },
  release: {
    files: ["RELEASING.md", "RELEASE.md", "CHANGELOG.md", "docs/release.md", "docs/releasing.md"],
    directories: [".changeset"],
  },
} satisfies Record<string, { files: string[]; directories: string[] }>;

export type Capability = keyof typeof sources;
export const capabilities = Object.keys(sources) as Capability[];

export interface CapabilitySources {
  capability: Capability;
  discovered: string[];
  declared: string[];
}

/** List known paths by name and type without opening files or following links. */
export async function inspectProjectTools(directory: string, declared: Map<Capability, string[]>) {
  const entries = new Map<string, "file" | "directory">();
  const root = await readdir(directory, { withFileTypes: true });
  const candidates = Object.values(sources).flatMap(({ files, directories }) => [...files, ...directories]);
  const parents = new Set(candidates.map((candidate) => path.posix.dirname(candidate)));
  for (const entry of root) {
    if (entry.isFile()) entries.set(entry.name, "file");
    if (!entry.isDirectory()) continue;
    entries.set(entry.name, "directory");
    if (!parents.has(entry.name)) continue;
    for (const child of await readdir(path.join(directory, entry.name), { withFileTypes: true })) {
      const relative = `${entry.name}/${child.name}`;
      if (child.isFile()) entries.set(relative, "file");
      if (child.isDirectory()) entries.set(relative, "directory");
    }
  }
  const inventory: CapabilitySources[] = capabilities.map((capability) => {
    const { files, directories } = sources[capability];
    return {
      capability,
      discovered: [
        ...files.filter((file) => entries.get(file) === "file"),
        ...directories.filter((dir) => entries.get(dir) === "directory"),
      ],
      declared: declared.get(capability) ?? [],
    };
  });
  const empty = root.every((entry) => [".git", ".DS_Store", "Thumbs.db"].includes(entry.name));
  return { inventory, empty };
}
