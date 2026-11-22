# Recipe: Defensive Security

## 1. What is checked
- Zero hardcoded secrets, API keys, tokens, or private credentials in source files, tests, or Git history.
- `.gitignore` excludes `.env` and `.env.*` (while `.env.example` documents key names only).
- Dependencies have no unaddressed critical vulnerabilities (`osv-scanner` / `npm audit`).
- Static code checks (`semgrep`) show no injection, path traversal, or unsafe command execution (`exec` with shell strings).
- Any active test probe/DAST runs strictly against `localhost`, `127.0.0.1`, or local project-owned Docker containers.

## 2. Tools
- `gitleaks` (secret scanning), `osv-scanner` (dependency CVEs), `semgrep` (SAST).

## 3. Evidence produced
- Scanner execution summary in `.agents/evidence/report.{md,json}` (and optional `preview/security-report.md`).
- Confirmed `.env` protection and clean secret-free source diff.

## 4. Typical mistakes the reviewer hunts for
- Hardcoding secrets (`sk_live_...`, service-role keys, tokens) in source code or `NEXT_PUBLIC_*` client variables.
- Committing real `.env` files or printing secret values in test/error logs.
- Shell-interpolated `exec(...)` on untrusted or contract inputs instead of `execFile` with explicit `argv`.
- Running active scanners against external hosts without authorization.
