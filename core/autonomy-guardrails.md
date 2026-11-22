# Autonomy Guardrails — Permission Tiers & Red/Green Boundaries

Trustworthy execution separates thinking, recommending, editing, and making permanent changes.

---

## 1. Separation of Decisions

Always keep these three approvals distinct unless the user explicitly combines them in one clear order:
1. **Approving a recommendation** (agreeing with the proposed design or fix)
2. **Authorizing implementation** (explicitly identifying what may be created or modified)
3. **Making a permanent rule** (saving a skill, team rule, or global preference)

---

## 2. Three-Tier Permission Model (`permissionMode`)

1. **`read-only` (Default Initial Mode):**
   - Allowed: reading files within agreed scope, running read-only inspections (`mtsk probe --json`, `mtsk doctor --json`, `mtsk sync --check`, `mtsk init --dry-run`), analyzing logs, critiquing, and proposing plans.
   - Blocked: creating, modifying, or deleting any file, installing packages, mutating Git state, or running write commands (`probe --write` included).
2. **`scoped-write` (Explicit Deliverable Authorization):**
   - Allowed: creating or modifying strictly the files and tests needed for the specific deliverable authorized by the user, writing QA evidence to `preview/`, and updating agreed state docs.
   - Blocked: touching unrelated modules, altering `permissionMode`, or crossing any Red-Zone boundary.
3. **`autonomous-green` (Authorized Green-Zone Unit Loop):**
   - Allowed: executing the Green Zone actions below one verified task unit at a time while pausing at Red-Zone gates.

---

## 3. Green Zone vs. Red Zone

### Green Zone (Allowed Only Under `scoped-write` / `autonomous-green`)
The example paths below refer to the full scaffold. Map them to the team's corresponding source, test and artifact locations within the authorized scope.
- Reading `inputs/`, `src/`, `tests/`, `.agents/`, `SPEC.md`, `PROJECT_STATE.md`.
- Editing approved code, tests, and state files inside `src/`, `tests/`, `docs/`.
- Running non-destructive typecheck, build, lint, tests, and local `localhost` Playwright/FFmpeg checks writing strictly to `build/`, `preview/`, `output/`.
- Running read-only local security scanners (`gitleaks`, `semgrep`, `osv-scanner`, `trivy fs`).
- Local atomic Git commits for QA-verified tasks (only under `autonomous-green` or explicit request).

### Red Zone — Mandatory Pause & Explicit Human Authorization (ALL Modes)
1. **External Installations:** Installing third-party MCP servers, global CLI packages, or unvetted skills.
2. **Destructive Changes:** Modifying/deleting files in `inputs/`, `DROP`/`TRUNCATE`/broad `DELETE`, `git reset --hard`, `git push --force`, or overwriting user rules.
3. **Publishing & Remote Actions:** Deploying to production, publishing packages (`npm publish`), pushing protected branches, or mutating remote cloud infra.
4. **Costs & Paid APIs:** Calling paid APIs, provisioning billable cloud resources, or exceeding `$0` local budget boundaries.
5. **External Data Transfers & Non-Local Scans:** Uploading local files/data externally or running active security probes/DAST against anything outside `localhost`, `127.0.0.1`, or project-owned local Docker containers.

---

## 4. Secret Hygiene & Git Safety

- Keep `.env` and `.env.*` (except `.env.example`) gitignored; never write real keys into code, specs, or commits.
- Check `git status` before multi-file edits; never discard uncommitted user changes.
