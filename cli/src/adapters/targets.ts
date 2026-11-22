import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { MetaSkillConfig } from "../schemas/config.js";
import type { AgentId } from "../schemas/probe.js";
import {
  loadManagedManifest,
  saveManagedManifest,
  syncManagedFencedFile,
  syncManagedWholeFile,
  type FencedSyncResult,
  type ManagedManifest,
} from "../utils/fs.js";
import { getPackageRoot } from "../utils/paths.js";
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
    capability.permissionEnforcement === "hooks-and-sandbox"
      ? "hooks + editor sandbox + advisory rules"
      : capability.permissionEnforcement === "editor-sandbox-plus-advisory"
        ? "editor-sandbox + advisory rules"
        : "advisory rules only (verify destructive actions manually)";

  return [
    "## MetaSkill Architect Integration",
    "",
    `- **Persona:** \`${config.persona}\` | **Language:** \`${config.language}\` | **Rhythm:** \`${config.autonomyMode}\` | **Permissions:** \`${config.permissionMode}\``,
    "- **Host Sandbox & Rules:** " + enforcementLabel,
    "- **Instructions:** Follow `AGENTS.md` and `.agents/skills/metaskill/SKILL.md` (Before: contract -> During: verifiable steps -> After: independent review & evidence).",
    "- **Read-Only Initial Mode:** When `permissionMode` is `read-only`, inspect and propose the contract first; create or modify zero files without permission.",
    "- **Evidence Discipline:** Keep `inputs/` untouched. Close every requirement as `verified`, `pending`, or `blocked` with observed output.",
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
    "- Use the team's equivalent checks and evidence for the relevant domain criteria. Mark requirements `verified`, `pending`, or `blocked`.",
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
    "- Follow `AGENTS.md` and the team's existing scope, state and verification workflow.",
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
      const pkgRoot = getPackageRoot();
      const geminiRes = await syncManagedFencedFile({
        targetDir,
        relPath: ".gemini/GEMINI.md",
        markerId: "ADAPTER",
        style: "html",
        blockContent: buildThinPointerBlock(config, "antigravity"),
        manifest,
        force,
        dryRun,
      });
      results.push(geminiRes);
      files.push(geminiRes.relPath);

      const agySkillSlugs = ["metaskill-contract", "metaskill-verify", "metaskill-handoff"];
      for (const slug of agySkillSlugs) {
        const src = path.join(pkgRoot, "plugins", "antigravity", "skills", slug, "SKILL.md");
        if (existsSync(src)) {
          const r = await syncManagedWholeFile({
            targetDir,
            relPath: `.agents/skills/${slug}/SKILL.md`,
            content: readFileSync(src, "utf8"),
            manifest,
            force,
            dryRun,
          });
          results.push(r);
          files.push(r.relPath);
        }
      }

      const hookAssets: Array<[string, string]> = [
        ["plugins/antigravity/hooks/stop-verify.mjs", ".agents/hooks/stop-verify.mjs"],
        ["plugins/antigravity/hooks/session-start.mjs", ".agents/hooks/session-start.mjs"],
        ["plugins/antigravity/hooks.json", ".agents/hooks.json"],
      ];
      for (const [srcRel, destRel] of hookAssets) {
        const srcFull = path.join(pkgRoot, srcRel);
        if (existsSync(srcFull)) {
          const r = await syncManagedWholeFile({
            targetDir,
            relPath: destRel,
            content: readFileSync(srcFull, "utf8"),
            manifest,
            force,
            dryRun,
          });
          results.push(r);
          files.push(r.relPath);
        }
      }
    },
    codex: async () => {
      // Codex reads canonical AGENTS.md and .agents/skills/ directly; add recommended read-only profile & hooks template.
      const tomlRes = await syncManagedFencedFile({
        targetDir,
        relPath: ".codex/config.metaskill.toml",
        markerId: "CODEX_PROFILE",
        style: "hash",
        blockContent: [
          "# Recommended MetaSkill read-only initial profile for Codex CLI.",
          "# Use via: codex --profile metaskill_readonly  (or merge into .codex/config.toml after reviewing).",
          "[profiles.metaskill_readonly]",
          'sandbox_mode = "read-only"',
          'approval_policy = "on-request"',
          "",
          "[profiles.metaskill_scoped]",
          'sandbox_mode = "workspace-write"',
          'approval_policy = "on-request"',
        ].join("\n"),
        manifest,
        force,
        dryRun,
      });
      const hooksTemplate = `${JSON.stringify(
        {
          hooks: {
            SessionStart: [
              {
                hooks: [
                  {
                    type: "command",
                    command: "node .agents/hooks/session-start.mjs",
                  },
                ],
              },
            ],
            Stop: [
              {
                hooks: [
                  {
                    type: "command",
                    command: "mtsk verify --from-report --workspaces --json",
                  },
                ],
              },
            ],
          },
        },
        null,
        2
      )}\n`;
      const hooksRes = await syncManagedWholeFile({
        targetDir,
        relPath: ".codex/hooks.metaskill.json",
        content: hooksTemplate,
        manifest,
        force,
        dryRun,
      });
      results.push(tomlRes, hooksRes);
      files.push("AGENTS.md", tomlRes.relPath, hooksRes.relPath);
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
