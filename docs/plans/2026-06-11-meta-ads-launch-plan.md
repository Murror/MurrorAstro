# Meta Ads Launch Plan — murror.app

**Date:** 2026-06-11 (PDT)
**Status:** Approved by Astro 2026-06-11
**Decisions:** Phased objective (traffic now, installs later) · $25–50/day ($35 midpoint) · US only · iOS app fully live (`apps.apple.com/app/id6741769381`)
**Structure:** Approach A — consolidated creative test (1 campaign, 1 broad ad set, 5 video ads)

## Phase 0 — Foundation (pre-launch, ~1 hour)

| # | Step | Notes |
|---|------|-------|
| 0.1 | Meta Pixel on murror.app | Static Next.js export in `murror-platform/apps/marketing`; snippet in root layout. Pixel ID minted after Meta MCP auth. Land via PR like any site change. |
| 0.2 | Custom event `AppStoreClick` | Fired on App Store / Google Play button clicks. Becomes the conversion event Meta optimizes toward. |
| 0.3 | UTM convention | `utm_source=meta&utm_medium=paid_social&utm_campaign={campaign}&utm_content={ad}` |
| 0.4 | Verify Business assets via MCP | Ad account, Page (facebook.com/murrorapp), IG (@murror.app), payment method. |

## Phase 1 — Creative production

Sources: 7 Kling 3.0 Pro masters on Higgsfield (1920x1080, 10s, ambient sound). 9:16 via Higgsfield `reframe` (96 credits each); edits, captions, end cards via local ffmpeg. Workdir: `Murror/marketing-ads/`.

| Ad | Scenes | Hook (on-screen) | Angle |
|----|--------|------------------|-------|
| Heavy Nights | s1→s2 (~14s) | "for the nights that feel heavy" | loneliness |
| Journey | s1→s4→s7 (~15s) | "from heavy nights to lighter mornings" | transformation |
| Not Alone | s4 (10s) | "you're not the only one awake at 3am" | belonging |
| Fresh Start | s7 (10s) | "your feelings, finally understood" | hope |
| Quiet Company | s3 (10s) | "a companion that remembers what matters to you" | warmth |

All ads: Murror logo end card + App Store badge, baked-in captions (sound-off safe), 9:16 primary (Reels/Stories), 16:9 originals available for in-stream placements.

**Compliance guardrails (mental-health adjacent):**
- Never imply the viewer has a condition (Meta personal-attributes policy). Universal framing only.
- No medical/therapy claims. Murror = wellness/journaling positioning.
- No em dashes in ad copy (brand rule).

Scene → Higgsfield job map (10s masters, 2026-06-11):
- s1 night city: `66741079-64b1-4246-8380-03d7399227e1`
- s2 misty streets: `b47a27fb-129f-4277-a11c-780bd1cafc09`
- s3 neighborhood: `d5dd0661-ab41-4646-8466-af3ac5f32906`
- s4 cosmos: `7dcad7e0-7ff4-4be2-9545-c6ec2d4030a5`
- s5 pre-dawn avenue: `fbb19a1a-8e0a-4fd1-944a-5ec2eaa4d07f`
- s6 sleeping city: `800e0ea5-bd59-43d4-b661-ea81eb310844`
- s7 sunrise park: `cd823832-baa8-458b-a793-74afb9f6672d`

9:16 reframe jobs (submitted 2026-06-11): s1 `8d95ea58`, s2 `b4b4231f`, s3 `5556f0da`, s4 `be3b45dc`, s7 `5111fa97`.

## Phase 2 — Campaign launch

```
Campaign: Murror-US-CreativeTest-01   (Traffic objective, $35/day)
└── Ad set: US · 18–54 · Advantage+ audience · Advantage+ placements
    └── 5 ads above — created PAUSED, Astro reviews, then enable
```

- Destination: murror.app (pixel signal + film sells + AppStoreClick event). Not raw App Store link.
- Optimization: Landing Page Views weeks 1–2 → switch to `AppStoreClick` conversions at ~50 events/week.

## Phase 3 — Measure & iterate (weekly)

- KPIs: hook rate ≥25%, CTR ≥1%, CPC ≤$1.50, cost per AppStoreClick, App Store Connect installs.
- Kill rule: $20 spend with CTR <0.6% → pause ad. Scale rule: +20% budget per 3 days on winners. Refresh creative at frequency >2.5.
- Weekly MCP insights pull → chat summary + Notion engineering log.

## Phase 4 — Graduate to App Promotion (week 2–4)

- Add `react-native-fbsdk-next` (Expo plugin) to MurrorMobile as a new module (no changes to existing code paths), register app with Meta, SKAdNetwork config.
- Then: App Promotion campaign optimizing installs directly. Separate sprint + review.

## Budget

$35/day ≈ $1,050/month. Weeks 1–2: 100% prospecting. Week 3+: carve ~20% for retargeting (site visitors, 25%+ video viewers, IG engagers) once pools build.

## Risks

- Meta MCP tool surface unknown until OAuth completes; video upload may need one-time manual Ads Manager upload (fallback documented in chat).
- Ad account / payment method may not exist yet — verify in Phase 0.4.
- Meta may classify murror.app as health → restricted custom events. Mitigation: generic event names, wellness positioning.
- murror.app → App Store conversion rate unknown; measure from week 1.
