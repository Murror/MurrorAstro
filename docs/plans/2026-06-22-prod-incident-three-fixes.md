# 2026-06-22 Prod incident response: chat errors, signup loop, diary data loss

## Context
After promoting the web reflection batch (#141/#142/#143 + avatar fix #140/5257b005)
to prod, three production reports came in:
1. Web AI chat "did not respond, came back with errors."
2. New-user Gmail signup failed during onboarding; later succeeded but onboarding restarted.
3. A live (mobile + web) user lost diary entries.

Parallel forensic agents (read-only) root-caused all three. The user's engineer
separately confirmed he had broken the web build.

## Root causes + fixes

### 1. AI chat errors = WRONG PROD WEB IMAGE (not a code bug)
- Prod `web-client` had been manually `kubectl set image`'d to `prod-96c7d414`, a build
  from the **`dev`** branch (a paywall-fallback patch). `dev` and `feat/web-app-from-mobile`
  diverged at `47f67a2a`; `dev` contains **none** of the web-app deep-chat code, so the
  socket never connected (murror-api logs: 0 WS handshakes vs 100 REST calls in 3h).
- The #137 token-refresh change was cleared (not even present in the dev build). viasr healthy.
- FIX: restored prod web to `prod-5257b005` (feat/web-app-from-mobile), later superseded by
  `prod-712a70d7`. WS "Connection added" resumed immediately.
- RISK/FOLLOW-UP: prod web image was flapping between our build and the eng's dev build.
  The paywall-fallback change must be merged INTO feat/web-app-from-mobile, not deployed
  straight from dev. Recommend pinning the prod web deploy source to feat/web-app-from-mobile.

### 2. Signup/onboarding restart = retry storm + tokenless 401
- `POST /onboarding/complete` was fired ~12x concurrently (auto-submit re-firing across
  renders + remounts on auth `TOKEN_REFRESHED`/route-guard bounce; async submit let
  concurrent calls all pass the mount-scoped ref). The completion handler wraps dozens of
  deleteMany/createMany/upsert in two `$transaction` blocks at the default 15s interactive
  timeout; under same-row lock contention every tx exceeded 15s -> 500s -> onboarding loop.
  Confirmed in prod: user butterycroissant02, 12 concurrent calls, 11x 500, row created
  with is_onboarding_completed=true but onboarding_completed_at=NULL.
- Latent: `create-authenticated-base-query.ts` did `getSession()` only (no refresh/retry),
  so a request in the brief post-OAuth window went out tokenless -> 401 (the #137 fix lived
  only in profile-api `/me`).
- FIX (web, PR murror-platform #144, prod-712a70d7):
  - Module-scoped submit latch in `use-onboarding.ts` (`submitInFlight` + `submitCompleted`)
    so complete fires EXACTLY ONCE; released on transient error and on reset()/Settings-redo.
  - Extracted `resolveAccessToken()` (refresh-once-when-null) used by BOTH the authenticated
    base query and profile-api; wrapped base query in `retry(maxRetries:2)`.
- FIX (api, PR murror-api #502, staging only): both `$transaction` -> `{timeout:30000, maxWait:10000}`;
  backfill `onboardingCompletedAt`/legacy `onboarding_date` when null on redo without
  re-stamping; redo still runs full churn (changed multi-selects persist). NOT promoted to
  prod (prod onboarding.service.ts diverges; prod has 15s from #380 + the web latch now
  stops the storm at source). Promote with the next backend catch-up.

### 3. Diary data loss = delete-draft destroyed ACTIVE conversations (our PR #501)
- PR #501 changed `DELETE /v1/deep-chat/current-draft` from `findCurrentDraft` (isDraft only)
  to `findLatestResumable` (status IN DRAFT,ACTIVE). So "delete draft" soft-deleted the
  user's newest ACTIVE conversation that already had user messages.
- Prod blast radius: exactly 2 ACTIVE conversations (2 msgs each), 2 users today
  (`91f2f601...` user b6df96a5 via web; `a45d74d9...` user c8b20dd4 via MurrorMobile).
  Fix C's 761-draft cleanup was RULED OUT (all DRAFT, zero diary_entries rows, 11-13mo stale).
  Completed journals/reflections untouched (journals has no deleted_at column).
- DATA RECOVERY: `softDelete()` sets only deleted_at (content intact). Restored both rows in
  a transaction (`UPDATE ... SET deleted_at=NULL WHERE id IN (...) AND status='ACTIVE'`), UPDATE 2.
- PERMANENT FIX (api, PR #502 staging + cherry-picked clean to production as a8a01aa, prod 0.36.5):
  `ConversationAggregate.isDiscardableDraft()` = status DRAFT AND zero USER messages, plus
  `userMessageCount()`. delete-draft only soft-deletes a genuinely empty draft; ACTIVE/
  content-bearing convos are a graceful no-op. Preserves #501's "dismissed draft keeps
  re-appearing" fix. Protects both mobile and web (shared backend, no app update needed).

## Deploys / verification
- murror-api prod: 0.36.4 -> **0.36.5** (production branch a8a01aa, deploy-matrix dispatch).
  Verified `isDiscardableDraft` compiled into live prod pod dist/.
- web prod + staging: **prod-712a70d7 / staging-712a70d7** (feat/web-app-from-mobile #144,
  carries #137-#143 + avatar + onboarding fixes).
- Health: web.murror.app 200, murror.api/health 200, viasr pods Running, restored convos alive.

## Earlier in the session (already prod before incident)
- Connection-reflection web batch: #141 self/partner correctness, #142 reflect-lock + own
  avatar on shared takeaway, #143 all reflection CTAs open a fresh locked chat, #140/5257b005
  avatar uncrop. Staging seed data for astrovinh (Alyssa Wang connection) for QA (seed_* rows).

## Open / follow-ups
- Promote onboarding tx-timeout (#502) to prod with next backend catch-up.
- Pin prod web deploy source to feat/web-app-from-mobile (prevent dev-branch clobber).
- Harden `DELETE /journals/:id` (currently a hard delete) to soft-delete (latent, not implicated).
- Remove staging seed_* QA rows when astrovinh finishes testing.
- murror-api #502 staging branch still open for the onboarding portion (delete-draft already in prod).
