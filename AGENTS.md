# MetaSkill Repository Agent Guidelines

This repository implements **MetaSkill (`mtsk`)**, a TypeScript CLI + open Agent Skills orchestrator.

## Repository Structure
- `cli/src/` — TypeScript ESM CLI (`schemas/`, `probes/`, `adapters/`, `commands/`, `index.ts`).
- `cli/tests/` — Vitest unit, schema, and end-to-end CLI integration tests.
- `SKILL.md` & `core/` — MetaSkill progressive-disclosure orchestrator protocols.
- `playbooks/` — Curated domain references (`web-fullstack`, `video-audio-multimodal`, `db-appsec-defensive`).
- `radar/` — Verified seed registry JSON (`seed-registry.json`) and lookup/comparison rules.
- `templates/` — Canonical project scaffolding templates (`AGENTS.md.tmpl`, `SPEC.md.tmpl`, `PROJECT_STATE.md.tmpl`).

## Non-Negotiable Code & Quality Rules
1. **ESM NodeNext Imports:** All relative imports inside `cli/src/` MUST end in `.js`.
2. **Safe Subprocess Execution:** Use `runExecFile` (`execFile` with explicit args and timeout) in probes — never shell-interpolated `exec`.
3. **Idempotent & Non-Destructive File Ops:** Never overwrite existing user files in Brownfield targets; always use `writeIfAbsent` or `upsertFencedBlock`.
4. **Verified Radar Only:** Every entry added to `radar/seed-registry.json` MUST be live-verified and pass `SeedRegistrySchema` (`npm run validate:registry`).
5. **Verification Required:** Always run `npm run typecheck`, `npm run build`, and `npm test` after edits and confirm all pass before completing tasks.
6. **Session Memory:** Read `MEMORY.md` at the start of every session in this repository and update it at the end with what changed, verification state, and next steps.
