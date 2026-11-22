# Recipe: Bug in Existing Project

## 1. What is checked
- Minimal test reproduces the exact reported bug *before* editing implementation code (confirming failure on the original behavior).
- Same regression test passes *after* the fix, along with relevant boundary values (`0`, empty, `null`, `undefined`, upper bounds).
- Existing test suite passes with zero collateral regressions or unintended edits.

## 2. Tools
- Project's existing test runner (`npm test`, `pytest`, `go test`, `cargo test`) + `git diff`.

## 3. Evidence produced
- Regression test file added/updated in the test suite.
- `.agents/evidence/report.{md,json}` showing failing-then-passing regression verification and full test suite pass.

## 4. Typical mistakes the reviewer hunts for
- Fixing code without adding a regression test that fails under the old bug.
- Running only the happy-path baseline test while edge cases (`0%`, `100%`, `>100%`, `null`, `""`) remain broken.
- Broad rewrites touching unrelated modules (`git diff` exceeds bug scope).
- Weakening or deleting existing assertions so tests turn green artificially.
