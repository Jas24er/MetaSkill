# Editor Capabilities & Permission Enforcement Matrix

MetaSkill distinguishes between **CLI-enforced guarantees** (deterministic checks/locks in `mtsk`), **host-editor technical controls** (native approvals/sandboxes), and **advisory instructions**.

| Editor (`AgentId`) | Auto-Loads `AGENTS.md` | Progressive `.agents/skills/` | Adapter Entrypoints | Permission Guarantee |
| :--- | :--- | :--- | :--- | :--- |
| `claude-code` | No (via `CLAUDE.md`) | Yes (`.claude/skills/` + `.agents/skills/`) | `CLAUDE.md`, `.claude/skills/metaskill/SKILL.md` | **Editor Sandbox + Advisory:** Native tool/bash prompts enforce edits/commands unless auto-accepted. |
| `cursor` | Yes | Yes | `.cursor/rules/metaskill-*.mdc`, `AGENTS.md` | **Editor Sandbox + Advisory:** Depends on user Auto-Run / command approval settings. |
| `antigravity` | Yes | Yes | `.gemini/GEMINI.md`, `.agents/skills/`, `AGENTS.md` | **Editor Sandbox + Advisory:** Workspace/command controls back advisory rules when enabled. |
| `codex` | Yes | Yes | `AGENTS.md`, `.agents/skills/metaskill/SKILL.md` | **Editor Sandbox + Advisory:** OS-level read-only / workspace-write sandbox when active. |
| `windsurf` | No | No (explicit read) | `.windsurf/rules/metaskill.md` | **Advisory Only:** Relies on instruction adherence unless IDE auto-run restrictions are enabled. |
| `cline` | No | No (explicit read) | `.clinerules/metaskill.md` | **Editor Sandbox + Advisory:** Per-tool auto-approve toggles control write/command confirmations. |

## Cross-Editor Continuity Contract

To hand off work cleanly to another chat or editor:
1. Run `mtsk sync --agents <targets>` (with authorization) so the target editor's adapter stays current.
2. Ensure `SPEC.md` and `PROJECT_STATE.md` capture the last decision, latest evidence in `preview/`, requirement states (`verified`/`pending`/`blocked`), and exact next step.
