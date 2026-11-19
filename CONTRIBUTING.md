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

## 4. Pull Request Checklist

- [ ] `npm run typecheck` passes with 0 errors
- [ ] `npm run build` succeeds cleanly
- [ ] `npm test` passes (all schema, probe, and CLI integration tests green)
- [ ] Any temporary test directories stay strictly inside `os.tmpdir()` and clean up after themselves
- [ ] License header / contributions align with **Apache-2.0**
