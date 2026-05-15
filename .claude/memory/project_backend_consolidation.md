---
name: Backend consolidation — Edge Functions → NestJS
description: 100% complete (38/38 endpoints migrated). Dual-write cleanup done. Rate limiting, DLQ, slow query logging added. Staging environment created.
type: project
originSessionId: 1da68e58-e6c5-44d5-8bc8-8bb394874dfb
---
## Status: 100% Complete (as of 2026-03-31)

All 38 mobile API endpoints migrated from Supabase Edge Functions to NestJS.
Zero `/functions/v1/` calls remain in mobile API clients.

## PRs Merged

**Backend (murror-api): 10 PRs (#280-290)**
- #280-283: Endpoint migration (user settings, journal CRUD, relationships, mental health, streaks, avatar)
- #284: Global rate limiting (3 tiers: 10/sec, 50/10sec, 200/min)
- #285: Code review security fixes (7 issues)
- #286: Final 6 endpoints (emotion, deep chat create, journal AI, reflection preview)
- #287: DLQ consumer + slow query logging
- #288: DTO validation + dead code cleanup + quotes dual-write removal
- #289: Dual-write cleanup (timezone, language, onboarding)
- #290: getUserProfile migration to murror schema

**Mobile (MurrorMobile): 6 PRs (#440-445)**
- #440: Onboarding bug fixes + API URL fix
- #441-443: Batch 1-3 mobile client switches
- #444: QA fix (emotion reaction revert)
- #445: Final 6 switches — 100% migration

## Dual-Write Status

| Area | Status |
|------|--------|
| Quotes reads | Migrated to murror `UserGeneratedQuote` |
| Timezone/language reads | Migrated to murror `User` |
| getUserProfile | Murror-first with legacy fallback for 6 unmigrated fields |
| Onboarding write | Removed `age` + `work` from legacy; 8 fields remain (read by Edge Functions) |

**Remaining legacy fields (can't remove yet):** first/last/middle name, enable_notification, is_panic_mode — not in murror User model.

**2026-04-18 update:** Avatar dual-write to `public.user_profiles` eliminated as part of murror-api PR #323 (settings data-integrity fix). Avatar now writes only to murror-schema. See `project_settings_data_integrity_fixes.md`.

## Infrastructure Added

- Rate limiting: `@nestjs/throttler` (3 tiers, health checks excluded)
- DLQ consumer: 7 routing keys, logs dead letters
- Slow query logging: Prisma middleware warns on >500ms
- Sentry: 3 alert rules (high error rate, unhandled errors, slow P95)
- Staging: `nsp-staging-murror` with dedicated Supabase project

## CI Issue (2026-03-31)

murror-api Deploy workflow fails at `setup-kubernetes` step — tries to deploy to old `nsp-alpha-murror` namespace. Pre-existing issue. Manual `kubectl rollout restart` needed until CI is fixed.
