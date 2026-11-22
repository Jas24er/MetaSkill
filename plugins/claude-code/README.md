# MetaSkill Plugin for Claude Code

> [!WARNING]
> **Demo (v0.2.0).** This plugin is still a demo and needs more testing. Expect breaking changes.

Enforce the **Before · During · After** quality cycle natively inside Claude Code using a `Stop` verification gate, `SessionStart` state loader, independent `metaskill-reviewer` subagent, and slash commands (`/contract`, `/verify`, `/handoff`).

## Install from MetaSkill Marketplace

Inside Claude Code:

```text
/plugin marketplace add Jas24er/MetaSkill
/plugin install metaskill@metaskill
```

## Included Components
- **Skill:** `metaskill` (`skills/metaskill/SKILL.md`)
- **Subagent:** `metaskill-reviewer` (`agents/metaskill-reviewer.md`) — isolated read-only reviewer without author reasoning
- **Commands:** `/contract`, `/verify`, `/handoff`
- **Hooks (`hooks/hooks.json`):**
  - `SessionStart`: injects active contract, last evidence summary, and next step
  - `Stop`: blocks turn completion (`exit 2`) if `SPEC.md` has a contract with missing or incomplete evidence (respects `stop_hook_active` to avoid loops)

## Submitting to External / Official Marketplaces
1. Ensure `.claude-plugin/marketplace.json` and `plugins/claude-code/.claude-plugin/plugin.json` pass validation (`claude plugin validate .` when logged in).
2. Submit a PR or listing pointing to `https://github.com/Jas24er/MetaSkill` (subdirectory `plugins/claude-code`) following Anthropic's official Claude Code plugin marketplace submission guidelines.
