---
name: metaskill-verify
description: Run SPEC.md checks, attach Antigravity visual/browser artifacts in preview/, trigger independent review, and emit .agents/evidence/report.{md,json}.
---

# MetaSkill Verify (`/metaskill-verify`)

1. If UI or browser behavior changed, capture screenshots/recordings into `preview/` and link them via `file: preview/...` in `SPEC.md`.
2. Run `mtsk verify` to execute all checks safely and generate `.agents/evidence/report.md` and `.agents/evidence/report.json`.
3. Run an isolated fault-hunting review (`mtsk review` or a separate subagent without author reasoning) and close every requirement explicitly as `verified`, `pending`, or `blocked`.
