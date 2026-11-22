# After: Evidence Report

The evidence report is what the user reads, trusts, and shares in PRs. Write it in plain language matching the user's conversation language.

## 1. Closure States
Every requirement in the contract closes explicitly as:
- **`verified`** — proved by an executed check or artifact observed in the current state (`mtsk verify` exit `0`, test output, or verified artifact path).
- **`pending`** — not yet built or verified (state the exact remaining check).
- **`blocked`** — stopped by a missing prerequisite/secret, unapproved action, or 3 failed attempts.

`exit code 0` on a build or `mtsk doctor` passing proves only environment/build health — never that product requirements work.

## 2. Standard Report Format (`.agents/evidence/report.md` & `report.json`)

```markdown
## Evidence Report — Registration Form
| Requirement | Status | Evidence |
| :--- | :--- | :--- |
| REQ-1 User can register with email and password | `verified` | `npm test -- signup` OK · `preview/signup.png` |
| REQ-2 Duplicate email shows a clear error | `pending` | Missing e2e test; tested manually only |

**Risks detected by the reviewer:** password minimum length is not enforced yet.
```

- Save machine-readable & Markdown reports in **`.agents/evidence/`** (`report.json`, `report.md`) so teams can track and share them in PRs.
- Keep heavy binary artifacts (screenshots, recordings, audio, video) in **`preview/`** (gitignored).
- Never drop open requirements silently or mark an unverified item `verified`.
