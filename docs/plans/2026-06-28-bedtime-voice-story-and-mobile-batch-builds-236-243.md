# Bedtime/Voice Story feature + mobile polish batch (builds 236-243)

Date: 2026-06-24 to 2026-06-28 (PST). Author: Astro (Claude).

## Context

A multi-day sprint that (1) took the daily "Voice / Bedtime Story" reflection
feature across the full stack (murror-api -> MurrorMobile + murror-platform web),
(2) ran a large mobile UI polish + QA batch (TestFlight staging builds 236-243),
and (3) established a two-agent working model (Claude on mobile + this repo set,
Codex on the web client) with a shared HANDOFF contract. The bedtime backgrounds
were generated in a separate session via the Higgsfield/Seedream MCP.

## What shipped

### Backend (murror-api, PRs to `staging`)
- `#518` (4739615) daily voice summary is a first-class diary entry.
- `#519` (2cfc5e7) takeaway "poke": sender can remind the receiver to reflect back.
- `#520` (5d50092) generate the daily voice summary same-day on a streak milestone.
- (c3c9efb) fix: allow memories photo uploads through ingress (proxy-body-size 50m).
- `#521` (8c4034f) song-invite accept/cancel (mirrors movie-invite). Migration
  `20260628000000_song_invite_accept_cancel` adds `ACCEPTED`/`CANCELLED` enum
  values + `accepted_at`/`cancelled_at`/`cancelled_by` columns. **Merged to
  `staging` and deployed** (deploy run success, staging API healthy 200). No
  song realtime emit yet (none exists in the codebase); TODOs left in the
  use-cases. Sentinel + cross-repo review = ship-safe.

### Mobile (MurrorMobile, staging TestFlight 236 -> 243)
- Voice/bedtime story:
  - (d14e9c2 / e9161c3) render the daily voice summary `voice_summary` entries as
    a playable bedtime card in the home Journal list (was rendering as a plain
    journal card and opening the wrong screen). Pure helper
    `journal-voice-utils.ts` (dedupe vs the injected evening card), unit-tested.
  - (fc26d39 / 2a38628) redesign the card: 10 bundled night-sky watercolor
    backgrounds (`src/assets/bedtime/`, optimized WebP ~1MB total, date-hash
    rotation), FastImage cover + bottom scrim, serif title, 260x280 height parity,
    fixed the clipped moon, removed the grey description.
- (7bf0846 / ee1cdda) glass toast: restyle the bottom toast to a frosted-glass
  pill (web parity), reusing the app's BlurView idiom.
- (84fc00c / 870803e) retire the butterfly shimmer loader; render a plain
  ActivityIndicator spinner everywhere (rewrote `butterfly-loading.tsx` in place
  so ~18 call sites needed no change; MUButton + notification pill use
  ActivityIndicator directly).
- (ed85b84) voice player (`DailyVoiceSummaryScreen`): auto-scroll now follows the
  highlighted paragraph via measured offsets (no longer jumps to top); progress
  bar is thicker, a progressive cyan->violet->pink gradient (clip-mask reveal),
  and tap/scrub-seekable. Added `seek()` to `use-audio-player.ts`.
- (488785a) Get Help: localized crisis info for Japanese (+ existing VI), wired to
  app language with an English fallback.
- (c2f29de) persona gating: Thanh Loc offered only to Vietnamese users in the
  picker (fail-safe: default personas always pass; stored selection still resolves).
- (06eb2d5 / 7f2e9aa) For Us: song-invite accept/cancel receiver UI + hooks
  (mirrors movie; keeps the Listen button); fixed a pending challenge being
  mislabeled "NEW" (which fired a spurious mark-as-read POST on the wrong id).
- Earlier in the window: Moments to Care rework + slide-to-next + streak milestone
  wrap-up (26ec217), takeaway sender poke UI (89cbe3f), relationship-type +
  privacy port to match web (edfd70e), and QA batches 2/3 (912da8c, 8260d45).

### Web (murror-platform, Codex, branch `feat/web-app-from-mobile`)
- For Us parity + playable voice/bedtime cards + takeaway songs + Moments parity
  (70164d83, 2f21b022, 65a5dca5, 50d35f23, 7397eb75, 6bb5d3af).
- Toast glass-pill styling + brand alignment (39c8fd5f, 0352e75c).
- Profile loading/date-picker polish, onboarding signup alignment (a76536c0,
  73c2e218, be5cca53).
- TikTok pixel + commerce funnel events (b4382676, 77d9c5b1, cf8cee8c).

### Coordination
- (77e9df3b) added the Claude/Codex operating model + API Lock to web `HANDOFF.md`:
  Claude owns mobile truth, Codex owns web implementation, HANDOFF owns shared
  state, one agent changes shared contracts at a time.

## Gotchas / lessons
- iOS build number lives in BOTH `project.pbxproj` (`CURRENT_PROJECT_VERSION`, 24
  occurrences) AND the per-scheme `*-Info.plist` `CFBundleVersion` (the staging
  app reads the plist; the OneSignal extension reads pbxproj). Bumping only one
  caused build 241 to first archive as 240 with a 240/241 app/extension mismatch.
  Bump both, with surgical sed/perl on the plist (NOT PlistBuddy Set, which
  reformats). The `ios-build.md` runbook is stale on this (a fix task is filed).
  See memory `ios_build_number_mechanism.md`.
- FastImage accepts a local `require()` source (typed `ImageRequireSource`); used
  for the bundled bedtime WebP. Storage decision: bundle locally (not Supabase)
  because the app builds artwork URLs from the env-specific `Config.SUPABASE_URL`
  and these are 10 fixed brand assets.
- song-invite migration is additive and safe: the new enum values are never USED
  in-file, so no Postgres "unsafe use of new enum value" transaction error.

## Verification
- TestFlight staging builds 236-243 archived + uploaded (app + extension build
  numbers verified equal before each upload).
- song-invite: PR #521 merged to staging, CI deploy succeeded, staging API 200,
  Sentinel + cross-repo contract review = ship-safe.
- Build 243 pre-archive review (Sentinel ship-safe + Iris caught and fixed the
  bedtime-card top-scrim date legibility). tsc/lint/unit-spec clean.
