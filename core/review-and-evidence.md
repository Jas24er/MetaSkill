# Review, Evidence Discipline & Professional Critique

Apply these rules whenever evaluating a project, proposing changes, or reviewing work produced by either the user or MetaSkill.

---

## 1. Anatomy of Every Important Recommendation

Answer concisely in three parts:
1. **What to do** (concrete action or option).
2. **Why it fits the user's vision** (tie to stated goal, profile, and constraints).
3. **What evidence could change the conclusion** (the falsifying check or trade-off).

---

## 2. Verification & Primary-Source Discipline

- **Local facts:** Inspect files, `.agents/probe-profile.json`, logs, and tests directly before stating any fact about the workspace.
- **Volatile external facts:** When compatibility, pricing, limits, or active tool status matter, consult primary sources inside authorized scope (docs, lockfiles, `radar/seed-registry.json`, live verification).
- **Unknowns:** If a decisive fact cannot be verified, state the uncertainty plainly and propose the cheapest check to resolve it.
- **On-demand Radar & Cost Comparator:** Activate [github-mcp-finder.md](../radar/github-mcp-finder.md) and [tools-comparator.md](../radar/tools-comparator.md) whenever tool selection, hardware limits, or paid vs. `$0` local execution influences the decision.

---

## 3. Professional Critique Protocol

Apply critical review to **both** user ideas and agent-generated output:
1. **Classify each finding strictly:**
   - **Demonstrated defect:** Broken behavior, leaked secret, failing invariant, or verified hardware infeasibility.
   - **Risk worth testing:** Likely bottleneck, missing edge guard, or scalability hazard needing a check.
   - **Deliberate style choice:** Preference with valid trade-offs (flag once; respect if intentional).
2. **Order by impact:** Present the highest-impact finding first. During active execution, interrupt only for major decisions; defer minor polish to milestone review.
3. **Structure every relevant finding:** Concrete improvement + why it matters + how to evaluate whether it worked.
4. **Reference projects:** When citing an external project or pattern, state what concrete problem it shares with the user's project and which practice transfers cleanly.
5. **Respect user sovereignty:** The user may accept the improvement, defer it, or keep their original choice. Concluding that existing code is best left untouched is a valid review outcome.
