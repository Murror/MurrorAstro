# Team Context (Updated: 2026-03-24)

## Current Sprint Focus
Merge QA PRs, Bedtime Story E2E, Apple Watch deploy, branch consolidation, production stability

## Active Branches
| Repo | Branch | Owner | Status |
|------|--------|-------|--------|
| MurrorMobile | feature/apple-watch | Astro | 68 commits, needs E2E then merge |
| MurrorMobile | fix/qa-sweep-frontend | Astro | PR #436 — 8 fixes, awaiting review |
| murror-api | fix/qa-sweep-security-v2 | Astro | PR #276 — 8 security fixes, awaiting review |
| viasr-api | fix/qa-sweep-ai-privacy | Astro | PR #344 — 7 AI/privacy fixes, awaiting review |
| viasr-api | fix/rabbitmq-health-ssl | Astro | PR #345 — Health check SSL fix, awaiting review |
| viasr-api | fix/rabbitmq-consumer-reconnect | Astro | PR #346 — Consumer StreamLostError fix, awaiting review |
| murror-backend | fix/qa-sweep-prompt-role | Astro | PR #886 — 1 prompt role fix, awaiting review |
| MurrorMobile | feature/vinh-sprint-1 | Vinh | Active sprint work |

## Recent Changes
| Date | Agent | Change | Files/Area | Status |
|------|-------|--------|------------|--------|
| 2026-03-24 | (unassigned) | Production viasr-api crash loop fixed — probe config + liveness removed | DOKS nsp-prod-murror-ai | Complete |
| 2026-03-24 | (unassigned) | Health check RabbitMQ SSL fix — port 5671 needs ssl_options | viasr-api health route + 3 callbacks | PR #345 |
| 2026-03-24 | (unassigned) | All 9 RabbitMQ consumers: catch StreamLostError + clean reconnect | viasr-api 10 files | PR #346 |
| 2026-03-24 | (unassigned) | Agent team updated — mandatory-context.md added, all agents must read codebase before working | .claude/agents/ | Complete |
| 2026-03-24 | (unassigned) | Dream skill created — memory consolidation at /dream | ~/.claude/skills/dream/ | Complete |
| 2026-03-23 | Sentinel+all | Full QA sweep: 109 issues found, 19 fixed | All repos | 4 PRs open |
| 2026-03-23 | Cortex | Auth guards + webhook sig + CORS hardening | murror-api (13 files) | PR #276 |
| 2026-03-23 | Muse | Error message leaks + log redaction + compassionate fallback | viasr-api (9 files) | PR #344 |
| 2026-03-23 | Iris | MUColors fix + test data removal + JSON.parse + accessibility | MurrorMobile (6 files) | PR #436 |
| 2026-03-23 | Sentinel | Prompt role assistant->system | murror-backend (1 file) | PR #886 |

## Active API Contracts
_None currently in progress. Agents should add contracts here when building cross-domain features._

## QA Sweep Status (2026-03-23)
Full 6-agent audit completed. 109 issues found (14C/33H/42M/20L). 19 fixed across 4 PRs. Deferred items by agent:
- **Muse**: Safe persona builder (which user fields to send to AI), output safety filter, per-user AI caps
- **Atlas**: HTTP rate limiting on murror-api, SSL cert verification (CERT_NONE), Node 18->22 auth-service-ui
- **Prism**: Dark theme on overview-page + subscription-management, app-wide accessibility labels
- **Cortex**: SMS rate limiting, WebSocket admin DTO validation, answer-questions input validation
- **Iris**: Type-safe route params (7 screens), emotional journey JSON.parse guard, empty catch blocks

Full details: `~/.claude/projects/-Users-vinhtran-Projects-murror-transfer/memory/qa_sweep_2026_03_23.md`

## Known Issues
- CloudAMQP at ~31/100 connections (was 100/100 before deactivating old clusters)
- Supabase pool exhaustion if PC + DOKS both active -- NEVER run simultaneously
- CI/CD DOKS deploy step fails (kubeconfig auth) -- use manual kubectl
- **Production viasr-api**: Liveness probe REMOVED (main thread blocks during Claude API calls). Startup + readiness probes still active. Pod stable at 5+ hours. Long-term fix: move AI requests off main uvicorn thread.
- **RabbitMQ consumer SSL drops**: CloudAMQP drops TLS connections periodically → StreamLostError. Fix in PR #346 (not yet deployed). Currently generates ~100 Sentry errors/day but consumers auto-reconnect.
- **Alpha 2 viasr-api (PC)**: Returning 502 — service may not be running on PC. Needs restart via `remote.ambercare.app`.

## Environment State
- **Active compute**: PC primary (Alpha 2 API), DOKS active (Production only)
- **DOKS Alpha 2**: Scaled to 0 (no pods in nsp-dev-murror, nsp-dev-murror-ai)
- **DOKS Production**: murror-api healthy (36h+), viasr-api stable (5h+, 0 restarts, no liveness probe)
- **Database**: Supabase Alpha 2 (zusfftodelhazjaswgby, US East), Production (dcftszkbpamgeivhtuzl, SEA)
- **Latest TestFlight**: build 148 (v2.0.1, 2026-03-23)
- **Container registry**: ghcr.io/murror/ (check PAT expiry before deploys)
- **GPG signing**: Configured globally, key B4DFA625FB59C9A9, `gpg.format = openpgp`

## Production viasr-api Probe Config (as of 2026-03-24)
**IMPORTANT for Atlas — do not re-add liveness probe without fixing main thread blocking first.**
- Liveness: **REMOVED** (was killing pod every 20-30 min due to event loop blocking from Claude API calls)
- Readiness: `/health/liveness`, 30s period, 15s timeout, 10 failures
- Startup: `/health/liveness`, 10s period, 120 failures (20 min window)
- Readiness should switch to `/health/readiness-k8s` after PR #345 is deployed (adds SSL to health check RabbitMQ connection)

## Pending viasr-api PRs (deploy order matters)
1. **PR #344** — QA sweep AI/privacy fixes
2. **PR #345** — Health check SSL fix (enables `/health/readiness-k8s`)
3. **PR #346** — Consumer StreamLostError reconnect (stops ~100 Sentry errors/day)

Deploy all 3, then switch readiness probe back to `/health/readiness-k8s`.

## How to Update This File
After completing work that affects other agents, append a row to the "Recent Changes" table with:
- Date (PST)
- Your agent name
- Brief description of what changed
- Files or area affected
- Status (In progress / PR / Merged / Complete)
