# Marketing Pages, Loneliness Research & Ad Monitoring (2026-06-12 to 06-13)

Technical execution record for the work after the Meta ads launch. Companion to `2026-06-11-meta-ads-launch-execution.md`.

## 1. Ad performance monitoring loop
- Session cron (`/loop` 3h) checks campaign `120246530407070507` (account `1673521989898581`) via facebook-ads MCP: per-ad spend/impressions/CTR/hook-rate/thruplay + pixel dataset `652112574291157` (PageView, AppStoreClick). Reports each cycle + appends to Notion "Meta Ads Performance Log" (`37c3af4a-aa92-8188-89a6-da9a25eed240`).
- Insights field names: `amount_spent` (not spend), `actions:link_click`, `3_second_video_plays`, `video_p25/thruplay`, `frequency`. grep -c exits 1 on 0 matches (breaks && chains).
- Day-1: b2-3am dominant (~9% CTR, 40% hook), then b3-bench overtook on delivery; funnel ~$0.95/AppStoreClick. KEY: AppStoreClick dropped day-2 (~4 vs 22) at steady ~250 PV → conversion leak downstream (stale App Store listing), not ads.

## 2. App Store listing review + copy kit
- Live US listing `id6741769381` reviewed: app is v1.0.19 (Nov 2025, stale); listing leads with relationship/"young generation" framing (mismatch vs ads); screenshots reported absent via lookup API; thin ratings (6 US).
- Paste-ready copy kit drafted in Notion (`37d3af4a-aa92-819e-8bef-e2255aece96b`): name, subtitle, promo text (editable without release), keywords, full description, 6-frame screenshot plan, What's New. Compliance-safe.

## 3. Demographic finding (from ad data)
- Age/gender breakdown: CTR rises monotonically with age; 65+ = 61% of spend @ 8.0% CTR; women = 88% of spend @ 8.6%. Advantage+ expanded far past the 18-54 suggestion. Triggered the research below.

## 4. Deep loneliness research (Gen Z vs older adults)
- deep-research workflow (run `wf_49bab3a6-768`); originally stalled pre-synthesis, resumed via `{scriptPath, resumeFromRunId, args}` (args must be re-passed on resume). 105 agents, 39 claims, 25 verified, 18 confirmed.
- Verdict: "Gen Z is loneliest" not well-supported. Youth lead on single-item self-report; older adults carry higher objective isolation + health/mortality severity (smoking-15/day comparison; +29% CHD, +32% stroke, +50% dementia). Loneliness != isolation. No source measures 55+ AI-companion adoption (the JMIR study caps at 18-49) → the Meta 55+ signal is novel/untested. Saved to Notion `37e3af4a-aa92-81a6-885e-fe934a227516`.
- Strategy: validate 55+ via installs/retention, not CTR; do not reposition off one day of data.

## 5. Video creative (Higgsfield)
- Set B (human stories) extended to 30s three-act films; product "See inside" clips iterated through 3 approaches → winner = nano_banana_pro readable-UI base + kling3_0 gentle motion. Assets in `~/Projects/murror-transfer/Murror/marketing-ads/`.
- Higgsfield ran OUT OF CREDITS (balance 22.7) mid /why work → /why uses pure-CSS animation instead of video. Top-up link surfaced via `show_plans_and_credits`.

## 6. Marketing site pages (murror-platform, deployed murror.app)
- **/how-it-works** (PR #54 / `50aa96d`): light sub-page, 5 product clips as alternating rows; en/vi/ja. Homepage "See inside" section removed (kept homepage simple).
- **/why** (PR #56 / `16b413f`): dark, animated, cited research story page; en/vi/ja. Pure-CSS scenes (per-scene radial jewel-tone gradients, drift glow blobs, HeroSparkles, fluttering brand butterflies), scroll-reveal copy, sans-serif count-up stats, crisis disclaimer + sources. Header dark-chrome pattern (`isWhy`/`darkChrome`): white logo/nav/CTA + dark glass bar; quick-nav menu renders on isHome||isWhy.
- **"Support the cause" -> "Support Us"** (EN: Header, Footer, give-strings metaTitle + eyebrow). VI/JA left as-is.
- **Nav rewire**: "How it works" and "Why" now point to their pages everywhere (rail, quick-nav, footer) via the SECTIONS `href` pattern.
- Meta Pixel verified intact across all. PR #55 closed (squash-divergence conflict) and superseded by cherry-pick PR #56.
- Deploy: `wrangler pages deploy out --project-name=murror --branch=main` (account `3f3f1ac28d8f7a94e8e2ac610e1da0b3`).

## 7. New /document skill
- `~/.claude/skills/document/SKILL.md`: 5-step routine (gather → git doc → PROGRESS → Notion → dream). Notion entries written plain-language for non-technical readers, in the June-10 colorful `<span color>` format (blue title / orange section+time / green shipped / red fixed / yellow heads-up). PST timestamps, page-body-not-comments, no em dashes.

## Pending
- Top up Higgsfield credits, then generate human-figure clips and layer behind the /why animated scenes.
- App Store: verify/upload screenshots, paste promo text, ship a current build.
- Keep watching install/retention by age to validate the 55+ signal.
