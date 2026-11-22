# MetaSkill (`mtsk`)

[Español](./README.es.md)

> **Your agent doesn't say "done" until it proves it.**

> [!WARNING]
> **Demo (v0.2.0).** MetaSkill is still a demo and needs more testing before real use. The benchmark has valid data only for Codex so far, Claude Code has not been measured yet, and the moderated user pilot has not run. Expect breaking changes, and do not rely on it for production work yet.

MetaSkill is a small quality layer for AI coding agents (**Claude Code**, **Codex**, **Antigravity**). It makes the agent agree on what "done" means before it starts, work in checkable steps, and finish with an **evidence report** that a separate reviewer has looked at.

---

## The Cycle: Before · During · After

**1. Before — a short contract.** The agent turns your request into 3–5 checkable requirements in `SPEC.md`:

```markdown
## Contract
- REQ-1: POST /api/tasks rejects an empty title with 400 (check: `npm test`)
- REQ-2: Home page shows the task list (check: `file: preview/home.png`)
- Out of scope: auth, styling changes
```

**2. During — checkable steps.** One small unit at a time, each with its check run. It stops after 3 failed attempts and asks you instead of guessing. It never touches `inputs/` originals or hardcodes secrets.

**3. After — independent review + evidence.** A separate reviewer (`mtsk review`, or the `metaskill-reviewer` subagent) hunts for failures, and `mtsk verify` writes `.agents/evidence/report.md` + `report.json`:

```markdown
| Requirement | Status | Evidence |
| :--- | :--- | :--- |
| REQ-1: POST /api/tasks rejects empty title | `verified` | `npm test` OK (1.2s) |
| REQ-2: Home page shows the task list | `pending` | `preview/home.png` not found |
```

Every requirement ends as **`verified`**, **`pending`**, or **`blocked`** — never silently dropped.

---

## Benchmark Results (with vs. without MetaSkill)

<!-- BENCH:START -->
Numbers below are copied from [`evals/RESULTS.md`](./evals/RESULTS.md) (run 2026-11-22, 7 recipe scenarios × 3 runs per variant) and the v0.1 baseline [`evals/baseline-v0.1.json`](./evals/baseline-v0.1.json) (8 quick scenarios × 3 runs). Lower False Done is better.

| Run | Host | False Done % (bare → MetaSkill) | Criteria % (bare → MetaSkill) | Time | Tokens | Runs completed |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: |
| Recipes (2026-11-22) | Codex | 0% → 0% | 97.62% → 95.29% | +21.58% | +50.83% | 42/42 |
| Recipes (2026-11-22) | Antigravity | error | error | n/a | n/a | 0/42 (quota exhausted) |
| Recipes (2026-11-22) | Claude Code | not run | not run | — | — | pending-auth |
| v0.1 baseline | Codex | 11.11% → 0% | 82.5% → 96.67% | +5.75% | +28.17% | 33/48 |
| v0.1 baseline | Antigravity | 0% → 13.64% | 80.87% → 82.45% | −8.07% | −0.38% | 45/48 |

Read these honestly:
- On the recipe run, Codex never falsely claimed "done" in either variant, so there was no false-done to reduce. MetaSkill added +21.58% time, which is over our 20% budget.
- The judge for that Codex run was Antigravity, whose quota was exhausted: 40 of 42 Codex runs were scored by deterministic checks only, without the LLM judge.
- In the v0.1 baseline MetaSkill cut Codex false-done from 11.11% to 0%, but Antigravity got worse (0% → 13.64%).
- Claude Code has no numbers yet (CLI not logged in).
<!-- BENCH:END -->

---

## Quickstart (< 5 minutes)

**CLI (any host):**

```bash
npx mtsk init            # minimal: AGENTS.md, SPEC.md, .agents/skills/metaskill/, host adapter
npx mtsk contract validate
npx mtsk verify          # runs the checks, writes .agents/evidence/report.{md,json}
npx mtsk review          # independent reviewer session (no author reasoning)
```

`mtsk init --full` also adds `PROJECT_STATE.md`, `inputs/`, `preview/`, and a probe profile. In our packaged-install smoke test, install → `init` → `contract validate` → `verify` produced a `verified` evidence report in 177 s, including `npm pack` and `npm install`.

**Agent Skills standard:** `npx skills add Jas24er/MetaSkill`

**Claude Code** (self-hosted marketplace, [plugins/claude-code](./plugins/claude-code/README.md)):

```text
/plugin marketplace add Jas24er/MetaSkill
/plugin install metaskill@metaskill
```

Adds `/contract`, `/verify`, `/handoff`, the `metaskill-reviewer` subagent, a `SessionStart` hook (loads contract + next step) and a `Stop` hook that blocks "done" while the contract lacks evidence.

**Codex:** `npx mtsk init --agents codex` — Codex reads `AGENTS.md` and `.agents/skills/metaskill/`; MetaSkill also writes a recommended read-only profile in `.codex/config.metaskill.toml` and hooks in `.codex/hooks.metaskill.json`. Independent review: `mtsk review --host codex`.

**Antigravity:** `npx mtsk init --agents antigravity` — installs `.agents/skills/metaskill/` and `.agents/hooks.json`; the plugin in [plugins/antigravity](./plugins/antigravity/) adds contract / verify / handoff skills. Browser screenshots and recordings go in `preview/` and are cited in `.agents/evidence/`.

**GitHub Action** ([docs/GITHUB_ACTION.md](./docs/GITHUB_ACTION.md)):

```yaml
- uses: Jas24er/MetaSkill@main
  with:
    contract: SPEC.md
    post-pr-comment: "true"
```

---

## Large Projects & Monorepos

- **One contract per package:** put a `SPEC.md` with a `## Contract` in each package that needs one, then run `mtsk verify --workspaces`. It reads the npm/yarn/pnpm, lerna, Cargo and Go workspace manifests and checks each contract in its own folder. The Stop hooks do the same.
- **Long test suites:** each check stops after 60 s by default. Use `mtsk verify --timeout 900000` (15 min) for slow suites; a check that runs out of time is reported as `TIMED OUT`, not as a failure.
- **Shared files stay machine-neutral:** `AGENTS.md` no longer includes your OS or hardware, and in existing projects the `.gitignore` block does not add `build/` or `output/`.

## Evidence Recipes

Short checklists (≤ 60 lines, EN + ES) loaded only when the task matches — see [recipes/README.md](./recipes/README.md):
[Web & frontend](./recipes/web-frontend.md) · [API & backend](./recipes/api-backend.md) · [Bug in existing project](./recipes/existing-project-bug.md) · [Data & databases](./recipes/data-databases.md) · [Defensive security](./recipes/defensive-security.md) · [Audio, video & image](./recipes/audio-video-image.md) · [LLM apps & agents](./recipes/llm-agents.md)

---

## "Verified with MetaSkill" Badge (optional)

```markdown
[![Verified with MetaSkill](https://img.shields.io/badge/verified%20with-MetaSkill-2ea44f)](./.agents/evidence/report.md)
```

Link it to your latest `.agents/evidence/report.md` so anyone can see what was actually checked.

---

## Paused (still works, not growing)

Until the three primary hosts are solid: `radar/` registry, `mtsk probe`, `mtsk prefs`, Cursor / Windsurf / Cline adapters, and any web platform.

---

## More

- Pilot guide: [docs/USER_PILOT_GUIDE.md](./docs/USER_PILOT_GUIDE.md) ([ES](./docs/USER_PILOT_GUIDE.es.md))
- Benchmark: [evals/README.md](./evals/README.md) · Contributing: [CONTRIBUTING.md](./CONTRIBUTING.md)
- License: **Apache-2.0** ([LICENSE](./LICENSE))
