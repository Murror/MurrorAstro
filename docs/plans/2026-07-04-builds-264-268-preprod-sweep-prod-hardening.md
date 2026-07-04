# 2026-07-04: Builds 264-268, pre-production QA sweep, prod hardening

Covers 2026-07-03 ~10:00 PST through 2026-07-04 ~01:00 PST. Predecessor: `2026-07-02-builds-259-261-and-production-promotion.md`.

## 1. Prod promotion follow-through + staging-branch incident (morning 07-03)

- murror-api #552 (`via_onboarding` quote enum) promoted to `production` (`0961c4d`); viasr search-path sweep batch already live on prod image `e0678d6`.
- INCIDENT: murror-api `staging` branch was auto-deleted by the promotion PR (`delete_branch_on_merge=true`), silently killing staging deploys. Recreated at prod tip + setting disabled. Standing rule recorded in `incident_staging_branch_autodeleted_2026_07_03.md`: verify `staging` resolves after EVERY promotion.

## 2. Builds 264-265 (QA263 + 429 fix)

Mobile PRs #535-#542. Highlights:
- `f37f6a3` song card "Going" pill type-guard; `bf02828` MTC movie description fallback + staging backfill (8 rows, title-matched, prepared SQL in scratchpad); `f4c7db1` prompt body keyed to selected connection; `f89356e` article callouts restyled as black quote cards.
- `23cbe89` coalesced relationshipDetailBundle invalidations (400ms debounce) - killed the 429 burst on app-open (backend task #40 root cause was client-side).
- Stella: was on the wrong environment (prod app, staging expectations); RevenueCat promotional premium granted (entitlement `entldae59e222a`).

## 3. Build 266 (challenge CTA v2 + streak wiring)

- Mobile `441f6bb`: challenge CTA simplified to a single "We did it" + post-completion share-a-thought prompt + quiet streak cue. Deprecated the completionMode-adaptive CTA matrix.
- Backend #553 (`dbcf074`): detail-bundle + legacy progress payloads now include `userProgress {userId, answered, answeredAt}` + computed `active` - THE quiz-card-stuck fix (4th attempt, this one proven with real answered data).
- Backend #554 (`46d37a8`): challenge day completion + quiz both-answered completion now advance the Connection Streak (idempotent `ON CONFLICT (user_id, streak_day) DO NOTHING`).
- Also in 266: onboarding goals dedup by title (`ea84af2`, root cause: 18 duplicate wellness_goals rows on staging, 2 id-generations x 9 titles), Reflect-tab calendar milestone guidance (`1a5f443`), suggestion-card title/body gap (`5978053`), quiz X dismiss gated on compare-viewed (`4ea4f69`).
- E2E test data minted on staging for Astro+Khanh (challenge a299fea5 + quiz day 2). Later proven: both users got CONNECTION streak rows.

## 4. Build 267 (QA266 batch)

Mobile PRs #548-#551 + backend #555:
- `1f9a276` accept-challenge false error toast (double-fire; in-flight ref guard + 400-as-idempotent-success) + toast text to full white.
- `6105e19` quiz + care-tip cards unified with For Us card chrome (cream pill, no boxes, "See insight" CTA en/vi/ja).
- `7bc74b2` legacy stacked-deck transform removed (the "stack of layered cards" double-render).
- `f339f29` prompt-pool name leak: whole-word Unicode filter drops suggestions naming any OTHER connection (server still generates names - backend follow-up open).
- murror-api #555 (`ea6fcae`): open challenge survives insight rotation (latest insight's challenge, else newest PENDING/ACTIVE on the connection).

## 5. Build 268 (design refinements)

- `e213726` tilted-card swipe animation restored (rotateZ +/-4deg, translateY +/-20) with neighbors still hidden at rest (opacity curve [-1,-0.85,0,0.85,1,2] -> [0,1,1,1,0,0]) so QA266-5 ghosting cannot return.
- `b0fb80f` moment prompt = single card-standard MUButton expanding in place (LinearTransition) to Share a thought / Add a photo / Not now.
- `bf88f8f` compact challenge card: face = pill + short title + CTA; description + today's prompt moved into the tap popup (popup recomputes currentDay locally).

## 6. Pre-production QA sweep (6 parallel auditors, night 07-03/07-04)

Full report in session; key outcomes:
- CRITICAL (confirmed via Supabase advisor, 6 ERROR): 5 legacy `app_storage.*` prod tables RLS OFF + full DML granted to anon/authenticated.
- HIGH: prod missing `murror_api.emotional_memory`/`emotional_snapshots` while deployed image e0678d6 writes qualified -> Memory Vault writes silently failing (fail-open). public.emotional_snapshots frozen at 111 rows.
- HIGH: vi/ja missing `streakMilestoneGuidance_one` plural key (English bleeds at count=1); quiz-compare screen: unguarded `choices` (crash on malformed question) + no error state. BATCHED into the prod-scheme build per Astro.
- HIGH: viasr rate limiter keys on an `x-user-id` header nothing sets (per-IP in practice) + new AI endpoints not in AI_PATH_SEGMENTS.
- Retired two 07-02 "blockers": CALLBACK_ALLOWED_HOSTS fails SAFE unset (config parity item, not SSRF); lodash resolves to patched 4.17.21.
- Verified clean: crisis code gate (3 invariants), quiz-compare authz, no PII in new logs, zero migration drift, streak E2E live. Crisis EVAL evidence needs one fresh run with regex prefilter ON (last two runs 91.6%/95.8%, misses explained as harness flake - both inputs match the prefilter deterministically).
- Privacy: account deletion orphans challenge/quiz/relationship_progress rows (Connection has no User FK cascade) - GDPR erasure gap, queued.

## 7. Prod hardening EXECUTED (Astro-approved freeze exceptions, ~00:50 PST 07-04)

On prod Supabase `dcftszkbpamgeivhtuzl`:
- `lockdown_app_storage_legacy_tables_20260704`: RLS ON + REVOKE anon/authenticated on the 5 app_storage tables (service_role/postgres retained; viasr uses SUPABASE_SERVICE_KEY - verified in config.yaml:87). Advisor 6 ERROR -> 1.
- `create_murror_api_emotional_compat_20260704`: `murror_api.emotional_snapshots` = auto-updatable VIEW over public (reconnects the 111-row table); `murror_api.emotional_memory` = table PK(user_id) + RLS. Verified insertable + EXPLAIN clean.
- Rollbacks documented in `incident_prod_hardening_2026_07_04.md`.
- KEY LESSON: the first analysis read a stale git branch and concluded prod worked; truth required `git show <deployed-image-sha>` + live `to_regclass` + row freshness.

## 8. Orphan-table classification + dead-model removal

- 8 staging-only `murror_api.*` tables classified: 6 = empty duplicate shells from out-of-band `prisma db push` of DEAD schema.murror.prisma models (live tables are the `public.*` twins via LegacyPrismaService + Edge Functions); `test_bypass_users` = raw-SQL-only, absent on prod (fail-open, log noise; Astro decision pending); emotional pair = fixed above.
- murror-api PR #556 (`d4ac7c7`, OPEN, not merged): removes the 6 dead models + 5 orphaned enums + `Connection.relationshipMessages` back-relation. db:generate + build pass. Pair with prepared staging DROP SQL (`scratchpad/prepared-artifacts/STAGING_drop_orphan_murror_api_duplicates.sql`) when merging.

## 9. In flight

- Build 269 (feat/card-flip-glass-peek, iris): challenge+quiz card flip w/ bounce to dark-glass back (replaces MUPopup), unified card chrome (pill under name, time top-right, no inner X, vertically centered body), next-card peek on the carousels, reduce-motion cross-fade, en/vi/ja keys. Mockup-converged with Astro; new standing rule `feedback_design_consistency_rule.md`.
- Day pacing decision: challenge "days" advance on completion (no calendar gate) - Astro chose leave-as-is.
- Remaining pre-promotion punch-list in `incident_prod_hardening_2026_07_04.md`.
