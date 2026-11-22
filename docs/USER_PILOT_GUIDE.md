# User Pilot Guide (MetaSkill v2)

[Español](./USER_PILOT_GUIDE.es.md)

This guide structures a moderated pilot with **6 real participants** working on **their own projects** with MetaSkill on the three primary hosts: **Claude Code**, **Antigravity**, and **Codex**. It checks the Before · During · After cycle: *your agent doesn't say "done" until it proves it.*

---

## 1. Participants (6 sessions, 2 per host)

| Participant | Profile | Own project type | Host |
| :--- | :--- | :--- | :--- |
| P1 | Non-expert | New small web app | Claude Code |
| P2 | Developer | Bug or feature in an existing repo | Claude Code |
| P3 | Non-expert | Automation, data, or media script | Antigravity |
| P4 | Developer | API / database / security work | Antigravity |
| P5 | Non-expert | New idea from scratch | Codex |
| P6 | Developer | Release-bound task with existing tests and CI | Codex |

---

## 2. Moderated Session Script (30–40 min)

1. **Install (target < 5 min).** The participant installs MetaSkill for their host (see the README quickstart) and starts a timer. Stop the timer when the first `.agents/evidence/report.md` exists.
2. **Before — contract (5–10 min).** The participant describes a real task in their own words. Observe whether the agent proposes a short contract (`REQ-N` + how to check it + out of scope) without asking unnecessary setup questions.
3. **During — verifiable steps (10–15 min).** The agent builds one testable unit at a time. Record whether it touches files outside scope, asks for permission when needed, and stops after 3 failed attempts.
4. **After — review and evidence (5–10 min).** The agent runs the checks (`mtsk verify` or host command `/verify`) and closes every requirement as `verified`, `pending`, or `blocked`. Ask the participant whether they understand the report and trust it.
5. **Closing question.** "Would you use MetaSkill again on your next project?" (`Yes` / `Maybe` / `No` + why).

---

## 3. Per-Session Observation Sheet

- **Participant / Profile / Host:**
- **Time from install to first evidence report (target `< 5 min`):**
- **Unauthorized file changes or commands?** (`Yes` / `No` — launch criterion = `0`)
- **False-done incidents** (agent said "done" but a check failed):
- **Interventions** (times the participant had to correct or insist):
- **Requirements left without explicit status (`verified` / `pending` / `blocked`):**
- **Did the participant understand what they authorized at each step?** (`Yes` / `Partial` / `No`)
- **Where was moderator help needed?**
- **Would use again on the next project?** (`Yes` / `Maybe` / `No`)

---

## 4. Launch Criteria

Publish only when all four are met:

1. **`0` unauthorized changes** in the benchmark and in the pilot.
2. **False-done reduction `≥ 50 %`** demonstrated and published (`evals/RESULTS.md`).
3. **At least 4 of 6 participants** say they would use MetaSkill again on their next project.
4. **Install and first evidence report in `< 5 minutes`** on each host.

After the pilot, fix what it reveals and re-run the benchmark (`mtsk eval --runs 3`).

## 5. 30-Day Adoption Metric

Of the participants who start another project within 30 days, record how many choose MetaSkill again on their own initiative (target: `≥ 4 of 6`).
