# Playbook: Databases & Defensive AppSec

Curated reference for safe relational schemas, authentication hardening, secret prevention, static/dependency scanning, and strictly local runtime security checks.

---

## 1. Strict Ethical & Scope Boundary (Defensive Only)

- This playbook covers **Defensive Application Security (AppSec)**, **Database Hardening**, and **Authorized Local Verification**.
- **RED-ZONE BOUNDARY:** Active security probes or DAST checks are **STRICTLY RESTRICTED** to `http://localhost:*`, `http://127.0.0.1:*`, or ephemeral Docker containers owned by this project. **NEVER** generate or run exploitation payloads or network scans against external domains or third-party infrastructure.

---

## 2. Database Engineering Invariants

1. **Declarative Schema & Versioned Migrations:** Manage schemas exclusively via versioned migration tools (`Drizzle Kit`, `Prisma Migrate`, or ordered SQL migrations). Never rely on unrecorded manual table edits in production.
2. **Expand-and-Contract Safety:** Never execute destructive `DROP TABLE`, `DROP COLUMN`, or `TRUNCATE` migrations automatically in autonomous runs (**Red-Zone pause required**). Prefer additive migrations, backfill, switch reads/writes, then deprecate.
3. **Default-Deny Row Level Security (PostgreSQL / Supabase):** Every user-facing table MUST enable RLS (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`) paired with explicit `SELECT`, `INSERT`, `UPDATE`, `DELETE` policies tied to `auth.uid()` or verified session claims.
4. **Parameterized Queries Only:** Never construct SQL statements with template string interpolation or concatenation of user inputs.
5. **Indexing & Integrity:** Every foreign key, tenant discriminator (`organization_id`, `user_id`), and high-frequency lookup column must have an explicit index and `NOT NULL` / `CHECK` constraint where invariants hold.
6. **Reproducible Seeding & Local Backup:** Include an idempotent dev seed script (`src/db/seed`) using synthetic fixture data only (never real user PII).

---

## 3. Defensive AppSec Invariants

1. **Zero Secret Leaks:** `.env` ignored in Git; `.env.example` documents required keys without values; run `gitleaks` before commits/releases.
2. **Auth & Session Hardening:** Never roll custom crypto/password hashing (use `Argon2id` or `bcrypt`, or vetted providers like Supabase Auth / Auth.js). Enforce `HttpOnly`, `Secure`, `SameSite=Lax` cookies; check authorization (`ownership` + `role`) on **every** server endpoint/action (prevent IDOR/BOLA).
3. **HTTP Security Headers & CORS:** Set explicit CORS origins (never wildcard `*` with credentials), validate redirects against allowlists, and configure CSP / `X-Content-Type-Options` / `X-Frame-Options` headers.
4. **Supply-Chain & Code Scanning:** Run `semgrep` (`semgrep mcp` or CLI) for injection/XSS/auth pitfalls and `osv-scanner` / `trivy fs` / `npm audit` for critical CVEs.

---

## 4. Anti-Patterns Prevented

- **Vibecoder trap #1:** Creating Supabase/Postgres tables with RLS disabled or `USING (true)` policies, exposing the entire database to anonymous API calls.
- **Vibecoder trap #2:** Hardcoding service-role keys, DB URLs, or JWT secrets into scripts and pushing them to public GitHub.
- **Vibecoder trap #3:** Checking user login (`if (!user)`) while forgetting ownership (`where eq(row.userId, user.id)`), leaving every record vulnerable to IDOR.

---

## 5. Mandatory Hybrid QA Gate

### Technical Gate
1. Schema validation / migration applies cleanly against a fresh local PostgreSQL/SQLite instance (and passes automated RLS/auth boundary tests where unauthenticated/other-user requests receive `401`/`403`/empty rows).
2. `gitleaks detect --source . --no-git` (when installed) returns `0` leaks.
3. `semgrep` and `osv-scanner` / `trivy` / `npm audit --audit-level=high` pass with `0` unresolved critical/high findings.

### Evidence Gate (`preview/`)
- Generate `preview/security-report.md` summarizing:
  - Migrations & RLS policies verified
  - Auth/IDOR boundary & data-integrity tests executed
  - Exact scanners run (plus explicit note for any tool marked missing by `mtsk doctor`) and explicit requirement closure (`verified` / `pending` / `blocked`).

---

## 6. Walking Skeleton (< 5 Minutes)

1. Inspect existing schema/secrets read-only first (`brownfield`), or define initial minimal schema + declarative migration + default-deny RLS policy + `.env.example` (`greenfield`).
2. Run migration + 1 automated cross-tenant isolation/integrity test + `gitleaks`/dependency scan.
3. Emit verified `preview/security-report.md`.
