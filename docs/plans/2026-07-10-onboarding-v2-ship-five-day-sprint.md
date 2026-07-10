# 2026-07-10: Onboarding v2 ship, five-day sprint (07-05 to 07-10)

The sprint that took the "Option C orbital" onboarding from an approved prototype to the OFFICIAL onboarding on web production and a device-polished mobile TestFlight, plus the prod incident that surfaced along the way and a large device-QA fix train.

## Headlines

- Web onboarding v2 is LIVE ON PRODUCTION AT 100% (PostHog flag `onboarding_funnel_v2` serves `test` to everyone; v1 = control on hold at 0%, one-call rollback via flag 752862).
- Mobile port shipped through NINE TestFlight builds (284-292) in ~36 hours of device-QA loops with Astro.
- A founder's letter (with rainbow chat-style streaming reveal) now sits between Act 1 and Act 2 of the mobile flow.
- Real AI "their-side" guess is live on BOTH staging and production after untangling a prod split-brain incident.
- Crisis-safety client net shipped on BOTH platforms (launch blocker found by a Heart safety review).
- New hard process rule + commit hook: blast-radius protocol (every task proves it broke nothing else).

## Timeline by day

### 07-05 (backend fixes + billing)
- murror-api staging: milestone de-dup scoped to current run (6cdd38c), stop resurfacing CANCELLED/EXPIRED challenges (c3054af), milestone wrap-up fires on connection-only streak days (c6c7fef).
- murror-api production: Stripe billing portal session + customer search (e9388f8, 876ece3).

### 07-06 (funnel package)
- `onboarding-funnel` repo: framework-free core (tween engine, scene state, canvas renderer, beat state machine) + React app shell + 19 beat components + mock services + docs (A/B spec, web integration guide, mobile port guide). PR #1. 40/40 tests, visual parity vs prototype v9.

### 07-07 to 07-08 (web integration + Act 2/3 redesign)
- Vendored the package into `murror-platform` web-client (worktrees `murror-platform-onboarding-v2`, `-act23`, `-go-live`).
- Act 2/3 chromeless redesign: gradient wash, vertical single-select lists w/ auto-advance, grid multi-select, DOB wheel, identity beat (butterfly avatar + username + DOB 16+), personalized insight payoff beat, per-question + scroll-guardrail analytics, VI/JA copy parity.
- Codex refinements: orbital fade-in/desktop width, uppercase CTAs, tagline placement, SE-size fixes, signup handoff stabilization, avatar/billing reconciliation.

### 07-09 (go-live day + prod incident + mobile blitz)
- PostHog experiment 382063 launched 50/50 (~01:43 PT), then Astro decided v2 = OFFICIAL: flag to 100% test (~02:25 PT). Control preserved for rollback.
- PROD SPLIT-BRAIN found + fixed: a 07-07 rogue `kubectl set image` had put an unmerged branch image on sfo2 murror-api and partially flipped api.murror.app DNS back to sfo2 (the decommissioning cluster). Fixes: api.murror.app A record -> sgp1 via Cloudflare API (memory corrected: murror.app is on Cloudflare, NOT Squarespace), viasr their-side deployed (staging-27d3f4b), murror-api prod cherry-pick (prod-ba51768), sfo2 scaled to 0. Real AI guess verified live on prod (all 4 chips, 200s, zero fallback).
- viasr staging: their-side endpoint reconciled (#579 -> 96027f4); CI kubeconfig asserts sgp1 (cdff8c8). Root cause of the drift class: PRs defaulting to base `develop`, which deploys nowhere.
- CRISIS GAP closed on both platforms (client-side `getCrisisSignal` pre-check before any AI guess; reduced-motion race closed): web a79b0ab2 (Codex), mobile 6fd6f97.
- Mobile: fmt/Xcode-26 Podfile patch (0afa43a), full v2 wiring (ff66ffc), then TestFlight builds 284 (first upload), 285 (entry gating + web-fidelity rework: MUButton pills, Reanimated fades, keyboard, v2 signup screen), 286 (7 screenshot-grounded fixes: Skia z-order, avatar corner-mask, trial-page skip, wash paywall, pill rows), 287 (thin connection line, CTA baseline const, visible hook fade, sign-in hatch, FOUNDER LETTER + rainbow streaming via the chat MarkdownStreamingText, extended additively w/ fontFamily/fontStyle props, chat byte-identical).

### 07-09 evening to 07-10 (device-QA train, builds 288-292)
- 288: BeatReveal soft-fade system (CTA always mounted, opacity-only = no layout jump), username centering, paywall "Use a different account" (v2-gated), Settings v2 launcher removed, + 4 app-QA fixes (streak milestone resets to 3 per run display-only, For Us reflect-card body un-gated, mental check-in chart centers active month, prompt refresh nonce rotation).
- 289: COMBINED build with a second session's PR #610 (Reflect-calendar butterfly forward-projection, prompt size-1 edge) + v2 sign-in screen (shared OnboardingV2AuthScaffold; auth mirrors save-progress sign-in; control untouched) + Terms/Privacy on signup + fade slowed to 1500ms. First real test of the blast-radius reconciliation (zero overlap proven; 130/130 specs together).
- 290: voice locale fix (recognizer followed app UI language which DEFAULTS to 'vi' -> English speech garbled; now device locale), zero-run milestone butterfly, in-chat persona persistence (was in-memory only; hydration clobbered it). Minh-niem "backend 400" comment proven STALE (accepted since 06-15); regression test PR #566 merged.
- 291: voice auto-punctuation (fork never set addsPunctuation; patch-package on @dev-amirzubair/react-native-voice), recognizer follows IN-APP language via i18n.language (Astro's decision; cannot revive the vi-default garble), persona sheet pinned CTA + scrollable bio.
- 292: voice-dies-after-persona-switch (rn-video AudioSessionManager.unregisterView evaluated the disableAudioSessionManagement opt-out AFTER removing the view; patch captures it before), MTC<->For Us "We did it" sync (refetchType 'all'), pause-care-tips hidden, gesture icon centered, challenge card redesign (primary "Add a photo" + side-by-side "A thought"/"Done").

### 07-10 (gesture redesign + translations, in flight)
- "Send a little something" redesign approved via heart+prism panel: new 6-gesture palette (thinking-of-you, im-here, hug, warm-drink, goodnight, rooting-for-you; retiring the coaching-toned/romantic-coded options), 3 mechanics (hold-to-send, echo back, 24h fading warmth), hard rules: no tallies/read receipts.
- Backend HALF SHIPPED: murror-api #567 merged to staging (ceca904): personalized bilingual per-gesture push copy, fail-open sender-name lookup. KEY FINDING: the live app sends gestures via legacy POST /:id/messages which fires NO push; the push endpoint POST /:id/icon-message was never called. Mobile build repoints the send.
- VI/JA translations: onboardingV2 namespace (102 keys) PR #620 open (founder letter in the intimate "minh" register); relationship.memories namespace in flight. i18n gap = VI users saw English through the entire funnel.
- Settings "Update your profile" -> v2: BLOCKED on scope. Gender/goals/interests/characteristics persist only via submitOnboarding (no per-field endpoints). Recommendation: Option B now (v2 look, same redo save path v1 uses) + Option C follow-up (per-field PATCH endpoints).

## Key gotchas recorded (for future sessions)
- xcodebuild CLI does NOT run scheme pre-actions: pin `/tmp/envfile` before every archive.
- Worktrees do not share node_modules: after merging a PR that adds a dep or patch-package patch, `yarn install` in the build-lane checkout BEFORE pod install/archive, then grep the patched source to verify.
- Skia <Canvas> composites above later siblings on iOS/Fabric: explicit zIndex + pointerEvents layering.
- iOS drops borderRadius corner masks at opacity < 1.
- KeyboardAvoidingView (behavior padding) overwrites its own paddingBottom: bottom gaps go on the child row.
- react-native-video reconfigures the shared AVAudioSession on last-view teardown even when every view opted out (patched).
- PostHog experiment-create auto-activates the flag: a "draft" experiment's flag is LIVE until disabled.
- PRs in murror-api/viasr default to base `develop`, which deploys NOWHERE. Base staging.
- App-language state (AppContext.currentLanguage) hardcodes 'vi'; the truthful UI-language signal is i18n.language.

## Process changes
- HARD RULE `feedback_no_regressions_blast_radius` (Astro, 07-09): 6-step protocol (map callers, gate shared changes, prove untouched paths, verify with evidence, adversarial review, report blast radius) + a PreToolUse git-commit hook in ~/.claude/settings.json that injects the checklist. Every agent dispatch carries a control-safety clause.
- Single-build lane held across two parallel sessions (the 289 combined build).

## PRs (5 days)
MurrorMobile: #600-#620 (builds, fixes, sign-in, translations). murror-api: #564 (their-side), #565 (CI), #566 (persona test), #567 (gesture push). viasr: #577-#580 + prod CI fix. murror-platform: onboarding-v2 integration + go-live branches (Codex-managed). onboarding-funnel: #1.
