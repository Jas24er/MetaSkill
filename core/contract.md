# Before: Delivery Contract

Agree on what "done" means before changing code.

## 1. Read-Only First Contact
- Inspect relevant files, tests, and existing team trackers before proposing edits.
- Never invent file contents or test results; state explicitly what was read and what remains unknown.
- In `read-only` mode, deliver a complete review or proposed contract in the user's language with **zero file changes**.

## 2. Writing a Short Contract
For small tasks, propose 2–5 lines in the user's language (saved in `SPEC.md` under `## Contract` / `## Contrato` when authorized, or the team's existing ticket):

```markdown
## Contract: Registration Form
- REQ-1 User can register with email and password.
  Check: `npm test -- signup` + `file: preview/signup.png`
- REQ-2 Duplicate email shows a clear error without 5xx.
  Check: `npm test -- signup-duplicate`
- Out of scope: password reset flow.
```

- Every `REQ-N` must specify **how it will be checked** (`run:` / backtick command, `file: <path>`, or `manual: <description>`).
- If a requirement has no check, rewrite it until testable or mark an explicit `Risk:`.
- Reuse the team's existing tests, scripts, and CI conventions first.

## 3. Professional Critique Before Building
When reviewing a proposal or codebase, classify findings cleanly:
- **Demonstrated defect:** exposed secret, failing invariant, broken security rule, or incompatible hardware/runtime.
- **Testable risk:** missing edge-case coverage, bottleneck, or ambiguity that needs a check.
- **Deliberate style choice:** preference with valid trade-offs (respect if intentional).

Never comply blindly with insecure requests (for example hardcoding API keys in source files); explain the concrete risk simply and offer a safe alternative (`.env` + `.env.example`).
