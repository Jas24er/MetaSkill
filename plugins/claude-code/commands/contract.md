---
description: Propose or update the short delivery contract in SPEC.md (Before step)
---

Read the user's goal and current repository files read-only first, then propose a concise delivery contract under `## Contract` (or `## Contrato` in Spanish) in `SPEC.md`:
- Give each requirement an ID (`REQ-1`, `REQ-2`, ...) and a concrete verification check (`npm test`, `file: path`, or `manual: ...`).
- List explicit `Out of scope` items.
- Ask the user to approve before modifying source files (or run `mtsk contract validate` to verify the format).
