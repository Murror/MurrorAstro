# Murror Progress

## 2026-06-05 (PDT) — murror.app marketing launch: Cloudflare cutover + SEO + email fix

Driver: Astro — "create a new website for murror.app without Squarespace, save costs," then take it live and harden discovery + email. Marketing site is the new `apps/marketing` static app (Next.js `output: export`) in `murror-platform`, deployed to **Cloudflare Pages (free)**. No backend/mobile touched (continue-never-rebuild; `apps/web` SSR routes left alone).

### Shipped & LIVE on murror.app
1. **DNS cutover off Squarespace → Cloudflare** — full nameserver move (`hank` / `heather.ns.cloudflare.com`). Verified the entire zone from Cloudflare's NS *before* flipping the registrar. Email preserved 100% (Google Workspace MX ×5 + DKIM + DMARC untouched); live subdomains preserved (api / insights / track). Custom domains `murror.app` + `www` attached to the `murror` Pages project; apex + www resolve to Cloudflare anycast, valid SSL, HTTP 200.
2. **SEO foundation** (`feat/marketing-site`, commit **c27926c**, 14 files, +191/-2) — `robots.ts` + `sitemap.ts` (`force-static` for static export), JSON-LD (Organization + WebSite site-wide, MobileApplication on home, FAQPage on support), `og.png` 1200×630 built via ffmpeg (dreamy hero + white wordmark — fixes the broken social card), canonical URLs on all 4 pages, `manifest.ts` + apple-touch-icon + 192/512 icons + theme-color. Build green, types green across all 10 packages. Deployed to Pages production (`--branch=main`); verified live: JSON-LD inlined, robots/sitemap/og all HTTP 200.
3. **Email deliverability fix** — apex SPF was **12 DNS lookups** (over the hard limit of 10 → PermError → SPF failing) because `mailgun.org` was included twice (directly + nested via `spf.onesignal.email`). Trimmed apex to `v=spf1 include:_spf.google.com ~all` (**1 lookup**; Astro confirmed Google Workspace is the only apex sender — app emails ride subdomains `email.` / `mail.` which keep their own SPF). DKIM (google) + DMARC (`p=quarantine`) already healthy. **mail-tester.com = 10/10.**

### Side quest
- **`/remote-control` "did nothing"** — root cause: shell alias `claude='claude --dangerously-skip-permissions'` injected a flag *before* the subcommand, breaking arg parse (`Unknown argument: remote-control`). Fix: use the flag form `claude --remote-control` (alias-friendly, order-independent). CLI v2.1.142; version + auth were both fine.

### Open / follow-ups (all optional, none blocking)
- Submit `sitemap.xml` to Google Search Console (needs Astro's Google login + domain verify; TXT verify record then dig-confirm).
- DNS housekeeping: delete junk `test.murror.app "test2"` TXT; remove proxied `_domainconnect` Squarespace-leftover CNAME.
- Decide AI-bot policy in Cloudflare managed robots.txt (currently blocks GPTBot / ClaudeBot / Google-Extended; search crawlers allowed).
- Rotate DB passwords baked into `~/.claude/settings.json` allow-list (surfaced during the remote-control probe).
- Push `feat/marketing-site` + open PR (deploys are direct `wrangler` uploads from `out/`; nothing pushed to GitHub yet — ~18 local commits).
- Lock loneliness-stat citations before any public push (footnote still "to be finalized").
- Cancel Squarespace site plan after a few days verified live (keep the domain registration).

### Cost outcome
Squarespace marketing hosting (~$16–49/mo) → Cloudflare Pages **$0/mo**.

---

## 2026-06-05/06 (PDT) — ambercare.app → murror.app migration + notifications audit

Driver: Astro — "centralize everything to murror.app, retire ambercare.app." Both zones are in one Cloudflare account (`astrovinh@gmail.com`). Design + implementation plans + kill-list committed under `docs/plans/`.

### Backend migration — DONE (zero user impact)
1. **Dead-DNS cleanup** — deleted **44** dead ambercare.app records (58 → 14): abandoned multi-region/KOL, the whole unused `murror-platform` suite (auth/admin/web/statistic/notifications — live auth=Supabase, push=OneSignal), VN/sg3/OVH infra, wildcards, 2 typos, 9 stale ACME. Prod health green after.
2. **Phase 2 twins** — `api.murror.app` + `ai.murror.app` → do-sfo2 `159.89.222.109` (DNS-only); added to the live prod ingresses (additive `kubectl patch`); cert-manager `letsencrypt-prod` auto-issued certs (HTTP-01). Parity verified (identical 200s; originals untouched). Precedent: `insights.murror.app` already ran this way.
3. **Apex redirect** — Cloudflare Redirect Rule 301s `ambercare.app` + `www` → `murror.app` (path+query preserved); live API/AI/files subdomains unaffected.

### The retirement gate (hard constraint)
`MurrorMobile/.env.production` hardcodes `murror.api.ambercare.app` (API) + `files.ambercare.app` (emergency-contacts). **No remote-config lever** (checked — `BASE_API_URL` is compiled in). So retiring the domain REQUIRES a mobile build flipping 2 lines to murror.app, then old-app age-out. No backend-only path. The 2-line change rides the next app release.

### Remaining (all gated to Astro): files.murror.app R2 custom-domain click · mobile `.env.production` (next release) · Phase 6 dev box · then retire ambercare.app.

### Notifications audit — push is HEALTHY
Confirmed live: daily push nudges WORK on prod (in-app **APScheduler** → `push_notification_task` → OneSignal, personalized EN+VI, idempotent — NOT beat). Missing `murror-ai-beat` only affects beat features (voice summaries, weekly reflections, theme aggregation, callback-pings) — **all deferred to 2.0 by Astro**, so prod having no beat is intentional (not Bug H).

### Live image state (end of session)
- `murror-api` = **`0.34.3`** · `murror-ai` = `main-5f350b4` (unchanged)
- ambercare.app: 14 records (down from 58); apex on murror.app; api/ai twins live

---

## 2026-06-05 (PDT) — Stuck-article cost fix + backlog purge

Driver: Astro flagged daily-article OpenAI cost bleed + "remove the stuck articles, they're outdated." All work on **live prod = do-sfo2** (`nsp-prod-murror`).

### Root cause
`ArticlePublishRetryService` (cron, every 5 min) re-published every `PENDING` article older than 10 min with **no upper age bound** — the historical stuck backlog (oldest 2026-02-13) was re-sent to OpenAI every 5 min = ongoing spend on stale content. The legacy `error:{not:null}` filter also hid published-but-never-completed articles (a successful re-publish clears `error`, so they stayed PENDING forever).

### Shipped to LIVE prod (do-sfo2)
1. **Code guard** (murror PR #409, image **0.34.2**) — mark `PENDING` FAILED when older than 2 days OR retries exhausted; bound recovery to `requestedAt` within the last 2 days; dropped `error:{not:null}`. Build green, scheduler specs 37/37. Deployed via `deploy-doks` image-only (production "Deploy" workflow still hits the wrong US cluster — Landmine A — so bypassed). Pod `murror-api-684d5dd9b8-4w6nd` healthy on `0.34.2`.
2. **One-time backlog purge** (Astro-approved, scoped `deleteMany` via pod Prisma) — deleted **897** non-completed rows (98 PROCESSING + 799 FAILED). Verified pre-delete they held ZERO content/keywords — empty transport/failure shells, not salvageable AI output (Astro asked if reusable as research data; answer: no, the real signal is in source `public.journals`/`public.deep_chat`, kept forever). After: **1498 COMPLETED only**, stable on re-query.

### Useful artifact: FAILED error-reason breakdown
609 `No AI completion received after max retries` (RMQ completion-loop break) · 150 `HTTP publish failed: fetch failed` · 23 retry/`Connection lost` · 4 OpenAI `401` · 2 `psycopg2 UndefinedFunction/connection`. The 609 ties to the known `ai.mood.updated`-on-article-queue mis-routing follow-up.

### Result
✅ Cost bleed stopped (0 PENDING = nothing to re-publish), backlog cleared, guard in place so it cannot recur. Logged to Notion Engineering Log + memory `project_activity_based_articles.md`.

### Then: off-cluster scheduler-leadership hijack (vps40) — root cause of the whole thing
Verifying the retry guard revealed it was **dormant**: the article-scheduler leader (DB-row lock `scheduler_lock`, 60s TTL) was held by an **off-cluster** instance `vps40-optimal-us` (REGION=us) — a leftover standalone murror-api connected to the prod DB, actively renewing the lock. So the cluster pod was never leader; vps40's OLD unbounded retry was what re-published the backlog. Couldn't reach vps40 (pooler-masked IP; PC tunnel down/CF-1033; doesn't resolve; not in any namespace).
- **Fix — murror PR #410, image 0.34.3:** cluster-eligibility gate in `SchedulerLeadershipService` — only `REGION` starting `doks` may lead; an in-cluster pod **preempts** a valid lock held by a non-cluster holder. Basic acquire path unchanged (alpha/staging unaffected). Prefix is bare `doks` (sentinel caught CI sets `doks` while live ConfigMap is `doks-sfo2`). 8/8 new spec, 37/37 scheduler specs. Sentinel adversarial review (no flapping/dual-leader; vps40 yields gracefully). Deployed via `deploy-doks`.
- **VERIFIED LIVE:** lock flipped `vps40-optimal-us` → `murror-api-79846d4f57-d7b4k` (doks-sfo2); `Leadership acquired` + retry job configured + `No articles needing retry`. Stable across renew cycles; vps40 cannot reclaim (maintained every 30s; restart self-heals via preempt).
- **⚠️ OPEN (security):** vps40 still alive with live prod DB creds (+ maybe a shared-Redis worker). Power off + rotate creds when reachable. Scheduler control fixed; box not yet decommissioned.

### Live image state (end of session)
- `murror-api` = **`0.34.3`** (bounded retry + backlog purge + cluster-only leadership)

---

## 2026-06-04 (PDT) — Prod reliability sprint + personalized articles

Driver: Astro reported "article is not generating." Turned into a full prod-reliability day. All work targeted **live production = do-sfo2 cluster** (`nsp-prod-murror` / `nsp-prod-murror-ai`). murror-api commits today: ~20; viasr: ~9.

### Shipped to LIVE prod (do-sfo2)
1. **Article generation pipeline fixed** — un-gated the new-article RMQ consumer + replaced the dead `save_to_db` with `send_response` (completed articles now reach users). Made **durable in `main`** (viasr PR #431) after discovering it was deployed-from-branch-but-not-merged.
2. **Quotes: stop AI generation → curated library** — onboarding 404 fixed by serving from the existing legacy pool (~5,952 quotes, EN+VI); read-path fallback for quote-less users; journal-quote saving disabled (murror PR #403). Stopped ALL viasr AI quote generation: journal + reflection + dead article-quote line (viasr PR #430). Closed the AI-route PR #429.
3. **Connections-cron fixed** (murror PR #406) — 2 cron jobs (insight health-check + stuck-task recovery) had errored every tick "for weeks"; schema-qualified the raw SQL to `murror_api.*` (pgbouncer drops search_path). Stuck-task recovery safety net restored.
4. **Activity-based daily articles** (murror PR #407, image 0.34.0) — NEW: one personalized article/day for each recently-active user, built from their recent journals + deep chats, all backend (no mobile change). Activity-only scope. Scheduler every 6h, idempotent. **2 bugs caught pre-deploy by a read-only prod dry-run** (wrong table name `"User"`; prod data lives in LEGACY `public` schema, not modern). LIVE + healthy; scheduler registered.

### CI / infra fixed (the "CI green ≠ live prod" landmines)
- **Landmine A** — murror CI "production" deploys to the wrong (US-migration) cluster, never live do-sfo2. Built a safe **image-only `deploy-doks` workflow** + least-priv `murror-api-deployer` SA + `KUBE_CONFIG_DOKS` secret (murror PRs #404/#405). One-click: `gh workflow run deploy-doks.yml --ref main -f image_tag=<tag>`.
- **Landmine B** — viasr deploy steps had a kubeconfig clobber ("Config not found"); pinned `KUBECONFIG` path (viasr PR #432).

### Live image state (end of day)
- `murror-api` = `0.34.0` (articles + quotes + cron fixes)
- `murror-ai` web + worker = `main-5f350b4` (article durable + stop-gen)

### Open / follow-ups
- murror **#402** (quote library on `staging` lineage) — parked; staging is 202 commits ahead of production, separate lineage.
- Verify ONE real article generation end-to-end post-deploy (write path; read path dry-run-validated).
- 16 pre-existing timezone/notification-schedule spec failures (DI/constructor drift) — separate cleanup.
- Optional: `@@unique([userId, requestedDate])` race-hardening (needs migration); systemic pgbouncer `search_path` fix.

See `~/.claude/.../memory/reference_prod_engineering_lessons_2026_06_04.md` for the recurring patterns (read before any prod / raw-SQL / deploy work).
