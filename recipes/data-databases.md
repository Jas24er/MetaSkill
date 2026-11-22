# Recipe: Data & Databases

## 1. What is checked
- Migrations are declarative, deterministic, and reversible (paired `up` and `down` SQL/migration files).
- Row Level Security (RLS) is enabled (`ENABLE ROW LEVEL SECURITY`) with explicit policies (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) enforcing least-privilege isolation.
- Foreign keys and ownership columns (`user_id`, `owner_id`, `tenant_id`) have supporting indexes and safe constraints.
- Queries are parameterized (no string interpolation in SQL).

## 2. Tools
- Local isolated Postgres/SQLite/Docker runner (`docker compose`, `psql`, `supabase db`, ORM migration checks) or SQL invariant test script.

## 3. Evidence produced
- Reversible migration files (`*.sql` + `*.down.sql`) and passing schema/RLS verification test in `.agents/evidence/report.{md,json}`.
- Cross-user/unauthorized access test proving default-deny behavior.

## 4. Typical mistakes the reviewer hunts for
- Tables created without `ENABLE ROW LEVEL SECURITY`, or RLS enabled with a missing `INSERT`/`UPDATE`/`DELETE` policy.
- Irreversible migrations (`DROP TABLE` / destructive changes without backup or `down` migration).
- Missing indexes on `user_id`/`tenant_id` causing full table scans under RLS.
- Raw SQL built with `${...}` template strings instead of bound parameters (`$1`, `?`).
