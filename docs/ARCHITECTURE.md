# Murror System Architecture

**Audience:** engineers who need to understand how the pieces fit together.
**Reading time:** ~10 minutes.
**Last verified:** May 11, 2026.

---

## 1. The 30-second view

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  iOS / Android  │ ───▶ │   murror-api     │ ───▶ │   viasr-api     │
│  React Native   │      │   (NestJS)       │      │  (Python/FastAPI│
│   MurrorMobile  │      │                  │      │   + Celery)     │
└────────┬────────┘      └────────┬─────────┘      └────────┬────────┘
         │                        │                          │
         │                        │                          │
         ▼                        ▼                          ▼
   ┌──────────┐            ┌────────────┐            ┌────────────┐
   │ Supabase │            │  Postgres  │            │  RabbitMQ  │
   │  (auth + │◀───────────│  (Prisma + │            │  (Celery   │
   │  legacy  │            │ pgbouncer) │◀───────────│   broker)  │
   │  PostgREST)           └────────────┘            └────────────┘
   └──────────┘
                                  ▲                          │
                                  │                          ▼
                                  │                   ┌────────────┐
                                  └───────────────────│   Redis    │
                                                      │  (Celery   │
                                                      │   results) │
                                                      └────────────┘
```

- **Mobile app** talks to BOTH Supabase (auth + small set of legacy endpoints) AND `murror-api` (the primary NestJS API).
- **`murror-api`** is the primary backend — handles diary, takeaways, invites, memory index, profile, subscription. Talks to Postgres via Prisma + pgbouncer.
- **`viasr-api`** is the AI service — handles deep-chat streaming, emotion extraction, memory librarian, crisis detection, song suggestions. Triggered by `murror-api` via service-to-service HTTPS for synchronous flows (like chat streaming) and by Celery tasks for async work.
- **Both backends share the same Postgres database** but read/write different schemas (`murror_api.*` vs `public.*` legacy).
- **All services run on DigitalOcean Kubernetes (DOKS)** in dedicated namespaces per environment.

---

## 2. Mobile-side architecture

### State management — two-layer split

| Layer | Library | Owns |
|---|---|---|
| **Server state** | TanStack Query v5 | All API responses. Cached in memory + persisted to AsyncStorage with `lz-string` UTF-16 compression. Default `staleTime: 5 min`, `gcTime: 24h`. Persisted cache survives app restart for 7 days. |
| **Local UI state** | MobX (`makeAutoObservable`) | UI state that crosses component boundaries but doesn't need persistence: bottom toast visibility, mood popup, sound playback, deep-link queue, journal submission state. Plain singletons in `src/store/` — no provider needed. |
| **Component state** | `useState` | Anything strictly local to one component. |

Anti-pattern: don't reach for MobX to cache a server response (TanStack Query owns that). Don't reach for `useState` for state another component needs to observe (use the existing MobX stores).

### API client topology

`MurrorMobile/src/apis/client/base-api-client.ts` is the central HTTP client. Every method takes an optional `isNewBE?: boolean` 4th argument:

| `isNewBE` | Routes to | Examples |
|---|---|---|
| `true` | `Config.BASE_API_URL` (murror-api NestJS) | New endpoints, all memory-vault endpoints, deep-chat |
| `false` / omitted | `Config.SUPABASE_URL` (Supabase PostgREST) | Legacy reads still living on Edge Functions / PostgREST |

If you add an endpoint and route it to the wrong base, you get a silent 404. The migration trajectory is "everything new lives on murror-api" — see `MemoryApiClient` for a clean "always new BE" example.

### Authentication

- Supabase Auth issues JWTs. Tokens cached in memory by `BaseApiClient` with a 60-second pre-expiry refresh buffer.
- **In-flight request deduplication:** parallel API calls on screen mount share one `getSession()` call rather than each hitting Supabase independently. Pre-PR-#475 every parallel request fired its own `getSession()` against US-region Supabase = 150-400ms RTT × N parallel requests.
- `supabase.auth.onAuthStateChange` drives socket reconnection + widget bridge sync (moved off the per-request hot path).

### Navigation

- `@react-navigation/stack` v7 + `@react-navigation/bottom-tabs` v7.
- Custom `lazyScreen()` wrapper at `src/common/lazy-screen.tsx` defers `require()` until first navigation. NOT React's `lazy()` + `Suspense`.
- Deep links: `linking.ts` config + Branch.io (`react-native-branch`) for cross-app deep-link infra.
- `react-native-screens` v4 with `enableFreeze(true)` + `enableScreens(true)` — inactive stack screens stop re-rendering and scheduling work.

### Performance posture (post-PR-#475/#476)

- Cold-start time tracked via `JS_MODULE_LOAD_TS` constant in `navigation-controller.tsx`, logged to Sentry as `coldStartMs` with `anchor: js_module_load`.
- Device tier (low/mid/high) classified at module load via `DeviceInfo.getDeviceId()` against an explicit allowlist (iPhone 6s through iPhone 11/SE2).
- Network resilience via `onlineManager` wired to `NetInfo`: mutations pause when offline, resume on reconnect. Mutation default `retry: 0` to prevent duplicate POSTs (most mutations are not idempotent).

---

## 3. Backend architecture (`murror-api` — NestJS)

### Layout

Domain-Driven Design folder structure under `src/`:

- `src/<bounded-context>/domain/` — entities, value objects, domain services
- `src/<bounded-context>/application/` — use cases (one class per use case)
- `src/<bounded-context>/infrastructure/` — Prisma repositories, external service clients
- `src/<bounded-context>/presentation/` — controllers (the HTTP boundary)

Bounded contexts include: `deep-chat`, `connections`, `journals`, `memory`, `subscriptions`, etc.

### Database

- **Postgres** via Prisma. Two schemas: `murror_api` (new, owned by this service) and `public` (legacy, shared with Edge Functions).
- **pgbouncer** in transaction mode on port **6543** (NOT 5432 — see [`runbooks/db-migrations.md`](./runbooks/db-migrations.md)).
- Prisma connects via Supabase's connection pooler at `aws-0-{region}.pooler.supabase.com:6543` with `?pgbouncer=true`.
- **Migration runtime URL is different from app runtime URL:** `MURROR_DATABASE_URL_EXTERNAL` (port 5432, session mode) for Prisma migrate; `MURROR_DATABASE_URL` (port 6543, transaction mode) for app runtime. See [`runbooks/db-migrations.md`](./runbooks/db-migrations.md).

### Async work + messaging

- **In-cluster RabbitMQ** at `murror-rabbitmq.rabbitmq.svc.cluster.local:5672` (replaced CloudAMQP March 2026, ~550ms → <1ms latency cut).
- **Vhosts per environment:** `murror-dev` (Alpha 2), `murror-staging`, `murror-prod`. **VHOST PARITY between murror-api and viasr-api is the most common cause of "reflection stuck at generating"** — see incident log entry 2026-04-15.
- **In-cluster Redis** at `murror-redis-master.nsp-prod-murror.svc.cluster.local:6379` (Bitnami standalone, shared by all 4 namespaces). Replaced Upstash (~320ms → <20ms).

### Backend consolidation status

As of 2026-03-31: **100% of mobile API endpoints (38/38) migrated** from Supabase Edge Functions to NestJS murror-api. Zero `/functions/v1/` calls remain in mobile API clients. Some legacy READ paths still go through Supabase PostgREST — see the `BaseApiClient` `isNewBE` flag.

---

## 4. AI service architecture (`viasr-api` — Python)

### Layout

- **FastAPI** for the HTTP layer
- **Celery** for background work (memory backfill, hourly callback pings, daily voice summary)
- **Anthropic Claude SDK** for LLM calls (currently Sonnet 4.6 for `model_complex_task`)
- **Domain-Driven layout** mirrors murror-api: `app/services/<service>/{domain,application,infrastructure,presentation}`

### Key services

| Service | Path | What it does |
|---|---|---|
| Deep chat stream | `app/services/deep_chat_stream/` | Streams chat tokens from Claude back to mobile via SSE |
| Memory librarian | `app/services/memory/` | Retrieves emotional memory chunks for callback injection |
| Emotion extraction | `app/services/emotion_extraction/` | Canonical 25-emotion taxonomy enforcement |
| Crisis detection | `app/services/crisis_detection/` | Regex pre-filter (PR `eb60697`) + LLM classifier; injects 988 + Crisis Text Line on `urgency=critical` |
| Voice summary | `app/tasks/voice/generate_daily_summary.py` | Daily bedtime story via Celery beat + ElevenLabs TTS |

### Database access

- Uses **asyncpg** via SQLAlchemy's async dialect against the same Postgres as murror-api.
- **Three-layer prepared statement fix** required for pgbouncer transaction mode:
  1. `connect_args={"statement_cache_size": 0}` (asyncpg)
  2. `prepared_statement_cache_size=0` on the engine (SQLAlchemy dialect)
  3. `prepared_statement_name_func=lambda: f"__asyncpg_{uuid4().hex}__"` (unique names per execute)

  Missing any layer = `DuplicatePreparedStatementError`. See [`runbooks/db-migrations.md`](./runbooks/db-migrations.md) and the asyncpg-pgbouncer memory file for the full saga (PRs #382→#384→#385 across April).

### Celery topology

- **Broker:** Redis (shared across envs, but queue names env-scoped per PR #402 to prevent cross-env contamination)
- **Result backend:** Redis
- **Worker:** `murror-ai-celery-worker` deployment, listens on `celery-{env}` queue
- **Beat:** `murror-ai-beat` deployment, runs scheduled tasks (hourly callback pings, daily voice summary at 8:30pm PDT)

⚠️ **Beat must be deployed in every env** that needs scheduled tasks. April 22 incident: prod had no `murror-ai-beat` pod, so daily bedtime story never fired in prod. See `INCIDENT_LOG.md` Bug H.

⚠️ **Default queue name MUST be env-scoped.** April 23 incident: shared Redis broker + default queue name `celery` meant any env's worker could pick up any other env's tasks, causing staging journals to run on prod Claude keys. Fixed in PR #402 (`celery-{env}`).

### K8s Secret layout (gotcha!)

In each `nsp-*-murror-ai` namespace, **two K8s Secrets exist** but only one is read:

| Secret name | Source | Consumed by |
|---|---|---|
| `app-secret` | CI `create-k8s-secret` step (recreated every deploy) | **NOTHING — ghost.** None of the deployments reference it. Dead code. |
| `murror-ai-secrets` | Helm install + ad-hoc `kubectl patch` | `murror-ai`, `murror-ai-worker`, `murror-ai-beat` |

When adding a new credential env var to viasr-api: patch `murror-ai-secrets` (mirror the Spotify step in PR #395), NOT `app-secret`. Also see [`runbooks/ci-kubeconfig.md`](./runbooks/ci-kubeconfig.md).

---

## 5. Environment topology

### Environments

| Env | Mobile config | murror-api | viasr-api | Supabase | Used for |
|---|---|---|---|---|---|
| **Local dev** | `MurrorMobileDevelopment` scheme + `.env.development` | `https://dev.api.murror.app` | internal | Alpha 2 (us-west-2) | Local development |
| **Alpha 2** | (test accounts) | `https://dev.api.murror.app` | internal | Alpha 2 (us-west-2) | Internal testing, unblocks staging-first flows |
| **Staging** | `MurrorMobileStaging` scheme + `.env.staging` | `https://staging.api.murror.app` | internal | staging Supabase project | TestFlight builds, paywall sandbox |
| **Production** | `MurrorMobile` scheme + `.env.production` | `https://murror.api.ambercare.app` | internal | Production (Singapore — migration to US planned) | Real users |

### DOKS namespaces

| Env | murror-api ns | viasr-api ns |
|---|---|---|
| Alpha 2 | `nsp-dev-murror` | `nsp-dev-murror-ai` |
| Staging | `nsp-staging-murror` | `nsp-staging-murror-ai` |
| Production | `nsp-prod-murror` | `nsp-prod-murror-ai` |

Cluster context: `do-sfo2-murror-cluster` (DigitalOcean SFO2 region — note the prod DB is in Singapore which adds ~950ms cross-region latency; SEA region migration pending).

---

## 6. Cross-cutting concerns

### Secrets

- Mobile `.env.*` files are **tracked in git** — they contain public anon keys and feature flag values, NOT secrets.
- Real secrets injected at build time via GitHub Actions secrets.
- Backend secrets in K8s Secrets (`murror-api-secret`, `murror-ai-secrets`).
- App Store Connect API key + Apple Developer cert: see [`runbooks/app-store-connect.md`](./runbooks/app-store-connect.md).

### Feature flags

- **Statsig** (`@statsig/react-native-bindings` v3) for both mobile and backend.
- Mobile flags live in `MurrorMobile/src/constants/feature-flags.ts`.
- `featureFlagSnapshot` provides a synchronous read for module-level / non-React code.

### Observability

- **Sentry** for crash reporting + performance traces (mobile, murror-api, viasr-api all integrated).
- **Mixpanel** for product analytics (mobile only).
- **Notion Engineering Log** (page ID `3273af4aaa9280b89efacd68d67cd3df`) — health check digests + incident timelines posted there.
- **Cold-start telemetry** (mobile only, since PR #476): `coldStartMs` event with `anchor: js_module_load` tag, viewable in Sentry under the `app` source.

### Crisis safety

- viasr-api `/chat/stream` injects 988 + Crisis Text Line resources when `urgency=critical` is detected (PR `6cfcc33`, April 22).
- Crisis classifier prompt tightened April 25 (PR `a7adbb0`) to reduce false positives on non-crisis content.

---

## 7. Things that are easy to break

This isn't fear-mongering — these are real things that have broken in the past month and have known fixes documented:

| If you... | Then... |
|---|---|
| Apply a Prisma migration before its PR merges | Cron crashes on column-mismatch within hours. See [`INCIDENT_LOG.md`](./INCIDENT_LOG.md) 2026-04-20 (P2032). |
| Squash-merge a back-merge PR (production → staging) | Downstream promotion PR stays CONFLICTING forever. Use merge-commit. |
| Share Redis broker without env-scoped queue names | Cross-env task contamination — staging tasks run on prod workers. PR #402. |
| Change murror-api / viasr-api RABBITMQ_URL vhost on only one side | "Reflection stuck at generating" — 100% silent message loss. |
| Use `console.log` in mobile app code | CI fails the build. Use `devLog` from `dev-logger.ts`. |
| Default-retry a non-idempotent POST in TanStack Query | Duplicate journal/invite records on flaky cellular. Default is `retry: 0`. |
| Deploy murror-api to one env without the other | Promotion drift — see `feedback_always_deploy_both_envs`. |
| Forget `imagePullPolicy: Always` on the Flyway migration Job | Stale image runs old SQL three deploys in a row. |
| Add a new viasr-api credential to `app-secret` | Pods don't read `app-secret`. Patch `murror-ai-secrets` instead. |

---

For day-1 onboarding, see [`HANDOFF.md`](./HANDOFF.md). For team process rules, see [`CONVENTIONS.md`](./CONVENTIONS.md). For specific past incidents and their resolutions, see [`INCIDENT_LOG.md`](./INCIDENT_LOG.md).
