---
name: DOKS infrastructure state
description: Kubernetes cluster — in-cluster Redis + RabbitMQ, InfluxDB disabled, DB latency baselines, perf PR — updated 2026-03-28
type: project
---

## Cluster

- **Context**: `do-sfo2-murror-cluster`
- **kubectl path**: `/opt/homebrew/bin/kubectl`

## DB Connection Config

Both dev and prod use port **6543** + `?pgbouncer=true` (PgBouncer transaction mode). Direct port 5432 exhausts the 3-connection session-mode limit. `EAGER_DB_CONNECTION=true` set on both environments (2026-03-28).

## In-Cluster Redis (deployed 2026-03-28)

Bitnami Redis standalone, shared by all 4 namespaces. Replaced Upstash (~320ms → <20ms).

| Property | Value |
|----------|-------|
| Helm release | `murror-redis` in `nsp-prod-murror` |
| Service DNS | `murror-redis-master.nsp-prod-murror.svc.cluster.local:6379` |
| Auth | Password in K8s secret `murror-redis` (key: `redis-password`) |
| Persistence | 2Gi PVC, `do-block-storage-retain` |

## In-Cluster RabbitMQ (deployed 2026-03-28)

Custom RabbitMQ in dedicated `rabbitmq` namespace. Replaced CloudAMQP (~550ms → <1ms). Also removes the 100-connection hard limit from CloudAMQP.

| Property | Value |
|----------|-------|
| Namespace | `rabbitmq` |
| Service DNS | `murror-rabbitmq.rabbitmq.svc.cluster.local:5672` |
| User | `murror` |
| Vhosts | `murror-dev` (Alpha 2), `murror-prod` (Production) |
| Persistence | 4Gi PVC |
| Management UI | port 15672 (not exposed externally) |

**Important:** Vhost permissions must be set manually after RabbitMQ pod restarts:
```bash
kubectl exec murror-rabbitmq-0 -n rabbitmq -- rabbitmqctl set_permissions -p murror-dev murror ".*" ".*" ".*"
kubectl exec murror-rabbitmq-0 -n rabbitmq -- rabbitmqctl set_permissions -p murror-prod murror ".*" ".*" ".*"
```

## InfluxDB — Disabled (2026-03-27)

`INFLUXDB_ENABLED=false` in `murror-api-config-map` for both dev and prod. InfluxDB was never deployed; the app was retrying writes against dead endpoints.

## Backend Performance PR #279 (merged 2026-03-28)

4 code fixes in `murror-api`:
1. **AuthGuard cache**: `getUser(token)` result cached in-memory for 5 min (~400ms saved per request)
2. **Service role client**: created once in constructor instead of per call
3. **Redis health indicator**: reuses long-lived client instead of creating/destroying per check
4. **Perf interceptor**: removed `JSON.stringify(data)` on every response, uses `content-length` header

CI deployed to main but Alpha 2 auto-deploy didn't trigger (deploy step failed at "Create namespace"). Code is running via the latest manual image deploy.

## DB Latency Baselines (after all optimizations, 2026-03-28)

| Service | Alpha 2 (us-west-2) | Prod (Singapore) |
|---------|---------------------|------------------|
| Database | ~120ms | ~950ms |
| Redis | ~7ms (in-cluster) | ~12ms (in-cluster) |
| RabbitMQ | ~180ms (health check) | ~940ms (health check) |
| viasrApi | ~15ms | ~19ms |
| **Total health check** | **~260ms** | ~1000ms |

## viasr-api Workers (2026-03-26)

Prod: `--workers 4` (was 2). Dev uses default.

## GitHub Actions — murror-backend repo (Edge Functions)

Updated 2026-03-30 for Alpha 2. CI pipeline fully working.

**Variables:** `SUPABASE_PROJECT_ID=ormdzpvhrzvietlsvmro`, `SUPABASE_URL`, `API_LOAD_BALANCER_URL`
**Secrets:** `SUPABASE_ACCESS_TOKEN` (repo-level), `SUPABASE_DB_PASSWORD`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`

## GitHub Actions — murror-api repo (NestJS API)

Updated 2026-03-31. CI deploy pipeline fully working.

**Fixes applied:**
- PR #291: `nsp-alpha-murror` → `nsp-dev-murror` in deploy.yml, deploy-matrix.yml, deploy-cloudflare-worker.yml
- PR #291: `alpha.murror.api.ambercare.app` → `dev.api.murror.app`
- `KUBE_CONFIG` secret (alpha env): updated to static token kubeconfig (was using doctl exec plugin which isn't available in GitHub runners)
- Deploy workflow `23824035510` succeeded 2026-03-31 — all jobs pass including build + deploy to nsp-dev-murror

## Celery Worker Configuration (updated 2026-04-05)

- Dev and prod workers share the same Redis instance (`murror-redis-master.nsp-prod-murror`)
- Dev uses `celery-alpha` queue, prod uses `celery` queue (fixed `e6a7b37` — prevents cross-env task stealing)
- `accept_content: ["json", "pickle"]` must be set explicitly on `celery_app.conf` (fixed `dd8571c`)
- Worker deployment is separate from main API: `murror-ai-worker` must be restarted independently

## Known Issues

- **UserSyncSchedulerService** — logs "Daily user sync schedule was removed. Re-registering..." every 30s on both dev and prod. BullMQ cron job keeps disappearing. Non-blocking but noisy.
- **Prod DB in Singapore** — ~950ms per query from SFO2. Needs Supabase project migration to US region.
- **RabbitMQ health check latency** — health indicator creates a new AMQP connection each check (~180ms). Same pattern as the Redis issue (Fix 1D). Not yet fixed.
- **Stale RabbitMQ consumers** — NestJS creates duplicate consumers per response queue (server + internal). Manual `rabbitmqctl close_all_connections` needed after deploys. `x-single-active-consumer` incompatible with existing quorum queues. Affects notifications queue too (50% loss).
- **viasr-api DB search_path** — Set to `murror_api`, not `public`. Any raw SQL to `public.*` tables (e.g., `conversation_wrapup`) must use explicit `public.` prefix.
- **Legacy reads in secondary features** — Streaks, Daily Mood, Articles, Connection Insights, Watch Summary still read from `public.*` via legacyPrisma. New entries won't appear there. Needs gradual migration to PrismaService.
- **Direct DB writes (viasr-api)** — Completion + Dive Deeper results written directly to `murror_api.*` via raw asyncpg (statement_cache_size=0 for PgBouncer). Also creates diary_entries row for completions.
- **Celery beat** — Enabled on worker with `-B` flag. Runs daily voice summary at 3:30 UTC (8:30 PM PDT).
- **OneSignal push** — APNS production mode only. Works on TestFlight, not simulator. New API key `murror-api-alpha2` deployed. Old stale subscriptions must be purged periodically.
- **Supabase Storage** — Voice summaries use REST API upload (not S3-compatible API which has credential issues). Bucket: `voice-summaries` (public).
