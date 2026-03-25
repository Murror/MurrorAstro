# Murror Project Progress

> Last updated: 2026-03-23 (TestFlight 148 + deploy strategy + navigation cleanup)
> Notion hub: [Murror Team Updates](https://www.notion.so/327dfff0223981e0a37dd0764b156465)
> Engineering log: [Daily Updates](https://www.notion.so/326dfff02239812a9078d2c28f90f44e)

## Progress at a Glance

```
COMPLETED ✅
──────────────────────────────────────────────────────────────
PRD & Personas         ████████████████████ 100%  ✅ Done
Task 2c — Reflection   ████████████████████ 100%  ✅ TestFlight 130
Article HTTP Bridge    ████████████████████ 100%  ✅ E2E verified
Performance (AI)       ████████████████████ 100%  ✅ 7 optimizations
Performance (Mobile)   ████████████████████ 100%  ✅ PR #426 + webp + memo
AI Empathy             ████████████████████ 100%  ✅ Prompts + persona
Notification Invest.   ████████████████████ 100%  ✅ Root cause found
Notification Audit     ████████████████████ 100%  ✅ 11/13 fixed, 2 deferred
Bug 5 (Articles)       ████████████████████ 100%  ✅ Pipeline replaced
Carousel UX            ████████████████████ 100%  ✅ Flat peek + zodiac
Claude Integration     ████████████████████ 100%  ✅ Primary LLM provider
Artwork Library        ████████████████████ 100%  ✅ AI image gen eliminated
Settings Overhaul      ████████████████████ 100%  ✅ Birthday + pills + redo
Emotion Journey        ████████████████████ 100%  ✅ PRs #880-884 merged
Task 2d — TTV UX       ████████████████████ 100%  ✅ Deployed to alpha
Journal Timeout Fix    ████████████████████ 100%  ✅ AbortSignal.timeout
Leadership Dashboard   ████████████████████ 100%  ✅ Glassmorphic redesign

Prog. Streak Insights  ████████████████████ 100%  ✅ Milestones + extended fields
Takeaway Insight UX    ████████████████████ 100%  ✅ Extended fields + generating UX
Chat Speed Optimization ████████████████████ 100%  ✅ 4.5x faster (10s→2.2s)
Chat Fix               ████████████████████ 100%  ✅ Production chat working
Infra Stability        ████████████████████ 100%  ✅ CloudAMQP + Upstash + DOKS + Supabase DB
Supabase US Migration  ████████████████████ 100%  ✅ Both Alpha 2 + Prod on DOKS + Supabase

NEARLY DONE 🟡
──────────────────────────────────────────────────────────────
Bedtime Story          ████████████████████░  98%  🟡 Full redesign: night sky + sparkles + ambient music + teleprompter. Moved to Journal section. Sentinel QA 43/43 PASS. Needs: Statsig flag + commit + TestFlight
EIM System             ███████████████████░░  95%  🟡 Phase 4 code done, push + E2E
Connection Review      ███████████████████░░  95%  🟡 10/13 E2E steps pass
Apple Watch App        ███████████████░░░░░░  75%  🟡 Phase 1 MVP built, needs Watch deploy + E2E
Design System          ██████████████████░░░  90%  🟡 More Figma pages?
Observability          ██████████████████░░░  90%  🟡 Sentry DSNs + merge PRs

IN PROGRESS / BLOCKED 🔴
──────────────────────────────────────────────────────────────
AI Emotion Project     █████████████░░░░░░░░  65%  🟡 Unblocked — emotion_events on K8s, extraction live
Security Audit Fixes   ████░░░░░░░░░░░░░░░░░  20%  🟡 Prompt injection (2C) + validation fixes shipped
QA Sweep               ████████████████░░░░░  80%  🟡 6 High remaining
Task 2a — SMS          ████████████████░░░░░  80%  🔴 Twilio + DB
Run on Simulator       ████████████░░░░░░░░░  60%  🔴 Alpha URLs
UX Guardian Fixes      ██████░░░░░░░░░░░░░░░  30%  🟡 P0 fixed, 4P1+7P2

NEW — LOCAL PC INFRASTRUCTURE 🆕 (Priority Order)
──────────────────────────────────────────────────────────────
Alpha 2 Local (PC)     ███████████████████░░  95%  ✅ LIVE! All services on PC via systemd. Edge Functions updated. DOKS warm standby. URLs: dev.api.ambercare.app + ai.api.ambercare.app
Local AI Inference     ██████████░░░░░░░░░░░  50%  🟡 Ollama installed + GPU working. Models: llama3.1:8b + nomic-embed-text. Next: wire into viasr-api waterfall
Emotion Model Training ░░░░░░░░░░░░░░░░░░░░░   0%  ⬜ #3. QLoRA fine-tune Llama 3.1 8B for Proprietary Emotion AI
Prod Safe Migration    ░░░░░░░░░░░░░░░░░░░░░   0%  ⬜ #4. Shadow mode → active → full offload. Only after Alpha 2 stable 4+ weeks

NOT STARTED ⬜
──────────────────────────────────────────────────────────────
Task 2b — Family Plan  ░░░░░░░░░░░░░░░░░░░░░   0%  ⬜ Not started
```

**Overall: 28 of 32 tasks at 90%+ | 24 fully shipped**

## Task Summary

| Task | Progress | Status | Branch / PR | Notes |
|------|----------|--------|-------------|-------|
| PRD & Personas | 100% | ✅ Done | `main` | PRD, 5 personas, development rules |
| Design System | 90% | ✅ Mostly done | `ast-mu` | Typography, colors, buttons, fields, modals. May have more Figma pages |
| Run on Simulator (Task 1) | 60% | 🔴 Blocked | — | App runs locally, needs alpha API URLs |
| Performance (Mobile) | 100% | ✅ Shipped | PR #426 | Lazy screens, diary virtualization, .png→.webp, React.memo, FastImage caching |
| Performance (AI) | 100% | ✅ Shipped | viasr-api `main` | 7 optimizations. Server-side only, works with build 130 |
| AI Empathy | 100% | ✅ Shipped | viasr-api PR #319 | Prompt rewrites, persona injection, temp 1.3→0.9, safety nano→mini |
| Claude Integration | 100% | ✅ Shipped | viasr-api `develop` | Primary LLM. Fallback: Claude→OpenAI→Groq→Gemini. ~$1,250/mo at 1K users |
| Task 2a — SMS Reflections | 80% | 🔴 Blocked | `feature/sms-reflections` | Backend+web+mobile coded. Blocked on Twilio + DB migration |
| Task 2b — Family Plan | 0% | ⬜ Not started | — | |
| Task 2c — Connection Reflection | 100% | ✅ Shipped | PR #426, PRs #255–260 | TestFlight build 130. Full sender+receiver flow |
| Task 2d — Time-to-Value UX | 100% | ✅ Shipped | `feature/time-to-value-ux` | 4 features built + E2E tested. Deployed to alpha |
| Connection Review | 95% | 🟡 E2E 10/13 | `fix/connection-notifications` | 5 bugs fixed. Core sender+receiver flow verified. Relationship reflection has transient TCP reset |
| Emotion Journey | 100% | ✅ Shipped | PRs #880–884 merged | Emotion detection for journals + deep chats. Mobile on `fix/connection-notifications` |
| Carousel UX | 100% | ✅ Shipped | `feature/vinh-sprint-1` | Flat peek + zodiac + sparkle stars + tilt animation |
| Article HTTP Bridge | 100% | ✅ Shipped | viasr-api PR #318, MurrorMobile PR #429 | Replaced RabbitMQ pipeline. E2E verified (~56s) |
| Observability | 90% | 🟡 Merge PRs | `feature/observability-sentry` (5 repos) | Sentry, OTel, correlation IDs, health checks, 3 Grafana dashboards. Sentry live on alpha murror-api |
| Notification Investigation | 100% | ✅ Done | `fix/connection-notifications` | Root cause: AI latency (already fixed). OneSignal restored |
| Notification Audit | 100% | ✅ Done | — | 13 issues found, 11 fixed. 2 deferred (per-type control, panic SMS) |
| QA Sweep | 80% | 🟡 6 High left | — | All 6 Critical fixed. 6 High remaining |
| EIM System | 95% | 🟡 Phase 4 push | viasr-api, murror-api, MurrorMobile | Phases 1-3 shipped. Phase 4 code done (growth card, feedback). Needs push + E2E |
| Artwork Library | 100% | ✅ Shipped | viasr-api `develop`, murror-api `main` | Replaced ALL AI image gen with pre-gen library (~120 images, 15 themes) |
| Settings Overhaul | 100% | ✅ Shipped | `feature/vinh-sprint-1` | Birthday fix, brand pills, redo onboarding, avatar, AI tone, quiet hours, display name |
| Takeaway Insight UX | 100% | ✅ Shipped | MurrorMobile, murror-api, viasr-api | Unified insight cards, structured AI output, tappable detail screen. Extended fields (quote, selfInsight, otherInsight, etc.), generating state 5s hold, movie poster URL fix |
| Chat Speed Optimization | 100% | ✅ Shipped | viasr-api PRs #332-335 | 4.5x faster (13.8s→3.5s cold, 9.4s→1.6s warm). Removed inter-chat retrieval (6.3s), emotional snapshots (1.1s), spam detection, deferred emotion detection. Bundled prompts locally. Retry limit on connection insights (PR #337) |
| Chat Fix | 100% | ✅ Shipped | viasr-api + murror-api PR #270 | Production chat fully working. Fixed: ghcr PAT, OpenAI project ID, missing viasr-api ingress, OAUTH_GITHUB_TOKEN, current-draft/messages endpoint, Redis CERT_NONE, pika SSL |
| Journal Timeout Fix | 100% | ✅ Shipped | murror-api `main` | AbortSignal.timeout on all viasr-api fetch calls. Parallelized artwork+emotions |
| Leadership Dashboard | 100% | ✅ Shipped | murror-platform | Dark glassmorphic redesign, per-card loading, Murror branding |
| Security Audit Fixes | 20% | 🟡 In progress | murror-api `main`, murror-backend `main`, viasr-api `main` | Prompt injection fixes (2C finding): murror-api validation/race conditions, murror-backend edge function hardening, viasr-api top_p fix + takeaway prompt hardening. Remaining: 5H+7M+7L findings |
| Progressive Streak Insights | 100% | ✅ Shipped | viasr-api PR #336 | Spark (3d) → Pattern (7d) → Mirror (14d) → Transformation (30d). Milestone endpoint + extended takeaway fields. Merged to develop |
| Bedtime Story | 98% | 🟡 Commit + flag | viasr-api PR #334, murror-api PRs #271-274, MurrorMobile `feature/apple-watch` | Voice Insights: Full redesign 2026-03-24. Night sky + branded sparkles + audio-reactive stars + ambient piano music + CustomModalBounce + teleprompter with smooth fades. Card moved from Moments to Care to Journal section (Home + Diary). Ambient music pipeline built (ElevenLabs Sound Generation, 21 emotions, 3 cached variations each). Sentinel QA: 43 PASS, 0 FAIL. Remaining: enable Statsig `VOICE_INSIGHTS_ENABLED`, commit, Cortex `ambient_url` migration, TestFlight 149. Next phase: "Your Story So Far" milestone voice experiences replacing text wrap-ups |
| AI Emotion Project | 65% | 🟡 In progress | `develop` (viasr-api), murror-api `main` | Taxonomy module (35 emotions, 12 triggers, 10 targets), extraction pipeline live. emotion_events moved to K8s Postgres (bypasses Supabase migration blocker). Storage bridge added. Next: E2E validation, fine-tuning dataset |
| Apple Watch App | 75% | 🟡 Deploy needed | `feature/apple-watch` | Phase 1 MVP: mood check-in (3 moods), presence signals, connections screen, micro-prompts. Direct Supabase auth (bypasses WatchConnectivity). Build 138/139. Next: deploy to Watch, test sign-in + emotion grid |
| Supabase US Migration | 100% | ✅ Shipped | murror-api + viasr-api | COMPLETE. Both Alpha 2 + Production on DOKS + Supabase. MURROR_DATABASE_URL points to Supabase (port 6543) on both envs. vn NodePort dependency eliminated. Data migrated (user_articles 1,755 rows). vn cluster retired — zero active dependencies |
| Infrastructure Stability Migration | 100% | ✅ Shipped | K8s secrets (all clusters) | Phase 1: RabbitMQ → CloudAMQP. Phase 2: Redis → Upstash. Phase 3: Compute → DOKS (SFO2). Phase 4: Database → Supabase. All old VPS/sg3 dependencies eliminated. DOKS LB: `159.89.222.109`. Verified: both `dev.api.murror.app` + `murror.api.ambercare.app` all-green |
| **Alpha 2 Local (PC)** | 95% | ✅ LIVE | murror-api, viasr-api | **LIVE on PC (2026-03-22).** WSL2 Ubuntu, systemd services, Cloudflare Tunnel (4 connections, SJC). `dev.api.ambercare.app` (murror-api) + `ai.api.ambercare.app` (viasr-api). Local RabbitMQ + Redis (4ms!). DOKS warm standby at `dev.api.murror.app`. PC URLs wired into mobile app. [Notion](https://www.notion.so/32b3af4aaa9281b68019f2113b767102) |
| **Local AI Inference** | 0% | ⬜ #2 | viasr-api | Ollama on GPU. Offloads emotion extraction, keywords, embeddings from cloud APIs. ~$350-550/mo savings. Cloud APIs remain fallback |
| **Emotion Model Fine-Tuning** | 0% | ⬜ #3 | pc-training/ (new) | QLoRA fine-tune Llama 3.1 8B on emotion taxonomy data. Accelerates Proprietary Emotion AI Phase 3. Synthetic → public → real data pipeline. Target: 90%+ agreement with Claude |
| **Prod Safe Migration** | 0% | ⬜ #4 | viasr-api | Shadow mode → active → full offload. Only after Alpha 2 stable on PC 4+ weeks. Single config toggle rollback |

## Infrastructure Changes (March 7–20)

| Date | Change | Impact |
|------|--------|--------|
| Mar 7 | Environment setup + handover | Full local dev running on macOS |
| Mar 13 | Claude SDK edge functions | REVERTED — CI overwrote API keys. OpenAI restored |
| Mar 14 | viasr-api memory 1Gi→2.5Gi | Fixed OOMKilled crash loops (FastText model) |
| Mar 14 | RabbitMQ exchange type fix | Fixed murror-api startup crash |
| Mar 15 | Supabase staging deleted | Only alpha + production remain |
| Mar 15 | Production deploy (viasr-api + murror-api) | 14 viasr-api commits + ~70 murror-api commits to prod |
| Mar 16 | Claude API bugs fixed | temperature/top_p mutual exclusion, clamping |
| Mar 16 | AI service audit | Gemini disabled, OpenAI unified, Serper removed |
| Mar 17 | Cloudflare SSL fix | Full (Strict)→Full for ambercare.app. Production restored |
| Mar 17 | RabbitMQ readiness probe removed | Prevented total 503 outage pattern |
| Mar 17 | Cloudflare access to both domains | murror.app + ambercare.app |
| Mar 17 | master.murror.app dashboard | Strategy command center deployed to sg3 |
| Mar 17 | Sentry DSN deployed to alpha | murror-api error tracking live |
| Mar 18 | Production API 503 fix | Pod crashed on vn cluster. Fixed via `gh run rerun` |
| Mar 18 | VN cluster kubeconfig added | Direct kubectl access to production (14.225.210.108:6443) |
| Mar 18 | Supabase storage migration | 4,540 files (6.2 GB) copied to US East (Alpha 2). 237 ghost entries in public/avatars not a blocker |
| Mar 18 | K8s sg3 reverted to Alpha (old) | Build 139 engineer login unblocked (JWT mismatch fixed) |
| Mar 18 | .env.alpha2 created | Isolated env file for Alpha 2 builds — .env.development untouched |
| Mar 18 | Build 142 in TestFlight | First build targeting Alpha 2 (US East). Independent from Build 139 / Alpha (old) |
| Mar 19 | Alpha 2 backend launched | `dev.api.murror.app` live in `nsp-alpha2-murror` on sg3. All new dev work targets Alpha 2 |
| Mar 19 | emotion_events on K8s Postgres | Bypassed Supabase migration blocker. AI Emotion Project unblocked |
| Mar 19 | Security hardening (3 repos) | Prompt injection fixes (murror-api, murror-backend, viasr-api). top_p/temperature mutual exclusion removed |
| Mar 19 | Build 143 in TestFlight | Targets Alpha 2 backend (`dev.api.murror.app`). New team developer onboarding build |
| Mar 19 | Transfer package updated | STAFF_SETUP.md updated, k8s-kubeconfig.yaml added, claude-configs synced (79 memory files) |
| Mar 19 | sg3 RabbitMQ total failure (outage) | 3 VPS nodes dead (vps50/53/55) → Longhorn volumes faulted → Alpha + Alpha2 + Production all down simultaneously for 3+ hours |
| Mar 19 | sg3 RabbitMQ rebuilt from scratch | Force-deleted faulted PVCs (server-0,1,2), reformed fresh 3-node cluster, recreated `murror_dev` + `murror_prod` vhosts + users. Memory request reduced 2Gi→1500Mi |
| Mar 19 | Production RabbitMQ restored | `murror_prod` vhost + user recreated after sg3 rebuild. All 3 environments back online — `STATUS: success` confirmed |
| Mar 19 | Infrastructure stability plan created | CloudAMQP + Upstash migration plan documented. Eliminates VPS stateful service risk. Alpha2 confirmed NOT independent from sg3 (shared RabbitMQ + Redis) — will be fixed in Phase 1+2 |
| Mar 19 | RabbitMQ → CloudAMQP (Phase 1) | All 3 envs migrated. Alpha+Alpha2: Tough Tiger $19/mo. Production: Tough Tiger $19/mo. 9 K8s secrets/configmaps updated. Self-hosted StatefulSet + 6Gi PVCs deleted |
| Mar 19 | Redis → Upstash (Phase 2) | All 3 envs migrated. Alpha+Alpha2: positive-heron-75877. Production: great-lacewing-77765. TLS enabled. 9 K8s secrets/configmaps updated. Self-hosted Deployment + 2Gi PVC deleted |
| Mar 19 | Alpha2 local Postgres deleted (Phase 3) | postgres-murror-api deployment + 5Gi PVC deleted. Alpha2 MURROR_DATABASE_URL confirmed pointing to Supabase US East |
| Mar 19 | viasr-api Celery SSL fix (PR #323) | Celery workers CrashLoopBackOff with `KeyError: '0'` after Upstash migration. Root cause: `redis_url` built `?ssl_cert_reqs=0` (integer string) — Kombu only accepts string constants. Fixed: `"CERT_NONE"`. Merged to develop, deployed to Alpha old + Alpha2 |
| Mar 19 | viasr-api config + Redis fixes (PR #324) | Two bugs: (1) `FeatureFlagConfig` missing `api_key` field → `AttributeError` in Statsig init. (2) `redis_sync.ConnectionPool(ssl=True)` → `AbstractConnection.__init__() unexpected keyword 'ssl'`. Fixed both: added `api_key: str = ""` field; switched TLS sync pool to `ConnectionPool.from_url()` |
| Mar 19 | Alpha2 Supabase `movie_invites` table created | `movie_invites` was missing from `public` schema (only existed in legacy `api` schema). Created in `public` with `connection_id UUID` to match actual `connections.id` UUID type in Alpha2 |
| Mar 19 | All 3 environments confirmed green | Alpha2 + Alpha old + Production: `rabbitmq ✅ redis ✅ database ✅ viasrApi ✅ errors: {}`. Monitoring dashboard lag (showing old sg3 endpoint) — actual API health confirmed via curl |
| Mar 22 | ghcr.io PAT expired — viasr-api DOWN 28h | Updated `ghcr-secret` in all 4 DOKS namespaces with new `astrovinh` PAT |
| Mar 22 | OpenAI 401 — wrong project ID | Production API key didn't match project `proj_zLn1tAImlYhGrWRc5C1ct6EV`. Shared Alpha 2 key for both envs |
| Mar 22 | Production viasr-api ingress created | `murror-ai.api.ambercare.app` → `nsp-prod-murror-ai`. Cloudflare DNS A record + cert-manager TLS |
| Mar 22 | Edge Function VIASR_API_URL fixed | Was sharing Alpha 2 URL → 403. Now `https://murror-ai.api.ambercare.app` for production |
| Mar 22 | Prompts bundled in Docker image (PR #335) | Eliminated GitHub dependency for prompt loading. 12 YAML files copied to `app/prompts/` |
| Mar 22 | current-draft/messages restored (PR #270) | Endpoint lost in DDD controller refactor. Restored in murror-api |
| Mar 22 | Pika SSL + heartbeat (PRs #325-326) | Added SSL for CloudAMQP TLS port 5671 + heartbeat 60s |
| Mar 22 | Redis CERT_NONE fix (PRs #327-328) | Fixed rate limiter redis-py / Celery incompatibility |
| Mar 22 | Chat speed 4.5x (PRs #332-333) | Removed inter-chat retrieval (6.3s), emotional snapshots (1.1s), spam detection, deferred emotion/feature detection |
| Mar 22 | Connection insight retry limit (PR #337) | Max 2 retries with exponential backoff. Prevents token exhaustion from infinite retry loops |
| Mar 22 | Startup probe added to prod viasr-api | 30s delay, 30 failures × 10s = 5min window. Prevents liveness probe from killing slow-starting pods |
| Mar 22 | Production freeze declared | No changes to production without Astro's explicit approval |
| Mar 19–20 | Production compute → DOKS | `murror.api.ambercare.app` migrated from vn VPS K3s to DigitalOcean Managed Kubernetes (SFO2, `do-sfo2-murror-cluster`). LB IP: `159.89.222.109`. DNS A record updated in Cloudflare. TLS cert auto-provisioned by cert-manager via HTTP-01 ACME |
| Mar 20 | Production MURROR_DATABASE_URL → Supabase | Eliminated vn NodePort (`14.225.210.108:30432`) dependency. Production Supabase: renamed `user_articles`→`user_article_jobs`, created `ArticleGenerationStatus` enum + new `user_articles` table (24-col pipeline model), migrated 1,755 rows from K8s pgvector. Updated `MURROR_DATABASE_URL` to Supabase transaction mode (port 6543) |
| Mar 20 | Alpha 2 schema fixes | Fixed `connection_insights.date_key does not exist` crash. Re-signed Prisma engine binary (macOS Sequoia ad-hoc signing hang). Applied missing columns via direct SQL. Port 5432→6543 (transaction mode) for pool exhaustion fix |
| Mar 20 | vn cluster retired | Zero active production dependencies after DB migration. vn VPS nodes can be decommissioned when canhnv is ready |
| Mar 20 | DOKS Prisma schema fix | Discovered critical issue: both DATABASE_URL and MURROR_DATABASE_URL pointed to Supabase without Prisma-managed tables. Created `murror_api` schema namespace in both Production (`dcftszkbpamgeivhtuzl`) and Alpha 2 (`zusfftodelhazjaswgby`) Supabase databases. Applied all 89 Prisma migrations (skipped 7 TimescaleDB + 1 index incompatible with Supabase). Updated K8s secrets with `?schema=murror_api`. Restarted pods on both envs |
| Mar 20 | 3 connection bugs fixed | (1) Relationship type popup error — `connections.legacy_connection_id` column missing, now exists in `murror_api` schema. (2) Zodiac insight 500 error — same root cause (missing schema tables). (3) Journal artwork null — `artwork-library` Storage bucket missing from production Supabase, needs bucket upload to fully fix |
| Mar 20 | Full DOKS infrastructure audit | All pods healthy, 0 restarts. Health endpoints OK. TLS certs valid. 7 warnings found: StuckTaskRecovery SQL type mismatch, prod AI missing OneSignal/Sentry keys, prod AI S3_ENDPOINT wrong, rate limiter disabled (Redis SSL), no metrics-server, Twilio placeholder on Alpha 2 |
| Mar 20 | DOKS fully independent | Zero sg3 dependencies confirmed. Production + Alpha 2 both running entirely on DOKS with Supabase + CloudAMQP + Upstash |
| Mar 20 | SQL type cast fix (murror-api PR #267) | Merged to main, deployed to DOKS. Fixes `StuckTaskCompletionRecoveryService` and `ConnectionInsightRepository` raw SQL errors caused by type mismatches |
| Mar 20 | Pika SSL + Redis SSL fix (viasr-api PR #325) | Merged to develop, deployed to DOKS. Fixes RabbitMQ connection failures (Pika SSL) and rate limiter bypass (Redis SSL) |
| Mar 20 | Artwork-library bucket → Production Supabase | Copied 119 files (15 emotion themes + manifest.json) from Alpha 2 to Production Supabase Storage. Journal artwork now works in prod |
| Mar 20 | Prod AI secrets/config updated | Added OneSignal API key + App ID, Sentry DSN, OpenAI Project ID, S3_ENDPOINT (external), MURROR_API_ENDPOINT to production viasr-api |
| Mar 20 | Metrics-server installed on DOKS | `kubectl top nodes/pods` now works. Resource monitoring enabled |
| Mar 20 | CloudAMQP connection crisis resolved | 100/100 connections saturated from sg3 (18), vn (31), DOKS (31). Fixed by scaling ALL deployments on sg3 and vn to 0 replicas. Connections dropped to 31/100 |
| Mar 20 | Old clusters deactivated | sg3 `nsp-alpha-murror` + `nsp-alpha-murror-ai` scaled to 0. vn `nsp-prod-murror` + `nsp-prod-murror-ai` + `murror-kol-prod-vn` scaled to 0. Only DOKS has running pods now |
| Mar 20 | Notification flood root cause | 40 notifications caused by Celery worker reconnecting to RabbitMQ and processing backlog queue. Push notifications lack idempotency guard — known risk |
| Mar 20 | imagePullPolicy → Always (all DOKS deployments) | Set to `Always` on ALL deployments (murror-api + viasr-api + celery workers) on DOKS. Previous `IfNotPresent` caused pods to use cached old images, preventing deployed fixes from taking effect |
| Mar 20 | OneSignal API key fix (prod viasr-api) | Prod viasr-api was using Alpha 2 OneSignal key. Corrected to production key matching murror-api |
| Mar 20 | Pre-populated Prisma tables | Synced 44 connections + 2,820 users from Supabase `public` schema into `murror_api` schema. Fixes insight generation failure (connection not found in empty Prisma DB) |
| Mar 20 | UptimeRobot Alpha old monitor note | Alpha old monitor will show DOWN — expected, as sg3 Alpha old is scaled to 0. Should be deleted/paused |
| Mar 20 | Edge Function secrets fixed (PRODUCTION) | All Supabase Edge Function secrets on `dcftszkbpamgeivhtuzl` updated to point to DOKS services (VIASR_API_URL, MURROR_EXTERNAL_API_URL, RABBITMQ_*, AI content filtering/translation URLs). Root cause of chat 500 errors — secrets pointed to dead sg3 |
| Mar 20 | Edge Function secrets fixed (ALPHA 2) | Same fix applied to `zusfftodelhazjaswgby`. All Edge Function-dependent features now functional on both envs |
| Mar 20 | viasr-api ingress created | `ai.api.murror.app` → DOKS viasr-api. DNS A record added in Squarespace. TLS cert auto-issued via cert-manager |
| Mar 20 | `.env.production` corrected | SUPABASE_URL was pointing to Alpha 2 project (`zusfftodelhazjaswgby`). Fixed to point to production project (`dcftszkbpamgeivhtuzl`) |
| Mar 20 | DOKS_SETUP_GUIDE.md created | Comprehensive onboarding doc for dev team — covers cluster, namespaces, Supabase mapping, database architecture, deployment process, DNS, retired clusters, health checks |
| Mar 20 | Supabase project mapping documented | Created `reference_supabase_project_mapping.md` in memory. Production = `dcftszkbpamgeivhtuzl`, Alpha 2 = `zusfftodelhazjaswgby`. All memory files corrected |
| Mar 20 | Chat working on production | Deep chat, journals, and all Edge Function-dependent features now functional after Edge Function secrets + env file fixes |
| Mar 20 | Chat parallelization (viasr-api PR #329) | Moved `adetect_app_feature_question` into `asyncio.gather` with main response + emotion detection. 3 Claude calls now run in parallel instead of sequential. Saves ~6s per chat message |
| Mar 20 | Profile cache not-found (viasr-api PR #330) | Cache "not found" sentinel in Redis for users without profiles. Prevents 3s SQLAlchemy connection on every chat message. TTL 5 minutes |
| Mar 20 | Missing viasr-api tables created | `emotional_snapshots`, `conversation_wrapup`, `emotional_memory`, `user_persona`, `user_profile` + missing columns (`lang`, `artwork_base64`, `deleted_at`, `keywords` as TEXT). Both Production and Alpha 2 |
| Mar 20 | Artwork fix (Edge Function) | `saveArtworkImage` in `protected-apis-deep-chat` now detects artwork-library URLs and uses them directly instead of base64 decoding. Deployed to both Supabase projects |
| Mar 20 | Dive Deeper fixed | `conversation_wrapup` table had missing `lang` column causing summary save to fail → proposals endpoint threw "No summary found". Fixed by adding columns + re-triggering summaries |
| Mar 20 | 1-worker viasr-api | Reduced uvicorn workers from 2 to 1 via command override. Fixes FastText OOM (`std::bad_alloc`). Applied to both Production and Alpha 2 |
| Mar 20 | Sentry cleanup | Resolved 99 viasr-api issues via API. All were from pre-migration or test calls |
| Mar 20 | RabbitMQ queue purge | Purged 6 stuck queues (`murror.ai.queue`, `murror.connections.queue`, `murror.llm-cost.queue`, 3 DLQs) |
| Mar 20 | sg3 + vn fully deactivated | All deployments on sg3 Alpha old (`nsp-alpha-murror`, `nsp-alpha-murror-ai`) and vn (all namespaces) scaled to 0. CloudAMQP connections dropped from 100/100 to 31/100 |
| Mar 20 | 3 mobile code fixes | `relationship-api-client.ts` hardcoded URL → `ai.api.murror.app`, `env-files/.env.development` BASE_API_URL → `dev.api.murror.app`, `WatchConfig.swift` fallback → `dev.api.murror.app` |
| Mar 20 | Chat speed optimization (3 PRs) | PR #329 parallel Claude calls, PR #330 cache not-found profile, PR #331 parallel DB lookups. Production chat: 30s → 15s (50% faster) |
| Mar 20 | Article generation verified | OpenAI embeddings + RAG + generation all functional on DOKS. Previous FAILED articles were from stale pod before restart |
| Mar 20 | Notifications verified working | Celery worker processing push_notification_tasks, OneSignal keys match, EN+VI delivery confirmed |
| Mar 20 | Connection insights verified | 5 COMPLETED insights from Mar 20, full RabbitMQ pipeline functional |
| Mar 20 | Orphan RabbitMQ queues deleted | murror.ai.queue, murror.connections.queue, murror.llm-cost.queue permanently deleted (no consumers, kept refilling) |
| Mar 20 | Ingress fix (ai.api.murror.app) | Ingress was stolen by Alpha 2 namespace, moved to production namespace |
| Mar 20 | Sentry cleanup (final) | 5 remaining issues resolved via API. Zero open issues |
| Mar 22 | Bedtime Story backend (viasr-api PR #334) | Voice Insights feature: new endpoint `/voice-summary`, Celery task for TTS generation, RabbitMQ message emission on completion. Merged to develop |
| Mar 22 | Bedtime Story API (murror-api PRs #271-273) | Voice insights Prisma migration, `users-with-insights` + `create-voice-summary` endpoints, `complete-takeaway` voice emission, TS type cast fix, voice summary crash fix (req.user.sub→req.user.id) |
| Mar 22 | Bedtime Story mobile (MurrorMobile) | Voice playback UI, daily summary screen, deep links. Built on `feature/apple-watch` branch |
| Mar 22 | Progressive Streak Insights (viasr-api PR #336) | Spark (3d) → Pattern (7d) → Mirror (14d) → Transformation (30d). Milestone endpoint + extended takeaway insight fields. Merged to develop |
| Mar 22 | Takeaway Insight extended fields | 6 new AI fields: quote, selfInsight, otherInsight, selfExpression, otherExpression, conclusion. Backend (murror-api + viasr-api) + mobile generating state 5s hold |
| Mar 22 | CI/CD: viasr-api auto-deploy to DOKS (PR #338) | Alpha deploys now go to `nsp-dev-murror-ai` on DOKS. Retired sg3 target. Auto-tag git after version generation |
| Mar 22 | CI/CD: murror-api build-and-push workflow | Manual builds from any branch. Auto-deploy to Alpha 2 (DOKS) |
| Mar 22 | Suggestion snake_case fix (murror-api PR #272) | Normalized `image_url`→`imageUrl`, `release_date`→`releaseDate` in suggestion responses |
| Mar 22 | App entrance + UX polish (MurrorMobile) | App entrance cleanup, play button UX, lotus splash screen, PC URLs wired, share sheet rainbow fix, streak detail crash fix |
| Mar 23 | Navigation cleanup (MurrorMobile) | Removed DailyVoiceSummaryScreen route, simplified app loading, systemBackgroundColor LaunchScreen, HomeScreen param on login |
| Mar 23 | Watch URL + splash fix (MurrorMobile) | WatchConfig fallback URL → `dev.api.murror.app`, 2s minimum splash delay, setRootScreen debounce |
| Mar 23 | Deploy strategy updated | PC primary + DOKS fallback for Alpha 2. Both targets kept in sync. Deploy to both for safety |
| Mar 23 | DOKS murror-api redeployed | `0.125.1-hotfix` image rebuilt from latest main (includes voice crash fix PR #274). CI build succeeded, deploy step failed (kubeconfig auth), manual `kubectl set image` applied |
| Mar 23 | TestFlight build 148 uploaded | v2.0.1, MurrorMobileDevelopment scheme, build 148. Includes all `feature/apple-watch` work (Watch + Bedtime Story + app polish) |
| Mar 24 | Bedtime Story full redesign (MurrorMobile) | Night sky with branded 4-pointed twinkling stars (cyan/purple/yellow/white), aurora color shifts, audio-reactive star pulsing. CustomModalBounce bottom sheet. Teleprompter with smooth Reanimated fades, word-count-proportional timing. Ambient piano music with fade in/out. Auto-play from card tap. White play buttons (consistent with app design). Pull-to-refresh on home (scroll-offset based, no spinner) |
| Mar 24 | Voice card moved to Journal section | Removed from Moments to Care carousel. Full-size card in Journal carousel (Home) + Diary screen. Night sky gradient + stars + script preview + play button. moment-to-care.tsx cleaned (934 to 382 lines) |
| Mar 24 | Ambient music pipeline (viasr-api) | New `ambient_music_service.py`: 21 emotion-to-music prompts for ElevenLabs Sound Generation. Caching: 3 variations per emotion (63 tracks max, ~$6 one-time). Integrated into `generate_daily_summary.py`. Storage path helper added. Handoff doc for Cortex (`ambient_url` column) |
| Mar 24 | ElevenLabs TTS test data | Real voice audio generated via ElevenLabs, uploaded to Supabase Storage. Test voice summary for astrovinh@gmail.com on Alpha 2 |
| Mar 24 | viasr-api PC fix | Redis password validation crash fixed (RedisConfig `password: str = ""` default, config.yaml hardcoded empty). PC service name: `murror-viasr` (systemd user, not system) |
| Mar 24 | Voice experience strategy documented | Daily bedtime + "Your Story So Far" milestone chapters (Spark/Pattern/Mirror/Transformation). Long-term: weekly, monthly, seasonal, growth narratives, connection stories. Video: Phase 1 enhanced animation ($0), Phase 2 Remotion, Phase 3 AI |

## Incidents Resolved

| Date | Incident | Duration | Root Cause |
|------|----------|----------|------------|
| Mar 13 | AI chat down (build 132) | Unknown | Sentry static import + deno.lock v5 + OpenAI quota |
| Mar 14 | AI chat down (OOM) | ~8 hours | FastText model OOM + RabbitMQ exchange mismatch |
| Mar 14 | RabbitMQ cascade | ~15 min | Nodes 0+1 restarted simultaneously |
| Mar 14 | murror-api rollout stuck | ~30 min | Missing Twilio secret in K8s |
| Mar 15 | Production deploy failure | ~1 hour | Prisma migration (friend_invitations missing) |
| Mar 15 | Claude SDK revert | Immediate | CI overwrote API keys with empty strings |
| Mar 17 | Production unreachable | Unknown | Cloudflare SSL "Full (Strict)" + self-signed cert |
| Mar 17 | Production 503 (RabbitMQ) | ~3 hours | RabbitMQ unreachable → readiness probe failed → all auth blocked |
| Mar 18 | Production 503 (pod crash) | ~1 hour | Pod crashed on vn cluster. Fixed via `gh run rerun` |
| Mar 19 | sg3 RabbitMQ total failure | 3+ hours | 3 VPS nodes dead (vps50/53/55) → Longhorn volumes faulted → all 3 envs (Alpha, Alpha2, Production) down simultaneously. Recovery: force-delete PVCs, fresh cluster, recreate vhosts+users |
| Mar 20 | DOKS missing Prisma schema | ~hours (silent) | DATABASE_URL + MURROR_DATABASE_URL both pointed to Supabase without Prisma-managed tables → connection bugs (relationship popup, zodiac 500, journal artwork null). Fixed: created `murror_api` schema, applied 89 migrations, updated K8s secrets |
| Mar 20 | CloudAMQP connection exhaustion | ~30 min | 100/100 connections saturated by ghost deployments on sg3 (18) + vn (31) + DOKS (31). Fixed: scaled all sg3 + vn deployments to 0 replicas → dropped to 31/100 |

## Active Branches (Unmerged)

| Branch | Repos | Contains | Next Step |
|--------|-------|----------|-----------|
| `feature/apple-watch` | MurrorMobile | Watch companion MVP + Bedtime Story voice UI + app entrance polish + PC URLs | E2E → merge (has accumulated multiple features) |
| `hotfix/voice-summary-userid` | murror-api | Voice endpoints + Prisma migration + voice summary crash fix | MERGED (PR #274) — local branch still checked out |
| `fix/ci-auto-tag` | viasr-api | Progressive streaks + extended takeaway + CI auto-deploy DOKS + auto-tag | PR → merge to develop |
| `feature/vinh-sprint-1` | MurrorMobile | Sprint 1: gradient bars, journal dismiss, article cards, settings overhaul, carousel, zodiac | E2E → merge |
| `fix/connection-notifications` | MurrorMobile, murror-api | CR review fixes, emotion journey, notification investigation | E2E → PR |
| `fix/chat-not-responding` | MurrorMobile | Mobile chat fixes (useFocusEffect, error overlay, TS fix) | Create PR |
| `feature/time-to-value-ux` | MurrorMobile | Time-to-Value UX (4 features) | Deployed to alpha, PR to main |
| `feature/observability-sentry` | All 5 services | Sentry, OTel, correlation IDs, health checks | Sentry projects → merge |
| `feature/sms-reflections` | murror-api, murror-platform, MurrorMobile | SMS reflections | Blocked on Twilio + DB |

## TestFlight Builds

| Build | Date | Branch | Key Changes |
|-------|------|--------|-------------|
| 130 | Mar 10 | `mu-121` | Connection reflection sender+receiver, performance |
| 137 | Mar 16 | `feature/vinh-sprint-1` | Album art fallback, zodiac fix, Read More sections, 7 bug fixes |
| 139 | Mar 17 | `feature/apple-watch` | Apple Watch companion, connection reflection code review fixes — **Alpha (old)** |
| 142 | Mar 18 | `.env.alpha2` | First build targeting **Alpha 2** (US East) for migration validation. Isolated from Build 139 |
| 143 | Mar 19 | `.env.alpha2` | Targets Alpha 2 backend (`dev.api.murror.app`). Security hardening + emotion extraction included — **Alpha 2** |
| 148 | Mar 23 | `feature/apple-watch` | v2.0.1. Bedtime Story voice UI, navigation cleanup, splash delay, Watch URL fix, app entrance polish, insight UX, streak milestones — **Alpha 2** |

## Cluster Access

| Context | Cluster | Endpoint | Namespace | Purpose |
|---------|---------|----------|-----------|---------|
| `do-sfo2-murror-cluster` | DOKS SFO2 | DigitalOcean managed | `nsp-dev-murror` | **Alpha 2 / Dev** — all active dev work (LB: `159.89.222.109`) |
| `do-sfo2-murror-cluster` | DOKS SFO2 | DigitalOcean managed | `nsp-prod-murror` | **Production** — `murror.api.ambercare.app` |
| `sg3` | Singapore (OVH) | `15.235.211.39:6443` | `nsp-alpha-murror` | Alpha (old) — **SCALED TO 0** (freeing CloudAMQP connections) |
| `vn` | Vietnam VPS | `14.225.210.108:6443` | — | **SCALED TO 0** — zero active dependencies, ready for decommission |
| `us` | US | `154.26.131.23:6443` | — | Platform (NOT in kubeconfig) |

## Key Links

- **Notion hub**: [Murror Team Updates](https://www.notion.so/327dfff0223981e0a37dd0764b156465)
- **Engineering log**: [Daily Updates](https://www.notion.so/326dfff02239812a9078d2c28f90f44e)
- **Infra health**: [Infrastructure Health & Performance Log](https://www.notion.so/323dfff0223981519db9c41f40bee763)
- **Strategy**: [Murror Strategy Command Center](https://www.notion.so/327dfff0223981889000c4bd2e40a764)
- **TestFlight**: Build 139 (Alpha old, 2026-03-17) | Build 142 (Alpha 2, 2026-03-18) | Build 143 (Alpha 2, 2026-03-19) | Build 148 (Alpha 2, 2026-03-23)
- **CI/CD**: GitHub Actions — `main`→alpha, `staging`→beta, `production`→prod
- **Deploy**: Use `gh run rerun <run-id>` (NOT `gh workflow run` — skips all jobs)
