---
description: Run deterministic contract checks, trigger independent review, and generate the Evidence Report (After step)
---

Verify the contract before claiming completion:
1. Run `mtsk verify` (or execute every check listed in `SPEC.md` directly if `mtsk` is not installed).
2. Delegate a fresh read-only review to `metaskill-reviewer` passing only `SPEC.md`, `git diff`, and `.agents/evidence/report.json`.
3. Close every `REQ-N` explicitly as `verified`, `pending`, or `blocked` in `.agents/evidence/report.md` and present the concise table to the user.
