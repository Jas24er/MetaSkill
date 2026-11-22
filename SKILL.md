---
name: metaskill
description: Quality layer for AI coding agents — Before (contract), During (verifiable steps), After (independent review & evidence report). Your agent doesn't say "done" until it proves it.
---

# MetaSkill — Proof Before "Done"

> **Your agent doesn't say "done" until it proves it.**

Match the user's language and technical level from their messages without asking redundant setup questions. Reuse the team's existing tests, scripts, tracker, and CI before adding new files.

## Overhead Rule (Stay Fast & Lean)
On focused tasks, follow the inline Before · During · After rules below directly without reading extra files. Load `core/` or `recipes/` only when you need detailed rules or domain checklists.

## Initial Mode & Permissions
- Start in **`read-only`** mode unless authorized (`scoped-write` or `autonomous-green`).
- In `read-only` mode: inspect files, explain findings, critique risks with facts, and propose the contract — **create, modify, or delete zero files**.
- Changing tone, language, or pace **never** escalates write permissions or rewrites existing documents.
- **Actions that require permission:** external installs, deleting user data/inputs, deploys/publishing, paid APIs, or touching files outside the agreed task scope.

## The Cycle: Before · During · After

### 1. Before — Delivery Contract ([core/contract.md](./core/contract.md))
- Turn the request into a short contract (3–5 lines for small tasks): use `SPEC.md` under `## Contract` (or the team's tracker) if it already exists or for multi-step work; on quick single-turn tasks without `SPEC.md`, keep the short contract in your reply instead of creating extra files unless asked.
  - Each `REQ-N` has a concrete **how to check it** (`npm test`, `file: preview/out.png`, or `manual: ...`). If it cannot be checked, rewrite it or mark it as a risk.
  - List **Out of scope** boundaries so unrelated files stay untouched.
- If the request is ambiguous or risky (exposed secrets, incompatible tools), object plainly with facts from local files and propose a safer testable alternative before editing.

### 2. During — Verifiable Steps ([core/execution.md](./core/execution.md))
- Build a **first testable version** one clean unit at a time; run the exact check for that unit before moving on.
- **Stop after 3 failed attempts** on the same issue; report what failed and ask for a decision instead of guessing a 4th patch.
- Never alter `inputs/` originals or hardcode secrets in code; keep `.env` ignored.
- On multi-session work, record the last decision, evidence, and next step in `PROJECT_STATE.md` (or the team's tracker).

### 3. After — Independent Review & Evidence ([core/independent-review.md](./core/independent-review.md), [core/evidence-report.md](./core/evidence-report.md))
- **Critical self-check / separate reviewer:** Inspect the diff and every requirement with a fault-hunting mindset (using a separate subagent or `mtsk review` when available, without author reasoning).
- **Run the exact requested check command** (for example `npm test`, never substitute a weaker check) and verify edge cases, exact file formats, and response fields before finishing.
- Produce a clear **evidence report** (`.agents/evidence/report.md` / `report.json` via `mtsk verify`, or inline table in chat):
  - Close every requirement explicitly as **`verified`** (with real command/file evidence), **`pending`** (exact missing check), or **`blocked`** (missing secret/tool or 3-strike stop).
  - Never mark a requirement `verified` or say "done" without observed evidence.

## References (Load Only On Demand)
- Core protocols: [contract.md](./core/contract.md) · [execution.md](./core/execution.md) · [independent-review.md](./core/independent-review.md) · [evidence-report.md](./core/evidence-report.md) · [editor-guarantees.md](./core/editor-guarantees.md)
- Evidence recipes: [recipes/](./recipes/README.md) (web, API, bugs, databases, security, media, LLM/agents)
