# Murror Engineering Handoff

**Audience:** new engineers joining Murror.
**Reading time:** ~15 minutes.
**Last updated:** May 11, 2026.

This is your day-1 doc. By the end of it you should know:
- What Murror is, at a system level
- Which repos do what
- What's surprising or non-obvious (so you don't trip over it)
- Where to find specifics for the area you'll be working in

---

## 1. The system in one paragraph

Murror is an iOS/Android app (`MurrorMobile`, React Native 0.77 + Hermes) talking to **three** backends:

1. **Supabase** — auth (JWT-based) plus a small set of legacy REST endpoints served via PostgREST.
2. **`murror-api`** (NestJS, Domain-Driven layout) — the primary product API. Diary, takeaways, invites, memory index, profile, subscription.
3. **`viasr-api`** (Python / FastAPI + Celery) — the AI + emotion analysis layer. Deep-chat streaming, emotion extraction, memory librarian, crisis detection, song suggestions.

The two backends talk to each other over HTTPS (mobile → murror-api → viasr-api in the chat path; viasr-api → murror-api over a service-to-service auth path for memory writes). Both deploy to DigitalOcean Kubernetes (DOKS) in dedicated namespaces per environment.

Mobile state is a deliberate two-layer split: **TanStack Query v5** owns server state (cached, refetched, persisted to AsyncStorage with lz-string compression); **MobX** owns local UI state that crosses component boundaries but doesn't need persistence (bottom toast, mood popup, sound playback).

---

## 2. Repo map

| Repo | What it is | Activity (last 30 days) |
|---|---|---|
| **`MurrorMobile`** | React Native 0.77 iOS+Android app. The "user" face of Murror. | 57 commits, 13 merged PRs |
| **`murror-api`** | NestJS API. DDD layout. Talks to Postgres via Prisma + pgbouncer. | 35 commits, 19 merged PRs |
| **`viasr-api`** | Python AI service. Celery workers, RabbitMQ, Anthropic SDK. | 52 commits, 13 merged PRs |
| `auth-service` | Supplemental auth flows. Has a CLAUDE.md. | dormant |
| `auth-service-ui` | UI for the above. | dormant |
| `murror-backend` | Older/legacy backend. Has a CLAUDE.md. | dormant |
| `murror-platform` | Platform-shared infra/tooling. Has a CLAUDE.md. | dormant |
| `docs` (this repo!) | Cross-cutting docs. Read this first. | always |

Each active repo (`MurrorMobile`, `murror-api`, `viasr-api`) has its own `HANDOFF.md` and `CLAUDE.md` — read those when you `cd` into the repo you'll work in.

---

## 3. What's surprising or non-obvious

Six things that will save you time if you read them now:

### 3.1 The mobile app talks to *both* Supabase AND `murror-api`

`BaseApiClient` (in `MurrorMobile/src/apis/client/base-api-client.ts`) has an optional `isNewBE?: boolean` argument on every method. `true` → `murror-api` (NestJS). `false`/omitted → Supabase (PostgREST). If you add an endpoint and route it to the wrong base, you'll silently get a 404. The active migration trajectory is "everything new lives on `murror-api`" — but legacy reads still go through Supabase. See `MemoryApiClient` for a clean "always new BE" example.

### 3.2 The build target most engineers should use is `MurrorMobileStaging`, not `MurrorMobile`

There are 4 iOS schemes (excluding the OneSignal extensions):

| Scheme | When to use |
|---|---|
| `MurrorMobileODE` | CI builds only ("on-device evaluation" pre-staging) |
| `MurrorMobileDevelopment` | Local dev. `ENV=development`, points at Alpha 2 Supabase + staging API. |
| `MurrorMobileStaging` | TestFlight builds. Mirrors production paywall against Apple Sandbox StoreKit. |
| `MurrorMobile` | Production. Don't touch this scheme during dev. |

For a real iPhone test of staging changes, archive `MurrorMobileStaging`. See [`runbooks/ios-build.md`](./runbooks/ios-build.md).

### 3.3 PR target branch convention

| Repo | Default integration branch | Why |
|---|---|---|
| `MurrorMobile` | `staging-environment-setup` | Long-lived "staging" branch on the mobile side; `main` is promoted from this. |
| `murror-api` | `staging` | Standard pattern. |
| `viasr-api` | `staging` | Standard pattern. Production promoted from `main` via `workflow_dispatch` (no `production` branch — common mistake). |

**Never push direct to `main` on any repo.** All changes via PR. Back-merge PRs (production → staging after a hotfix) must use **merge-commit**, not squash — squashing breaks ancestry and leaves downstream promotion PRs perpetually CONFLICTING. See [`CONVENTIONS.md`](./CONVENTIONS.md).

### 3.4 Database migrations and PRs land together

**Never** apply a migration out-of-band (from a feature branch, directly to staging DB) before its PR merges. This caused a P2032 incident on April 20 — a feature-branch migration sat applied for 5 days while its PR was still open. When the next migration squashed/altered the column, the original PR's commit referenced a column that no longer existed in the expected state. Cron crashes ensued.

Migration SQL + code must land via the same PR. CI runs migrations pre-deploy via the Flyway-in-CI Job pattern. See [`runbooks/db-migrations.md`](./runbooks/db-migrations.md).

### 3.5 `console.*` is stripped from prod bundles

`babel-plugin-transform-remove-console` removes every `console.log/error/warn/info` from production iOS bundles. **Never** use raw `console.*` in app code. Use `devLog`/`devWarn`/`devError`/`devInfo` from `MurrorMobile/src/common/dev-logger.ts` — they're no-ops in production.

CI checks for residual `console.*` in the production bundle and fails the job if any are found.

### 3.6 Mutations default to `retry: 0`, not 3

TanStack Query default `mutations.retry: 0` in `MurrorMobile/src/config/react-query/query-client.ts`. This is deliberate: most write mutations (POST journal, POST friend invite, POST movie/location invite) are **not idempotent**. A retry on a timed-out-but-actually-succeeded request creates a duplicate record. The backend has no idempotency-key deduplication.

If you're writing a `PUT` or `PATCH` that IS idempotent (e.g., update profile, update settings), add `retry: 3` explicitly on that mutation. The default safe behavior is no retry; the recovery path is the `onlineManager` + `networkMode: 'offlineFirst'` pair which pauses-and-resumes mutations across offline windows (firing exactly once on reconnect).

---

## 4. Where to start, by area

| You'll be working on... | Start here |
|---|---|
| Mobile UI / RN | [`MurrorMobile/HANDOFF.md`](../MurrorMobile/HANDOFF.md) → [`MurrorMobile/CLAUDE.md`](../MurrorMobile/CLAUDE.md) → `MurrorMobile/src/apis/client/base-api-client.ts` |
| Backend (NestJS) | [`murror-api/HANDOFF.md`](../murror-api/HANDOFF.md) → [`murror-api/CLAUDE.md`](../murror-api/CLAUDE.md) |
| AI / Python | [`viasr-api/HANDOFF.md`](../viasr-api/HANDOFF.md) → [`viasr-api/CLAUDE.md`](../viasr-api/CLAUDE.md) → `viasr-api/README.md` |
| Deploy / TF release | [`runbooks/ios-build.md`](./runbooks/ios-build.md) + [`runbooks/app-store-connect.md`](./runbooks/app-store-connect.md) |
| Infra / K8s / CI | [`ARCHITECTURE.md`](./ARCHITECTURE.md) + [`runbooks/ci-kubeconfig.md`](./runbooks/ci-kubeconfig.md) |
| DB migrations | [`runbooks/db-migrations.md`](./runbooks/db-migrations.md) |
| Eval harness / prompt regression | [`runbooks/eval-harness.md`](./runbooks/eval-harness.md) |
| Recent perf work | [`PROGRESS.md`](./PROGRESS.md) (May 11 entry) |
| Past incidents (don't repeat) | [`INCIDENT_LOG.md`](./INCIDENT_LOG.md) |
| Team process rules | [`CONVENTIONS.md`](./CONVENTIONS.md) |

---

## 5. If you're using Claude Code

Each active repo has a `CLAUDE.md` at its root. Running `claude` inside the repo dir auto-loads it as project instructions — you get the same baseline context Astro has been working with.

`Murror/.claude/memory/` contains ~40 committed memory files capturing institutional knowledge (architecture notes, incident postmortems, runbook references). These are shared across the team via git.

> Note: per-user feedback memories (tone, preferences) are NOT shared in `.claude/memory/`. Each engineer's Claude Code installation has its own private feedback memory in `~/.claude/projects/.../memory/`.

---

## 6. Conventions in one screen

(Full list in [`CONVENTIONS.md`](./CONVENTIONS.md).)

- **Commit style:** Conventional Commits. `perf(mobile): ...`, `fix(detail): ...`, `chore(ios): ...`.
- **Branch naming:** `type/scope-description`. Examples: `perf/mobile-sprint-6`, `hotfix/conversation-detail-anim-stuck`.
- **PR target:** never `main` directly. See §3.3.
- **Code review:** for high-cost deploys (TestFlight archive, prod deploy), dispatch parallel review agents on the diff BEFORE building. ~5 min of agent review beats a wasted 25-min build cycle.
- **Permanent fixes only:** zero tolerance for retries-as-fix, cosmetic error messages, manual DB patches, pod restarts as fix, disabled tests, TODO-and-ship. Root-cause every bug.
- **Test once at end of sprint:** bundle all fixes into ONE TestFlight build cycle. Don't ship N small TFs.
- **Visual-first communication:** tables, diagrams, structured layouts. Don't dump walls of plain text in PR descriptions or docs.
- **No em-dashes in app copy** (locale files, UI strings, prompts) — comma or other punctuation instead. The em-dashes-in-prompts rule is enforced because Claude tends to over-use them and they read as AI-generated to users.

---

## 7. First-week checklist

1. ☐ Read this doc (you're doing it)
2. ☐ Read [`CONVENTIONS.md`](./CONVENTIONS.md) (5 min)
3. ☐ Skim [`INCIDENT_LOG.md`](./INCIDENT_LOG.md) (10 min — pattern-recognition for "don't do that")
4. ☐ `cd` into the repo you'll work in; read its `HANDOFF.md` + `CLAUDE.md`
5. ☐ Get your local environment up: clone, install deps, run the dev build, sign in to Alpha 2 test account
6. ☐ Skim [`PROGRESS.md`](./PROGRESS.md)'s May 11 entry to understand what just shipped
7. ☐ Pair on a small bug fix to land your first PR
8. ☐ (Optional) If you'll use Claude Code: install it, `cd Murror && claude` from the relevant repo dir — `CLAUDE.md` auto-loads

---

## 8. Open questions for whoever inherits this

Things this doc doesn't have answers for, but should — flag them to your tech lead:

- Who has admin access to App Store Connect / can rotate the upload key?
- Who is the on-call rotation for the prod health check email + Notion Engineering Log?
- What's the actual Service Level Objective for chat first-token latency on SEA cellular? (Currently aiming for ≤7s as the perf-sprint target.)
- When does the production Supabase region migration land?

---

If anything in here is wrong or missing, the right move is to fix it in a PR. This doc is a living artifact — keep it current.
