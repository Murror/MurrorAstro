# GEO / AI-Search Optimization + Download Tracking + Ad Pause (2026-06-14 to 06-16)

Technical execution record. Follows `2026-06-13-marketing-pages-research-monitoring.md`.

## 1. Download-rate tracking (full funnel)
Built end-to-end install measurement so the ad funnel reaches Downloads, not just store taps.

- **App Store**: `Murror/marketing-ads/asc_downloads.py`. App Store Connect Sales Reports API, JWT ES256 via key `GGV7225WH5` (.p8 at `~/.appstoreconnect/private_keys/`, issuer `628f9cc5-6342-4c1d-8a74-3723334b1fc2`). **Vendor number `92356333`** (was the blocker; saved to `reference_appstore_connect.md`). `Accept: application/a-gzip`; gzipped TSV; sums Product Type Identifier in {1,1F,1T,F1} as first installs, by country. Apple lag ~1-2 days (today/yesterday 404 until generated).
- **Play Store**: `Murror/marketing-ads/play_downloads.py`. Reads the bulk-report Cloud Storage bucket `pubsite_prod_6813940291724343735`, file `stats/installs/installs_com.murrormobile_YYYYMM_country.csv` (UTF-16), via service account `murror-stats-reader@murror.iam.gserviceaccount.com` (key `~/.gplay/murror-play-key.json`). Needed `pip install google-cloud-storage google-auth`. SETUP GOTCHA: granting the SA "download bulk reports" via Play Console took ~9h to propagate the GCS IAM binding (403 until then). Google Play Developer Reporting API enabled in the `murror` Cloud project.
- **Dashboard**: `Murror/marketing-ads/funnel-dashboard.html`. Standalone, dependency-free interactive funnel (editable inputs, per-step conversion, cost/stage). Reflects: 4,460 impressions -> 380 clicks (8.5% CTR) -> 33 store taps -> ~2 US installs (1 iOS + 1 Android in window; rest are VN organic).

## 2. Ad monitoring + STALL diagnosis + pause
- Ran ~6 full-funnel cycles (Meta `ads_get_ad_entities` + pixel `ads_get_dataset_stats` 652112574291157 + store pulls). Spend frozen at **$49.95** across all cycles. Funnel byte-identical.
- Root cause of the freeze: `ads_get_errors` returned "reached the spending limit you set for your ad account." The campaign hit a **$50 account-level spending limit** (distinct from the $35/day budget) on ~Jun 12 and Meta auto-paused delivery while still showing ACTIVE. Ad set delivery showed `active` with no error; only the errors endpoint surfaced it.
- Conversion leak confirmed on BOTH stores: 33 taps -> 1 US install each platform. The bottleneck is the **store listings** (stale v1.0.19, mismatched copy), not the ads (CTR 8.5%, all creatives healthy).
- DECISION (Astro): pause everything, wait for a new app version + refreshed listings, then resume. Campaign `120246530407070507` set status=PAUSED via `ads_update_entity`. The 3-hourly monitoring cron (`5b9822cb`) deleted. Resume checklist in `project_meta_ads_launch.md`: ship build+listings, raise the account spend limit, un-pause, re-create cron.

## 3. GEO / AI-search optimization
Goal: be the top AI-engine-recommended app for "AI app for loneliness/self-growth." Positioning wedge (Astro's call): **"AI companion for loneliness and connection"** (whitespace), laddering to self-growth (crowded). Research (3 parallel agents): site SEO already strong; the gap is OFF-site (absent from Reddit/Wikipedia/listicles/reviews, the sources AI cites). Brand mentions ~3x backlinks for AI visibility. Name-collision risk with "Mirror" (Child Mind Institute).

Worktree `murror-platform-geo`, branch `feat/marketing-geo`, PR #67 (base feat/marketing-site).

- **Phase 1 (commit b74e1158)**: `app/robots.ts` explicitly welcomes 14 AI crawlers; `public/llms.txt` (loneliness-anchored summary + key URLs); enriched home `MobileApplication` schema (applicationSubCategory, slogan, keywords, featureList, publisher); `Organization` schema gained knowsAbout topics + App Store/Play sameAs + slogan.
- **Phase 2 (commit 87fa5f0c)**: two owned `/resources` articles, each EN/VI/JA (twin-parity test green), auto Article+FAQPage+BreadcrumbList schema + sitemap: `best-ai-apps-for-loneliness` (balanced neutral 9-app roundup so engines cite it), `murror-vs-replika-day-one-rosebud` (comparison). Fixed a factual error (Day One does have Android); kept competitor prices as ranges to avoid staleness.
- **THE CLOUDFLARE BLOCKER (resolved 2026-06-16)**: murror.app live robots.txt was actively Disallowing GPTBot/ClaudeBot/Google-Extended/CCBot/Applebot-Extended/Amazonbot/Bytespider/meta-externalagent + `Content-Signal: ai-train=no`. Source was NOT "Block AI bots" (Security) nor the per-crawler AI Crawl Control toggles. It was the **AI Crawl Control -> Signals -> "Managed robots.txt" toggle**. Turned OFF -> our origin robots.txt (welcomes all AI bots) now serves live. Verified: no managed block, no ai-train=no, all AI bots `Allow: /`.
- **Deploy**: `wrangler pages deploy out --project-name=murror --branch=main --commit-dirty=true` with `CLOUDFLARE_ACCOUNT_ID=3f3f1ac28d8f7a94e8e2ac610e1da0b3` (the `Astro` CF account; non-interactive wrangler needs the account id). Both phases live + verified (6 article URLs HTTP 200).
- **Off-site kit** (`Murror/marketing-ads/geo-drafts/outreach-kit.md`, founder-led): Wikidata entity (do now, kills Mirror collision), ~50 app-store reviews, Reddit 90/10 playbook, listicle pitches (TechRound, Kristi Hines, Mindful Suite), 3 paste-ready blurbs. Drafts also: `best-ai-apps-for-loneliness.md`, `compare-page.md`.

## Gotchas captured
- Cloudflare "Managed robots.txt" (AI Crawl Control -> Signals) silently overwrites origin robots.txt with an AI-block; robots.txt is edge-cached (~1 min lag).
- Meta "ACTIVE but $0 new spend" = check `ads_get_errors`; account spend cap auto-pauses with no delivery error.
- Play bulk-report SA grant can take ~9h to propagate GCS access.
- New `/resources` articles REQUIRE en+vi+ja twins or the vitest twin-parity test fails.

## Verification
- vitest 10/10 (twin parity), turbo check-types green (18 pkgs), static build clean (cache-miss with --force).
- Live: llms.txt 200; 6 article URLs 200; robots.txt serves origin welcome; homepage schema present.
