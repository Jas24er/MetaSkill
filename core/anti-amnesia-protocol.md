# Anti-Amnesia Protocol, Acceptance Contracts & State Closure

Prevent context rot, silent requirement loss, and infinite retry loops across sessions and editors.

---

## 1. Context Budget & File Roles

1. **`AGENTS.md` (`<= 100` lines):** Lean project router holding identity, invariants, and skill pointers. Never bloat it.
2. **`SPEC.md` (Approved Truths):** Product scope, architecture, acceptance constraints, and Red-Zone boundaries. Updated only on approved changes.
3. **`PROJECT_STATE.md` (Active Memory):** Current phase, active task queue (`5–10` items), last decision, latest evidence, blockers, 3-strike counter, and next step. Archive completed tasks exceeding `15` into `.agents/archive/STATE_HISTORY.md`.

---

## 2. Acceptance Contract & Requirement Closure

- **At task acceptance:** Identify **(1) expected outcome**, **(2) constraints**, and **(3) how completion will be verified**. Use one sentence for a small task or a concise list for multi-deliverable work.
- **When the user revises a decision:** Update the affected acceptance criteria and preserve all unaffected criteria verbatim.
- **`mtsk doctor` vs. Deliverable Acceptance:** `doctor` verifies *environment readiness* (OS binaries, canonical files, adapters). Deliverable acceptance depends strictly on *the requested outcome working with real evidence*.
- **Mandatory Closure States:** Every agreed requirement MUST close explicitly as:
  - **`verified`** — demonstrated via executed check/evidence in the current state;
  - **`pending`** — not yet built or verified (state exact remaining check);
  - **`blocked`** — stopped by missing prerequisite, 3-strike halt, or unapproved Red-Zone gate.
  Never silently drop or mark unverified requirements as done.

---

## 3. Clean-Unit Execution Loop (Under `scoped-write` / `autonomous-green`)

1. Pick one unblocked task -> inspect target files & preconditions.
2. Implement within authorized scope -> run Hybrid QA Gate ([qa-multimodal-gates.md](./qa-multimodal-gates.md)).
3. On pass: reset strike counter, commit (if authorized), record evidence & requirement statuses in `PROJECT_STATE.md`, and hand off cleanly.

### Cross-Chat / Cross-Editor Handoff (Requires Permission to Persist)
When authorized to save state, record in `PROJECT_STATE.md`: **last decision**, **evidence paths (`preview/`)**, **requirement states (`verified`/`pending`/`blocked`)**, and **next step**, then sync target adapters (`mtsk sync`).

---

## 4. The 3-Strike Circuit Breaker (Mandatory Halt)

If the **same task** or **root error** fails 3 consecutive times:
1. **STOP** editing code immediately (never attempt a speculative 4th patch).
2. Restore the last clean checkpoint if edits broke prior working behavior.
3. Document in `PROJECT_STATE.md` and report to the user: **(a) what was tried (all 3 hypotheses), (b) what was learned from observed evidence, and (c) what specific decision is needed to proceed**.
