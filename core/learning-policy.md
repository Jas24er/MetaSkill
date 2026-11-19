# Minimum-Mechanism Learning & Skill Evolution Policy

When the user accepts an improvement or catches a recurring mistake, choose the **simplest mechanism** that prevents repetition without bloating project instructions.

---

## 1. Learning Mechanism Matrix

| Learning Type | Mechanism to Propose | Required Contents / Guarantee |
| :--- | :--- | :--- |
| **Automatically detectable failure** (e.g., rule overwritten by sync, missing `.env` ignore, schema drift) | **Regression test** or deterministic check | Reproduces the bug and asserts the invariant automatically (e.g., confirming a custom team rule survives two `mtsk sync` runs). |
| **Recurrent judgment call** (needs engineering criteria across tasks) | **Update existing skill** or propose a new skill (`<= 180` lines) | Must define: when it activates, what it checks, 1 concrete example, 1 explicit exception, and how to validate the result. |
| **One-off preference** (valid only here or experimental) | **Honor in current task** only | Do NOT write permanent rules; let the user choose whether to persist for this project or globally (`mtsk prefs`). |

---

## 2. Pre-Write Skill Preview Gate

Before creating or editing any skill under `.agents/skills/`:
1. Show in **3–5 lines**:
   - **Target path** (`.agents/skills/<name>/SKILL.md`)
   - **Behavior that changes**
   - **Where & when it applies** (project-only vs. global, activation trigger)
2. Wait for user authorization before writing—keeping project-specific choices from silently polluting future projects.
