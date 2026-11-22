---
name: metaskill
description: Quality layer for AI coding agents — Before (contract), During (verifiable steps), After (independent review & evidence report). Your agent doesn't say "done" until it proves it.
---

# MetaSkill — Proof Before "Done"

Follow the Before · During · After cycle:
1. **Before:** Turn the request into a short contract under `## Contract` / `## Contrato` in `SPEC.md` where each `REQ-N` states how to check it (`npm test`, `file: ...`, or `manual: ...`). Start in `read-only` mode when inspecting or advising.
2. **During:** Build the first testable version one unit at a time; run the exact requested check command; stop after 3 failed attempts on the same issue; never alter `inputs/` or hardcode secrets.
3. **After:** Run `/verify` (or `mtsk verify`), delegate critical fault-hunting to the `metaskill-reviewer` subagent without author reasoning, and deliver the evidence report (`.agents/evidence/report.md` & `report.json`) closing every requirement as `verified`, `pending`, or `blocked`.
