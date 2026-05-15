---
name: Callback Pings queue routing bug — emotional_memory queue unconsumed
description: Callback Pings tasks route to hardcoded "emotional_memory" queue; workers only listen on env-scoped "celery-{env}" queue after PR #402. Flag=true + broken routing = silent void.
type: project
originSessionId: 8f1c5851-d71b-4095-b91e-a4809d2f710c
---
Discovered 2026-04-24 while verifying the Emotional Memory Vault pre-launch enablement (Astro asked to flip `CALLBACK_PINGS_ENABLED=true` on staging).

**The bug:**
- `app/celery_app/utils.py:131-135` — beat schedule routes `callback_ping_scheduler` to `queue="emotional_memory"` (hardcoded, not env-scoped)
- `app/tasks/emotional_memory/send_callback_ping.py:368` — task bound to `queue="emotional_memory"`
- `app/tasks/emotional_memory/callback_ping_scheduler.py:104` + `:190` — task bound to `queue="emotional_memory"` and apply_async uses same
- `app/tasks/memory_backfill/backfill.py:388` — same hardcoded queue

**Why it's broken:** after PR #402 env-scoped the default queue, worker only subscribes to `celery-staging` (no `-Q` flag → default-queue-only). Callback Ping tasks go to `emotional_memory` queue that has ZERO consumers → pile up in Redis forever.

**Why it was invisible:** `CALLBACK_PINGS_ENABLED=false` kill switch meant the scheduler task returned early on whatever worker did consume `emotional_memory` back when that was the default queue. Nobody saw a callback ping send end-to-end in any deployed env.

**Why:** Callback Pings was designed BEFORE the cross-env celery contamination incident (PR #402). The queue-rename happened after and missed the hardcoded `emotional_memory` references.

**How to apply:** Before re-enabling Callback Pings:
1. Env-scope the queue name: `emotional-memory-staging` / `emotional-memory-prod` (mirrors PR #402 pattern)
2. Update all 4 task definitions + beat schedule options
3. Update worker `-Q` subscription to include the scoped emotional-memory queue
4. Smoke test with whitelist accounts — verify ping arrives in OneSignal + opens app
5. PHQ-9 daily notifier is UNAFFECTED — its tasks have no queue kwarg, route to default `celery-{env}` queue correctly

**Related bugs surfaced same day:**
- `phq9_score=0` hardcoded in `app/tasks/notification/load_and_schedule_notifications.py:226` — PHQ notifier never reads real PHQ data
- `_normalize_schedule_for_level` at `app/tasks/notification/load_and_schedule_notifications.py:301` forces 7x/day cadence regardless of level — anti-caring default, will cause users to mute notifications
