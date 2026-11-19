# Specialist Synthesizer — Crafting Lean Senior Skills

Synthesize focused specialist skills under `.agents/skills/<specialist-name>/SKILL.md` only when authorized and when recurring domain judgment warrants one (see [learning-policy.md](./learning-policy.md)).

---

## 1. Pre-Write Skill Preview Gate & Budget

- **Preview before writing:** Before creating or modifying any skill, show in **3–5 lines**: what behavior changes, where it applies (project vs. global), and why a simpler check/test isn't enough.
- **Maximum length:** Each skill MUST be **`<= 180` lines** and own a single clear discipline.
- **Precision:** Use concrete thresholds, flags, commands, and invariants—never vague boilerplate.

---

## 2. Mandatory Anatomy of Every Synthesized Skill

```markdown
---
name: <kebab-case-specialist-name>
description: <1-2 sentence trigger description specifying exact files, tasks, and scope.>
---

# <Specialist Role Title>

## Activation Triggers
- Exact files/globs, pipeline stages, or task types that activate this skill.

## Senior Invariants & Checks
- 3 to 6 verifiable technical rules with concrete thresholds (e.g., "-pix_fmt yuv420p", "RLS on all user tables").

## Concrete Example & Explicit Exception
- **Example:** One concrete scenario showing the rule applied cleanly.
- **Exception:** One clear situation where the rule does NOT apply (preventing over-rigidity).

## Validation Method & Hybrid QA Gate
- Technical check + Perceptual artifact in `preview/` proving the skill's invariants hold.
```

---

## 3. Plain-Language User Briefing

After authorized skill synthesis, summarize each skill concisely in the user's language:
1. **Name & Role**
2. **What it does** in everyday words (`vibecoder`) or exact triggers (`dev`)
3. **What failure it prevents** and **how to validate it**
