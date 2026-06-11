# Murror Progress

## 2026-06-11 (PDT) — Staging web app: the log view becomes deep chat, 5 QA batches, a backend emotion fix, the voice diary ported, and a persona showcase world

Driver: Astro — iterative QA on the staging web app (`apps/web-client`, staging.app.murror.app). Astro tested in rounds and sent findings with screenshots; each batch was root-caused against the MOBILE source (MurrorMobile is always ground truth), fixed, gate-checked (tsc + full vitest), harness-verified end-to-end against live staging, deployed (CI image -> helm, nsp-staging-murror), and logged (PARITY_LOOP_LOG.md + Notion Engineering Log). Staging only; production untouched. 7 web deploys (helm rev 78-84), 1 viasr backend PR, 4 showcase accounts.

### The headline arc: the journal writer IS the deep chat now (mobile-exact)
1. **Conversation mode v1** (`staging-09ec8b2`) — Submit sends the entry into the AI conversation; rainbow streaming reply; Save completes through the diary pipeline. Shared settle-hold extracted to `use-streaming-settle` (deep-chat-page refactored onto it).
2. **Astro: "I still see journaling screen" -> fused screen** (`staging-947a673`) — read mobile's add-log-screen properly: there is NO mode swap. Rebuilt as ONE surface: SEND arrow visible from the start (mobile InputAccessoryView), bubbles grow above the persistent textarea, header Save = mobile's tick (plain journal if you never chatted / complete-conversation if you did).
3. **Calm pass** (`staging-54f64cc`) — streaming 15->90ms/word (mobile component default is 60), all card chrome removed (only the trust pill remains boxed, like mobile), mic+send as mobile's exact pink/blue radial-gradient circles in a frosted accessory pill, bubbles 13px.
4. **Polish batch 7** (`staging-70ad660`) — bubble color pinned to the reply's slot (was flipping twice at stream->settle because it derived from messages.length), MurrorIconCircle avatar (exact mobile SVG: white circle/black ring/4-color butterfly) on bubbles + typing indicator, prompt auto-fetches on open + regenerate, EmotionalJourneySection wired on conversation details, header chips to ~80% white / dark glass (readable over artwork heroes).
5. **Batch 8** (`staging-45fda74`) — voice input continuous + error toasts (was single-shot + silent), invitation dialog opaque (was 10% glass mud), user messages render as PLAIN PAGE TEXT like mobile (no bubble/timestamp - the real spacing fix), header non-sticky, **daily voice diary PORTED to web** (was never built: VoiceSummary entity + getVoiceSummary query + moon card playing narration over the bedtime piano; found+fixed diary-api's split-base routing /v1/connections/* to the dead legacy Supabase host; today-or-yesterday date logic).
6. **Batch 9** (helm rev 84) — drafts restored (Draft button; X = save-and-leave; restore on return), entrance fades (writer text + Reflection sections), consistency pass (Knowledge -> warm canvas + renamed "Research" + non-sticky; Diary/Reflection headers aligned).

### Cross-cutting fixes
- **Light-theme contrast sweep** (batch 5, `staging-09ec8b2`+) — built a runtime WCAG scanner (walks every text node, reads the actual painted layer stack via elementsFromPoint, canvas-resolves Tailwind v4's oklch/oklab colors). Confirmed-broken + fixed: settings account form (white labels + invisible typed text), settings premium card, subscription error/loading, home cards (pinned dark - home ignores the theme like mobile; shared cards gained an `appearance` prop), shell chrome on always-dark routes. Light + dark scans clean on 11 routes. Scanner lessons saved to agent memory.
- **Cold-load routing fix** (`staging-c9f73a8`) — refreshing/deep-linking any inner page bounced to home: one-render race where auth resolves but the profile query hasn't started (RTK initiates in an effect), guard read "uninitialized" as "not onboarded" -> /onboarding -> /. Both profile guards now hold for data-or-error. TDD: regression spec failed on old code, green after; 449/449.
- **Home background pixelation** — daily watercolor confined to the centered max-w-2xl column (1206px asset downscales instead of stretching) with a radial mask into the dark gradient.

### Backend: conversation emotion gap (viasr-api #446, merged + auto-deployed)
Completed conversations got empty emotionArc while plain journals were fully analyzed - breaking "emotion detection on every journal entry" for the type the web log flow now creates. Root cause traced 3 layers: murror-api's completion handler accepts+persists the fields and the web renders them, but viasr's rabbitmq_deep_chat completion flow never computed them (the journal pipeline's `conversation_emotion_arc` function - literally named for this - was never wired in). Fix: detect_emotions() in PARALLEL with summary (asyncio.gather - zero added latency), non-fatal, producer carries emotionArc/emotionJourneyText; payload regression tests. **E2E proof**: fresh web conversation -> arc ["anxious","reflective"] + journey on the FIRST poll -> Emotional Journey renders on the detail. Pre-fix conversations keep empty arcs (no backfill).

### Persona showcase world (for website + ads)
4 staging accounts built through the REAL product APIs (no DB stuffing): Maya Chen (24, marketing), Jaylen Brooks (26, engineer), Ava Reyes (21, student), Noor Rahman (23, nurse) - `*.murror@example.com` / `MurrorPersona2026!`. Higgsfield SOUL portrait avatars (512px via /me/avatar), full onboarding (POST /onboarding/complete), 4-edge friend circle (invitation-link flow), 9 hand-written journals with deliberate emotional arcs, ALL FOUR edges with completed takeaway-reflection loops -> INSIGHT_READY shared insights (titled cards + song suggestions, e.g. "Showing Up for Each Other" + "Lean on Me"), 2 movie invites (Past Lives PENDING for the CTA state, The Farewell ACCEPTED). Mini Challenge waits on the next connections-cron cycle (challenges FK-validate against cron-generated connection insights).

### Verification discipline
Every batch: tsc + full vitest (440->449 tests grew across the session) -> vite build -> harness E2E against live staging (real sockets, real pipelines) -> CI image -> helm -> live-chunk verification (grep the deployed JS for the new code markers) -> PARITY_LOOP_LOG + Notion. Hidden-tab artifacts (framer freezes, timer clamping, cold-load auth races) documented and worked around rather than trusted.

### Engineering lessons (also in agent memory)
- **Tailwind v4 computed colors are oklch/oklab** — regex hex/rgb parsers fail silently BOTH ways (false positives AND skipped elements). Canvas fillStyle -> getImageData resolves any CSS color exactly.
- **RTK Query skip-flip gap** — when `skip` flips false, the fetch starts in an EFFECT; the same render reports isLoading:false with no data. Guards must treat "no data AND no error" as loading.
- **diary-api split base** — endpoints default to the LEGACY Supabase host unless allowlisted to murror-api; new /v1 endpoints must be added to `isBackendEndpoint` or they silently die.
- **Takeaways/invites use MODERN connection ids** (cuid), not the legacy relationshipId (uuid) — match partners via connectionDetails userIds. Movie invites need a takeawayId/insightId anchor; challenges FK-validate insightId against cron-generated connection_insights.
- **Profile rows exist only after onboarding/complete**; /me/avatar is PNG/JPEG-only and the ingress 413s over ~1MB (512px PNGs fit).

---


## 2026-06-10/11 (PDT) — murror.app experience overhaul: content engine, cinematic film homepage, living library, trilingual launch

Driver: Astro — build the SEO content engine, then turn the homepage into a cinematic scroll experience (hubtown.co.in reference), the resources hub into a phantom.land-style draggable field, and finally take the whole site trilingual (EN/VI/JA) with automatic language + location routing. All in `apps/marketing` (`murror-platform`, branch `feat/marketing-site`), deployed via wrangler to Cloudflare Pages. Backend/mobile untouched. **Engineering reference for all of these systems now lives at `apps/marketing/README.md`.**

### Shipped & LIVE on murror.app (9 ships, ~8 production deploys)
1. **/resources content hub (EN)** — content engine (md loader, 3 pillars) + 9 articles, Article/Breadcrumb/FAQPage JSON-LD, canonicals, crisis note (988), immutable `_next/static` caching, hero `fetchPriority`. Merge `1bac76b`+`ba0ffeb`.
2. **Vietnamese mirror /vi/resources** — locale engine (STRINGS map, shared renderers), 9 VI twins (same slugs), EN|VI toggle, bidirectional hreflang + x-default, VI crisis note (115), +10 sitemap URLs. Merge `45d054b`.
3. **AI-journaling reframe + verified research** — all 18 articles rewritten around the AI-companion thesis with **13 verified citations** (PubMed/JMIR/Nature/SAGE; adversarial fact-check fixed a ratio-vs-proportion misread before ship) + 5 Higgsfield butterfly-motif illustrations per article (no in-image text — EN/VI share assets). Merge `503ce56`. Editorial serif titles + brand-tint cards on the hub followed (`3a774ee`…`0550c11`).
4. **Daily article autopilot** — scheduled task (7am PT) drafts one bilingual article/day into the same content system (slug-inventory → research → EN+VI → Higgsfield illustration → cwebp). First scheduled run produced `gratitude-journaling` (EN+VI) on its content branch.
5. **Cinematic scroll-film homepage** — 7 Higgsfield city-journey scenes (kling3_0 pro 10s → ByteDance 4K upscale → 240 webp frames/scene @24fps; 1920px desktop ~136MB lazy + 960px mobile set ~61MB), canvas player with frame cross-blending, **autoplaying scenes where scroll only turns the page**, blur-materializing copy that holds until the next gesture, sparkle-star/grain/vignette overlays + dark wash, sticky transparent nav, mobile beat mode (long sections as sub-slides), bold-sans stat numerals. Pivot story: started as three.js forest world (`d16a865`…`a0c7374`), Astro redirected to real film. Merge `2f42ad1` + `14d0fca`.
6. **Phantom-style resources field** — the article library as a draggable infinite card plane above the classic list: real DOM cards (illustration + pillar tint + serif title), rAF drag/momentum/wrap, ambient drift, perspective dome bend, full-opacity cards with a 180px edge fade band. Reduced-motion/crawlers keep the canonical list (zero SEO impact). Merge `187b0be`.
7. **Page-turn scroll turnstile + 3:3 features** — wheel/touch/keys no longer move the page; they request page turns (gsap scrollTo between act/beat stops). One gesture = exactly one page; momentum tails recognized via 300ms gesture-gap; mid-flight gestures swallowed; a fresh post-arrival gesture queues exactly ONE turn (fixes "feels stuck" without allowing skips). Features grid rewrapped to even 3:3 columns on desktop (was 4:2). Merge `7bcd3a6`.

8. **Chapter rail nav + a critical crash fix** — vertical left rail (xl+) replacing the top nav links: Why Murror / Features / How it works / AI companion / Resources, click-to-glide via the turnstile machinery, scrollspy highlight (theater broadcasts the act on stage), `mix-blend-difference` so labels auto-invert on any background. Shipped with a **critical fix**: ScrollTrigger pin-spacers re-parent the act sections, and React route changes removed DOM before passive cleanups ran → `removeChild` crash → blank site on ANY internal link away from the homepage (live since the film homepage; surfaced as "support is not working"). Theater teardown moved to a mutation-phase layout effect; Theater pinned above the acts in JSX. Merge `81f5b30`.

9. **Trilingual site: English + Vietnamese + Japanese, with language & location routing** — 9 JA articles (translated by 9 parallel agents), full VI+JA homepages (film copy via a locale dictionary, shared `HomeExperience`), locale-aware header/footer/rail, EN|VI|JA switcher, JA crisis line, hreflang across all 42 pages (sitemap 36 URLs). Routing is two-layer: a pre-paint client script (browser language) plus a Cloudflare Pages `_worker.js` scoped by `_routes.json` to the EN entry paths (location: VN→vi, JP→ja; cookie choice > browser vi/ja > geo > en; bots and assets never redirected). Verified: 13/13 browser-language puppeteer checks, 11 live-edge checks, 10/10 unit tests on the shipped worker with mocked countries. Mid-publish race caught: origin gained the Meta Pixel (#52) during the work — merged and redeployed so production has both. Merge `a87e740`.

### Verification
- **Turnstile gauntlet on LIVE murror.app: 12/12 green** — violent flick = 1 page, continuous grind = 1 page, mid-flight swallowed, post-arrival queues 1, up/keyboard correct, 3:3 columns measured, mobile beats + queue, zero JS errors (desktop + mobile).
- **Rail + navigation: 13/13** (section glides land pixel-perfect with the right highlight, scrollspy tracks the wheel, cross-page jumps, crash-path round trips clean) and **overlap re-scan at 1366/1440/1512: zero text under the rail**.
- **Trilingual: 13/13 puppeteer** (overridden `navigator.languages` — JA/VI/EN routing, mixed preferences, remembered choice, lang attributes), **11 live-edge checks on production** (VI/JA browsers 302 to twins; Googlebot, images, film frames untouched; Meta Pixel intact), **10/10 unit tests on the shipped `_worker.js`** with mocked `request.cf.country`.
- Every deploy live-verified by curl sweep: all pages 200, sitemap correct, prior features intact.

### Engineering lessons (also in agent memory)
- **GSAP pins vs React teardown**: ScrollTrigger pin-spacers re-parent DOM; route changes remove DOM before passive `useEffect` cleanups → `removeChild` crash → whole app unmounts. Teardown must be a (mutation-phase) layout effect, and the Theater component must precede the pinned sections in JSX.
- **Cloudflare Pages upload throttle**: bulk frame uploads EPIPE-fail; fix = paced half-scene deploys (~120 files, 150-220s gaps). Production deploys then reuse preview-warmed hashes (3,636 files in 3.5s).
- **Pages `_worker.js` must be scoped**: `_routes.json` limiting invocation to `/` + `/resources/*` keeps the film's thousands of asset requests off the 100k/day free-tier Functions quota. In-worker guards: never redirect bots, non-GET, or extension paths (article images live under `/resources/*.webp`).
- **Hidden tabs freeze animation**: scroll/animation behavior must be verified via puppeteer-core headless (rAF runs; `page.mouse.wheel` sends trusted events); the local preview tab can't. Production homepage needs `waitUntil: domcontentloaded` (film frames never go network-idle on cold cache). Prefer full-viewport screenshots (`clip` flakes in headless).
- **Gauntlet design**: assert landings relative to the previous landing (absolute indices cascade one failure into five); CDP round-trip latency stretches synthetic burst timing; localStorage persists across pages in one puppeteer browser (a stored-preference test can poison the next test — use fresh contexts).
- **Shared branch hygiene**: fetch origin before deploying — the Meta Pixel (#52) landed mid-rollout and one production deploy briefly shipped without it.

### Open / follow-ups
- **Astro: review the Vietnamese homepage copy natively** (murror.app/vi/ — my translation); commission a native Japanese pass before any serious JP marketing push.
- Submit sitemap.xml to Google Search Console (needs Astro's Google login) — now carries all 3 locales.
- PR #48 (`feat/marketing-site` → dev) repo hygiene; `fix/insights-seo` + viasr-api `fix/ai-docs-noindex` still awaiting their PRs/deploys.
- VI title capitalization normalization (pending Astro's call); cancel Squarespace site plan (site live + stable since 06-05).

---

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
