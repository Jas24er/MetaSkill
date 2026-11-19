import type { MetaSkillConfig } from "../schemas/config.js";
import type { AgentId } from "../schemas/probe.js";
import {
  loadManagedManifest,
  saveManagedManifest,
  syncManagedFencedFile,
  type FencedSyncResult,
  type ManagedManifest,
} from "../utils/fs.js";
import { EDITOR_CAPABILITIES } from "./capabilities.js";

export interface SyncAdapterOptions {
  manifest?: ManagedManifest;
  force?: boolean;
  dryRun?: boolean;
}

export interface AdapterSyncReport {
  files: string[];
  results: FencedSyncResult[];
  conflicts: FencedSyncResult[];
}

function buildThinPointerBlock(config: MetaSkillConfig, agent: AgentId): string {
  const capability = EDITOR_CAPABILITIES[agent];
  const enforcementLabel =
    capability.permissionEnforcement === "editor-sandbox-plus-advisory"
      ? "editor-sandbox + advisory rules"
      : "advisory rules only (verify destructive actions manually)";

  return [
    "## MetaSkill Architect Integration",
    "",
    `- **Persona:** \`${config.persona}\` | **Language:** \`${config.language}\` | **Rhythm:** \`${config.autonomyMode}\` | **Permissions:** \`${config.permissionMode}\``,
    `- **Editor Guarantees (${capability.displayName}):** \`${enforcementLabel}\``,
    "- **Canonical Source:** Read `AGENTS.md`, `SPEC.md`, `PROJECT_STATE.md`, and `.agents/skills/metaskill/SKILL.md`.",
    "- **Read-Only First:** When `permissionMode` is `read-only`, inspect and propose scope first; never modify files without an explicit order.",
    "- **Environment Profile:** Read `.agents/probe-profile.json` if present (or run read-only `mtsk probe --json`) instead of guessing.",
    "- **Safety & Evidence:** Never mutate `inputs/`; close requirements as `verified`, `pending`, or `blocked` with `preview/` evidence.",
  ].join("\n");
}

function renderCursorCoreFrontmatter(): string {
  return [
    "---",
    "description: MetaSkill canonical project router (always active, lightweight pointer)",
    "alwaysApply: true",
    "---",
  ].join("\n");
}

function renderCursorDomainFrontmatter(description: string, globs: string[]): string {
  return [
    "---",
    `description: ${description}`,
    `globs: ${globs.join(", ")}`,
    "alwaysApply: false",
    "---",
  ].join("\n");
}

function renderCursorDomainBody(playbookPath: string, config: MetaSkillConfig): string {
  return [
    `Read \`${playbookPath}\` and matching specialist skills under \`.agents/skills/\` before editing matching files.`,
    `- Active Permissions: \`${config.permissionMode}\` (inspect read-only first; edit only within authorized scope).`,
    "- Run the domain's Hybrid QA Gate (technical checks + `preview/` evidence) and mark requirements `verified`, `pending`, or `blocked`.",
  ].join("\n");
}

function renderClaudeSkillFrontmatter(): string {
  return [
    "---",
    "name: metaskill",
    "description: Thin adapter delegating to the canonical MetaSkill brain in .agents/skills/metaskill/SKILL.md.",
    "---",
  ].join("\n");
}

function renderClaudeSkillBody(config: MetaSkillConfig): string {
  return [
    "# MetaSkill (Claude Code Adapter)",
    "",
    `- **Persona:** \`${config.persona}\` | **Language:** \`${config.language}\` | **Rhythm:** \`${config.autonomyMode}\` | **Permissions:** \`${config.permissionMode}\``,
    "- Canonical instructions live in `.agents/skills/metaskill/SKILL.md`.",
    "- Read `AGENTS.md`, `SPEC.md`, `PROJECT_STATE.md`, and `.agents/skills/metaskill/SKILL.md` before proposing or running changes.",
  ].join("\n");
}

async function syncCursorAdapters(
  targetDir: string,
  config: MetaSkillConfig,
  manifest: ManagedManifest,
  force: boolean,
  dryRun: boolean
): Promise<FencedSyncResult[]> {
  const results: FencedSyncResult[] = [];

  results.push(
    await syncManagedFencedFile({
      targetDir,
      relPath: ".cursor/rules/metaskill-core.mdc",
      markerId: "ADAPTER",
      style: "html",
      frontmatter: renderCursorCoreFrontmatter(),
      blockContent: buildThinPointerBlock(config, "cursor"),
      manifest,
      force,
      dryRun,
    })
  );

  if (config.domains.includes("web-fullstack")) {
    results.push(
      await syncManagedFencedFile({
        targetDir,
        relPath: ".cursor/rules/metaskill-web.mdc",
        markerId: "DOMAIN",
        style: "html",
        frontmatter: renderCursorDomainFrontmatter(
          "MetaSkill Web Full Stack standards & Playwright QA",
          ["**/*.tsx", "**/*.jsx", "**/*.css", "app/**/*", "src/**/*", "playwright.config.*"]
        ),
        blockContent: renderCursorDomainBody(
          ".agents/skills/metaskill/playbooks/web-fullstack.md",
          config
        ),
        manifest,
        force,
        dryRun,
      })
    );
  }

  if (config.domains.includes("video-audio")) {
    results.push(
      await syncManagedFencedFile({
        targetDir,
        relPath: ".cursor/rules/metaskill-media.mdc",
        markerId: "DOMAIN",
        style: "html",
        frontmatter: renderCursorDomainFrontmatter(
          "MetaSkill Video/Audio multimodal FFmpeg/Remotion standards",
          ["**/remotion/**/*", "**/*.py", "scripts/**/*", "inputs/**/*"]
        ),
        blockContent: renderCursorDomainBody(
          ".agents/skills/metaskill/playbooks/video-audio-multimodal.md",
          config
        ),
        manifest,
        force,
        dryRun,
      })
    );
  }

  if (config.domains.includes("db-appsec")) {
    results.push(
      await syncManagedFencedFile({
        targetDir,
        relPath: ".cursor/rules/metaskill-db-appsec.mdc",
        markerId: "DOMAIN",
        style: "html",
        frontmatter: renderCursorDomainFrontmatter(
          "MetaSkill Database & Defensive AppSec invariants",
          ["**/*.sql", "prisma/**/*", "drizzle/**/*", "supabase/**/*", "docker-compose*.yml"]
        ),
        blockContent: renderCursorDomainBody(
          ".agents/skills/metaskill/playbooks/db-appsec-defensive.md",
          config
        ),
        manifest,
        force,
        dryRun,
      })
    );
  }

  return results;
}

/**
 * Generates thin, idempotent, conflict-safe IDE adapter files using fenced blocks
 * pointing back to `.agents/skills/metaskill/` and `AGENTS.md`.
 */
export async function syncAdapters(
  targetDir: string,
  config: MetaSkillConfig,
  options: SyncAdapterOptions = {}
): Promise<AdapterSyncReport> {
  const ownsManifest = !options.manifest;
  const manifest = options.manifest ?? (await loadManagedManifest(targetDir));
  const force = Boolean(options.force);
  const dryRun = Boolean(options.dryRun);

  const results: FencedSyncResult[] = [];
  const files: string[] = [];

  const handlers: Record<AgentId, () => Promise<void>> = {
    cursor: async () => {
      const cursorResults = await syncCursorAdapters(targetDir, config, manifest, force, dryRun);
      results.push(...cursorResults);
      files.push(...cursorResults.map((r) => r.relPath));
    },
    "claude-code": async () => {
      const claudeMdRes = await syncManagedFencedFile({
        targetDir,
        relPath: "CLAUDE.md",
        markerId: "ADAPTER",
        style: "html",
        blockContent: buildThinPointerBlock(config, "claude-code"),
        manifest,
        force,
        dryRun,
      });
      const skillRes = await syncManagedFencedFile({
        targetDir,
        relPath: ".claude/skills/metaskill/SKILL.md",
        markerId: "ADAPTER",
        style: "html",
        frontmatter: renderClaudeSkillFrontmatter(),
        blockContent: renderClaudeSkillBody(config),
        manifest,
        force,
        dryRun,
      });
      results.push(claudeMdRes, skillRes);
      files.push(claudeMdRes.relPath, skillRes.relPath);
    },
    windsurf: async () => {
      const res = await syncManagedFencedFile({
        targetDir,
        relPath: ".windsurf/rules/metaskill.md",
        markerId: "ADAPTER",
        style: "html",
        blockContent: buildThinPointerBlock(config, "windsurf"),
        manifest,
        force,
        dryRun,
      });
      results.push(res);
      files.push(res.relPath);
    },
    antigravity: async () => {
      const res = await syncManagedFencedFile({
        targetDir,
        relPath: ".gemini/GEMINI.md",
        markerId: "ADAPTER",
        style: "html",
        blockContent: buildThinPointerBlock(config, "antigravity"),
        manifest,
        force,
        dryRun,
      });
      results.push(res);
      files.push(res.relPath);
    },
    codex: async () => {
      // Codex reads canonical AGENTS.md and .agents/skills/ directly.
      files.push("AGENTS.md");
    },
    cline: async () => {
      const res = await syncManagedFencedFile({
        targetDir,
        relPath: ".clinerules/metaskill.md",
        markerId: "ADAPTER",
        style: "html",
        blockContent: buildThinPointerBlock(config, "cline"),
        manifest,
        force,
        dryRun,
      });
      results.push(res);
      files.push(res.relPath);
    },
  };

  for (const agent of config.agents) {
    await handlers[agent]();
  }

  if (ownsManifest && !dryRun) {
    await saveManagedManifest(targetDir, manifest);
  }

  const conflicts = results.filter((r) => r.status === "conflict");
  return {
    files: [...new Set(files)],
    results,
    conflicts,
  };
}

/** Expected primary adapter file paths per configured AgentId (used by `mtsk doctor`). */
export function getExpectedAdapterPaths(config: MetaSkillConfig): string[] {
  const expected: string[] = [];
  for (const agent of config.agents) {
    switch (agent) {
      case "cursor":
        expected.push(".cursor/rules/metaskill-core.mdc");
        break;
      case "claude-code":
        expected.push("CLAUDE.md", ".claude/skills/metaskill/SKILL.md");
        break;
      case "windsurf":
        expected.push(".windsurf/rules/metaskill.md");
        break;
      case "antigravity":
        expected.push(".gemini/GEMINI.md");
        break;
      case "cline":
        expected.push(".clinerules/metaskill.md");
        break;
      case "codex":
        expected.push("AGENTS.md");
        break;
    }
  }
  return [...new Set(expected)];
}
