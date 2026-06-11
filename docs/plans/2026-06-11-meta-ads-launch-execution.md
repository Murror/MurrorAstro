# Meta Ads Launch — Execution Record (2026-06-11)

**Status: 🚀 LIVE as of 2026-06-11 ~3:00pm PDT.** Campaign, ad set, and all 6 ads ACTIVE; 3 ads delivering immediately (b3/b4/b5, pre-cleared review), 3 in Meta review queue (b1/b2/b6).
**Plan doc:** `2026-06-11-meta-ads-launch-plan.md` (commit 72ac4e2). This file records what actually shipped, every ID, and the gotchas.

---

## 1. What launched

```
Campaign: Murror-US-CreativeTest-01 (120246530407070507)
  $35/day CBO · OUTCOME_TRAFFIC · AUCTION · LOWEST_COST_WITHOUT_CAP
└── Ad set: US-Broad-AdvantagePlus (120246530414510507)
    LANDING_PAGE_VIEWS optimization · billing IMPRESSIONS · destination WEBSITE
    Targeting: US broad, Advantage+ audience (18–54 as suggestions)
    └── 6 video ads, conversion_domain murror.app, CTA "Download"
```

| Ad | Ad ID | Creative ID | Video ID | Headline |
|----|-------|-------------|----------|----------|
| b1-lit-window-30s | 120246531664060507 | 1770011701084182 | 1323185145865520 | A soft place to land |
| b2-3am-30s | 120246531664810507 | 3048687295335671 | 1864047017624387 | A soft place to land |
| b3-bench-30s | 120246531666010507 | 775079135694331 | 1987223378667117 | Company for your inner world |
| b4-carried-30s | 120246531667580507 | 952060677883476 | 2071140277119086 | A companion for heavy nights |
| b5-reply-30s | 120246531668200507 | 1883110719022861 | 1381627330450362 | Your feelings, finally understood |
| b6-morning-30s | 120246531669420507 | 2821937548147250 | 1324663696516479 | From heavy nights to lighter mornings |

Links: `https://murror.app/?utm_source=meta&utm_medium=paid_social&utm_campaign=creativetest01&utm_content=b{n}-{slug}`

**Account objects:** ad account Murror `1673521989898581` (business murror.app `177160881557106`, USD, payment on file) · Page Murror `108860985224678` · Pixel/dataset "download" `652112574291157`.

## 2. Creative production (all same-day)

**Set A (city films, reserve inventory):** the 5 original 16:9 Kling 3.0 city/butterfly scenes reframed to 9:16 via Higgsfield `reframe` (96 credits each), assembled as 12s ads (`final/murror_*_916.mp4`). Astro verdict: beautiful but generic. KEPT as refresh inventory, not uploaded as ads.

**Set B (human stories — what shipped):** 6 new vignettes, different protagonist per ad, same dreamy storybook style. Kling 3.0 pro, native 9:16, 10s, sound on, 25 credits each (4x cheaper than reframing).
- B1 Lit Window: girl in the one lit window; butterflies climb the building; whole facade warms.
- B2 3AM: boy awake; butterflies rise from his phone; asleep at dawn (product moment).
- B3 Bench: elderly man in evening rain; butterfly lands on his hand; escorted home.
- B4 Carried: student bent under glowing burden orb; it becomes a lantern; set down at home.
- B5 Reply: rooftop man; the city's windows pulse back; heard by the whole city.
- B6 Morning: woman opens windows to sunrise blossoms (payoff). v1 cast a baby; re-rolled with "stylized ADULT woman, seen from behind".

**30s extension ("three acts"):** Kling caps at 10s/gen, so each film = act1 + act2 + act3 chained by feeding each act's last frame as `start_image` (extract via ffmpeg `-sseof`, upload via `media_upload` presigned PUT + `media_confirm`). 12 continuation gens + 1 recast + 1 hedge ≈ 350 credits. Total Higgsfield spend across the day ≈ 880 credits (balance ended ~716).

**Assembly pipeline (`Murror/marketing-ads/`):**
- `assets/render_text.py` — Pillow renders 29 caption PNGs (Playfair Display, white + soft shadow, Reels-safe zone) + end cards. Local ffmpeg has NO drawtext filter; PNG overlays instead.
- `assets/make_music.py` — original 31s ambient piano bed (numpy synthesis, C–G–Am–F, two passes, echo + fades). Zero licensing risk by construction.
- `assemble30.sh <act1> <act2> <act3> <cap1> <cap2> <tag> <payoff> <out>` — caption overlays with alpha fades at 0.4s/4.8s/11s/21s, xfade between acts, end card at ~29s, music mixed under ambient (0.35), H.264 1080×1920 24fps yuv420p faststart, 30.3s.
- End card rule (Astro, standing): **app icon tile + MURROR logotype only, no body text** (`render_endcard3`). Every ad needs a music bed.
- Finals: `final/murror-b{1..6}-*-30s.mp4` (15–21MB) + `webupload/` re-encodes at 2.2Mbps (~8MB, made for a 10MB browser-tool cap that ended up unused; manual upload used the full-quality finals).

## 3. Measurement layer

- **Meta Pixel 652112574291157 LIVE on murror.app** — PR murror-platform#52 (`MetaPixel.tsx` in marketing app root layout + delegated capture-phase click listener firing custom `AppStoreClick` {store, page} on any App Store / Google Play link). Merged to `feat/marketing-site`; the concurrent locale-rollout session merged + deployed it to production (32423b9).
- **E2E verified in a real browser:** `fbevents.js` 200 → pixel config 200 → `facebook.com/tr?ev=PageView` 200; `AppStoreClick` proven by wrapping `fbq` in-page and simulating a store-link click (captured `trackCustom AppStoreClick {store: app_store}`). Note: events fired right before navigation use sendBeacon and don't show in request logs.
- The pixel had existed since Apr 2025 and had NEVER fired (last_fired_time = epoch).

## 4. Gotchas (read before touching this again)

1. **Meta MCP cannot upload videos** — creatives need a `video_id` that already exists; Astro uploaded the 6 files manually via the Ads Manager draft flow (drag-drop, ~2 min). Images are fine via URL.
2. **2FA wall is surface-specific:** business.facebook.com asset library forces authenticator re-auth; adsmanager.facebook.com worked with the existing session. Go straight to adsmanager URLs.
3. **`instagram_user_id` rejects the public IG profile id** (55040108184). It wants the IG *Business Account* id, which no MCP tool exposes. Creatives were made without it; the Page-linked IG (@murror.app) shows in Ads Manager Identity. Verify IG delivery in placement breakdowns; fix in UI if absent.
4. **OUTCOME_TRAFFIC ad sets reject `promoted_object: {pixel_id}`** — omit it; pixel tracking still works via the site + conversion_domain.
5. **Activation is per-level:** toggling ads ON does nothing while ad set/campaign are paused; campaign, ad set, and each ad must be activated individually (`ads_activate_entity`).
6. **Video creative thumbnails:** the video's own auto-generated `picture` URL (from `ads_get_ad_videos` with `video_ids`) works as `image_url`.
7. **`ads_get_ad_preview` not yet rolled out** for this account.
8. **Kling quirks:** "no detailed facial features" is ignored (chibi faces anyway, accepted as style); ~1-in-7 castings wrong (the B6 baby); jobs occasionally wedge >25 min — fire a 25-credit duplicate and race; Higgsfield's preset_recommendation intercepts some prompts — retry with `declined_preset_id`; an innocent frame (cartoon boy in bed) tripped an NSFW false-positive on upload — re-extract at a different timestamp.

## 5. Operating playbook (week 1+)

- **Insights:** `ads_get_ad_entities` level=ad, date_preset, fields spend/impressions/ctr + video metrics. First read ~24h after launch.
- **Kill rule:** $20 spend with CTR < 0.6% → pause ad. **Scale:** +20% budget every 3 days on winners. **Refresh:** frequency > 2.5 → rotate in Set A city ads.
- **Optimization switch:** at ~50 `AppStoreClick`/week, change ad set optimization to OFFSITE_CONVERSIONS on that event.
- **Phase 4 (separate sprint):** `react-native-fbsdk-next` in MurrorMobile + SKAdNetwork → OUTCOME_APP_PROMOTION campaign optimizing installs.
- Leftover to tidy: draft ad `upload-draft-temp` (120246531036510507) can be discarded in Ads Manager.
