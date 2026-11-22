---
name: metaskill
description: Before-During-After verification workflow for Antigravity. Propose a short contract in SPEC.md, build in verifiable steps, run independent review, and prove completion before saying done.
---

# MetaSkill (Antigravity)

1. **Before:** Propose a short contract in `SPEC.md` (`## Contract`) with a concrete check (`npm test`, `file: preview/screen.png`, or `manual: ...`) for every `REQ-N`.
2. **During:** Build one clean unit at a time; run the exact requested check command; stop after 3 failed attempts on the same issue.
3. **After:** Save screenshots/browser recordings in `preview/`, run `mtsk verify` (and independent review via `mtsk review` or a clean subagent), and deliver `.agents/evidence/report.md`.
