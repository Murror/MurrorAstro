# 2026-07-14 builds 312 to 324 mobile polish and TestFlight loop

## Context

This writeup covers the mobile-heavy review loop that followed the July 13 round 12
handoff. The active product target was staging only. Mobile changes landed in
`MurrorMobile` on `staging-environment-setup`, with the backend reporting support
landing in `murror-api` staging. The final build in this batch was TestFlight
build 324.

This work was intentionally incremental. Each round kept the existing components and
adjusted the exact broken surface rather than replacing whole screens.

## What shipped

### Build 312 and build 313 foundation

- Graduated the connections tab orbital re-skin to staging, then cut build 313.
  - Mobile commits: `01ea9c2e`, `2f65e093`, merge `3a05398b`.
- Restored the advisor/persona voice under insight cards and strengthened the tests
  so the source labels stay wired to the intended contrast tokens.
  - Mobile PR #704, commits include `3f823182`, `9897fe2`, `220c13c`, `a31c84f`,
    `edfccfc`, merge `e9932d9`.
- Fixed the Moment share/comment footer so the Send button remains visible above the
  keyboard instead of being cropped.
  - Mobile PR #705, commits include `f9c3813`, `3456e3e`, `e0ad070`, merge
    `35385f4`.
- Simplified memory detail actions into compact controls, added private content
  reporting affordances, improved keyboard layout, and preserved the memory detail
  spacing.
  - Mobile PR #706, commits include `9ef51fc`, `fb04eb2`, merge `9623764`.
  - Backend staging commits: `8edb972`, `918216a`, `2976e2c`.
- Restored the connection streak section in Reflection when real streak data exists
  and added an explicit error state rather than letting the section look empty.
  - Mobile PR #707, commits include `1c3aafc`, merge `aab84d1`.
- Quieted the butterfly FAB rim and aligned the FAB outline with the bottom
  navigation treatment.
  - Mobile PR #708, commits include `387910b`, `fe89e4c`, merge `96b0571`.
- Cut build 314 from the cumulative fixes.
  - Mobile PR #709, commit `521b2e5`.

### Build 315 to build 317 device polish

- Polished the build 315 feedback pass for memory detail, settings, onboarding copy,
  comment sending, orbit startup stability, and card visual consistency.
  - Mobile PR #710, commit `16693c4`; build 315 bump `9d30599`, merge `f6a7828`.
- Polished the build 316 feedback pass and cut build 316.
  - Mobile PR #712, commit `ebb0178`; build 316 bump `6757af9`, merge `6d4923a`.
- Polished the build 317 feedback pass and cut build 317.
  - Mobile PR #714, commit `6571436`; build 317 bump `43156ab`, merge `ee5ddb0`.

### Guided MTC card and build 318 to build 319

- Added the guided MTC onboarding card on Home so people have a lightweight prompt
  to begin sharing instead of facing an empty or generic call to action.
  - Design and plan commits: `05de751`, `0b596ff`.
  - Selection, render, and persisted graduation commits: `9ff5bc9`, `c9e1d12`,
    `b166dab`.
- Resolved staging merge issues for the guided card and kept the onboarding progress
  path on track.
  - Commits: `f811ec4`, `93ac87b`.
- Cut build 319 after the guided MTC fixes.
  - PR #717 and PR #718, commits include `a319466`, `ad8bff0`, merge `72dd6d3`.

### Build 320 to build 324 visual and motion polish

- Reworked the black-card visual direction after build 320 feedback. The card bodies
  moved back toward black surfaces while tab headers kept a softer gradient instead
  of short, sharp tint bands.
  - Mobile PR #719, commit `ae07851`; build 320 bump `5388562`, merge `2b9174b`.
- Polished build 321 feedback, including card surfaces, memory Polaroid scale and
  spacing, filled white heart treatment, and bottom-sheet outline cleanup.
  - Mobile PR #721, commit `938860f`; build 321 bump `0020b94`, merge `bb9ad7c`.
- Added the build 322 visual and motion polish, including summary-entry scroll fade
  behavior and smoother header treatment.
  - Plan commit `943a459`; mobile PR #723, commit `07ae701`; build 322 bump
    `5102b7f`, merge `d0b6061`.
- Fixed the MTC carousel so the card keeps its border/frame while the horizontal
  scroll can bleed to the edge instead of being visually cropped.
  - Mobile PR #725, commit `fc40bea`; build 323 bump `86c3824`, merge `92db23b`.
- Centered For Us card body copy vertically between the pill title and footer CTA,
  matching the Connection Reflection body placement pattern.
  - Mobile PR #727, commit `874d28c`; build 324 bump `d7f65f8`, merge `024819a`.

## TestFlight builds

- Build 313: staged connections-tab re-skin and earlier round 12 work.
- Build 314: insight voices, share/comment keyboard footer, memory actions,
  reporting, reflection streak visibility, and FAB/nav outline pass.
- Build 315: first July 14 polish pass.
- Build 316: second July 14 polish pass.
- Build 317: third July 14 polish pass.
- Build 319: guided MTC card and staging merge fix.
- Build 320: visual feedback pass.
- Build 321: black-card and Polaroid visual polish.
- Build 322: visual motion polish and summary scroll fade.
- Build 323: MTC card bleed with frame restored.
- Build 324: For Us body copy vertical centering.

Build 324 App Store Connect verification:

- App bundle: `app.murror.mobile.stg 2.1.0 (324)`.
- Notification extension: `app.murror.mobile.stg.OneSignalNotificationServiceExtensionStg 2.1.0 (324)`.
- Staging endpoint present.
- Dev endpoint absent.
- App Store Connect state: `VALID`.
- Build ID: `4b869e39-7307-4081-a880-ce4599cb5c40`.

## Verification

- Focused Jest coverage was added and run for the For Us body-centering change:
  `src/screens/main/Diary/insight-card-tap.spec.tsx`, 5 of 5 passing.
- TypeScript passed for build 324.
- ESLint exited 0 for the touched For Us files, with existing inline-style warnings
  in `insight-card.tsx`.
- `git diff --check` passed for the build 324 branch before merge.
- The build 324 archive succeeded.
- Upload to App Store Connect succeeded. Xcode reported the known non-blocking
  Hermes dSYM warning, but the uploaded package reached `VALID`.

## Gotchas and operating notes

- The July 14 Codex loop does not appear in Claude Code token-accounting transcripts.
  The `/document` token script can count the available July 13 Claude sessions, but
  not the Codex-internal turns that produced the July 14 build train. The Notion row
  should call this out rather than inventing a token number.
- The relationship next-step prototype commits exist on their prototype branch, but
  were not found on `origin/staging-environment-setup`, so they are not listed as
  shipped in this TestFlight batch.
- The marketing progress source path in the active `murror-platform` checkout was
  stale. The current progress page source was found in the `murror-platform-progress`
  worktree on `feat/marketing-site`.

## Doc pointers

- Previous doc: `Murror/docs/plans/2026-07-13-round-12-build-311.md`.
- This doc: `Murror/docs/plans/2026-07-14-builds-312-324-mobile-polish.md`.
- Final mobile PRs in this batch: #704 through #709, #710, #712, #714, #717 through
  #728.
- Backend reporting commits: `8edb972`, `918216a`, `2976e2c`.
