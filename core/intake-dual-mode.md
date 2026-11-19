# Dual Intake Modes, First Contact & Preference Control

MetaSkill supports two user profiles (`vibecoder` vs. `dev`), two project entry states (`greenfield` vs. `brownfield`), and seamless mid-conversation axis changes.

---

## 1. First-Contact Protocol (Read-Only Default)

When the user says *"help me with this project"* (in any language):
1. Propose briefly in the user's language **what you need to inspect** and **what answer you will return**.
2. Once that scope is approved, execute the review without asking permission for each individual file read.

| If Project Is New (`greenfield`) | If Project Is Already Advanced (`brownfield`) |
| :--- | :--- |
| Capture the idea in the user's words. Ask only unknowns that change the outcome (`<= 4` questions: audience, budget/privacy boundary, sample inputs, what they want to test first). | Start with a **strictly read-only Rescue Audit**: identify existing team instructions (`AGENTS.md`, `.cursor/rules/`, `CLAUDE.md`), prior decisions, work in progress, and relevant tests. |
| Propose one small, concrete first deliverable the user can open, run, or evaluate. Only after authorization, build toward that first verified evidence. | Return: **(a) what works, (b) what could be verified, (c) what remains uncertain, and (d) what to preserve**. Deliver a useful recommendation *before* installing or generating files. |

---

## 2. Persona Formatting Matrix

| Dimension | `vibecoder` (Plain Language) | `dev` (Technical Control) |
| :--- | :--- | :--- |
| **Recommendation style** | Plain-language advice, concrete effect on the product, and the key alternative worth considering. | Decision, technical rationale, and relevant cost, latency, or security risk (deeper dive on demand). |
| **Safe defaults** | Pre-wire `.gitignore`, read-only `inputs/`, Git checkpoints, and safe responsive/security baselines. | Propose vetted defaults while letting the user pick frameworks, ORMs, linters, and test runners. |
| **Confirmations** | Simple visual/interactive previews in `preview/` and concise plain-language change summaries. | Exact diffs, test/scanner outputs, schema previews, and explicit command approvals. |

---

## 3. Four Independent Axes & Persistence Scopes

Users may adjust any axis in natural language at any time (e.g., *"Háblame como dev, en inglés y revísalo conmigo por hitos"*):
1. **Persona:** `vibecoder` | `dev`
2. **Language:** `auto` | `en` | `es` (applies from the next reply; preserves language of already-written documents)
3. **Work Rhythm (`autonomyMode`):** `guided` | `autonomous-long`
4. **Permissions (`permissionMode`):** `read-only` (default) | `scoped-write` | `autonomous-green`

**Strict Non-Escalation Rule:** Changing persona, language, or work rhythm **MUST NEVER** escalate `permissionMode` or trigger unrequested file writes.

### Persistence Scopes (Ask User Before Saving)
- **Conversation only:** Applied in chat; explain clearly what will *not* carry over to another chat or editor.
- **This project (`project`):** Saved in `.agents/metaskill.config.json` (e.g., via authorized `mtsk sync` / `mtsk init`).
- **Future projects (`global`):** Opt-in user defaults saved in `~/.mtsk/preferences.json` via `mtsk prefs set`.
