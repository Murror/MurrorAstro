# 2026-08-05 — Build 416 feedback: UI polish, and the paywall footer root cause

Session followed Astro's build-416 TestFlight feedback. Everything below was
verified on an **iOS Simulator** (iPhone 17 Pro, iOS 26.4) running a locally
compiled build of trunk `4ff1572b` (= build 416). **No device verification.**

Branch: `fix/build416-feedback-ui` in the `sim-416` worktree.
Commits: `75987368` (UI), `f7050be2` (specs). **Not pushed, no PR yet.**

---

## The headline: the paywall footer was never a colour problem

Five separate attempts (builds 353, 399, 413, 415/416, plus four of mine this
session) tried to make the full paywall's sticky footer read as translucent by
tuning a blur or a gradient. All of them failed for the same reason:

**The footer was a plain flex sibling of the `ScrollView`.** In a flex column
that means it occupied its own space, so the scroll view ended exactly where the
footer began and **page content never passed behind it**. Its backdrop was bare
screen background. A fade over nothing is indistinguishable from a solid fill.

Measurement that should have caught it sooner: the entire ramp moved luminance by
**~5 units out of 255**. I read that as "black gradient over near-black content"
when the real answer was "there is no content there at all".

Fix (`subscription-screen.tsx`):
- footer `position: 'absolute'`, pinned `left/right/bottom: 0`, so it overlays
  the scroll content
- `ScrollView` `paddingBottom` grown by the **measured** footer height
  (`onLayout` + state), so the last rows are not trapped underneath
- the app's card glass recipe (`blurType="dark"`, `blurAmount={5}`,
  `overlayColor="transparent"` — identical to `custom-blur-card.tsx` and
  `locked-card.tsx`) behind the existing gradient

**Why the blur and the fade are two layers:** iOS renders a `BlurView` as a
`UIVisualEffectView`, which ignores a `CALayer` mask, so a blur cannot be
feathered and has a hard edge wherever it starts (`locked-card.tsx:34`). That is
what killed builds 353 and 399. The blur supplies glass texture; the **gradient**
supplies the fade to zero. Splitting them is the only way to get both on iOS.

Verified: laurel sharp above the footer and frosted through the glass below it;
footer text legible; content visibly passing behind while scrolling.

---

## Home background

Two separate causes, both fixed.

1. **Home never showed the shared tint at all.** `home-orbital-background.tsx`
   painted a flat `#05070F` base at `absoluteFill`, which is opaque, so it
   covered the `#000000 -> #323245` gradient `home-screen.tsx` already wrapped
   the screen in. Now renders the shared `<BackgroundGradient />` as its base, so
   there is ONE derivation of the app background instead of a third copy.
2. **Too bright at the bottom.** Aurora washes reduced (top rest/min 0.30 ->
   0.14, peak 0.50 -> 0.24; bottom rest/min 0.26 -> 0.07, peak 0.42 -> 0.13),
   then the shared gradient's bottom stop taken `#323245` -> `#15151D`.

Measured at `x=10pt` on Home (verified as Home first, via the "GET HELP" glyph):

| y | original | after washes | after darker stop |
|---|---|---|---|
| 300 | (31,22,42) | (23,19,32) | **(13,10,19)** |
| 600 | (42,36,57) | (36,35,50) | **(16,15,22)** |
| 780 | (56,48,76) | (48,46,66) | **(23,20,31)** |
| 860 | (62,52,84) | (53,50,73) | **(25,23,33)** |

🚨 **`background-gradient.tsx` has 26 consumers**, not the 8 first reported.
Onboarding (`language-screen`, `notification-screen`), all Diary screens,
Reflection, Galaxy modal layer, settings, knowledge, memory-room and more all get
the darker bottom. Deliberate — a Home-only override is exactly what caused
cause (1) — but worth eyeballing those screens.

---

## Nav pill and the butterfly FAB de-purpled

R10 "Retint, don't rebuild" applied a purple aurora on the
`enable_home_state_of_world` arm. It lived in **two independent copies**, which is
why fixing the nav did not fix the FAB:

- `tab-controller.tsx` — nav pill tint + focused-tab star. Gated behind a new
  `NAV_AURORA_RETINT_ENABLED = false`.
- `murror-bubble.tsx` — the FAB's own `fab-aurora-tint`. Gated behind a local
  `auroraRetintEnabled = false`, kept **separate from `chooserEnabled`** because
  that flag also drives the FAB's behaviour, not just its look.

R10 code kept behind the switches rather than deleted; this is a design decision,
so it should be one flip to reverse. Measured nav pill fill (18,17,23), spread 6.

---

## Paywall variants unified

`use-different-account` was gated on `(fromOnboardingV2 || hideCloseIcon)`, so the
cold-start gate and the Settings-initiated paywall looked like two different
screens. Now unconditional: one appearance, every entry point.

⚠️ That link **signs the user out** and is now reachable from Settings. If
unwanted, restore the condition rather than deleting the link.

**There is exactly ONE full paywall.** Verified four ways: registered routes
(`SubscriptionScreen` only; `SubscriptionManagement` is manage-plan), both entry
points (`open-upgrade.ts:52` and `upgrade-sheet-host.tsx:268` both
`present('SubscriptionScreen')`), locale-string usage, and filenames. No
duplicates exist. `upgrade-sheet.tsx` is a `type="partial"` sheet, not a page.

---

## Memo last-word flicker

The stated hypothesis (completion callback never fires) was **wrong** — it fires,
and `AnimatedFadeWord`'s effect deps are stable. Real mechanism: the
`Animated.Text -> Text` **element-type swap** on settle. These words render inside
a parent `<Text>`, which RN flattens into one attributed string, so each
retirement rebuilds it. Every word does this; the LAST word's rebuild has no
other motion to mask it.

Fix: keep `Animated.Text` with a plain `opacity: 1` (not the `Animated.Value`), so
the element type never changes and the per-frame commit is still removed.

Blast radius **proven to be one screen**: `revealStyle="fade"` is passed only by
`personal-note-letter-screen.tsx:331`. AI chat (`multi-bubble-ai-message.tsx`) and
onboarding (`founder-letter-beat.tsx`) route to `AnimatedMarkdownText` /
`AnimatedWord`, untouched. **Not device-verified.**

---

## Pronouns (viasr-api, UNCOMMITTED)

Root cause was better than assumed. `app/prompts/relationship.yaml:890` literally
instructed the model:

> Use "you" for the primary user and "he/she" for the other person

while also forbidding the username — forcing a gendered guess for a connection
whose gender we hold no data for. It was the **only** such instruction in the
whole prompts + services tree.

Fixed by layer 1 of the agreed design (structurally unable to need a pronoun):
address the connection by FIRST NAME, explicitly forbid third-person gendered
pronouns, they/them fallback. Ships by **API deploy, not TestFlight**.

Still uncommitted in the `viasr-api` working tree.

---

## MTC card overlap: NOT reproduced, no fix written

Six prior fixes have failed. This session deliberately did not write a seventh.

Built a temporary harness injecting mock cards at the `usePinnedFeed()` boundary
(leaving `pinned-compact-feed-card.tsx` byte-identical) and tested four
configurations on the simulator:

| Config | Result |
|---|---|
| 3 journal cards at rest | face 289pt vs `CARD_FACE_WIDTH` 290, ~12pt gap ✅ |
| paging 1 -> 2 -> 3 | clean ✅ |
| hard fling past the last card | bounced back, nothing vanished ✅ |
| 3 `moment` cards, 3-photo fans | fan inside the card, no overflow ✅ |

Harness fully removed before committing (zero references remain).

**Eliminated with proof:**
- the patched `reanimated-carousel` opacity hunk — only runs for
  `mode="horizontal-stack"`; this rail passes no `mode`
- `Dimensions` at module import — build-414 telemetry says `screen_width 402`
- the `Number.MAX_SAFE_INTEGER` parked-sentinel theory I raised and then
  **downgraded myself**: parking only ever targets FAR, already-offscreen
  indices, so it has no visible effect. See
  `incident_mtc_card_vanish_parked_sentinel.md`.

🚨 **The build-414 geometry telemetry is unreliable.**
`reportGeometryOnce` (`pinned-compact-feed-card.tsx:128`) returns early when
`measuredSlotWidth <= 0`, so it **structurally cannot report a bad frame**. The
in-code comment states "the GEOMETRY IS ALREADY CORRECT" as settled fact; it is
not.

**Recommendation instead of a seventh fix:** a latching diagnostic recording the
real max per-item `animationValue` and measured face/stride, reported when the
overlap happens on Astro's device.

---

## Verification

- `yarn tsc --noEmit` clean
- `eslint` on all changed files: 0 errors, 1 inline-style warning
- targeted jest, 5 suites, **86 passed, 0 failed**
- Release simulator build succeeded; staging host `staging.api.murror.app`
  confirmed baked in the native binary (Alpha and prod hosts absent)

### 11 specs rewrote, not deleted

The blast-radius gate caught these. They locked the OLD design Astro overrode:
`tab-controller.spec` (aurora tint + 6 focused-star cases), `murror-bubble.spec`
(FAB tint x2), `subscription-screen.spec` ("does NOT render the link on the
v1/control paywall (byte-identical control)"). Each assertion inverted with the
reason recorded inline.

⚠️ That control test's name suggests the conditional link may have been a
deliberate A/B control. Worth confirming with Astro before merge.

---

## Not done / open

- **Not pushed, no PR, no build number bump, no archive.** Single-build-lane
  requires: PR to `staging-environment-setup` -> merge -> `ios-next-build.sh`
  -> bump PR -> merge -> archive from `build-lane` -> upload.
- Blast-radius step 5 (**adversarial review of the diff**) not yet done. Required
  before any archive.
- `support-screen.tsx` feedback-URL change still uncommitted in `build-lane`
  (with a `Podfile.lock` artifact that should NOT be committed).
- viasr-api pronoun fix uncommitted.
- Blur top-edge taper: Astro dropped the request. Approaches, if revisited:
  stacked blur bands of decreasing `blurAmount`, or a lower `blurAmount`.

## Gotchas worth remembering

- **Verify which screen is on the simulator BEFORE trusting a pixel sample.** I
  reported numbers from the wrong screen three times (a note letter, and the
  paywall twice). A dark-pixel probe is not a screen identity check; assert on a
  known glyph.
- `grep ... | head` reports `head`'s exit status, so `|| echo` never fires. Do not
  infer "no errors" from a silent `||` branch.
- Settings -> UPGRADE PREMIUM routes to the full-screen paywall, not the sheet.
- The cold-start paywall gate can be a HARD gate on staging (no close button,
  because RevenueCat products cannot load), which blocks reaching Home.
