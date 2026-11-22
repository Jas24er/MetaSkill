# Hybrid QA Gates — Evidence Matching the Work

`exit code 0` and `mtsk doctor` passing indicate **environment and build readiness**—never proof that a delivered product works. Every requirement must be backed by evidence matching its domain before closing as **`verified`**.

---

## 1. Dual Gate Structure

Use the team's checks and evidence locations when they demonstrate the requested outcome. For release review, match the evidence to the revision or artifact being shipped. The paths below describe the bundled playbooks. Cite existing reports or artifacts directly and apply only checks relevant to the task.

1. **Technical Gate (Deterministic):** Objective checks (types, build, unit/integration tests, `ffprobe`, LUFS, schema/RLS/security checks).
2. **Perceptual / Evidence Gate (`preview/`):** Real interaction or inspection evidence saved under `preview/` so an agent and human can evaluate it in seconds.

---

## 2. Domain Evidence Standards

- **Web Full Stack:** Technical checks (`typecheck`, `build`, tests) + **real interaction** against the running local server (e.g., Playwright/HTTP smoke confirming 0 uncaught errors, 0 unexpected 5xx, working form/API round-trip) + `preview/` desktop (`1280x800`) and mobile (`375x812`) visual checks (or `preview/web-verification.md` when headless UI tooling is unavailable).
- **Video & Audio Multimodal:** `ffprobe` stream validation (`yuv420p`, CFR, `48000 Hz` audio) + `ebur128` loudness check (`-14` / `-16 LUFS`, `<= -1.0 dBTP`) + **played/sampled verification** via `preview/contact-sheet.png` (`3x2`) and optional `preview/audio-spectrum.png` while preserving `inputs/` byte-for-byte.
- **Databases & Defensive AppSec:** Clean migration dry-run/apply + **data integrity & authorization test** (default-deny RLS enabled, parameterized queries, cross-tenant `401`/`403`/empty isolation) + local scanners (`gitleaks`, `semgrep`, `osv-scanner` / `trivy`) + `preview/security-report.md`.

---

## 3. Closure & Failure Discipline

- If a preview or functional check fails, treat it as a failing test: increment the strike counter and fix the root cause (up to 3 strikes).
- If an environment constraint prevents a check (e.g., missing browser or binary), mark the affected requirement **`pending`** or **`blocked`**—never **`verified`**.
- Clean only task-owned temporary outputs when authorized and retain the evidence referenced at handoff.
