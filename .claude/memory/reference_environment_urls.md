---
name: Environment URLs and health endpoints
description: Canonical URLs, Supabase projects (Alpha 2 migrated to us-west-2 on 2026-03-28), DOKS namespaces, backing services
type: reference
---

## Architecture — Everything runs on DOKS

All environments run on DOKS (DigitalOcean Kubernetes, `do-sfo2-murror-cluster`). The local PC is NOT used for serving traffic.

## Health Check Endpoints

Both environments use `/api/health` (not `/health` — that 404s).

```bash
# Alpha 2 (dev)
curl https://dev.api.murror.app/api/health

# Production
curl https://murror.api.ambercare.app/api/health
```

## Supabase Projects

| Environment | Project Ref | Region | Pooler Host |
|-------------|-------------|--------|-------------|
| **Alpha 2 (dev)** | `ormdzpvhrzvietlsvmro` | **us-west-2** (Oregon) | `aws-0-us-west-2.pooler.supabase.com:6543` |
| **Production** | `dcftszkbpamgeivhtuzl` | **ap-southeast-1** (Singapore) | `aws-0-ap-southeast-1.pooler.supabase.com:6543` |

- Alpha 2 was migrated from `zusfftodelhazjaswgby` (us-east-1) → `ormdzpvhrzvietlsvmro` (us-west-2) on 2026-03-28
- Prod DB still in Singapore — ~950ms latency from SFO2. Migration to US planned.

## Alpha 2 (Dev) — DOKS only

| Service | URL | K8s Namespace |
|---------|-----|---------------|
| murror-api | `https://dev.api.murror.app` | `nsp-dev-murror` |
| viasr-api | internal only | `nsp-dev-murror-ai` |

## Production — DOKS only

| Service | URL | K8s Namespace |
|---------|-----|---------------|
| murror-api | `https://murror.api.ambercare.app` | `nsp-prod-murror` |
| viasr-api | internal only | `nsp-prod-murror-ai` |

## Backing Services

| Service | Provider | Notes |
|---------|----------|-------|
| Database | Supabase (PgBouncer, port 6543) | Dev: us-west-2. Prod: Singapore (pending migration) |
| Redis | **In-cluster** (Bitnami) | Deployed 2026-03-28. `murror-redis-master.nsp-prod-murror.svc.cluster.local:6379` |
| RabbitMQ | **In-cluster** (custom) | Deployed 2026-03-28. `murror-rabbitmq.rabbitmq.svc.cluster.local:5672` |
| InfluxDB | **Disabled** (2026-03-27) | `INFLUXDB_ENABLED=false` in both dev and prod configmaps |

Old external services (Upstash Redis, CloudAMQP RabbitMQ) are no longer used but accounts may still exist.

## Mobile App Env Files

| Build | Env File | API URL | Supabase Project |
|-------|----------|---------|-----------------|
| Development / Alpha 2 | `.env.development` | `dev.api.murror.app` | `ormdzpvhrzvietlsvmro` (us-west-2) |
| Alpha 2 (explicit) | `.env.alpha2` | `dev.api.murror.app` | `ormdzpvhrzvietlsvmro` (us-west-2) |
| Production | `.env.production` | `murror.api.ambercare.app` | `dcftszkbpamgeivhtuzl` (Singapore) |
| Staging | `.env.staging` | `beta.murror.api.ambercare.app` | `ekstwjykgzggsgrpdelz` |

Mobile env files updated 2026-03-28. TestFlight build 156 uploaded with all fixes.

**Warning:** `dev.api.ambercare.app` returns HTTP 530 (Cloudflare origin DNS error) — it's dead. Only `dev.api.murror.app` works for dev/Alpha 2.

## Uptime Monitoring

Alpha 2 monitor URL updated 2026-03-29 from dead `alpha.murror.api.ambercare.app` to `dev.api.murror.app/api/health/live`. Previous 9-day "ongoing incident" was a false alarm from the dead domain.

## DNS

- `*.murror.app` → Squarespace → A `159.89.222.109` (DOKS LB)
- `*.ambercare.app` → Cloudflare (some subdomains dead, e.g., `dev.api.ambercare.app` returns 530)

## DOKS Namespaces

| Namespace | Purpose |
|-----------|---------|
| `nsp-dev-murror` | Alpha 2 murror-api |
| `nsp-dev-murror-ai` | Alpha 2 viasr-api + worker |
| `nsp-prod-murror` | Prod murror-api + insights-portal |
| `nsp-prod-murror-ai` | Prod viasr-api + celery |
| `rabbitmq` | Shared in-cluster RabbitMQ |

kubectl path: `/opt/homebrew/bin/kubectl`
