---
name: Eliminate legacy public.* schema (dual-table cleanup)
description: Remove remaining dual-write to public.* tables, reads/writes from murror_api.* only. Improves speed, debugging, stability.
type: project
originSessionId: 1da68e58-e6c5-44d5-8bc8-8bb394874dfb
---
## Problem
After the Edge Functions → NestJS migration, many flows still dual-write to both `murror_api.*` (new) and `public.*` (legacy) tables via `LegacyPrismaService`. This causes:
- **2-3x slower onboarding submission** (~400-800ms vs ~150-300ms)
- **More DB connections** (two Prisma clients, two pools)
- **Schema drift bugs** (e.g. `map_gender_to_enum` in `public` not found from `murror_api` search_path)
- **Silent data desync** when one table write succeeds and the other fails

## Flows still using legacy tables (as of 2026-04-09)
- Onboarding completion — `public.user_profiles` upsert + `map_gender_to_enum` PG function
- Streaks wrap-up content
- Articles
- Quotes
- Some notification flows
- Possibly more (needs audit)

## Already migrated
- Diary list (PR #300) — reads from `murror_api.diary_entries` directly, legacy dual-write removed
- Avatar (murror-api PR #323, 2026-04-18) — dual-write to `public.user_profiles` removed, reads/writes murror-schema only

## Still-remaining legacy reads to sweep
- `user_checkin_reports` (public schema)
- `recent_interests` fallback branch in `user-profile.service.ts` (murror-first with legacy fallback)
- Onboarding completion (public.user_profiles upsert + `map_gender_to_enum`)
- Streaks wrap-up content, articles, quotes, some notification flows

## Plan (when ready)
1. **Audit** — grep for all `legacyPrisma.*` calls in murror-api/src
2. **Migrate each** — replace with `prisma.*` equivalents using `murror_api` schema
3. **Remove `LegacyPrismaService`** injection entirely
4. **Drop** legacy tables (only after 2 weeks of stable operation on new schema)
5. **Remove** `DATABASE_URL` env var (leave only `MURROR_DATABASE_URL`)

## Expected gains
- 50% faster onboarding submission
- 30% fewer DB connections
- Simpler debugging (one schema, one source of truth)
- No more "reset two tables" when resetting user state

## Not urgent but tracked
Target: post US-launch polish sprint, ~2-3 days of focused work.
