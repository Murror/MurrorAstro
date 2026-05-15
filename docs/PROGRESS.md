# Murror Engineering Progress

**Last updated:** May 11, 2026 — PDT
**Updated by:** Claude (engineering handoff snapshot)

> This document is paired with [`HANDOFF.md`](./HANDOFF.md), [`ARCHITECTURE.md`](./ARCHITECTURE.md), [`CONVENTIONS.md`](./CONVENTIONS.md), and [`INCIDENT_LOG.md`](./INCIDENT_LOG.md). New engineers — start with `HANDOFF.md`.

---

## May 11 — Three-week wrap-up: launch sprint + mobile perf

Picking up where the April 20 daily snapshot left off. The 21-day gap was dominated by **two interlocking initiatives**: the end-to-end SSE chat streaming push (May 3–8) and the mobile performance sprint (May 7–11, 6 sub-sprints totaling 41 mobile-side wins shipped across PRs #475 + #476).

### 🚀 Mobile performance sprint — 41 wins across 6 sub-sprints (TF builds 211 + 212)

The May 7 → May 11 window. Driven from a 3-agent code audit (network, asset, render). Bundled in two PRs:

- **MurrorMobile PR #475** (merged May 8) — 21 wins. Auth token cache + in-flight dedup in `BaseApiClient`, Socket.IO `initSocket()` relocated from `getAuthToken` hot path to `onAuthStateChange` listener, conversation-detail polling gated by `useFocusEffect`, 4 GIF/JPG assets → WebP (-5.1 MB), HomeBackgroundSound lazy Proxy, lazy-loaded tab screens via `lazyScreen()`, RouteOverlays memoized in app.tsx, per-word fade-in removed from streaming text, lodash deep imports across 42 files, lz-string compression on React-Query AsyncStorage cache, avatar `cacheControl.immutable`, friend list `FastImage.preload()` prefetch.

- **MurrorMobile PR #476** (merged May 11) — 20 more wins layered across sprints 2–6. 5 Lottie animations packaged as dotLottie (-5.94 MB binary), tab-bar callbacks hoisted out of render, diary feed avatar+artwork prefetch, NetInfo + TanStack Query `onlineManager` wiring, mutation retry default DROPPED to 0 (to prevent duplicate POST journals on flaky cellular — the original retry: 3 was a regression introduced in sprint 4 and caught in agent self-review), 18 unused `Animated.Value` refs removed from `conversation-detail-screen.tsx`, persistent cache V1→V2 migration, FastImage `memoryWarning` → `clearMemoryCache()`, 8 `withRepeat(-1)` infinite animation cleanups added (sparkles in insight-card, daily-zodiac, reflection-day, etc.), 7 FlatLists tuned with `removeClippedSubviews` + `windowSize` + `getItemLayout`, OfflineBanner pill, device-tier classification util (low/mid/high), `shouldPlayDecorativeAnimations()` helper gating 4 ongoing Lotties on low-tier, splash brand-delay 600ms → 200ms, splash entrance anim 1000ms → 250ms, cold-start telemetry to Sentry (`anchor: js_module_load`), `enableFreeze(true)` for react-native-screens.

Verified on TF 212 (uploaded May 11). All sprints kept type-check at 19/19 errors and lint at 103/100 problems vs baseline. Open question for measurement: real-iPhone SEA-cellular numbers will tell us whether B1 (streaming text Reanimated rewrite) and B3 (`add-log-screen.tsx` slim down) are worth doing.

### 🌐 End-to-end SSE chat streaming (May 3–8 across all 3 repos)

Two-day push to make deep-chat stream tokens visibly instead of waiting for a full response. The fix sequence is worth studying because each layer had a separate bug:

- **viasr-api `0afebde`** — first attempt to stream SSE to mobile (was aggregating before).
- **viasr-api `805679b`** + `de4235f` + `8659ae0` — three downstream bugs surfaced once SSE was live: language fallback when detection returns None, MessageSource enum mismatch with Prisma, missing `updated_at` on persisted messages.
- **murror-api `0afebde` (PR #359)** — propagate SSE upstream from viasr → mobile.
- **murror-api `5d83466`** — upsert conversation in mobile BEFORE the viasr stream starts (FK race: stream tokens arrived faster than the parent `Conversation` row existed).
- **murror-api `c606c49`** + `ebfe53e` — nginx ingress: disable `proxy-buffering` for SSE routes; then remove `proxy-request-buffering off` because that variant dropped iPhone POSTs.
- **MurrorMobile `966789c`** — first cut of mobile SSE consumer.
- **MurrorMobile `ee77141`** — **the catch**: React Native's `fetch` buffers the entire response body before resolving. SSE doesn't work over `fetch` in RN. Swapped for `XMLHttpRequest` reading the `responseText` on each progress event.
- **MurrorMobile `b451d93`** — resolve the SSE Promise on the `done` event, not on `readyState === 4` (XHR completes after the server closes the connection, not when the last token arrives).
- **MurrorMobile `b808a3f`** — skip the rainbow gradient render path on streamed bubbles (was double-animating per token).
- **MurrorMobile `74cb809`** — minimal mobile chat render layers + fix a "second message hangs" bug from accumulated XHR state.
- **viasr-api `eb60697`** — crisis-detection regex pre-filter that short-circuits when there are no signal tokens. Cuts 600–1500ms from chat TTFT.
- **murror-api `8d3...` cluster** (May 6) — perf interceptor stripped of heavy work, AuthGuard local JWT verify fallback, fire-and-forget upsert + keep-alive HTTP agent on the viasr fetch.
- **viasr-api `6d72a2c`** — bump `model_complex_task` from Sonnet 4.0 to Sonnet 4.6 (May 8).

### 🏗 Relationship-detail bundling (May 6, murror-api PR `8d8dcde` + MurrorMobile `3d4751d`)

`GET /relationships/:id/detail-bundle` now returns the aggregate of 13 previously-separate calls (last activity, takeaway list, mission progress, mood check-ins, etc.) in one request. Mobile screen rewired to consume it; back-nav to a connection page dropped from ~8s on cellular to <1s. Pattern is worth studying as a template for other detail screens.

### 🤖 AI tone personalization rollout (mostly Apr 23–25)

Three pre-set tones backed by per-user `aiTone` on the profile. `AI_PERSONALITY_PROMPT` injected into chat (viasr-api `366`/`367`), mobile profile sync (PR #452), em-dashes purged from prompts (`feedback_no_em_dashes` rule, viasr-api PR `370`).

### 💭 Emotion arc + taxonomy (Apr 23–26, viasr-api)

Canonical 25-emotion taxonomy established and enforced (PR `958a8c2`). Emotion arc generated on journal completion (PR `3dd7565` ports `conversation_emotion_arc` from develop) and included in mobile responses. Bucket 3 (`relationship` + `new_relationship`) and Bucket 1 (`takeaway` + `reflection_card` + `relationship_reflection`) prompts now emit structured emotion fields (PR #375, #376).

### 🚨 Incidents (full detail in [`INCIDENT_LOG.md`](./INCIDENT_LOG.md))

- **Apr 21 — CI GHCR auth + secret recreate** (murror-api `33f9a2e`, `1ff63ad`, `6063c0b`). Resolved.
- **Apr 22 — Bug H: prod missing `murror-ai-beat` deployment** (viasr-api `131ed10`). Memory file: `incident_bug_h_bedtime_story.md`. Resolved.
- **Apr 22 — Crisis detection gap** on `/chat/stream`. viasr-api PR `6cfcc33` injects 988 + Crisis Text Line when `urgency=critical`. Memory file: `incident_crisis_detection_gap.md`. Resolved.
- **Apr 23 — Celery cross-env task contamination** (viasr-api `1ad7aea`). Shared Redis broker + default queue name "celery" let staging tasks run on prod workers. Memory file: `incident_celery_cross_env_contamination.md`. Resolved.
- **Apr 23 — emotion_events `source_id` type mismatch** (murror-api `5bc4a4e`, `e68dac5`, `f8e4906`). UUID → TEXT (to accept cuid). Required dropping and recreating a dependent view. Resolved.
- **Apr 25 — Crisis detection over-firing on non-crisis content** (viasr-api `a7adbb0`). Tightened classifier prompt. Resolved.
- **May 11 — Mutation retry blocker** (caught in PR #476 self-review, NOT shipped to users). 3 retries on non-idempotent POSTs would duplicate journals on flaky cellular. Fixed before merge. New memory: this exact class of bug is now flagged in `CLAUDE.md` for mobile.

### 🧰 Infra / CI stabilization (Apr 21–23)

Cluster of fixes that unblocked staging deploys:
- GHCR auth: use `secrets.GITHUB_TOKEN` not a separate PAT (murror-api `1ff63ad`); `REPOSITORY_OWNER` as GHCR username (`33f9a2e`).
- Skip empty K8s secret recreate when source env is empty (avoided wiping live secrets).
- viasr-api CI: `workflow_dispatch` deploys staging + alpha, concurrency isolated (PR `9962597`).
- viasr-api CI also runs on PRs targeting staging, not just main (PR `75dfd76`).
- Beat deployment step extended to production (the `incident_bug_h_bedtime_story.md` fix).
- Disabled `CALLBACK_PINGS_ENABLED` for launch (Memory Room hidden behind Statsig flag).

---

## 🧭 What's still on the table (as of May 11)

### Mobile-side (low-risk, just needs decision)
- **B1** — Streaming text full Reanimated rewrite. High visual-regression risk. Should wait for TF 212 real-device measurements to know if it's worth doing.
- **B3** — `add-log-screen.tsx` slim down (1500+ lines). Same — measurement first.
- **B2** — Layout-property animations (modal slide, keyboard height) → transform. Cosmetic, low-impact.

### Server-side (highest remaining leverage for SEA cellular)
- **C1** — Cloudflare in front of API. Already in active speed-sprint planning.
- **C3** — Asset CDN closer to SEA (`files.ambercare.app` is US-hosted).
- **C4** — Supabase region migration to SEA. High impact, high risk; pending.
- **C5** — Confirmed (May 10) that backend doesn't gzip small JSON responses. Likely working on large ones but unverified — flag for backend team.

### Post-launch
- Eliminate legacy `public.*` schema (2–3 day post-launch sprint).
- Per-screen `shouldPlayDecorativeAnimations()` adoption across the 10+ Lottie consumers.

---

## April 20 — What shipped today

### Emotional Memory Vault (EMV) — Phase 2 hardening + Memory Room unblock

The 4-component EMV design (Librarian + AI Callbacks + Memory Room + Callback Pings) continued rolling out. Today's focus: hardening Phase 2 memory injection and unblocking Memory Room population for real users.

- **PR #381 (viasr-api)** — Phase 2 harden: crisis re-check before injecting memories + 500ms hard timeout on retrieval so slow memory reads can never stall the chat response.
- **PR #382 (viasr-api)** — pgbouncer transaction-mode compat: strip `pgbouncer` / `connection_limit` / `pool_timeout` kwargs from asyncpg URL + disable asyncpg statement cache.
- **PR #383 (viasr-api)** — wire `memory_backfill.run_chunk` Celery trigger into 4 consumers: deep-chat, journal, individual-reflection, relationship-reflection. Every completion now enqueues a live memory-index chunk for the user.
- **PR #384 (viasr-api)** — disable SQLAlchemy asyncpg-dialect `prepared_statement_cache_size` (follow-up to #382 — same class of pgbouncer bug at a different layer). INSUFFICIENT — see #385 below.
- **PR #385 (viasr-api, IN FLIGHT)** — add `prepared_statement_name_func` using UUID-stamped names so SQLAlchemy's per-execute `prepare()` calls cannot collide on recycled pgbouncer connections. Permanent fix for `DuplicatePreparedStatementError`.

### murror-api — Takeaway Ask-to-Join finalization + P2032 cron recovery

- **PR #337** — takeaway-driven movie/place invites: lets the app request invite flows from a takeaway suggestion (not just a standalone screen).
- **PR #338** — PR #310 follow-ups (1, 2, 4; 3 excluded by design).
- **PR #339** — broadcast invite lifecycle via Supabase Realtime so both sides of an invite see state changes without polling.
- **🚨 P2032 incident (resolved):** Hourly `expirePendingInvites` cron started crashing on staging at 13:00 PDT with `P2032` on `movie_invites.insight_id`. Root cause: PR #310 was open since 2026-04-15; its migration `20260415210000_add_takeaway_id_to_invites` had been applied to the staging DB out-of-band but the PR itself never merged. 3 orphan rows with NULL `insight_id` broke the cron. Fix: cherry-picked the original migration commit (`d061402`) onto a fresh branch off staging → PR #337 → admin-merge. 16:52 UTC cron verification clean. **New memory rule saved:** `feedback_no_out_of_band_migrations.md` — migration SQL + code must land together via PR; never apply migrations from feature branches.

### MurrorMobile — Emergency feature flag + Home render fix

- **PR #457** — hid the emergency feature for v2.0 via `EMERGENCY_BUTTON_ENABLED` flag in `config/constants.ts`.
- **Hotfix `5d3f9eb`** — home screen was importing only `BOTTOM_TAB_BAR_HEIGHT` and referenced `EMERGENCY_BUTTON_ENABLED` at render, crashing with "Property 'EMERGENCY_BUTTON_ENABLED' doesn't exist". Added it to the import. Committed directly to `staging-environment-setup` (minimal render fix).

---

## April 19 — What shipped today

### Emotional Memory Vault — Phase 1 through Phase 4 foundations

Massive 20-PR day across all three repos to lay down the EMV core. Full design was approved Friday (`docs/plans/2026-04-18-emotional-memory-vault-design.md`).

**Phase 1 — Memory Librarian (schema + service)**

- **PR #328 (murror-api)** — DB schema: `MemoryIndex` + `MemoryBookmark` tables, `pgvector` extension, indexes on `(userId, createdAt DESC)` + `(sourceType, sourceId)` unique.
- **PR #329 (murror-api)** — Memory Room read API: `/v1/memory/index`, `/v1/memory/month/:ym`, `/v1/memory/:id`, `/v1/memory/summary`. Includes emotion-key normalization bug fix.
- **PR #330 (murror-api)** — Supabase AuthGuard on memory routes + fixed double `v1` path prefix.
- **PR #372 (viasr-api)** — Memory Librarian Python service + retrieve API + one-shot backfill Celery task `memory_backfill.run_chunk`.

**Phase 2 — Memory injection into chat + journal**

- **PR #374 (viasr-api)** — inject retrieved memory callbacks into deep chat + journal analysis prompts (with provenance tracking for compassion review).

**Phase 3 — Memory Room mobile**

- **PR #453 (MurrorMobile)** — 5 leaf UI components: `MemoryCard`, `CastleMonthNode`, `MonthHeatmap`, `SummaryWidget`, etc.
- **PR #454 (MurrorMobile)** — `MemoryRoomScreen` + deep link + full i18n translations.
- **PR #456 (MurrorMobile)** — Home shortcut → Memory Room + extracted callback strings.

**Phase 4 — Callback Pings (hourly proactive reach-outs)**

- **PR #332 (murror-api)** — `memory_callback_log` migration with per-day unique index + POST `/v1/memory/callback-pings` endpoint to record deliveries.
- **PR #333 (murror-api)** — fix migration: make per-day unique index IMMUTABLE (Postgres requires immutability for index predicates).
- **PR #334 (murror-api)** — fix migration: wrap UTC-date cast in IMMUTABLE function so index can be created.
- **PR #377 (viasr-api)** — hourly Celery Beat scheduler + per-user send task. Checks quiet-hours, preferred window, whether any journal/reflection happened in the last 24h.
- **PR #455 (MurrorMobile)** — Settings toggle for enabling/disabling callback pings (off by default per user preference model).

### Emotion extraction — every journal type (core company value unlock)

Per the `feedback_emotion_detection_everywhere.md` rule, every journal type must carry an emotion arc. Two buckets landed today:

- **PR #375 (viasr-api)** — Bucket 3: `relationship` + `new_relationship` service prompts now emit structured emotion fields.
- **PR #376 (viasr-api)** — Bucket 1: `takeaway` + `reflection_card` + `relationship_reflection` service prompts emit structured emotion fields.

### murror-api — privacy + AI tone

- **PR #325** — per-user `shareLevel` wired across ALL Connection AI services (`feedback_python_str_enum_equality.md` bug caught + fixed).
- **PR #327** — `aiTone` field on User profile for AI companion personality selection (Phase A — storage).
- **PR #452 (MurrorMobile)** — sync AI tone selection to server via `useUpdateProfile`.

### viasr-api — AI tone + crisis detection + CI hardening

- **PR #366** — trim `AI_PERSONALITY_PROMPT` to 3 tones, key by string.
- **PR #367** — persist `aiTone` + inject personality into chat (Phase C).
- **PR #370** — purge em-dashes from LLM prompts (per `feedback_no_em_dashes.md`).
- **PR #371** — hardcoded crisis response on `/chat/stream` (unblocks the `incident_crisis_detection_gap.md` memory).
- **PR #378** — bump `kubectl rollout timeout` to 600s (prevents CI false-fails on slow rollouts).
- **PR #379** — deploy Celery Beat as dedicated pod for staging (lets Phase 4 hourly jobs actually run).
- **PR #380** — port eval harness from `develop` branch so staging can run evals.

### Infra / ops

- **PR #331 (murror-api)** — template ingress class + TLS secret per environment (unblocks multi-env k8s manifests).
- **PR #335 (murror-api)** — force `imagePullPolicy: Always` on migration Job (prevents stale-image migration runs).
- **PR #336 (murror-api)** — remove backticks from migration Job heredoc comment (shell was mis-parsing them).
- **PR #373 (viasr-api)** — bump Dockerfile Poetry to `2.3.2` to match lock file (CI build was failing).

---

## April 18 — What shipped today

### Staging CI/CD pipeline — permanent end-to-end fix

Cascade of 4 deploy failures resolved, staging now ships changes via GitHub Actions end-to-end (final run `24599395136` GREEN).

- **PR #320 (murror-api) + #358 (viasr-api)** — meta-fix: unified deploy action + workflow architecture. Admin-merged after final diff review.
- **PR #321 (murror-api)** — switched migration Job to `MURROR_DATABASE_URL_EXTERNAL` (port 5432 session mode, no pgbouncer) to fix Prisma `migrate deploy` hang. Runtime still uses `MURROR_DATABASE_URL` (port 6543 tx-mode).
- **PR #322 (murror-api)** — removed 53-line ServiceMonitor + ClusterRole + ClusterRoleBinding block from `k8s/manifests.yml` (Prometheus Operator CRDs not installed on DOKS, causing admission rejection).
- **Token-based DOKS kubeconfig** — replaced exec-plugin (doctl, unavailable on GH runners) with `ci-deploy` ServiceAccount in `kube-system` + cluster-admin binding + static-token Secret. Updated `KUBE_CONFIG` on staging + alpha + production envs of both repos.
- **GitHub env secrets populated** — bounced 116 live K8s secret/configmap values from `nsp-staging-murror` and `nsp-staging-murror-ai` into staging env vars/secrets on both repos (previous staging envs had 0 secrets).
- **`MURROR_DATABASE_URL_EXTERNAL` pre-provisioned** across all 3 envs (staging, alpha, production) in both cluster secrets and GitHub env secrets — preempts the same failure when alpha/prod deploy through the new pipeline.
- **Rollout audit trail** added via `kubernetes.io/change-cause` annotation (`sha=… branch=… actor=… run=…`) visible in `kubectl rollout history`.

### murror-api
- **Settings data-integrity fixes** (PR #323, merged to `staging`, commit `8c00e2b`):
  - `firstName`/`lastName` added to `UpdateUserProfileDto` + written through by `updateProfileV1`. Previously mobile sent them; DTO silently dropped them; user edits lost.
  - `ensureUserExists` now extracts `given_name`/`family_name` from OAuth `user_metadata` at signup (Google + Apple both provide these on first sign-in). Falls back to splitting `full_name` on last whitespace.
  - Avatar legacy dual-write to `public.user_profiles` removed — backend consolidation complete, single write to `murror_api.User` is now the only persistence path.
  - Unused `LegacyPrismaService` injection removed from controller.

### MurrorMobile
- **Timezone auto-sync on profile updates** (PR #451, merged to `staging-environment-setup`, commit `82f9fca`):
  - `profile-api-client.updateProfile` now attaches `Intl.DateTimeFormat().resolvedOptions().timeZone` to every payload. Backend User table has timezone column and endpoint already accepted it — mobile just wasn't sending it. Unlocks correct localization for notifications, quiet hours, "good morning" prompts.

### Settings audit — findings and non-bugs
Full end-to-end Settings audit performed. Cleared three false-positives so future sessions don't re-chase them:
- **Delete account** already awaits `supabase.auth.admin.deleteUser` and throws `InternalServerErrorException` on failure. Correct as-is.
- **NotificationScreen & LanguageScreen** ARE registered in `navigation-controller.tsx`. Menu items work.
- **Quiet hours & AI tone** remain device-local by design (explicit user choice).

Non-fix: `firstName`/`lastName` in `CompleteOnboardingDto` — onboarding UI doesn't collect them, signup-time OAuth extraction covers it.

### Memory system
- 6 new memory files: `reference_ci_token_kubeconfig.md`, `reference_migration_db_url_external.md`, `project_ci_cd_pipeline_hardening.md`, `feedback_python_str_enum_equality.md`, `project_settings_data_integrity_fixes.md`, `reference_settings_nonbugs.md`.
- 3 stale memories corrected: `project_backend_consolidation.md`, `project_env_priority_staging_first.md`, `project_eliminate_legacy_schema.md` (avatar no longer in legacy-read list).

---

## March 26 — What shipped today

### MurrorMobile
- **Apple Watch bundle ID fix** (PR #438, 8:09 PM PDT) — `app.murror.mobile.dev.MurrorWatch.watchkitapp` → `app.murror.mobile.dev.watchkitapp`. Removed `INFOPLIST_KEY_WKWatchOnly = YES` which was blocking WatchConnectivity. WatchConfig.swift API URL updated to `dev.api.ambercare.app`.
- **In-progress work saved** (12:00 PM PDT) — Mac migration stash: Watch config, UI screen changes, env files.

### murror-api
- **RevenueCat webhook auth fix** (PR #278, 7:29 PM PDT) — `subscription.webhookSecret` → `revenueCat.webhookSecret`. Wrong key was silently returning `undefined`, bypassing webhook signature verification in production for every RevenueCat event.
- **Streak date timezone clarification** — Added comment in `streak.repository.ts` documenting that UTC ISO slice comparison is safe because `createdAt` is always `startOf('day')` in user timezone via Luxon.

### viasr-api
- **Production stability mega-merge** (6:47 PM PDT) — Merged QA PRs #342–#348 into main:
  - Pool recycle + pre-ping for stale DB connections
  - `VOICE_INSIGHTS` feature flag gating ElevenLabs TTS
  - RabbitMQ SSL fix for CloudAMQP port 5671
  - `StreamLostError` handling in all 9 consumers + socket leak fixes
  - ACK-first pattern for connection insight consumer (stops poison-message loop)
  - Sentry noise suppression for pika SSL drops
- **`_retry_counts.pop` bug fix** (6:33 PM PDT) — Orphaned call from ACK-first refactor was causing `AttributeError` → channel kill on every single processed message.
- **uvicorn workers 2 → 4** (8:36 PM PDT) — Readiness probe was timing out under heavy LLM load with only 2 workers. 4 workers = 2x event loops = probe requests always get served. Fixed 33h stuck-pod state in production.

### murror-backend
- **Prompt injection fix** (6:47 PM PDT) — Isolated user journal input into `user` role (not entangled with instruction). `system` role for task instructions. Removed em dashes from all prompts.

### Infrastructure (DOKS / K8s — not in git)
- **DB connection pooling fixed in both namespaces** — `MURROR_DATABASE_URL` secrets in `nsp-dev-murror` and `nsp-prod-murror` updated from port 5432 (session mode, 3-connection limit) → port 6543 + `pgbouncer=true` (transaction mode, unlimited). Deployments restarted.
- **Prod viasr-api pod restored** — Pod stuck at 0/1 Ready for 33h (readiness probe timeout under load). Fixed by workers increase + `kubectl rollout restart`. Now 1/1, prod health endpoint fully green.

---

## Feature Status

### Apple Watch
```
████████░░ 85% 🟡 bundle ID + API URL fixed, needs portal registration + device test
```
- ✅ WatchConnectivity integration
- ✅ Bundle ID corrected (`app.murror.mobile.dev.watchkitapp`)
- ✅ `WKWatchOnly` flag removed
- ✅ API URL pointing to `dev.api.ambercare.app`
- ⬜ Register new bundle ID in Apple Developer portal (manual — Astro)
- ⬜ Deploy to Watch Ultra 2 via Xcode
- ⬜ E2E sign-in test on Watch

### Voice Summary Pipeline
```
████████░░ 85% 🟡 shipped TTS + ambient, needs E2E test on device
```
- ✅ Daily voice summary generation (ElevenLabs TTS)
- ✅ Ambient music pipeline (21-emotion prompts, S3 caching)
- ✅ `VOICE_INSIGHTS` feature flag in place
- ✅ Bedtime Story UI redesign (night sky, stars, aurora, teleprompter)
- ✅ Voice card moved to Journal section
- ⬜ E2E test on TestFlight 151

### Milestone Voice ("Your Story So Far")
```
███████░░░ 75% 🟡 pipeline built, extended to 60/90/180/365 day tiers
```
- ✅ Celery task `generate_milestone_voice.py`
- ✅ Tier-specific prompts: Spark / Pattern / Mirror / Transformation
- ✅ Extended tiers: Evolution (60d) / Season (90d) / Compass (180d) / Odyssey (365d)
- ✅ Streak butterfly tap → voice screen
- ⬜ Milestone push notification copy finalized
- ⬜ E2E test full milestone flow

### Connection Insight (RabbitMQ Pipeline)
```
█████████░ 95% 🟢 production stable after QA sweep
```
- ✅ ACK-first pattern (prevents poison-message loops)
- ✅ SSL fix for CloudAMQP port 5671
- ✅ StreamLostError handling in all consumers
- ✅ `_retry_counts` orphaned call removed
- ✅ Reflection card dispatch after insight complete

### Emotional Memory Vault (EMV)
```
████████░░ 80% 🟡 all 4 components shipped, backfill blocked on pgbouncer fix
```
- ✅ Phase 1 — Memory Librarian DB schema + pgvector + Python service + retrieve API
- ✅ Phase 2 — memory injection into deep chat + journal analysis (crisis re-check + 500ms timeout)
- ✅ Phase 3 — Memory Room mobile screen, components, deep link, i18n, Home shortcut
- ✅ Phase 4 — hourly callback-pings scheduler + endpoint + Settings toggle
- ✅ Live write path wired to 4 consumers (deep-chat, journal, individual-reflection, relationship-reflection)
- 🚨 **Blocker: `DuplicatePreparedStatementError` on pgbouncer transaction-mode** — PR #382 + #384 shipped but insufficient; PR #385 (`prepared_statement_name_func`) in flight
- ⬜ Backfill for Astro's user (a2ed32da-…) — unblocks end-to-end Memory Room verification
- ⬜ Emotion extraction Bucket 2 (voice/bedtime journal types)

### Streaks
```
████████░░ 85% 🟡 core logic shipped, consecutive day counting stable
```
- ✅ Streak aggregate + repository
- ✅ Consecutive day counting (O(1) date set lookup)
- ✅ `hasWrappedUpWithThreshold` idempotency check
- ✅ Timezone-safe date handling (Luxon startOf('day') in use-case layer)
- ⬜ Statsig feature flag for production rollout

### RevenueCat Subscription
```
█████████░ 95% 🟢 webhook auth now working in production
```
- ✅ Webhook endpoint implemented
- ✅ Config key fixed (`revenueCat.webhookSecret`)
- ✅ Signature verification active in prod
- ⬜ Statsig `STATSIG_SERVER_SECRET_KEY` set in prod K8s secret

### Bedtime Story
```
██████████ 100% ✅ shipped
```
- ✅ Night sky + aurora environment
- ✅ Branded 4-pointed twinkling stars (audio-reactive)
- ✅ Teleprompter with Reanimated fade transitions
- ✅ Ambient piano music (fade in/out)
- ✅ Auto-play from card tap
- ✅ Moved Voice Card to Journal section

### Prompt Injection / Security
```
██████████ 100% ✅ shipped
```
- ✅ Journal input isolated into `user` role
- ✅ System role for task instructions
- ✅ Em dash removal from all edge function prompts
- ✅ murror-api QA sweep security hardening (#276)

---

## Infrastructure Status

| Component | Status | Notes |
|---|---|---|
| DOKS cluster (do-sfo2-murror-cluster) | ✅ Healthy | 4 namespaces |
| nsp-staging-murror (murror-api) | ✅ 1/1 Running | CI deploys via GHA end-to-end |
| nsp-staging-murror-ai (viasr-api + worker + beat) | ✅ 3/3 Running | Celery Beat pod added for EMV Phase 4 |
| nsp-prod-murror (murror-api + insights-portal) | ✅ 2/2 Running | |
| nsp-prod-murror-ai (viasr-api + celery-worker) | ✅ 2/2 Running | |
| DB connection pooling (all envs) | 🟡 In flight | PR #385 (viasr-api) ships the real pgbouncer prepared-statement fix |
| RabbitMQ (CloudAMQP, SSL 5671) | ✅ Stable | All consumers healthy |
| Redis (in-cluster) | ⚠️ Cross-env leak | All envs share one `celery` queue — separate PR needed |
| Sentry | ✅ Muted dev/staging | Re-enable before prod launch per `project_sentry_alerts_muted.md` |
| Prod Health Check (every 6h) | ✅ Automated | PR #314 shipped 2026-04-17 |

---

## Pending / Next Up

| Task | Owner | Blocked on |
|---|---|---|
| PR #385 (viasr-api) — `prepared_statement_name_func` permanent fix | muse agent | CI green + admin-merge + backfill verification |
| Backfill `memory_index` for Astro's user (a2ed32da-…) | Claude | PR #385 deploy |
| Patch `ONESIGNAL_APP_ID` into staging + alpha + prod K8s secrets | Astro | Manual (separate OneSignal app per env) |
| ElevenLabs API key rotation | Astro | Dashboard access |
| `memory_backfill.run_chunk` SQL bug (mixed `:named` + `$1..$4` params) | Claude | Separate PR after #385 |
| Cross-env Celery leak (staging/dev/prod share `celery` queue) | Claude | Separate PR (add env-scoped queue names) |
| Register `app.murror.mobile.dev.watchkitapp` in Apple Developer portal | Astro | Manual step |
| Deploy Watch to Watch Ultra 2 + E2E sign-in test | Astro | Portal registration first |
| Set `STATSIG_SERVER_SECRET_KEY` in prod murror-api K8s secret | Astro | |
| E2E voice test on TestFlight | Astro | Device |
| Finish murror-api CUID/UUID type-mismatches (Bugs 2+3+Bonus on `fix/cuid-uuid-type-mismatches`) | Claude | Session resume |
| Diary list stuck "generating" state bug | Claude | Session resume |
| Fix fine-tuning script (SFTTrainer API changed in trl v0.29) | Astro | PC access |
| RevoPush CLI login | Astro | |
| `staging → production` promotion (both repos) | Astro | Explicit authorization |
