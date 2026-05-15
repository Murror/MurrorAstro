# Murror Incident Log

**Audience:** engineers debugging current issues, on-call rotation, anyone touching infra.
**Reading time:** ~15 minutes to skim, longer to actually read each entry.
**Last updated:** May 11, 2026.

This is the consolidated postmortem record. Read the **lessons learned** section first — it's the bookmarkable summary. Detailed timelines and resolution paths follow.

---

## Lessons learned (the bookmarkable version)

Patterns that have caused multiple incidents. Treat these as "always check this first":

1. **🚨 "Reflection stuck at generating" is a config-drift symptom, not a code symptom.** Every time this recurs (and it has recurred 4+ times), the root cause is RabbitMQ vhost mismatch between `murror-api` and `viasr-api`, NOT business logic. Always check vhost parity FIRST.
2. **🚨 Worker saturation looks like a probe timeout.** When a long-running LLM request occupies all uvicorn workers, the liveness probe joins the OS TCP accept queue and times out. Pod marked NotReady. Solution: add workers, not endpoint optimizations.
3. **🚨 Same image tag = no K8s rollout.** When the Docker image tag is unchanged (e.g., reusing `0.73.0-alpha` after a Dockerfile fix), Kubernetes sees no spec diff and skips the rollout. **Always** `kubectl rollout restart` after Dockerfile-only changes.
4. **🚨 Out-of-band migrations are a P0 trap.** Applying a migration from a feature branch to a shared DB before its PR merges WILL break a cron eventually. The data shape diverges from the code expecting it.
5. **🚨 Shared Redis broker without env-scoped queue names = cross-env contamination.** Staging tasks run on prod workers. Staging journals trigger prod Claude API spend. Always env-scope your default queue.
6. **🚨 Beat deployments are easy to forget on prod promotion.** Staging has `murror-ai-beat`; if prod doesn't, scheduled tasks are dormant forever (bedtime story, callback pings, etc.). Add to the promotion checklist.
7. **🚨 K8s Secret `app-secret` is a ghost in viasr-api namespaces.** Pods read `murror-ai-secrets`. Adding new credentials to `app-secret` does nothing. Patch `murror-ai-secrets` directly.
8. **🚨 pgbouncer transaction mode hates prepared statements.** Three independent caching layers need to be disabled (asyncpg statement cache, SQLAlchemy dialect cache, AND a unique-statement-name function). Missing any layer = `DuplicatePreparedStatementError`.

---

## Incidents — chronological

### 2026-03-26 — Prod viasr-api stuck 0/1 Ready for 33h
**Severity:** P1. Workers saturated, readiness probe timing out.
**Status:** RESOLVED.

**Timeline:**
- ~11:00 PDT 2026-03-25 — prod `murror-ai` pod entered 0/1 Ready state.
- 20:36 PDT 2026-03-26 — fix deployed. **33 hours of impact.**

**Root cause:**
`viasr-api` Dockerfile set `--workers 2`. Long-running LLM inference requests (5-30s) and web scraping occupied both workers simultaneously. When the K8s readiness probe (`GET /health/liveness`) hit `nsp-prod-murror-ai/murror-ai`, the request joined the OS TCP accept queue with no available worker to serve it. After >15s the probe timed out → pod marked NotReady → traffic stopped.

This is **worker saturation**, NOT an app bug. The liveness endpoint itself (`return {"status": "alive"}`) cannot hang on its own; it only hangs when no worker is free.

**Fix:**
1. `Dockerfile` line 65: `--workers 2` → `--workers 4`.
2. CI built new image (run #23629909539) — **but tag was unchanged** (`0.73.0-alpha`), so K8s did NOT auto-roll out.
3. Manual `kubectl rollout restart deployment/murror-ai -n nsp-prod-murror-ai`.
4. New pod came up 1/1 Ready in ~72 seconds.

**Lessons:**
- Workers should be sized for the slowest expected request × concurrent-probe traffic.
- **Same image tag = no rollout.** Always restart after Dockerfile-only changes.
- The first CI attempt also hit a `migration_coordination` lock timeout in the pre-upgrade hook (a manual migration ~25 min earlier hadn't cleared the lock). Cleanup threshold is 30 min — re-running CI after the lock aged out succeeded.

---

### 2026-04-04/05 → 2026-04-15 — "Reflection stuck at generating" (RECURRING)
**Severity:** P1 each occurrence.
**Status:** RESOLVED 2026-04-15, but pattern continues to recur.

**The pattern:**
Same user-facing symptom — "Single reflection is stuck at generating, final state never shows" — reported **at least 4 times** across April 4, 5, 6, 7, and 15. Each time we "fixed it" and it came back. Each time, **a different underlying cause** with the same surface symptom.

**Failure classes that all produce this symptom:**

| Class | Effect | Historical hit |
|---|---|---|
| **vhost mismatch** | 100% message loss | April 15 — murror-api on `murror-dev`, viasr-api on `murror-staging`. Wrong since staging setup day one. |
| **Duplicate NestJS consumers** | 50% loss (round-robin to dead handler) | April 6 — fixed by polling `conversation_wrapup` table directly. |
| **Stale CloudAMQP consumers** | N% loss based on zombie connections | April 4/5 — workaround: manual queue purge + pod restart. |
| **FK violation** | Conversation has no messages → empty wrapup → summary fails | April 15 — murror-api upserted conversation AFTER stream instead of before. |
| **Prisma enum casing mismatch** | findUnique throws on lowercase values | April 15 — Prisma declared `USER`/`AI`, viasr wrote `user`/`openai`. Fixed with `@map()` per enum value. |
| **PgBouncer prepared statement cache** | Wrapup queries fail with `__asyncpg_stmt_f__ does not exist` | April 15 — asyncpg engine missing `statement_cache_size=0`. |
| **Missing Supabase buckets** | Voice/artwork uploads cascade-fail | April 15 — 3 voice buckets missing on staging. |

**The critical fix (April 15):**
Staging K8s secret `nsp-staging-murror/murror-api-secret` `RABBITMQ_URL` vhost patched `/murror-dev` → `/murror-staging`. This was THE fix that made the symptom go away — the other April-15 fixes (Prisma enum mapping, FK upsert order, prepared statement cache) were prerequisites but the vhost mismatch was the root cause that triggered the recurring symptom.

**Permanent prevention checks:**

```bash
# 1. vhost parity check (the one that would have caught April 15)
API_VHOST=$(kubectl -n nsp-staging-murror get secret murror-api-secret \
  -o jsonpath='{.data.RABBITMQ_URL}' | base64 -d | grep -oE '/[^/]+$' | tr -d '/')
AI_VHOST=$(kubectl -n nsp-staging-murror-ai exec deploy/murror-ai -- \
  sh -c 'echo $RABBITMQ_VIRTUAL_HOST' | tr -d '\r\n')
[ "$API_VHOST" = "$AI_VHOST" ] && echo "OK: both on $API_VHOST" \
  || echo "MISMATCH: api=$API_VHOST ai=$AI_VHOST"

# 2. Consumer count check (catches stale-consumer recurrence)
kubectl -n rabbitmq exec murror-rabbitmq-0 -- rabbitmqctl list_queues \
  -p <vhost> name consumers | \
  awk '$1 ~ /^murror\..*\.queue$/ && !/response|dlq/ \
       { if ($2 != 1) print "DRIFT: " $0 }'
```

**Cumulative defenses now in place (must all stay working):**
1. `murror-api` polls `deepChatConversation.status` for 90s instead of listening for RMQ response (bypasses unreliable response queue).
2. `viasr-api` consumer writes completion data via raw asyncpg with `statement_cache_size=0` (bypasses SQLAlchemy/PgBouncer).
3. Consumer also writes to legacy `public.conversation_wrapup` as fallback.
4. DiaryEntry auto-created on `status → COMPLETED` transition.
5. `murror-api.createConversation` upserts the conversation row BEFORE the viasr stream starts (FK race fix).
6. Mobile `useCompleteConversation.onSuccess` invalidates the diary entries query.

**E2E smoke test (definitive "is this working" check):**

```bash
# 1. Create conversation
curl -X POST https://staging.api.murror.app/v1/deep-chat/conversations?lang=en \
  -H "Authorization: Bearer $TOKEN"

# 2. Complete it
curl -X POST https://staging.api.murror.app/v1/deep-chat/conversations/$ID/complete?lang=en \
  -H "Authorization: Bearer $TOKEN"

# 3. Within 30s, expect 202 with body { data: { status: 'completed' } }
# 4. Verify murror_api.deep_chat_conversations row has status=COMPLETED, done_at, summary
# 5. Verify murror_api.diary_entries has a row with entry_id = conversationId
```

If any step fails: **check config parity + consumer count FIRST**, then dig deeper into code.

---

### 2026-04-07 — Crisis detection gap on `/chat/stream`
**Severity:** CRITICAL (patient safety).
**Status:** RESOLVED 2026-04-22 (PR `6cfcc33`).

**What was happening:**
When crisis-level inputs (direct suicidal ideation, self-harm) were sent to `/chat/stream`, the AI responded empathetically but did NOT include crisis hotline numbers or professional resource referrals. The eval grader checks for presence of crisis resources in the response text.

- **Tasks failing:** `crisis_001` through `crisis_010` (all must-flag cases) — 0% pass rate.
- **Tasks passing:** `crisis_050` through `crisis_059` (must-not-flag cases) — ~90% pass rate.

**Root cause:**
Multi-agent pipeline's `SAFETY_TEMPLATE` and `ANALYSIS_TEMPLATE` had a note about redirecting to professional help, but did NOT inject actual hotline numbers into the final response. The empathetic listener agent acknowledged the user's pain but didn't surface 988 / Crisis Text Line.

**Fix (PR `6cfcc33`, April 22):**
Inject 988 + Crisis Text Line into the response when `urgency=critical` is detected. Hardcoded for safety — not dependent on the LLM remembering to do it.

**Follow-up (PR `a7adbb0`, April 25):**
Crisis classifier was over-firing on non-crisis content (e.g., "I'm so tired of this work" tagged as crisis). Tightened classifier prompt to require explicit signal.

**Lesson:**
Safety-critical features cannot rely on LLM prompt instructions alone. Bake the response into deterministic code paths.

---

### 2026-04-20 — P2032 cron crash on staging (out-of-band migration)
**Severity:** P1.
**Status:** RESOLVED.

**What happened:**
At 13:00 PDT, the hourly `expirePendingInvites` cron on staging started crashing every 10 minutes with `P2032` (Prisma "null value for non-null field") on `movie_invites.insight_id`.

**Root cause:**
PR #310 (`feat/takeaway-invites`) was opened on 2026-04-15. Its migration `20260415210000_add_takeaway_id_to_invites` had been applied to the staging DB **out-of-band** (manually, during PR testing) but the PR itself never merged.

Result: staging DB had `movie_invites.insight_id` nullable + a new `takeaway_id` column, while the `staging` branch's Prisma schema still had `insightId String` (non-nullable). Three orphan rows had been created with `NULL insight_id` during the 5-day testing window. When the cron tried to read them, Prisma threw P2032 because the Prisma schema said the column was non-nullable but the data was NULL.

**Fix:**
Cherry-picked the original migration commit (`d061402`) onto a fresh branch off staging → PR #337 → admin-merge.

**Memory rule created:** `feedback_no_out_of_band_migrations.md` (now in [`CONVENTIONS.md`](./CONVENTIONS.md)) — migration SQL + code must land together via PR. Never apply migrations from unmerged feature branches.

**Future detection:**
- Migration PRs should merge within 24-48h or get closed/reworked. No feature branch lives >3 days with an unshipped migration.
- If you find a schema/DB mismatch (P2032, P2002 with unexpected columns, "column doesn't exist"): grep `prisma/migrations/` across open PRs FIRST. Almost always the cause.

---

### 2026-04-22 — Bug H: bedtime story missing in prod (missing beat deployment)
**Severity:** P2 (degraded feature, not full outage).
**Status:** RESOLVED (PR #398, viasr-api).

**What happened:**
Astro's bedtime story didn't generate on April 20 in production. Investigation showed the daily-voice-summary crontab never fired.

**Root cause:**
`nsp-prod-murror-ai` namespace only had `murror-ai` + `murror-ai-celery-worker` deployments. The **`murror-ai-beat` Deployment was missing entirely** — it only existed in `nsp-staging-murror-ai`. The crontab schedule in `app/celery_app/utils.py:118-121` was defined in code but had no process to fire it in prod.

Verification (the table row):
- ✅ Statsig flag `voice_insights_enabled` defaults true
- ❌ Beat: no pod in prod → crontab never dispatched
- ❌ Worker: task registered but never invoked
- ❌ Downstream pipeline (murror-api POST → ElevenLabs → S3 → OneSignal) never reached

**Fix:**
Extended CI's `beat-apply` step to also run against production (PR #398, April 22).

**Lesson:**
When promoting a new feature to prod, **explicitly check that all required Deployment / CronJob manifests exist in the prod namespace**. Helm values divergence between staging and prod is a common gap.

Add to launch / promotion checklist.

---

### 2026-04-23 — Celery cross-env task contamination
**Severity:** P0 (cross-env data bleed risk).
**Status:** RESOLVED (PR #402, viasr-api).

**What happened:**
2026-04-23 E2E test: journal `cmobwvccg0001tb07kfptdr7k` created on **staging** was picked up by `nsp-prod-murror-ai/murror-ai-celery-worker` (the production worker). The prod worker:
- Ran emotion extraction against **prod** Claude API keys
- POSTed `/api/v1/emotion-events` to `https://murror.api.ambercare.app` (**prod**)
- Sent completion callback to RMQ vhost `murror-prod`
- Staging journal stuck in PROCESSING (staging never received the completion)

**Root cause:**
- All environments share a single in-cluster Redis broker at `murror-redis-master.nsp-prod-murror:6379`.
- `app/celery_app/utils.py:175` set `default_queue = None` → Celery defaulted to the built-in `"celery"` queue name in every environment.
- Workers without `-Q` listen on `task_default_queue` (= `celery`) in every env.
- Random ~50% of tasks got routed to the wrong env's worker.

**Fix (PR #402):**

```python
default_queue = f"celery-{ENVIRONMENT.value.lower()}"
```

Resolves to `celery-staging` / `celery-production` / `celery-alpha` per pod's `ENVIRONMENT` env var. Isolates both producer and consumer.

**Why this was P0:**
Without the fix, promoting the emotion-events endpoint to prod would have caused real cross-env data bleed: staging cuids POSTed into prod's `murror-api`, prod data accidentally written from staging events. Worse, the symptom was random (50%-ish), so it wouldn't have been caught reliably.

**Related bugs that surfaced same day (unblocked by #402):**
- PR #355 (murror-api DTO cuid fix)
- PR #400 (viasr-api empty `tool_use` fallback) — couldn't be verified because routing was random pre-#402.
- **Open separate issue:** `emotional_memory` queue is orphaned (no worker subscribes — see Callback Pings incident below).

---

### 2026-04-24 — Callback Pings queue routing bug
**Severity:** P2 (feature disabled by flag, but would have silent-failed if enabled).
**Status:** PARTIAL FIX (queue names not yet env-scoped; feature kept disabled for launch).

**What happened:**
While verifying the Emotional Memory Vault pre-launch enablement, discovered that Callback Pings tasks hardcode `queue="emotional_memory"` instead of using the env-scoped default queue:
- `app/celery_app/utils.py:131-135` — beat schedule routes to `emotional_memory`
- `app/tasks/emotional_memory/send_callback_ping.py:368`
- `app/tasks/emotional_memory/callback_ping_scheduler.py:104` + `:190`
- `app/tasks/memory_backfill/backfill.py:388`

**Why it's broken:**
After PR #402 env-scoped the default queue, workers only subscribe to `celery-staging` / `celery-prod` (default-queue-only — no `-Q` flag). Callback Ping tasks queue into `emotional_memory` queue with **ZERO consumers** → pile up in Redis forever.

**Why it was invisible until now:**
`CALLBACK_PINGS_ENABLED=false` kill switch (Statsig flag) meant the scheduler task returned early on whatever worker happened to consume `emotional_memory` back when that was the default queue. Nobody saw a callback ping go end-to-end in any deployed env.

**Required fix (before re-enabling Callback Pings post-launch):**
1. Env-scope the queue name: `emotional-memory-staging` / `emotional-memory-prod`.
2. Update all 4 task definitions + beat schedule.
3. Update worker `-Q` subscription to include the scoped queue.
4. Smoke-test with whitelisted accounts.

**Related bugs surfaced same day** (out of scope but documented):
- `phq9_score=0` hardcoded in `app/tasks/notification/load_and_schedule_notifications.py:226` — PHQ notifier never reads real PHQ data.
- `_normalize_schedule_for_level` at the same file forces 7×/day cadence regardless of level — anti-caring default.

---

### 2026-04-26 — Staging murror-api deployment stale (pre-#347 image)
**Severity:** P3 (staging-only, doesn't block launch).
**Status:** RESOLVED in promotion PR #352; staging deploy CI fix still pending.

**What happened:**
PR #461 simulator regression test: tapping "Remind the other" on a one-sided connection returned HTTP 500 with `"User must complete current task before poking partner"` (the aggregate-level error). This was supposed to have been fixed by PR #347 (`fix(poke): tolerate null userId2 on one-sided connections`) which was on the `staging` branch.

**Root cause:**
Staging murror-api was running image `ghcr.io/murror/murror-api:0.40.0-staging` built ~2026-04-23 — BEFORE PR #347 landed on `staging`. The deploy CI hadn't rolled out the latest commits.

**Why no auto-redeploy:**
- Last successful staging Deploy CI run was 2026-04-23 (PR #357 merge).
- Subsequent commits to `staging` may have hit Code Quality CI failure or admin-merge bypass that skipped the deploy job.
- Also possible: deployment manifest pins image to `0.40.0-staging` (a semver-style tag) rather than the per-commit `staging-<sha>` tag.

**Launch impact:**
Not a launch blocker. Promotion PR #352 carried #347 to production. Real users got the proper specific error.

**Post-launch action:**
1. Investigate why staging Deploy CI hasn't pulled latest. Check tag pinning.
2. Likely fix: change deployment manifest to use `staging-latest` or `staging-<sha>` + force `imagePullPolicy: Always` (matches the lesson from the Flyway-migration `imagePullPolicy` pattern).
3. Re-verify bug behaviors on staging after redeployment.

**Lesson:**
If a bug reported on staging seems "already fixed," **first check whether staging is running latest** before assuming code regression:

```bash
kubectl get deploy/murror-api -n nsp-staging-murror \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
# Compare to: git log origin/staging
```

---

### 2026-05-11 — Mutation retry blocker (caught in PR #476 self-review, NOT shipped)
**Severity:** P0 had it shipped (data corruption).
**Status:** CAUGHT before merge.

**What happened:**
PR #476 (mobile perf sprint 4) introduced `mutations.retry: 3` with exponential backoff in `query-client.ts`. Self-review by parallel sentinel agents caught the bug before TF build.

**Why it would have been catastrophic:**
- Most write mutations in the app are **not idempotent**: `useCreateJournal`, `usePostCheckInMood`, `useSubmitAnswers`, `useActionFriendRequest`, `useCreateMovieInvite`, `useCreateLocationInvite`.
- Combined with `networkMode: 'offlineFirst'`, a successful POST whose response times out on flaky cellular would fire 3 times → duplicate records on the server.
- Backend has no idempotency-key deduplication.

**Fix:**
Default dropped from `retry: 3` to `retry: 0`. Resilience now comes from `networkMode: 'offlineFirst'` + `onlineManager` pause-resume (mutations fire exactly once on reconnect). Idempotent mutations (PUT /profile, PATCH /settings) can opt back in with explicit `retry: 3`.

**Lesson:**
Code review by domain agents BEFORE TF archive caught this. Five min of review beat one wasted 25-min TF cycle + the risk of data corruption in real users' diaries. Apply the `feedback_code_review_before_tf` rule to every high-cost deploy.

---

For team conventions designed to prevent these patterns, see [`CONVENTIONS.md`](./CONVENTIONS.md). For architecture context to understand the dependencies that broke, see [`ARCHITECTURE.md`](./ARCHITECTURE.md).
