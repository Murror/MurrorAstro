---
name: Never apply migrations out-of-band — merge the PR first
description: Long-lived feature branches + migrations applied to shared DBs before the PR merges cause schema/DB drift; led to 2026-04-20 P2032 movie-invite incident
type: feedback
originSessionId: 1da68e58-e6c5-44d5-8bc8-8bb394874dfb
---
When a PR contains a Prisma migration, the **migration and the code that depends on it must land together** via the normal PR → CI → deploy flow. Never run `prisma migrate deploy` from a feature branch against a shared DB (staging, alpha, prod). Never apply migration SQL manually through Supabase/psql to "unblock testing."

**Why:** On 2026-04-20 the hourly `expirePendingInvites` cron started throwing `P2032` every 10 minutes on staging. Root cause: PR #310 (`feat/takeaway-invites`, author Astro) was opened on 2026-04-15 and its migration `20260415210000_add_takeaway_id_to_invites` got applied to the staging DB — but the PR itself never merged. Staging DB ended up with `movie_invites.insight_id` nullable + a new `takeaway_id` column, while the `staging` branch still had `insightId String` (non-nullable) in the Prisma schema. 3 orphaned rows were written with NULL insight_id during that testing window. The cron then couldn't read them without crashing.

Shipped the fix as a cherry-pick of the original migration commit (`d061402`) onto a fresh branch off staging → PR #337 → admin-merge.

**How to apply:**
- 🚨 If a PR has a migration in `prisma/migrations/`, **do not run that migration against a shared DB** until the PR is merged to the target environment's branch.
- ✅ Rule: migration PRs merge within 24-48h or get closed/reworked. No feature branch lives for >3 days with an unshipped migration.
- ✅ If you need to validate a migration before merge, use a local/ephemeral DB (`docker-compose up postgres` or a throwaway Supabase branch DB), not staging.
- ✅ All PRs target `staging` (per `feedback_always_target_staging.md`) — not `main`. Targeting `main` makes branches orphan-prone.
- 🚩 If you find a schema/DB mismatch (Prisma P2032, P2002 with unexpected columns, or "column doesn't exist" errors on what should be working code): **check for an open PR with an unmerged migration** before doing anything else. Grep `prisma/migrations/` across open PRs. That's almost always the cause.
- 🔧 Fix for schema drift when you find it: cherry-pick the migration's originating commit onto a fresh branch off the target environment branch, ship through normal PR flow. Don't try to manually reconcile.
