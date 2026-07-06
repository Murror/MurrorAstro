# 2026-07-04/05: Builds 271-276, backend challenge-cancel + milestone fix, analytics buildout

Context: continuation of the post-269 flip-card work. Six TestFlight builds (271-276) plus
backend features and a full mobile+web analytics buildout. All mobile PRs target
`staging-environment-setup`; backend PRs target `staging`; web PRs target
`feat/web-staging-refresh-2026-07-02`.

## Build 271 - app-review flip/card fixes (6 items)
Astro's build-269 review. Files: `MurrorMobile/src/screens/main/Diary/insight-card.tsx`.
- Scrollable challenge back face, removed "Tap to flip back" hint (items 1a/1b).
- Front title centered, dropped "tap for details" hint, centered moments line, first attempt at
  Share-a-thought tap fix via CTA-container zIndex (item 2). NOTE: the zIndex fix was applied 3
  levels too deep in the view tree and did NOT actually work at the touch level - see build 274.
- MTC<->For Us sync for Add-a-photo + Share-a-thought via `refreshChallengeCard` (item 3).
- Streak: focus-refetch + milestone-completed progress-bar state (item 4).
Commits f96ee96..1cab3f7. Build 271 shipped.

## Build 272 - sync consolidation + challenge decline + onboarding port
- `syncConnectionCardCaches` shared util; migrated ~10 mutation hooks (movie/song/location
  invites + create-journal + submit-answer) so every card type syncs both feeds (PR #563).
- Challenge dismiss on MTC wired to a NEW backend cancel endpoint with a confirm dialog (PR #563).
- Onboarding web-parity: profile screen (display name + DOB + 3 butterfly avatars reusing Codex's
  PNGs), dropped last-name + birth-time; Our Approach copy swap (PR #564, avatar-URL fix 3fb0df7).
- Backend: challenge cancel/decline endpoint `POST :connectionId/challenges/:challengeId/cancel`,
  schema migration adds CANCELLED to ChallengeStatus + cancelled_at/by, first-ever challenge
  notification (copy of movie-invite-cancel), one endpoint for PENDING-decline + ACTIVE-end, either
  party, keeps progress+journals (murror-api PR #560, commit b81609f).
- Backend: onboarding-complete DTO accepts optional `avatar` URL, 3 preset butterfly PNGs hosted in
  Supabase Storage dev+staging+prod (murror-api PR #559, commit ff93bb1). Prod upload done live.
- Also reconciled the murror-api subscription-cancel branch fork + promoted viasr artwork removal
  (PR #577) to prod.
Build 272 shipped.

## Build 273 - milestone bug fix + streak unify + We-did-it + Read More
- Backend milestone de-dup bug: `hasWrappedUpWithThreshold` checked ALL-TIME history, permanently
  locking out re-earning any milestone after the first. Prod milestone wrap-ups had been dead since
  2026-03-19. Fixed by scoping the de-dup to the current run via a shared grace-aware backward walk
  (murror-api PR #561, commit 6cdd38c). ~8 prod users historically affected.
- Streak cache consolidation: Home + Reflection unified onto one query window/key + `syncStreakCaches`
  util; killed the two-caches drift; auto-sized limit to window (PR #568, commit 96d9f9a).
- We-did-it idempotency: 400 "already completed" now treated as success (no false error toast),
  narrowed to the exact message so status/day 400s still surface (PR #566, commits bbd65a8+7aabf6f).
- Read More overlap: reflect-card expandable quote wrapped in bounded ScrollView so it stops
  overlapping SHARE YOURS (PR #567, commit 460b8c7).
Build 273 shipped. Backend deployed to staging (image 0.186.0-staging, migration applied).

## Build 274 - Mini challenge tap + streak goal/overline/milestone ladder
- Share-a-thought tap: root cause was the build-271 zIndex fix sitting 3 levels too deep to compete
  with the flip overlay (never worked at touch level). Fixed with `pointerEvents:'box-none'` on the
  overlay during the justCompleted prompt so taps fall through to the CTA (PR #571, commit d9fafe4).
- Streak goal regression (from build 273 cache consolidation exposing the build-271 milestone-complete
  clamp): restored Day-X-of-Y goal, celebration only on the genuine milestone day; overline title;
  upcoming-milestone ladder on the calendar reusing existing WrappedUpIcon/UpcomingWrapUpIcon
  (PR #572, commits f0d947a/8395a81/756868c). 180/365 markers out of calendar window (known).
Build 274 shipped. NOTE: PostHog was reverted from 274 (Metro bundle break) then re-fixed for 275/276.

## Analytics buildout
- Mobile: added PostHog fanned out from the single `Analytics` dispatcher (no autocapture, no session
  replay, production-only) - first attempt PR #570 broke the iOS archive at the Metro bundle step
  (`@posthog/core/surveys` barrel-import), reverted (PR #574), re-fixed via scoped deep import
  `posthog-react-native/dist/posthog-rn` + ambient d.ts (PR #575, commit 40c8fba).
- Web: Mixpanel added as a 5th fan-out destination alongside PostHog/Meta/TikTok/CAPI (PR #160,
  commit 9f2932b).
- Identity fixes (audit-found bugs): mobile PostHog + web Mixpanel never called identify()/reset(),
  orphaning all their events as anonymous. Wired both through the same Supabase-uuid identify + reset
  on logout (mobile commit 79957e5 in PR #575; web PR #162 commit 45ec705).
- Ad-pixel scope-down: split ConversionName into disjoint Ad vs Internal types (compile-enforced),
  added `fireInternalConversion` (PostHog+Mixpanel only), moved OnboardingCompleted + both StartTrial
  off Meta/TikTok/CAPI to internal-only; kept CompleteRegistration on ad networks (Astro decision).
  FTC-pattern (BetterHelp/GoodRx) risk mitigation (web PR #161, commit e7f721e). The 3 direct
  trackTikTok* purchase calls are INTENTIONALLY left firing per Astro (see memory).

## Build 275 - reflect-card overlap + CR popup + voice hardening
- Reflect/reflect-waiting carousel overlap: identical derived cardIdentityKey meant recycle-reset
  effects never fired on transition. Fixed by passing `cardIdentityOverride={item.cardKey}` for every
  card (PR #576, commit 05539e1).
- CR SHARE YOURS: suppress the redundant invite popup on the responder path (partner already
  completed) + auto-share back (PR #576, commit 0f1801e).
- Voice mic dead tap: diagnostics + hardening (Sentry breadcrumbs, try/catch, 3s watchdog) so a dead
  tap gives feedback + reports where it dies (PR #577, commit 9b35d12).
Build 275 shipped.

## Build 276 - voice New-Architecture library swap (the actual voice fix)
- Root cause: `@react-native-voice/voice@3.2.4` (abandoned, legacy RCTEventEmitter) silently drops
  native speech events under RN 0.77 New Architecture, so the recognizer starts but nothing calls
  back = visible-button-dead-tap. Swapped to `@dev-amirzubair/react-native-voice@1.0.4` (New-Arch
  fork with real TurboModule codegen, drop-in identical API); deleted the old Android-only patch
  (PR #579, commit 6d06734). Build 276 = its own isolated build; archive SUCCEEDED (TurboModule
  RNVoiceSpec compiled+linked = strong native verification). Superset of 275.
- Toolchain note: `bundle exec pod install` in a worktree failed on objectVersion 70 (worktree-env
  artifact); on the main checkout it succeeds (xcodeproj 1.27.0). After pod install re-verify the fmt
  consteval patch. See memory incident_voice_newarch_library_swap.

## Verification
Every build: tsc + lint + targeted jest + (for 274 onward) a REAL Metro bundle preflight before
archive, and a REAL archive as the native-compile gate. All 6 uploads confirmed
`** EXPORT SUCCEEDED **`. Backend milestone + challenge-cancel: 115 + spec tests green, deployed to
staging. Analytics: reviewed clean, identity fixes verified, ad-pixel type split compile-enforced.

## Open / heads-up
- Voice: build 276 needs on-device confirmation (Astro taps the mic). Android voice with the fork
  needs its own device check. If confirmed, the 275 diagnostic scaffolding can be trimmed later.
- Prod milestone fix (PR #561) is staging-only; promotes to prod under freeze-with-approval.
- Redis rotation (task #68) still pending Astro go.
