import { EditorCapabilitySchema, type EditorCapability } from "../schemas/capabilities.js";
import type { AgentId } from "../schemas/probe.js";

/** Honest capability and permission-enforcement declarations per supported editor. */
export const EDITOR_CAPABILITIES: Record<AgentId, EditorCapability> = {
  "claude-code": EditorCapabilitySchema.parse({
    id: "claude-code",
    displayName: "Claude Code",
    instructionEntrypoints: [
      "CLAUDE.md",
      ".claude/skills/metaskill/SKILL.md",
      ".agents/skills/metaskill/SKILL.md",
    ],
    autoLoadsCanonicalAgentsMd: false,
    supportsProgressiveSkills: true,
    sessionContinuityMechanism: "CLAUDE.md + .claude/skills/ + PROJECT_STATE.md",
    permissionEnforcement: "editor-sandbox-plus-advisory",
    guarantees: [
      "Reads CLAUDE.md automatically at session start and discovers .claude/skills/ wrappers.",
      "Native tool/shell confirmation prompts enforce write/command approvals alongside MetaSkill rules.",
    ],
    limitations: [
      "Does not auto-read root AGENTS.md natively unless directed from CLAUDE.md.",
      "MetaSkill read-only mode relies on instruction compliance whenever the user enables auto-edit tools.",
    ],
  }),
  cursor: EditorCapabilitySchema.parse({
    id: "cursor",
    displayName: "Cursor",
    instructionEntrypoints: [
      ".cursor/rules/metaskill-core.mdc",
      ".cursor/rules/metaskill-*.mdc",
      "AGENTS.md",
    ],
    autoLoadsCanonicalAgentsMd: true,
    supportsProgressiveSkills: true,
    sessionContinuityMechanism: "alwaysApply core rule + glob-scoped domain .mdc + PROJECT_STATE.md",
    permissionEnforcement: "editor-sandbox-plus-advisory",
    guarantees: [
      "Injects alwaysApply .mdc rules and root AGENTS.md consistently into new chats.",
      "Domain .mdc globs scope specialist playbooks to matching files.",
    ],
    limitations: [
      "If Cursor Agent Auto-Run / YOLO mode is turned on by the user, read-only rules are advisory only.",
    ],
  }),
  antigravity: EditorCapabilitySchema.parse({
    id: "antigravity",
    displayName: "Antigravity / Gemini",
    instructionEntrypoints: [
      ".gemini/GEMINI.md",
      ".agents/skills/metaskill/SKILL.md",
      "AGENTS.md",
    ],
    autoLoadsCanonicalAgentsMd: true,
    supportsProgressiveSkills: true,
    sessionContinuityMechanism: ".gemini/GEMINI.md + .agents/skills/ + PROJECT_STATE.md",
    permissionEnforcement: "editor-sandbox-plus-advisory",
    guarantees: [
      "Reads canonical AGENTS.md and .agents/skills/ natively with progressive skill loading.",
      "Workspace boundaries and command/approval settings complement MetaSkill Red-Zone rules.",
    ],
    limitations: [
      "Read-only initial scoping depends on instruction adherence unless workspace write restrictions are enabled.",
    ],
  }),
  windsurf: EditorCapabilitySchema.parse({
    id: "windsurf",
    displayName: "Windsurf",
    instructionEntrypoints: [".windsurf/rules/metaskill.md"],
    autoLoadsCanonicalAgentsMd: false,
    supportsProgressiveSkills: false,
    sessionContinuityMechanism: ".windsurf/rules/metaskill.md -> PROJECT_STATE.md",
    permissionEnforcement: "advisory-only",
    guarantees: [
      "Loads .windsurf/rules/metaskill.md automatically as workspace rules.",
    ],
    limitations: [
      "No native progressive .agents/skills/ discovery; relies on explicit file reads.",
      "Permission boundaries are advisory instructions unless restricted in Windsurf IDE settings.",
    ],
  }),
  codex: EditorCapabilitySchema.parse({
    id: "codex",
    displayName: "Codex",
    instructionEntrypoints: ["AGENTS.md", ".agents/skills/metaskill/SKILL.md"],
    autoLoadsCanonicalAgentsMd: true,
    supportsProgressiveSkills: true,
    sessionContinuityMechanism: "AGENTS.md + .agents/skills/ + PROJECT_STATE.md",
    permissionEnforcement: "editor-sandbox-plus-advisory",
    guarantees: [
      "Reads canonical AGENTS.md and .agents/skills/ directly without duplicate adapter files.",
      "Codex read-only / workspace-write sandbox modes provide OS-level enforcement when active.",
    ],
    limitations: [
      "Without Codex read-only sandbox active, read-only advisory mode relies on prompt compliance.",
    ],
  }),
  cline: EditorCapabilitySchema.parse({
    id: "cline",
    displayName: "Cline",
    instructionEntrypoints: [".clinerules/metaskill.md"],
    autoLoadsCanonicalAgentsMd: false,
    supportsProgressiveSkills: false,
    sessionContinuityMechanism: ".clinerules/metaskill.md -> PROJECT_STATE.md",
    permissionEnforcement: "editor-sandbox-plus-advisory",
    guarantees: [
      "Loads .clinerules/metaskill.md automatically across tasks.",
      "Cline auto-approve toggles let users enforce manual confirmation for file writes and terminal commands.",
    ],
    limitations: [
      "No native progressive .agents/skills/ discovery; relies on explicit file reads.",
    ],
  }),
};

/** Returns capability records for the given configured agents (preserving order, deduplicated). */
export function getEditorCapabilities(agents: AgentId[]): EditorCapability[] {
  const unique = [...new Set(agents)];
  return unique.map((agent) => EDITOR_CAPABILITIES[agent]);
}
