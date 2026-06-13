# Post-Launch: Ads Monitoring, Research & Marketing-Site Build (2026-06-11 → 13)

Everything after the Meta ads campaign went live (see `2026-06-11-meta-ads-launch-execution.md`). All shipped.

## 1. Ads performance monitoring (3-hour loop)
- Session `/loop` cron (`81d5ddeb`, every 3h) pulling per-ad spend/impressions/CTR/video metrics + pixel dataset stats, appending each cycle to the Notion **Meta Ads Performance Log** (`37c3af4a-aa92-8188-89a6-da9a25eed240`).
- **Day-1 read:** strong top-of-funnel. b2-3am led early (8–12% CTR), b3-bench overtook on day 2 (25–35% CTR). All 6 ads cleared review; no kill-rule triggers; frequencies ~1.0.
- **Funnel-leak finding:** AppStoreClick fell ~80% day-2 vs day-1 on steady ~250 daily PageViews → the bottleneck is the App Store listing / landing, not the ads. Escalated the listing fix as #1 lever.

## 2. Demographic surprise + research
- **Meta age/gender breakdown:** CTR rises monotonically with age; **65+ = ~61% of spend at ~8% CTR**, women ~88% of spend. The opposite of the assumed Gen-Z target.
- **Deep-research report** (105-agent harness, adversarially verified, resumed after a mid-run interruption): "Is Gen Z really the loneliest, or older adults?" Verdict: not clean — youth report higher *subjective* loneliness (single-item self-report), older adults carry higher *objective isolation + health severity*; the two constructs differ; older adults under-report; and the literature has a hard gap above age 49 on AI-companion adoption. Net: the 55+ signal is novel/untested, validate via installs→retention, not CTR. Saved to Notion `37e3af4a-aa92-81a6-885e-fe934a227516`.

## 3. App Store listing kit (drafts)
- Notion doc `37d3af4a-aa92-819e-8bef-e2255aece96b`: message-matched name/subtitle/promo-text/keywords/description rewrite + 6-frame screenshot plan. Flagged: live build is stale (v1.0.19, Nov 2025); listing screenshots appear missing; promo text is editable without a release. Paste-ready; awaiting Astro in App Store Connect.

## 4. Marketing-site build (all live on murror.app)
Repo `murror-platform/apps/marketing` (Next static export, Cloudflare Pages project `murror`, account `3f3f1ac2...`, deploy `wrangler pages deploy out --project-name=murror --branch=main`).

### a. Meta Pixel (PR #52)
Pixel `652112574291157` + delegated `AppStoreClick` event sitewide. Verified live (PageView + AppStoreClick).

### b. "See inside Murror" → **How it works page** (PR #54)
- Iterated 3 creative approaches for product clips: floating mock (too gadgety) → real-UI composite on held phone (too static) → **winning pipeline: `nano_banana_pro` readable base (real screenshots as reference) + `kling3_0` gentle motion that preserves on-screen text.** 5 clips: chat/journal/home/emotions/diary.
- Moved them off the homepage into a dedicated **/how-it-works** page (en/vi/ja), light sub-page theme. Homepage restored.
- **"Support the cause" → "Support Us"** (EN: header, footer, give page).

### c. **/why research story page** (PR #56)
- Dedicated **/why** (en/vi/ja): the loneliness research as a customer-facing, compliance-safe, evidence-based case (universal framing, no medical claims, crisis disclaimer, cited sources: SG 2023, Gallup 2024, Holt-Lunstad, NASEM 2020).
- **Animation-only, no video** (Higgsfield hit 0 credits mid-task): per-scene radial jewel-tone gradients (indigo → plum → warm-gold journey), drifting glow blobs, sparkles, fluttering brand butterflies; scroll-reveal copy; **sans-serif** count-up stats.
- Nav rewired: "Why" → /why everywhere; header **dark-chrome pattern** (`darkChrome = overHero || isWhy`) gives /why a dark glass bar + white logo/nav/CTA + the quick-nav menu; light sub-pages unchanged.

## Open / pending
- Top up Higgsfield credits → generate human-figure clips, layer behind the /why animated scenes.
- App Store listing: ship a current build + paste the new copy + fix screenshots.
- Validate the 55+ engagement signal with install/retention data (not CTR) before any repositioning.
- VI/JA donate label still "support the mission" wording (EN changed to "Support Us").

## Gotchas captured
- Squash-merging a PR diverges the source branch → later PRs conflict; fix by cherry-picking the delta onto a fresh branch off the target (#55 → #56).
- pnpm+turbo monorepo: full `pnpm install` before the pre-commit type-check (filtered install breaks it).
- Higgsfield: NSFW false-positives on "lying/lap/young student" framings; Kling preset interception (`declined_preset_id`); looped image inputs need `-shortest` in ffmpeg or they render infinitely.
