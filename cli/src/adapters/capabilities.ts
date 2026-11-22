import { EditorCapabilitySchema, type EditorCapability } from "../schemas/capabilities.js";
import type { AgentId } from "../schemas/probe.js";

/** Source-verified capability and enforcement declarations per supported AI coding host (verified 2026-11-21). */
export const EDITOR_CAPABILITIES: Record<AgentId, EditorCapability> = {
  "claude-code": EditorCapabilitySchema.parse({
    id: "claude-code",
    displayName: "Claude Code",
    tier: "primary",
    verifiedAt: "2026-11-21",
    officialDocs: [
      "https://code.claude.com/docs/en/memory",
      "https://code.claude.com/docs/en/skills",
      "https://code.claude.com/docs/en/sub-agents",
      "https://code.claude.com/docs/en/hooks",
      "https://code.claude.com/docs/en/plugins",
      "https://code.claude.com/docs/en/plugins-reference",
      "https://code.claude.com/docs/en/plugin-marketplaces",
      "https://code.claude.com/docs/en/headless",
    ],
    instructionEntrypoints: [
      "CLAUDE.md",
      ".claude/skills/metaskill/SKILL.md",
      ".claude/agents/",
      ".claude/commands/",
      ".claude/settings.json",
    ],
    autoLoadsCanonicalAgentsMd: false,
    supportsProgressiveSkills: true,
    supportsHooks: true,
    supportsSubagents: true,
    supportsHeadless: true,
    headlessCommand: "claude -p",
    sessionContinuityMechanism: "CLAUDE.md + SessionStart hook + .claude/skills/ + SPEC.md/PROJECT_STATE.md",
    permissionEnforcement: "hooks-and-sandbox",
    guarantees: [
      "Reads CLAUDE.md at session start and discovers skills in .claude/skills/ and .agents/skills/.",
      "Supports deterministic hooks (SessionStart, PreToolUse, PostToolUse, Stop) via settings.json or plugins.",
      "Stop hooks block premature completion with exit code 2 or JSON block decisions.",
      "Supports isolated subagents (.claude/agents/*.md), plugins (.claude-plugin/plugin.json), marketplaces, and headless claude -p.",
    ],
    limitations: [
      "Does not auto-read root AGENTS.md natively unless directed from CLAUDE.md.",
      "Read-only mode still depends on tool permission settings or PreToolUse hooks when auto-accept is active.",
    ],
    verifiedClaims: [
      {
        claim: "CLAUDE.md hierarchy and on-demand subdirectory memory loading",
        sourceUrl: "https://code.claude.com/docs/en/memory",
        verifiedAt: "2026-11-21",
      },
      {
        claim: "Skills progressive disclosure and subagents under .claude/agents/",
        sourceUrl: "https://code.claude.com/docs/en/sub-agents",
        verifiedAt: "2026-11-21",
      },
      {
        claim: "SessionStart, PreToolUse, PostToolUse, and Stop hooks (exit 2 / JSON decision block)",
        sourceUrl: "https://code.claude.com/docs/en/hooks",
        verifiedAt: "2026-11-21",
      },
      {
        claim: "Plugin layout (.claude-plugin/plugin.json, hooks/hooks.json) and GitHub marketplace distribution",
        sourceUrl: "https://code.claude.com/docs/en/plugin-marketplaces",
        verifiedAt: "2026-11-21",
      },
      {
        claim: "Headless execution via claude -p with JSON output and --bare mode",
        sourceUrl: "https://code.claude.com/docs/en/headless",
        verifiedAt: "2026-11-21",
      },
    ],
  }),
  codex: EditorCapabilitySchema.parse({
    id: "codex",
    displayName: "Codex",
    tier: "primary",
    verifiedAt: "2026-11-21",
    officialDocs: [
      "https://learn.chatgpt.com/docs/codex/cli",
      "https://learn.chatgpt.com/docs/agent-configuration/agents-md",
      "https://learn.chatgpt.com/docs/build-skills",
      "https://learn.chatgpt.com/docs/security",
      "https://learn.chatgpt.com/docs/hooks",
      "https://learn.chatgpt.com/docs/non-interactive-mode",
    ],
    instructionEntrypoints: [
      "AGENTS.md",
      "AGENTS.override.md",
      ".agents/skills/metaskill/SKILL.md",
      ".codex/config.toml",
      ".codex/hooks.json",
    ],
    autoLoadsCanonicalAgentsMd: true,
    supportsProgressiveSkills: true,
    supportsHooks: true,
    supportsSubagents: true,
    supportsHeadless: true,
    headlessCommand: "codex exec",
    sessionContinuityMechanism: "AGENTS.md + .agents/skills/ + config.toml + SPEC.md/PROJECT_STATE.md",
    permissionEnforcement: "hooks-and-sandbox",
    guarantees: [
      "Discovers AGENTS.md / AGENTS.override.md hierarchically and loads .agents/skills/*/SKILL.md progressively.",
      "Enforces OS-level sandbox modes (read-only, workspace-write, danger-full-access) and approval policies in config.toml.",
      "Supports lifecycle hooks in .codex/hooks.json or config.toml (SessionStart, PreToolUse, PostToolUse, Stop, SubagentStop).",
      "Supports headless codex exec with --output-schema, --json, and codex exec review.",
    ],
    limitations: [
      "Project-scoped command hooks require explicit user trust in Codex CLI unless --dangerously-bypass-hook-trust is passed.",
      "Without read-only sandbox active, initial read-only posture relies on instruction compliance.",
    ],
    verifiedClaims: [
      {
        claim: "Hierarchical AGENTS.md and AGENTS.override.md loading",
        sourceUrl: "https://learn.chatgpt.com/docs/agent-configuration/agents-md",
        verifiedAt: "2026-11-21",
      },
      {
        claim: "Agent Skills discovery under .agents/skills/<name>/SKILL.md",
        sourceUrl: "https://learn.chatgpt.com/docs/build-skills",
        verifiedAt: "2026-11-21",
      },
      {
        claim: "Sandbox modes (read-only, workspace-write) and approval policies via config.toml and CLI flags",
        sourceUrl: "https://learn.chatgpt.com/docs/security",
        verifiedAt: "2026-11-21",
      },
      {
        claim: "Lifecycle hooks in .codex/hooks.json and config.toml requiring explicit project hook trust",
        sourceUrl: "https://learn.chatgpt.com/docs/hooks",
        verifiedAt: "2026-11-21",
      },
      {
        claim: "Non-interactive codex exec mode with --json, --output-schema, and review subcommand",
        sourceUrl: "https://learn.chatgpt.com/docs/non-interactive-mode",
        verifiedAt: "2026-11-21",
      },
    ],
  }),
  antigravity: EditorCapabilitySchema.parse({
    id: "antigravity",
    displayName: "Antigravity / Gemini",
    tier: "primary",
    verifiedAt: "2026-11-21",
    officialDocs: [
      "https://antigravity.google/docs/rules.md",
      "https://antigravity.google/docs/skills.md",
      "https://antigravity.google/docs/hooks.md",
      "https://antigravity.google/docs/plugins.md",
      "https://antigravity.google/docs/cli/reference.md",
      "https://antigravity.google/docs/ide/browser.md",
      "https://antigravity.google/docs/permissions.md",
      "https://antigravity.google/docs/sandbox.md",
    ],
    instructionEntrypoints: [
      "AGENTS.md",
      "GEMINI.md",
      ".gemini/GEMINI.md",
      ".agents/rules/*.md",
      ".agents/skills/metaskill/SKILL.md",
      ".agents/hooks.json",
    ],
    autoLoadsCanonicalAgentsMd: true,
    supportsProgressiveSkills: true,
    supportsHooks: true,
    supportsSubagents: true,
    supportsHeadless: true,
    headlessCommand: "agy -p",
    sessionContinuityMechanism: "AGENTS.md + .agents/skills/ + .agents/hooks.json + artifacts",
    permissionEnforcement: "hooks-and-sandbox",
    guarantees: [
      "Discovers AGENTS.md, GEMINI.md, .agents/rules/*.md, and progressive .agents/skills/*/SKILL.md natively.",
      "Supports synchronous lifecycle hooks in .agents/hooks.json (SessionStart, PreToolUse, PostToolUse, PreInvocation, PostInvocation, Stop).",
      "Supports plugins (.agents/plugins/<name>/plugin.json with root hooks.json), browser automation, and visual artifacts.",
      "Supports headless agy -p / --print with --json-schema, --output-format json, --mode, and --sandbox.",
    ],
    limitations: [
      "Rule files are capped at 24,000 bytes per file with a 20,000-token aggregate always-on rules budget.",
      "Static single-file workflows are deprecated in favor of Agent Skills and dynamic /run-workflow scripts.",
    ],
    verifiedClaims: [
      {
        claim: "Directory rules (AGENTS.md/GEMINI.md), 24 KB per-file cap, and 20k-token aggregate rules budget",
        sourceUrl: "https://antigravity.google/docs/rules.md",
        verifiedAt: "2026-11-21",
      },
      {
        claim: "Progressive Agent Skills in .agents/skills/<name>/SKILL.md",
        sourceUrl: "https://antigravity.google/docs/skills.md",
        verifiedAt: "2026-11-21",
      },
      {
        claim: "Lifecycle hooks in .agents/hooks.json including Stop (decision: continue + continuationActive)",
        sourceUrl: "https://antigravity.google/docs/hooks.md",
        verifiedAt: "2026-11-21",
      },
      {
        claim: "Plugin bundles placing hooks.json at plugin root alongside plugin.json, rules/, and skills/",
        sourceUrl: "https://antigravity.google/docs/plugins.md",
        verifiedAt: "2026-11-21",
      },
      {
        claim: "Antigravity CLI headless print mode (agy -p), --json-schema, and terminal sandbox",
        sourceUrl: "https://antigravity.google/docs/cli/reference.md",
        verifiedAt: "2026-11-21",
      },
    ],
  }),
  cursor: EditorCapabilitySchema.parse({
    id: "cursor",
    displayName: "Cursor (Paused)",
    tier: "paused",
    verifiedAt: "2026-11-21",
    officialDocs: ["https://cursor.com/docs/rules"],
    instructionEntrypoints: [
      ".cursor/rules/metaskill-core.mdc",
      ".cursor/rules/metaskill-*.mdc",
      "AGENTS.md",
    ],
    autoLoadsCanonicalAgentsMd: true,
    supportsProgressiveSkills: true,
    supportsHooks: false,
    supportsSubagents: false,
    supportsHeadless: false,
    sessionContinuityMechanism: "alwaysApply core rule + glob-scoped domain .mdc + SPEC.md",
    permissionEnforcement: "editor-sandbox-plus-advisory",
    guarantees: [
      "Injects alwaysApply .mdc rules and root AGENTS.md into new chats.",
      "Adapter preserved for compatibility while focus stays on Claude Code, Codex, and Antigravity.",
    ],
    limitations: [
      "Paused in MetaSkill v2: no new host-specific enforcement features are planned until Phase 6.",
      "If Cursor Auto-Run mode is enabled, read-only rules are advisory only.",
    ],
    verifiedClaims: [
      {
        claim: "Workspace .cursor/rules/*.mdc and root AGENTS.md support",
        sourceUrl: "https://cursor.com/docs/rules",
        verifiedAt: "2026-11-21",
      },
    ],
  }),
  windsurf: EditorCapabilitySchema.parse({
    id: "windsurf",
    displayName: "Windsurf (Paused)",
    tier: "paused",
    verifiedAt: "2026-11-21",
    officialDocs: ["https://docs.devin.ai/desktop/devin-local/customizations"],
    instructionEntrypoints: [".windsurf/rules/metaskill.md"],
    autoLoadsCanonicalAgentsMd: false,
    supportsProgressiveSkills: false,
    supportsHooks: false,
    supportsSubagents: false,
    supportsHeadless: false,
    sessionContinuityMechanism: ".windsurf/rules/metaskill.md -> SPEC.md",
    permissionEnforcement: "advisory-only",
    guarantees: [
      "Loads .windsurf/rules/metaskill.md as workspace rules (legacy adapter maintained).",
    ],
    limitations: [
      "Paused in MetaSkill v2: no new host-specific enforcement features are planned until Phase 6.",
      "Permission boundaries are advisory instructions unless restricted in IDE settings.",
    ],
    verifiedClaims: [
      {
        claim: "Workspace rules directory and activation modes documentation",
        sourceUrl: "https://docs.devin.ai/desktop/devin-local/customizations",
        verifiedAt: "2026-11-21",
      },
    ],
  }),
  cline: EditorCapabilitySchema.parse({
    id: "cline",
    displayName: "Cline (Paused)",
    tier: "paused",
    verifiedAt: "2026-11-21",
    officialDocs: ["https://docs.cline.bot/customization/cline-rules"],
    instructionEntrypoints: [".clinerules/metaskill.md"],
    autoLoadsCanonicalAgentsMd: false,
    supportsProgressiveSkills: false,
    supportsHooks: false,
    supportsSubagents: false,
    supportsHeadless: false,
    sessionContinuityMechanism: ".clinerules/metaskill.md -> SPEC.md",
    permissionEnforcement: "editor-sandbox-plus-advisory",
    guarantees: [
      "Loads .clinerules/metaskill.md automatically across tasks (legacy adapter maintained).",
      "Auto-approve toggles control write and command confirmations.",
    ],
    limitations: [
      "Paused in MetaSkill v2: no new host-specific enforcement features are planned until Phase 6.",
      "No native progressive .agents/skills/ discovery; relies on explicit file reads.",
    ],
    verifiedClaims: [
      {
        claim: "Workspace .clinerules/*.md rules directory loading",
        sourceUrl: "https://docs.cline.bot/customization/cline-rules",
        verifiedAt: "2026-11-21",
      },
    ],
  }),
};

/** Returns capability records for the given configured agents (preserving order, deduplicated). */
export function getEditorCapabilities(agents: AgentId[]): EditorCapability[] {
  const unique = [...new Set(agents)];
  return unique.map((agent) => EDITOR_CAPABILITIES[agent]);
}
