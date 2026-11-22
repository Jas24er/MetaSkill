# Contributing to MetaSkill

Thank you for helping improve **MetaSkill (`mtsk`)**! Every contribution must preserve cross-platform reliability (Windows, macOS, Linux), lean context budgets, and supply-chain safety.

---

## 1. Local Development Setup

```bash
npm install
npm run typecheck
npm run build
npm test
```

You can invoke the CLI locally during development via:

```bash
npm run dev -- probe
```

---

## 2. Adding a Verified Entry to `radar/seed-registry.json`

All MCP servers, Agent Skills, and CLI tools in the local seed registry must be verified live and satisfy `SeedRegistrySchema`:

1. Confirm the repository exists over HTTPS, check its license, last maintenance activity, and review install/runtime scripts for supply-chain safety.
2. Add the entry to `radar/seed-registry.json` with today's `verifiedAt` (`YYYY-MM-DD`), explicit `osSupport`, `installApprovalRequired`, and concise `securityNotes`.
3. If an older tool is deprecated or archived, keep it marked `"deprecated"` or `"archived"` with `replacedBy` pointing to an active entry ID so MetaSkill blocks stale recommendations.
4. Run strict schema validation:
   ```bash
   npm run validate:registry
   ```

---

## 3. Adding a New Domain Playbook

1. Create `playbooks/<domain-name>.md` following the exact 5-section structure used by existing playbooks:
   - Default Stack & Toolchain
   - Senior Engineering Invariants (concrete rules & numbers, never fluff)
   - Anti-Patterns Prevented
   - Mandatory Hybrid QA Gate (Technical Gate + Perceptual `preview/` Gate)
   - Walking Skeleton (`< 5 Minutes`)
2. Keep playbooks focused and token-efficient (`< 120` lines recommended).
3. Update relevant tests and documentation if adding a first-class `DomainId` in `cli/src/schemas/config.ts`.

---

## 4. Contributing a Community Evidence Recipe (`recipes/`)

Recipes are short verification checklists that plug into the Before · During · After cycle. Every recipe PR must:

- [ ] Add `recipes/<slug>.md` (EN) **and** `recipes/<slug>.es.md` (ES), each **`<= 60` lines**.
- [ ] Use the 4 required headings: `## 1. What is checked` · `## 2. Tools` · `## 3. Evidence produced` · `## 4. Typical mistakes the reviewer hunts for` (ES: `## 1. Qué se comprueba` · `## 2. Herramientas` · `## 3. Evidencia producida` · `## 4. Errores típicos que busca el revisor`).
- [ ] Add a paired scenario + isolated fixture in `evals/scenarios.json` with `"recipe": "<slug>"` and at least one deterministic check.
- [ ] List the recipe in `recipes/README.md` and `recipes/README.es.md`.
- [ ] Pass `npm test` (`cli/tests/recipes.test.ts` enforces line limits, headings, and scenario pairing).
- [ ] Attach benchmark output from `mtsk eval --scenario <id> --runs 3` showing the recipe does not make results worse.

---

## 5. Running the Public Benchmark

Anyone can run the benchmark and compare MetaSkill versions (see [evals/README.md](./evals/README.md)):

```bash
npm run build
node dist/index.js eval --subset quick --runs 3 --judge auto        # fast subset for every change
node dist/index.js eval --subset full --runs 3 --judge auto         # full suite before each release
```

Include the generated `evals/RESULTS.md` table in PRs that change `SKILL.md`, `core/`, or `recipes/`. A change is only accepted if it improves or does not worsen the metrics.

---

## 6. Updating the Host Capabilities Matrix

`cli/src/adapters/capabilities.ts` records what each host (Claude Code, Codex, Antigravity, and paused hosts) officially supports, with a source URL and `verifiedAt` date. A weekly workflow (`.github/workflows/host-capabilities-check.yml`) runs:

```bash
npm run build
node scripts/check-host-docs.mjs
```

It fails if a primary-host documentation URL is unreachable and warns when a primary host was verified more than 30 days ago. When it fails, re-read the official docs, update the claims, URLs, and `verifiedAt`, and run `npm test`.

---

## 7. Pull Request Checklist

- [ ] `npm run typecheck` passes with 0 errors
- [ ] `npm run build` succeeds cleanly
- [ ] `npm test` passes (all schema, probe, and CLI integration tests green)
- [ ] Any temporary test directories stay strictly inside `os.tmpdir()` and clean up after themselves
- [ ] License header / contributions align with **Apache-2.0**
