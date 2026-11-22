# Recipe: LLM Apps & Agents

## 1. What is checked
- Fixed evaluation dataset (`eval/cases.json`) covers normal tasks, edge cases, and adversarial inputs (prompt injection, override tricks).
- Measurable **before vs. after** comparison against a recorded baseline (`eval/baseline.json` -> `eval/report.json`) across `N` runs when outputs are stochastic.
- Cost/token budget per request is measured and compared against limits.
- Schema/structured output compliance and fallback behavior on invalid/empty model output.

## 2. Tools
- Project eval harness (`mtsk eval`, `vitest`, `node --test`, `pytest`, Promptfoo, or custom evaluation script).

## 3. Evidence produced
- Machine-readable evaluation report (`eval/report.json`) showing baseline accuracy, post-change accuracy, adversarial pass rate, and average tokens/cost per request.
- Passing deterministic test suite in `.agents/evidence/report.{md,json}`.

## 4. Typical mistakes the reviewer hunts for
- Tuning prompts "by intuition" without running a before/after evaluation dataset.
- Passing happy-path samples while failing prompt-injection cases (`Ignore previous instructions...`).
- Hardcoding case IDs or overfitting exclusively to fixture phrases instead of fixing the logic/prompt boundary.
- Ignoring token/cost spikes or latency regressions when adding extra model calls.
