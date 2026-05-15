---
name: Celery cross-env task contamination
description: Shared Redis broker + default queue name "celery" meant any worker could pick up any env's tasks; staging journals ran on prod Claude keys and prod URLs. Fixed 2026-04-23 via PR #402 (per-env default_queue).
type: project
originSessionId: 8f1c5851-d71b-4095-b91e-a4809d2f710c
---
## Discovery

2026-04-23 E2E test: journal `cmobwvccg0001tb07kfptdr7k` created on staging was picked up by `nsp-prod-murror-ai/murror-ai-celery-worker`, which:
- Ran emotion extraction against prod Claude keys
- POSTed `/api/v1/emotion-events` to `https://murror.api.ambercare.app` (prod) instead of `https://staging.api.murror.app`
- Sent completion callback to RMQ vhost `murror-prod` instead of `murror-staging`
- Staging journal stuck in PROCESSING (staging never received the completion)

## Root cause

- All environments share `murror-redis-master.nsp-prod-murror:6379` (in-cluster Redis, same password, DB 0)
- `app/celery_app/utils.py:175` set `default_queue = None`, so Celery used the built-in `"celery"` queue in every env
- Workers started without `-Q` listen on `task_default_queue` = `celery` in every env
- Any worker could steal any other env's tasks — random 50%-ish routing

## Fix (PR #402)

```python
default_queue = f"celery-{ENVIRONMENT.value.lower()}"
```

Resolves to `celery-staging` / `celery-production` / `celery-dev` / `celery-alpha` per pod's `ENVIRONMENT` env var. Isolates producer (publish queue) and consumer (worker queue) without a helm/args change.

**Why:** Without isolation, promoting to prod would add the emotion-events endpoint and prod worker would start successfully POSTing staging cuids back into prod murror-api — real cross-env data bleed.

**How to apply:** Don't share Redis brokers across environments without also setting a per-env default queue. The emotion-pipeline fixes (#355 DTO, #400 empty tool_use) were real but couldn't be verified until #402 ships because routing was random.

## Related

- PR #355 (murror-api DTO cuid fix)
- PR #400 (viasr-api empty tool_use fallback)
- PR #402 (this fix)
- `emotional_memory` explicit queue is orphaned (no worker subscribes) — separate pre-existing issue, not fixed here
