# Host Capabilities & Permission Enforcement Matrix

> **Last verified against official docs:** `2026-11-21` · Primary hosts: **Claude Code**, **Codex**, **Antigravity**.

MetaSkill separates **CLI checks** (`mtsk`), **host mechanisms** (hooks, sandboxes, subagents, headless modes), and **advisory instructions**.

## 1. Primary Hosts (Active)

| Host | Instructions | Skills | Subagents | Hooks | Headless CLI | Official Sources |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Claude Code** | `CLAUDE.md` (does not auto-load `AGENTS.md`) | `.claude/skills/`, `.agents/skills/` | `.claude/agents/*.md` | `SessionStart`, `PreToolUse`, `PostToolUse`, `Stop` (exit `2` or JSON decision block) via settings or plugin `hooks/hooks.json` | `claude -p` (`--output-format json`, `--bare`) | [memory](https://code.claude.com/docs/en/memory), [hooks](https://code.claude.com/docs/en/hooks), [plugins](https://code.claude.com/docs/en/plugins), [marketplaces](https://code.claude.com/docs/en/plugin-marketplaces), [sub-agents](https://code.claude.com/docs/en/sub-agents), [skills](https://code.claude.com/docs/en/skills), [headless](https://code.claude.com/docs/en/headless) |
| **Codex** | `AGENTS.md`, `AGENTS.override.md` | `.agents/skills/*/SKILL.md` | Yes (native + second `codex exec`) | `.codex/hooks.json` or `[hooks]` in `config.toml` (`SessionStart`, `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Stop`, `SubagentStop`; project hooks require explicit trust) | `codex exec` (`--sandbox`, `--json`, `--output-schema`, `review`) | [cli](https://learn.chatgpt.com/docs/codex/cli), [agents-md](https://learn.chatgpt.com/docs/agent-configuration/agents-md), [skills](https://learn.chatgpt.com/docs/build-skills), [security](https://learn.chatgpt.com/docs/security), [hooks](https://learn.chatgpt.com/docs/hooks), [noninteractive](https://learn.chatgpt.com/docs/non-interactive-mode) |
| **Antigravity** | `AGENTS.md`, `GEMINI.md`, `.gemini/GEMINI.md`, `.agents/rules/*.md` (24 KB/file cap, 20k aggregate rules budget) | `.agents/skills/*/SKILL.md` (legacy static workflows deprecated; use skills + `/run-workflow`) | Yes (custom subagents + browser agent + artifacts) | `.agents/hooks.json` or plugin root `hooks.json` (`SessionStart`, `PreToolUse`, `PostToolUse`, `PreInvocation`, `PostInvocation`, `Stop` via `decision: "continue"` + `continuationActive`) | `agy -p` (`--output-format json`, `--json-schema`, `--sandbox`, `--mode`) | [rules](https://antigravity.google/docs/rules.md), [skills](https://antigravity.google/docs/skills.md), [hooks](https://antigravity.google/docs/hooks.md), [plugins](https://antigravity.google/docs/plugins.md), [cli](https://antigravity.google/docs/cli/reference.md), [browser](https://antigravity.google/docs/ide/browser.md) |

## 2. Paused Hosts (Maintained Without New Features)

| Host | Status | Entrypoints | Permission Enforcement | Official Source |
| :--- | :--- | :--- | :--- | :--- |
| **Cursor** | Paused until Phase 6 | `.cursor/rules/metaskill-*.mdc`, `AGENTS.md` | Editor settings + advisory | [rules](https://cursor.com/docs/rules) |
| **Windsurf** | Paused until Phase 6 | `.windsurf/rules/metaskill.md` | Advisory instructions only | [customizations](https://docs.devin.ai/desktop/devin-local/customizations) |
| **Cline** | Paused until Phase 6 | `.clinerules/metaskill.md` | Tool auto-approve toggles + advisory | [cline-rules](https://docs.cline.bot/customization/cline-rules) |

## 3. Sandbox & Continuity Notes

- **Claude Code:** Plugins bundle `.claude-plugin/plugin.json`, `skills/`, `agents/`, `commands/`, and `hooks/hooks.json`; GitHub repos can self-host `.claude-plugin/marketplace.json`.
- **Codex:** `config.toml` sets `sandbox_mode` (`read-only`, `workspace-write`, `danger-full-access`) and `approval_policy` (`on-request`, `never`); `--approve-for-me` routes approvals automatically inside `workspace-write`.
- **Antigravity:** Native plugins place `hooks.json` directly at the plugin root alongside `plugin.json`; visual artifacts (screenshots, browser recordings) serve as perceptual evidence.
