> [Leer en Español -> README.es.md](./README.es.md)

# MetaSkill (`mtsk`) — Universal AI Project Architect

**MetaSkill** turns AI coding assistants (**Claude Code, Cursor, Antigravity, Windsurf, Codex, Cline**) into a disciplined, evidence-driven engineering workflow — built for both **non-technical Vibecoders** and **Developers**, across full-stack web apps, multimodal video/audio pipelines, databases, and defensive cybersecurity.

Instead of blindly writing boilerplate or overwriting your team's existing rules, MetaSkill starts as a **read-only advisor**, inspects your actual hardware and codebase deterministically, preserves user work with **conflict-safe fenced adapters**, and requires **real domain evidence (`preview/`)** before marking any requirement complete.

---

## Installation & Quick Start

> **Distribution Status:** Package name **`mtsk`** (`mtsk` and `metaskill` binary aliases) is configured for npm, **pending public release on the npm registry**. Until `npm publish` is run, install or run directly from this repository or an isolated tarball (`npm pack`):

```bash
# 1. Clone or enter the MetaSkill repository
npm install
npm run typecheck && npm run build

# 2. Link globally on your machine (exposes `mtsk` and `metaskill`)
npm link

# 3. Initialize or inspect any target project
mtsk probe
mtsk init --dry-run
mtsk init
mtsk doctor
```

*(Once published to npm, `npx mtsk init` will work directly without cloning.)*

---

## Core Design Principles

### 1. Safe First Contact (`read-only` Default)
- MetaSkill starts in **`read-only` advisory mode**. It proposes what files/checks it needs to review and what output it will return, inspects within that agreed scope, and delivers actionable advice **before** creating, modifying, or installing anything.
- **Greenfield:** Captures the idea in your words (`<= 4` high-leverage questions) and proposes one small, usable first deliverable before writing code.
- **Brownfield:** Runs a strictly read-only **Rescue Audit** first—identifying team rules, prior decisions, work in progress, and relevant tests, returning *what works / what was verified / what remains uncertain / what to preserve*.

### 2. Four Independent Axes & Three Persistence Scopes
Adjust **profile**, **language**, **work rhythm**, and **permissions** independently at any time in natural language (e.g., *"Talk to me as a dev, in English, and review by milestones"*):

| Axis | Values | Behavior |
| :--- | :--- | :--- |
| **Persona** | `vibecoder` \| `dev` | Plain everyday outcomes vs. technical trade-offs, risks, and flags. |
| **Language** | `auto` \| `en` \| `es` | Applies from the next reply without rewriting existing documents. |
| **Work Rhythm** | `guided` \| `autonomous-long` | Milestone check-ins vs. autonomous clean-unit loops with 3-strike halts. |
| **Permissions** | `read-only` (default) \| `scoped-write` \| `autonomous-green` | **Never escalates** when you change persona, language, or rhythm. |

- **Persistence Scopes:** Keep changes for **this conversation**, save to **this project** (`.agents/metaskill.config.json`), or opt into **future projects** globally via `mtsk prefs set` (`~/.mtsk/preferences.json`).
- Approving a recommendation, authorizing implementation, and creating a permanent rule remain separate decisions unless explicitly combined.

### 3. Conflict-Safe Fenced Adapters & Idempotency
- Repeating `mtsk init` preserves prior `persona`, `language`, `autonomyMode`, `permissionMode`, `agents`, `createdAt`, and `greenfield` status when only MetaSkill scaffolding exists.
- All managed sections in `AGENTS.md`, `.gitignore`, `.cursor/rules/*.mdc`, `CLAUDE.md`, `.claude/skills/metaskill/SKILL.md`, `.windsurf/rules/metaskill.md`, `.gemini/GEMINI.md`, and `.clinerules/metaskill.md` live inside **fenced blocks** tracked via SHA-256 hashes in `.agents/.metaskill-managed.json`.
- If you edit inside a MetaSkill block manually, `mtsk sync` **preserves your changes untouched and reports a conflict** (inspect safely with `mtsk sync --check`; refresh only the fenced block with `mtsk sync --force`).

### 4. Evidence Discipline, Professional Critique & Requirement Closure
- **Recommendations:** State *what to do*, *why it fits the user's vision*, and *what evidence would change the conclusion*.
- **Critique:** Evaluates both user proposals and agent output, distinguishing **demonstrated defects**, **testable risks**, and **deliberate style choices**.
- **`doctor` vs. Acceptance:** `mtsk doctor` verifies **environment readiness** (binaries, adapters, hardware advisories); deliverable acceptance requires real domain evidence in `preview/`.
- **Zero Dropped Requirements:** Every agreed requirement closes explicitly as **`verified`**, **`pending`**, or **`blocked`**, with cross-chat handoff state recorded in `PROJECT_STATE.md`.

### 5. Minimum-Mechanism Learning & Token Economy
- **Automatically detectable bug** -> Regression test (e.g., team rule survives two `mtsk sync` runs).
- **Recurrent judgment call** -> Lean specialist skill (`<= 180` lines) with **Pre-Write Preview Gate**, activation trigger, checks, 1 example, 1 exception, and validation method.
- **One-off preference** -> Honored for the current task without bloating permanent rules.
- Default replies stay as short as needed to understand and decide while always surfacing decisive risks.

---

## Honest Editor Capabilities & Guarantees

MetaSkill explicitly declares what each host editor enforces technically vs. via advisory instructions:

| Editor | Auto-Loads `AGENTS.md` | Progressive `.agents/skills/` | Permission Enforcement | Entrypoints |
| :--- | :--- | :--- | :--- | :--- |
| **Claude Code** | No (via `CLAUDE.md`) | Yes | Editor sandbox/prompts + advisory | `CLAUDE.md`, `.claude/skills/metaskill/SKILL.md` |
| **Cursor** | Yes | Yes | Editor settings + advisory | `.cursor/rules/metaskill-*.mdc`, `AGENTS.md` |
| **Antigravity** | Yes | Yes | Editor sandbox/approvals + advisory | `.gemini/GEMINI.md`, `.agents/skills/`, `AGENTS.md` |
| **Codex** | Yes | Yes | OS sandbox modes + advisory | `AGENTS.md`, `.agents/skills/` |
| **Windsurf** | No | No (explicit read) | Advisory instructions only | `.windsurf/rules/metaskill.md` |
| **Cline** | No | No (explicit read) | Tool auto-approve toggles + advisory | `.clinerules/metaskill.md` |

---

## Pilot Domains Included (Milestone 1)

| Domain Playbook | Orchestrated Engines | Mandatory Evidence (`preview/`) |
| :--- | :--- | :--- |
| **Web Full Stack** (`playbooks/web-fullstack.md`) | TypeScript, Next.js / React+Vite, Playwright / HTTP checks | `typecheck`, `build`, tests, live interaction (`0` 5xx/console errors) + `preview/` screenshots or verification log |
| **Video & Audio Multimodal** (`playbooks/video-audio-multimodal.md`) | FFmpeg, FFprobe, SoX, Remotion, Python via `uv` | `ffprobe` streams (`yuv420p`, `48000 Hz`), `-14/-16 LUFS`, read-only `inputs/`, `preview/contact-sheet.png` |
| **Databases & Defensive AppSec** (`playbooks/db-appsec-defensive.md`) | PostgreSQL / SQLite, Drizzle / Prisma, RLS, `gitleaks`, `semgrep`, `osv-scanner` | Declarative migrations, default-deny RLS/integrity checks, `localhost`/Docker-only DAST, `preview/security-report.md` |

---

## CLI Reference

| Command | Purpose |
| :--- | :--- |
| `mtsk init` | Guided (bilingual from Question 1) or flag-driven setup (`--persona`, `--domains`, `--agents`, `--autonomy`, `--permissions`, `--lang`, `--yes`, `--no-git`, `--dry-run`, `--force`, `--save-global`) |
| `mtsk probe` | Read-only deterministic inspection of OS, CPU/RAM, GPU/VRAM, IDEs, and CLIs (`--json`, `--write`) |
| `mtsk doctor` | Environment readiness check: canonical health, `AGENTS.md <= 100` lines, adapter drift/conflicts, OS hints, editor guarantees, and hardware advisories (`--domain`, `--json`) |
| `mtsk sync` | Conflict-safe canonical & adapter synchronization (`--check`, `--force`, `--agents`, `--domains`, `--persona`, `--lang`, `--autonomy`, `--permissions`) |
| `mtsk prefs` | Inspect (`show`), save (`set`), or delete (`clear`) opt-in global defaults (`~/.mtsk/preferences.json`) |

---

## Behavioral Evals & User Pilot Kit

- **`evals/`:** Reproducible fixtures and behavioral scorecard covering brownfield custom-rule preservation, evidence-backed objection, unverified exit-0 delivery, and non-escalating preference switches (`npm test` verifies contracts + zero read-only mutations).
- **`docs/USER_PILOT_GUIDE.md`:** Structured observation kit and release-gate checklist for moderated 5-user pilots.

---

## Open-Core Roadmap

- **Milestone 1 (This Repository — Apache-2.0):** Local CLI (`mtsk`), read-only advisory MetaSkill brain, 4 independent axes, conflict-safe fenced adapters across 6 IDEs, 3 verified domain playbooks, curated `radar/seed-registry.json`, and behavioral evaluation contracts.
- **Milestone 2 (Future Web Platform):** Visual pipeline canvas, continuously audited Skill/MCP registry with `OS x Agent` compatibility matrix, and hardware cost estimator sharing the Zod schemas exported at `mtsk/schemas`.

---

## Contributing & License

Contributions for domain playbooks, behavioral evals, and live-verified `radar/seed-registry.json` entries are welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md).
Licensed under the **Apache License 2.0** ([LICENSE](./LICENSE)).
