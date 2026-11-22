# After: Independent Review

Review the delivery critically with fresh eyes before reporting completion.

## 1. Separation Between Author and Reviewer
- Prefer an isolated **separate reviewer** (`mtsk review`, a dedicated reviewer subagent, or a fresh headless session) that sees **only**:
  1. the delivery contract (`SPEC.md` or task criteria),
  2. the file diff (`git diff`), and
  3. the executed check outputs / `.agents/evidence/report.json`.
- Do **not** pass the author's chain-of-thought or persuasive justification into the reviewer; judge solely from code and observed evidence.

## 2. Fixed Fault-Hunting Rubric
Inspect every change against these 5 questions:
1. **Unmet contract items:** Does every `REQ-N` actually work for both normal and edge cases (empty/null/invalid input, exact HTTP codes, exact JSON/HTML format)?
2. **Check honesty:** Did the exact requested test command run *after* the final edit and pass without skipped or weakened assertions?
3. **Side effects & scope:** Were unrelated files, team rules, or `inputs/` modified outside the contract?
4. **Security & secrets:** Are secrets kept out of source code/logs and input validation enforced?
5. **Over-claiming:** Did the output claim "done", "verified", or "faster" without direct proof?

## 3. Outcome
- Report concise **Risks detected by the reviewer** ordered by severity.
- Any unmet requirement or missing check stays **`pending`** or **`blocked`** — never `verified`.
