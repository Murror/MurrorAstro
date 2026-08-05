# 2026-08-04 — Build 413/414 feedback, MTC root cause, freemium activation

Technical record. Companion Notion entry is the plain-language version.

## Context

Build 413 shipped with seven reported defects. This session fixed six, shipped
build 414, took a second feedback round, and fixed four more. It also activated
the soft paywall on staging for the first time, which exposed a billing-display
defect that is still open.

## The MTC overlap: five fixes were in the wrong file

The headline finding. Five consecutive fixes (through PR #1020 / build 413) were
written into `src/screens/main/Home/moment-to-care.tsx`. **That is not the rail
on screen.**

Proven two independent ways from Astro's device screenshot:

1. **Card height.** Measured 140.0pt exactly (iPhone 16 Pro, 402pt wide, 3x).
   That is `CARD_HEIGHT` in `src/components/feed/pinned-card-metrics.ts`.
   `moment-to-care.tsx`'s card is `((ScreenWidth-100)*450)/283` = 480pt.
2. **Position.** The cards sit fixed above the tab bar = `styles.fixedPinned`,
   `home-screen.tsx:544`. `MomentToCare` renders separately at line 611.

Both rails are on Home simultaneously. They were deliberately built to look
identical: `pinned-carousel-config.ts` duplicates the tilt worklet byte-for-byte
and both use the same constant NAMES (`CARD_WIDTH`, `CAROUSEL_VIEWPORT`) with the
same formulas. That is how five sessions targeted the wrong file while passing
unit AND mutation tests.

### Then the geometry turned out to be fine

Build 414 shipped a Release-safe diagnostic (`AnalyticsService.trackMtcRailGeometry`,
event `home.mtc_rail_geometry_diagnostic`). It reported from Astro's device:

| field | value |
|---|---|
| screen_width | 402 |
| card_width_stride | 302 |
| measured_slot_width | **302** |
| card_face_width | 290 |
| slot_minus_face | **12** (the intended gap) |
| stride_minus_measured_slot | **0** |

No width mismatch anywhere. Combined with Astro's "once I scroll, the cards fall
into place, so it's the loading state in the beginning only", the bug is a
FIRST-PAINT timing issue: items painted before the carousel assigns offsets.

The prior mitigation could never have worked: `railRevealed` only toggled
`overflow: hidden` -> `visible`, and clipping does not separate cards stacked at
the same x INSIDE the viewport.

**Fix:** do not mount the `<Carousel>` until the viewport has measured. Its first
render then knows its container size, so items are positioned on frame one. A
same-height placeholder holds the rail's height.

## Build 413 feedback fixes (PR #1022, #1024, #1026, #1027)

- **Dark settings sheet.** The sheet background was flipped to `#0b0b16` but the
  foregrounds were never flipped. `MUText` defaults `textColor` to
  `neutralBlack`; `XIcon` defaults `#131313`. Fixed per call site so shared
  components keep their light-surface defaults.
- **Paywall footer.** iOS renders `BlurView` as a `UIVisualEffectView`, which
  does NOT honour a CALayer mask, so the gradient-masked blur (build-353,
  build-399) was inert and retuning mask stops could not have changed anything.
  Replaced with locked-card.tsx's proven pattern, then in build-414 replaced
  again with ONE continuous gradient (see below).
- **Sub-sheet transitions.** Every sub-view had both `entering` AND `exiting`.
  Reanimated keeps an exiting view mounted AND occupying layout, so in a column
  container the animated height became outgoing PLUS incoming stacked;
  `LinearTransition` animated to that inflated sum then re-targeted down. Two
  chained animations per tap. Dropped every `exiting`, made the spring explicit
  (an unconfigured `LinearTransition` is not a spring at all, it is
  `withTiming` 300ms `Easing.inOut(quad)`), and hoisted ONE persistent
  `NavigationBar` into the host.
- **For Us word fade.** `AnimatedFadeWord` used `useNativeDriver: true` while
  rendering inside a parent `<Text>`. RN flattens nested text into the parent's
  attributed string, a virtual node with no backing view, so the native driver
  had nothing to attach to and the animation was a silent no-op. Sibling
  `AnimatedWord` already used the JS driver for exactly this reason.
- **Freemium locking.** Milestone and `voice_summary` branches returned BEFORE
  the lock was computed, so bedtime stories were never gated. There was no
  exemption for them, they fell outside an inclusion rule naming only
  `deep_chat`. Replaced the 7-day window with a count rule.

## Build 414 feedback fixes (branch `fix/build414-feedback`, NOT merged)

- **MTC** — the mount gate above.
- **Paywall solid layer.** The build-413 scrim ramped to `rgba(0,0,0,0.92)`,
  which IS solid. Replaced feather + scrim + blur with ONE continuous gradient
  spanning both, transparent -> 0.72, monotonic so there is no flat region.
- **Note fade flicker + 2x.** Words stayed JS-driven `Animated.Text` for the life
  of the note, so per-frame commits accumulated. They now retire to a plain
  `<Text>` once settled (what `AnimatedWord` already does). Timings halved.
- **Sheet header without body.** `dataConnectionTypeList?.map(...)` rendered
  NOTHING while undefined, so the auto-height sheet collapsed to a bare header
  then jumped. Four placeholders hold the 2x2 footprint.
- **Picker title.** "Who do you want to talk about?" read as gossip. Now "Who do
  you want to reflect on?". Astro's suggested "Choose a connection to reflect"
  was not used: solo is a separate type labelled "With Murror", so that title
  would not cover its own case.
- **REVERTED:** the waiting-side insight change, pending a full flow review.

## Connection-scoped prompts (murror-api #730 + #731, merged + deployed)

Suggested prompts named the wrong person and guessed "he". Root cause: the mobile
client has ALWAYS sent `relationshipConnectionId` on `POST /api/v1/log`, but
`CreateJournalDto` never declared it, so the global `ValidationPipe`
(`whitelist: true, forbidNonWhitelisted: false`) **stripped it silently**. Grep
returned zero hits in `src/`. Prompts were stored per user while their content was
about whichever connection the source reflection concerned.

Fix: declare the field, persist it, thread it via a nullable column on both
`journals` and `journal_prompts`, filter on read. `replaceUserPrompts` now deletes
scoped to `(userId, connectionId)` — it used to delete the user's ENTIRE pool,
which once prompts carry a connection would mean writing about A wipes B's.

Deployed to staging and the migration applied (deploy run 30960025047).

🚨 **General trap:** murror-api discards ANY field no DTO declares, with no error.

## Account deletion (murror-api #732, merged)

`purgeUserData` anonymized shared photos `WHERE deletedAt: null`, skipping
already-soft-deleted rows; `verifyPurge` counts EVERY row for that uploader, found
the skipped row, threw, and the request retried forever. Anyone who had soft
deleted one of their own shared photos could never complete account deletion.

Fixed on the PURGE side. Relaxing the verifier would have removed the error while
LEAVING the PII. **The existing test asserted the defect** (`deletedAt: null`) and
was green throughout; rewritten in the same change.

## Per-environment PostHog flags (PR #1027)

Staging and production share one PostHog project, so the hard-paywall kill switch
was one flag scoped by the `env` PERSON PROPERTY — the mechanism that already
failed once when `env` was lost on identify/reset and unlocked premium for
everyone. Split into `enable_hard_pay_wall_staging` (no fallback, so the legacy
flag can never reach staging) and `enable_hard_pay_wall_production` (falls back to
legacy, so production is byte-identical until its own flag exists).

Both flags created. Staging serves `false` at rollout 0% — **counterintuitive but
correct**: a non-matching flag returns `false`, and `false` is what relaxes the
wall. 0% = soft paywall ON.

## Not needed: the murror-api back-merge

All 7 prod-only commits are already in staging BY CONTENT under different SHAs. A
trial merge proved it: `pnpm type-check` reported `Duplicate identifier
'STRIPE_SECRET_KEY'` and `Duplicate function implementation`. Worse, taking
production's side on `reflection-preview.controller.ts` would have REVERTED
staging's own rate limiting and input validation on a public endpoint. Merge
aborted.

## Open

- 🚨 **Premium shown while content locked.** Row is `INACTIVE` with
  `current_period_end` in 2027. Writer is the negative-sync self-heal
  (`revenuecat.service.ts` ~1514), not the transfer handler. Fix direction hinges
  on whether staging RevenueCat still entitles the account. See
  `incident_premium_shown_while_content_locked` memory. **Do not guess.**
- Branch `fix/build414-feedback` — 6 commits, green, NOT PR'd.
- Production migration: 23 (not 28; 5 Galaxy excluded), 3 mutating.
- Takeaway reflections have no TTL; poke is not rate limited; `attemptCount` is
  never read as a retry cap.

## Verification

All mobile work: `tsc --noEmit` clean, eslint clean, suites green (286/289 with 3
pre-existing skips at the last full run; 234/234 Diary). murror-api: type-check
clean, lint clean, 98/98 across 13 suites at the deletion fix.

Nothing in this document is device-verified beyond build 414 itself.
