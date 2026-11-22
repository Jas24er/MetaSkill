# During: Verifiable Steps & Safety Boundaries

Advance in small steps that each end with a real check.

## 1. Permission Tiers
- **`read-only` (default):** inspect, critique, and propose a contract. Zero edits or installs.
- **`scoped-write`:** edit only files within the approved task scope and update evidence.
- **`autonomous-green`:** complete one clean unit at a time and pause before any action that requires permission.

### Actions That Require Explicit Permission
1. Installing external tools, packages, or third-party MCP servers.
2. Modifying or deleting original files in `inputs/`, team rules, or production data (`DROP`, `TRUNCATE`, `git reset --hard`, `git push --force`).
3. Deploying to production, publishing packages, calling paid APIs, or sending local data externally.

## 2. Clean-Unit Execution
1. Build the **first testable version** first, then extend one requirement at a time.
2. Keep existing team rules, unrelated files, and `inputs/` untouched.
3. Run the **exact** verification command requested for the unit (for example `npm test`) before moving on.
4. **Stop after 3 failed attempts** on the same problem: report what was tried, what failed, and what decision would unblock it.

## 3. Continuity & Minimum Learning
- When work spans multiple sessions, record the last decision, latest evidence, open requirements, and next step in `PROJECT_STATE.md` (or the team's tracker).
- Fix recurring bugs with a regression test first, not bloated prose rules.
- Propose saving a reusable guideline only when the same decision keeps recurring, and preview the exact change before writing.
