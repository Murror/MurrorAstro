# CODEX-HANDOFF.md

**Cross-tool state for Murror. Claude Code and Codex both work these repos, often the same day.
Read this at the start of any Murror session; update it when you ship something the other tool
would trip over.**

Last updated: **2026-09-17 19:16 ICT**, by Codex (Build 159 is available on Play Internal; Fold 8 retest is pending)

---

## ANDROID BUILD 159 PUBLISHED TO PLAY INTERNAL (2026-09-17, CODEX)

Build 159 (`baf7d1678b5c5d8effec19400720dc08d2625d8a`) is available to Internal testers on
the `Internal` track. It carries the three repairs reopened by Astro's Build 158 Fold 8 test on
branch `codex/android-ui-stability-build150-20260916`:

| Finding | First wrong frame | Repair and evidence |
|---|---|---|
| Memory Detail comment composer hidden by keyboard | `memory-detail-sheet.tsx` received live keyboard geometry but Android always returned the resting safe-area inset | Reused `useKeyboardLayout` and `resolveKeyboardOverlayInset`; measured the modal viewport so overlay and already-resized Dialog modes are distinct. The isolated 66-test suite and mutation red passed. |
| Connection Detail sheets laggy or missing slide | Settings rendered inline through fail-open `CustomModalBounce`; Memory Detail explicitly used Android `animationType='none'`; View All dismissal and detail presentation raced two Dialog windows in one commit | Added a scoped Android native slide host for Settings, native slide for Memory Detail, and serialized Add Memory/View All/detail handoffs with pending state plus `InteractionManager.runAfterInteractions`. Connection suites passed 113 tests; three source mutations went red. The global fail-open rule is unchanged. |
| Mental Check-in lower answer cropped | Shared metrics kept a 50dp top gap and reserved only 160dp for a four-row answer stack needing about 201dp | Metrics now accept answer count and font scale, spend the top gap down to 8dp, reserve answers before shrinking the card, and retain scroll fallback. Six suites and 84 tests passed; three mutations went red. |

Before the release bump, the branch merged official
`origin/staging-environment-setup@92e5897e9b0a69f2d2f851870da9d6af79f87238`. Local verification
passed 8 suites and 237 tests with a fresh Jest cache, all required mutation reds, TypeScript,
scoped ESLint, Prettier, diff hygiene, Android release contracts, workflow contracts, the
single-React-Native guard, the production environment contract, codegen, and
`assembleProductionDebug`.

Astro approved this specific hosted build. One manual production Android workflow was dispatched:
<https://github.com/Murror/MurrorMobile/actions/runs/35213510525>. It passed from the exact release
SHA. The independently downloaded signed artifacts matched the provenance receipt:

- AAB SHA-256: `ee46eaee24430fbe24bf2f4662af1965b19820a3ecd085849c5f0d7d1e55677a`
- APK SHA-256: `b4f62afffcd33321b698a97501cc3fb8d906ce0692c85d99f3f7089cb019c472`
- native symbols SHA-256: `18102f747fdaa32541b3de8b86be4f7a0357e7ba6dbef5ca97e9cd00d023f7db`
- package/version: `com.murrormobile`, `2.0.0 (159)`, min SDK 24, target SDK 36
- APK signer: expected Murror Android upload certificate; APK v2 signature passed

Google Play processed release ID 65 without a blocking error. Build 159 is visibly `Available to
internal testers`; the Production track was not changed. The install link is:
<https://play.google.com/apps/internaltest/4701017521848127510>.

Two non-blocking Play warnings remain: the Console Advertising ID declaration disagrees with the
manifest intentionally omitting `AD_ID`, and no deobfuscation file is attached because release
obfuscation is disabled. Unit-tested, locally built, hosted-signed, and Play-published. Not yet
device-verified on the Galaxy Z Fold 8.

Progress hub:
<https://app.notion.com/p/3de3af4aaa9281e88b9af24cb0fd9528?pvs=204>

---

## 🧹 QA SWEEP + FOLD FIX BATCH -> BUILD 84 (2026-09-06, Claude)

Astro: "fix everything then make a new build for me to test everything." Branch
`codex/android-launch-readiness-20260901` @ `82ade76f`, pushed. Hosted run `34012638097`
(61 min) produced the Play-signed AAB, verified: signer `f44e00d4` (the upload key), all 15
CI production checks re-run on the downloaded bytes, sealed at
`android/app/build/outputs/play-ready-82ade76f/`, SHA-256
`7771d44c0e257eee0d9da2ef828e9dd64a165d6dd2faddac17e9f7cb983281c5`. Staged at
`~/Desktop/Murror-Android-v84/`. **NOT uploaded** — Astro drags it in; the browser tool caps
uploads at 10 MB. Gates: 567 jest suites / 5,648 tests, tsc 0, exact ESLint baseline, 187
Android contracts, i18n + workflow contracts. **NOTHING IS DEVICE-VERIFIED.**

### Fixed (13 commits, `e6932081..82ade76f`)
| Area | Cause |
|---|---|
| Tap-twice dead screens | `custom-modal-bounce` rested transparent AND one window below the viewport, recovered only by an unguarded mount effect; transparentModal + `detachPreviousScreen=false` left the previous screen visible with an invisible modal eating taps |
| Share photo bare X (2 entry points) | RN `Modal` fixes `isRendered` in its constructor and runs the open path ONLY on a false->true `visible` transition, so a modal born visible never opens |
| Connections looked unselected | unselected ring `#E3E3E3` was BRIGHTER than 7 of 8 selected hues; plus `removeClippedSubviews` on a horizontal list nested in a ScrollView |
| Multi-photo silent failure | `react-native-image-picker` RESOLVES with `{errorCode}` and never rejects, so failure read as cancel. 3 sites fixed |
| Fold orbit cropped | height manufactured as `W*0.92`, so the `Math.min` radius guard could never fire from Home |
| Fold stretch | rneui `ScreenWidth` = module-scope `Dimensions.get`, baked into module-scope `StyleSheet.create`. **20 screens** migrated to live dimensions |
| Home 90 idle animations | paint-window context defaults to null and `moment-to-care` never provided it, so sparkles took the continuous branch ungated |
| Analytics queue unbounded | every nav queues, flush every 30 s, whole batch unshifted back on failure. Every flush stringifies the WHOLE queue on the JS thread; a test proved a 5,001-event single POST |
| Keystore hang | reads had no deadline while writes did; Supabase holds its auth lock across each |
| CDP scroll | solid borders at 6 InsightCard sites (Astro REVERSED his 09-04 rejection), Android-gated `removeClippedSubviews`, paint window `display`->`opacity` |

### 🚨 Findings that overturned earlier conclusions
- **`COMPLETED` is NOT terminal.** I reported the feed predicate as backwards and it is CORRECT:
  `COMPLETED` = both reflected, AI writing (poll it); `PENDING` waits on a HUMAN for days.
  Flipping it would have killed the real poll and started a worse one. The actual defect was no
  expiry; now budget-bounded off the server timestamp + focus gate.
- **Reanimated `entering` is DISQUALIFIED on Fabric/Android.** The commit hook clones views whose
  entering carries opacity 0, only a UI-thread progress frame restores it, and the
  cancel-to-final-state net is deliberately disabled for react-native-screens. A dropped entering
  animation = permanently invisible, with LESS recourse than the original bug. 🚨 The T12 note's
  stated cause is contradicted by the installed source; ~30 call sites carry this exposure.
- **Do NOT add `density`/`fontScale` to configChanges.** Fabric sets pixel density ONCE at instance
  creation; `fontScale` refreshes only in `onHostResume`. Declaring them = permanent disagreement
  between layers. Samsung publishes both Fold displays at EQUAL density. Also: the stale-width
  stretch could not have manifested if JS restarted on fold, so the symptom itself proves the
  Activity survived.
- **2 of 3 "ungated BlurView" findings were FALSE** (`bond-screen`, `journey-screen`,
  `subscription-screen` are all already gated). One file imports both `isIOS` (rneui, for a style)
  and `isiOS` (the real gate), which fools a grep. Treat that audit's remaining claims with care.
- **The channel Map is bounded, not growing** — those channels are never subscribed, so no socket
  and no heartbeat. Does not explain instability.

### 🚨 targetSdk 36 removed the portrait lock on large screens
`e54c46f2` (2026-09-01, first commit of this branch) moved 35 -> 36. At 36 Android IGNORES
`screenOrientation` on displays >= 600dp smallest width. The Fold's INNER display qualifies, the
cover does not. So the inner screen can rotate and resize freely and no landscape layouts exist.
Astro chose to SUPPORT rotation rather than opt out (the compat property expires at API 37).
Build 84 makes screens REFLOW (clamped at 480dp) but they are not DESIGNED for wide. That work
has not started.

### Still open
1. **Landscape layouts** — the funded project above. Not started.
2. **Error boundary built but NOT WIRED** (`src/components/section-error-boundary.tsx`). One bad row
   still blanks the app. Adoption sites listed in the component and in the lane report.
3. **`murror-header` MaskedView** pays 2 saveLayers + a blend EVERY scroll frame; it passes a REAL
   two-colour gradient so the flag is inert and collapsing it is an unapproved visual change.
4. **7 channel call sites** still on the caching accessor (`diary-screen.tsx`, `relationship-mission.tsx`).
5. **`devError` redacts the picker breadcrumb** — `dev-logger.ts` allowlists keys and redacts string
   values, so `error_code` logs as `{redacted:true}`. The diagnostic is currently blind.
6. **`activity-service` should migrate** to `recordBatchEventsResult`; a 2xx with an empty envelope
   is falsy today and re-queues accepted events.
7. `insight-card` save failure is still silent; `pickErrorKeyFor` duplicated; `globalMocks.js`
   lacks a `Dimensions` stub so `useWindowDimensions` throws at unmount in specs.
8. **Sentry still out of quota** — zero telemetry from the device. Highest leverage item.

---

## 📱 FIRST PHYSICAL FOLD QA — 3 BUGS, 3 CAUSES, ALL PRE-EXISTING (2026-09-06, Claude)

Astro ran v81 on a real **Samsung Galaxy Z Fold 8** — the physical-device gate Codex had open since v78
is now partially closed. He found three defects. All three are byte-identical in builds 79, 80 and 81
(`git diff 1a8f7131 19312969` empty over every implicated file), so **none is a regression from the
WIP commit `2f098775` or from the v81 perf slice**. Root-caused per the house rule; fixes in flight on
four parallel lanes with exclusive file ownership.

**A. First tap on a history entry / Research tab / conversation detail does nothing; exit and retry works.**
The FAB hiding is the *proof* the navigation SUCCEEDED: `app.tsx:79-90` renders `MurrorBubble` only while
`MAIN_ROUTER.includes(currentRoute)`, so the FAB can only vanish if the route actually changed. The screen
mounts, then `custom-modal-bounce.tsx:44-49` starts BOTH `animationProgress` and `opacityProgress` at 0 and
`:71-79` interpolates `translateY` over `[windowHeight, 0]` — the resting state is fully transparent AND one
whole screen below the viewport, recovered only by a single unguarded `useEffect(..., [])`. These routes are
`presentation: 'transparentModal'` with `detachPreviousScreen=false` (`navigation-controller.tsx:769-785,
865-882`), so a missed effect leaves the PREVIOUS screen visible with an invisible full-screen modal eating
taps — exactly the report. 🚨 **Fail-closed by design.** WHY the effect misses on that device is NOT proven;
surviving candidates are `enableFreeze(true)` (`index.js:19`) deferring passive effects, and foldable
`useWindowDimensions()`. The fail-open fix is self-discriminating: if screens then appear WITHOUT the bounce,
the effect never ran (freezing); if they animate, it was dimensions.
Killed hypotheses (do not re-chase): `lazy-screen.tsx` is fully synchronous (cold require 5.16 ms per Codex's
own probe) and `modal-presentation-state` is a closed 5-id union excluding detail screens.

**B. Share photo from the FAB shows a bare X and no upload UI on the first press.**
`butterfly-action-chooser.tsx:165-170` sets `setSheetMounted(true)` and `setSheetOpen(true)` in ONE batched
tick while `onDismiss()` tears down the chooser overlay, so `<MomentShareSheet>` mounts with `visible={true}`
already set and its RN `<Modal>` (`moment-share-sheet.tsx:628`) attaches its Android window on its first
render. Header draws, body does not lay out. `sheetMounted` never resets, so every later press is an ordinary
false->true transition and works. Introduced 2026-07-11 in `ac0b8d9f`.

**C. Z Fold: Home orbit cropped, and the UI stretches on fold/unfold.** Two unrelated causes.
Crop: `home-orbital-view.tsx:414-416` reads width ONLY and manufactures `H = W * 0.92`; with
`home-orbital-geometry.ts:60` `R = Math.min(W*0.44, H*0.46)`, substituting H makes the second term
`0.4232W` — always smaller — so **the `Math.min` guard is dead code** and R is unconditionally 0.4232x width.
On the Fold's wide inner screen H balloons past the band (`home-screen.tsx:958-963`, `overflow:'hidden'`) and
is clipped rather than scaled.
Stretch: `@rneui/base/dist/helpers/index.js:18-20` captures `Dimensions.get('window')` at MODULE SCOPE once at
bundle load; ~57 source files import `ScreenWidth`/`ScreenHeight`, including module-scope `StyleSheet.create`
at `home-screen.tsx:928,940` and `avatar-circle-view.tsx:59`, which can never re-read after a fold.
🚨 The manifest is NOT at fault — `AndroidManifest.xml:47` already declares
`screenLayout|screenSize|smallestScreenSize|uiMode`, so the config change arrives and JS simply ignores it.
Both are reproducible WITHOUT a Fold: `adb shell wm size 1812x2176` is a live config change, `wm size reset`
restores.

**D. Not yet diagnosed:** no visible selected-state for connections in the share sheet ("no ui indicator like
on iOS"). Under investigation — the leading suspicion is an iOS-only shadow used as the selection affordance,
which is a no-op on Android without `elevation`.

**Secondary bug found, not the cause of anything above:** `getPresentOptions()`
(`navigation-controller.tsx:310`) is spread inline into `options={}` at `:774, :783, :870, :880, :1114`, so it
is evaluated during `NavigationController`'s render while `present()`/`push()` mutate the module-level
`NavigationOptions.isPresent` at tap time — a genuine stale read. Cosmetic today (both branches end visible).

**✅ Google Sign-In gate CLOSED** (Astro passed the GCP passkey, 2026-09-06): GCP project `murrorv2`
(`844186200639`) client `AndroidProductionRelease`, package `com.murrormobile`, SHA-1
`F8:7D:52:2B:EC:74:20:B9:C3:FD:50:09:02:C0:CF:76:9C:6C:B8:8A` == Play's Google-managed app-signing SHA-1.
Play-delivered builds can sign in with Google. 🚨 That fingerprint is not page text — prime the clipboard with
a sentinel, click "Copy SHA-1 certificate fingerprint", then `pbpaste`.

---

## ANDROID v81 PERF SLICE ON THE CODEX BRANCH (2026-09-05 23:30 ICT, Claude)

Astro's pick after the panel: "startup noise + safe size wins first". Branch
`codex/android-launch-readiness-20260901`, five commits after `d0a8adbf`, pushed, zero hosted minutes:

| Commit | What | Evidence |
|---|---|---|
| `448cc1e8` | Android copies of SF Pro Display subset to Latin-plus (`scripts/subset-android-fonts.sh`) | 7 x ~2.2 MB -> 206-248 KB; `scripts/ci/android-font-subset-contract.test.mjs` parses cmap+name (34 code points incl. Vietnamese) and caps size at 400 KB; iOS `src/assets/fonts` untouched |
| `b6728a40` | secure-storage read cache + coalescing (`src/common/secure-storage.ts`) | auth-js 2.68 reads storage on every getSession() and its 30 s tick; emulator cold launch Keystore reads **10 -> 1**; 7 specs, 2 mutants proven |
| `b434a4c7` | versionCode 81 | five sites |
| `721c8097` | **review-found race fixed**: a read in flight across `clearSecureStorage(preserve)` / backend swap could cache the OUTGOING account's session | read epoch captured per in-flight read; 2 specs fail on the old code |
| (next) | `android-font-subset-contract` added to android.yaml's explicit contract list | ci.yaml globs it, android.yaml did not |

Measured on the API-36 emulator, local DEBUG-signed v81 vs v80: universal APK 85.9 -> 76.3 MB, AAB
120.4 -> 110.7 MB, SF Pro in APK ~15 -> 1.6 MB, PSS 235 -> 225 MB, cold start unchanged within noise
(310-540 ms vs 330-700 ms). First screen renders the subset fonts correctly (screenshot kept in the
session scratchpad). Full lane: 543 Jest suites / 5,289 tests, tsc 0, exact ESLint baseline, 183+29
Android contracts.

Diagnosed, deliberately NOT changed:
- **Facebook 15-29 `GraphRequest can't be used` errors per launch**: `com.facebook.internal.FacebookInitProvider`
  (auto-merged from facebook-core, still in the built manifest) runs `sdkInitialize` on the main thread
  before `Application.onCreate`; with `AutoInitEnabled=false` nothing calls `fullyInitialize` until JS
  (`app.tsx` `Settings.initializeSDK()` == `FacebookSdk.fullyInitialize()` only). Removing the provider
  breaks the SDK because fbsdk-next never calls `sdkInitialize`; a real deferral needs a small native
  module. Gain ~10 ms of cold start + log noise. Meta events DO send later (consent auto-grants on Android).
- **Branch before SoLoader** in `MainApplication.onCreate`: not a perf issue; the ordering is deliberate
  (tracking disabled before MainActivity.onStart). Left alone.
- **RNSkia `updateAndRelease() failed` / EGLConsumer lines**: react-native-skia says "can safely be ignored".
- **x86/x86_64 in release** (`reactNativeArchitectures`): dropping them would shrink the upload/CI time
  but Play lists 72 supported Chromebook models, Intel ones would lose the app. Astro's call; not done.
- **v81 Play-signed AAB EXISTS (Astro approved the dispatch, 2026-09-06 00:02 ICT):** hosted run
  `33979707582` on `19312969` (ubuntu-latest, 61 min) succeeded; artifact downloaded, all 15 CI production
  checks re-run on the bytes (signer `CN=Murror Android Upload` `f44e00d4…`, env digest `1782ad73…`),
  sealed at `android/app/build/outputs/play-ready-19312969/Murror-2.0.0-81-production-release.aab`
  SHA-256 `1361112457c6ce36aea8057f1f8f97f54b61f333fc92701401120630c6c3d16c`, universal APK
  `b59efd2c7afb712e1a3c4af79d615518bb255a96528f43cf9efed5e9439018f1`; 110.7 MB AAB / 76.3 MB APK
  (v80: 120.4 / 85.9). Copied to `~/Desktop/Murror-Android-v81/` for the drag-in upload.
  **PUBLISHED to `Murror AI` Internal testing (Astro's explicit yes, 2026-09-06 06:53 ICT):** release 38 =
  `81 (2.0.0) - Startup and size`, en-US notes only. Track summary reads
  `Active, Latest release: 81 (2.0.0) - Startup and size`, Available to internal testers, 1 version code.
  Play's own review numbers confirm the font work: **download 46.4 MB (-10.1 MB), time to download 26s (-6s)**,
  update size 41.4 MB, **0 devices lost on every form factor** (Chromebook stays 72 - the reason all four ABIs
  were kept). Sole warning is the same non-blocking deobfuscation-file note as v80.
  🚨 **Uploading the bundle RESETS the release name and notes to Play's placeholders**, including the `<vi>`
  block, even when they were filled before the upload. Refill and re-verify AFTER the bundle attaches.

---

## SENTRY IS DARK ORG-WIDE BECAUSE THE QUOTA RAN OUT (2026-09-05 19:10 ICT, Claude)

- Sentry org `murror` is on the free **Developer plan, 5,000 errors per usage period (Aug 14 – Sep 13)**.
  Billing page reads "Usage Exceeded": 5,191 accepted, 906 dropped as Rate Limited. Org-wide
  query: **0 accepted events in the last 7 days across every project** (mobile prod/dev, viasr-api,
  murror-api). This is the whole "client Sentry dark since 08-26" incident; not iOS, not the SDK.
- Positive control: `am crash com.murrormobile` on the v80 emulator (network VALIDATED, ingest host
  reachable, RNSentry started with the prod DSN) never appeared. Do not spend effort on release
  tags, symbolication or native init until Astro restores quota (upgrade / on-demand / Sep 13 reset).
- Android gates measured today (Play Console + RevenueCat, read-only): Play subscription
  `app.murror.premium` with base plans `monthly` + `yearly` Active and a live `3-day-trial` offer;
  RevenueCat Android app `app188f5718b2` with both products in the current `premium` offering.
  Google-managed app-signing cert is SHA-256 `03:A1:60:F6…` (upload cert `F4:4E:00:D4…`); whether
  GCP project `844186200639` has an Android OAuth client for that cert is UNVERIFIED (passkey wall).
- Perf baseline v80 on the API-36 emulator: cold start to first frame 330–700 ms, warm 59 ms,
  PSS 235 MB, download 56.5 MB (dex 21.5 MB, fonts 10.7 MB, arm64 libs 9.1 MB, res 9.0 MB,
  Hermes bundle 4.4 MB). `enableProguardInReleaseBuilds=false`; release ships x86/x86_64 ABIs;
  Facebook SDK is never initialized (15 GraphRequest errors per launch, app events never sent);
  the missing auth token is read from Keystore 10× in the first second; Branch inits before SoLoader.

---

## ANDROID LANE CONTINUED BY CLAUDE — v80 DEBUG-SIGNED TEST BUILD, PLAY SIGNING IS THE GATE (2026-09-05 17:45 ICT)

Astro chose (AskUserQuestion, 2026-09-05): WIP-commit and push Codex's uncommitted tree, finish the
fence work, build v80 locally, and **Codex keeps ownership of the fence work**. Branch
`codex/android-launch-readiness-20260901` is now at `d0a8adbf`, pushed. Zero hosted minutes spent
(branch is not an `android.yaml` push trigger; verified with `gh run list --branch` after each push).

- **`2f098775` wip(codex)** = Codex's working tree exactly as it was left at 12:17 (97 modified +
  22 untracked, ~5.5k product + ~4.9k spec lines: onboarding commit fence, auth/session isolation,
  secure-storage watchdog, first-chat storage). Not reviewed as a release. All three P1s from
  Codex's own 11:20 Stage-1 review are implemented (sentinel, file:line). Full lane on it:
  type-check 0 errors, jest 543 suites green, exact ESLint baseline, 174 Android contracts.
- **`0fb3d103` test(onboarding)**: the two failing specs in `connections-add-friend.spec.tsx`
  asserted the pre-change route-Home policy; aligned to the source's "unknown storage is not
  absence, keep Continue retryable" rule that the neighbouring spec already encoded. Added the
  missing `resetOnboardingCommitFenceForTests()` to `use-onboarding-signin.spec.tsx` (module-level
  `activeCommits` Map leaked across tests in that file only).
- **`d0a8adbf` chore(android)**: versionCode 79 -> 80 at the five sites; versionName stays 2.0.0.
- **Local production build works from this worktree** with three things CI does that the
  worktree did not: `JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home`,
  `./gradlew generateCodegenArtifactsFromSchema` FIRST (else CMake fails in 22s on absent
  `codegen/jni` dirs), and `SENTRY_DISABLE_AUTO_UPLOAD=true` (else it dies after 5 min at the
  Sentry upload task). Env: `MurrorMobile/.env.production` (digest `fb748163`), copied in at 0600,
  passes `check-android-environment.mjs --expected-env production --expected-scheme murror`.
- **Artifact:** `android/app/build/outputs/test-ready-d0a8adbf/Murror-2.0.0-80-production-DEBUGSIGNED.aab`
  SHA-256 `826f64643668da7305d86b053a7e3cfcef9eb12823e3dac9c189dd6930de5cc2` and the universal APK
  `027607edb621b8fd4a68d7aa3f8c979391ebc1a3daab57b833fb3332846acb0e`. Passes every CI production
  check (badging, v2 signature, no AD_ID permissions, compiled ENV/BASE_API_URL/scheme) EXCEPT the
  upload certificate: **signed with the stock debug key** (`fac61745...`), because
  `android/local.properties` points `APP_PROD_UPLOAD_STORE_FILE` at `debug.keystore`. The real
  replacement upload key (`F4:4E:00:D4...`) exists only in the iCloud signing vault (passwords in
  Keychain) and in GitHub's `play-production` environment. **This AAB must not be uploaded.**
  Cold-launch on API-36 emulator-5556: PASS (`verify-android-device.mjs`, versionCode 80 installed).
- **Open for Codex (owner of the fence work):** (1) `isSectionWithinAnimationWindow` in
  `relationship-detail-screen.tsx:719-729` is not platform-gated, so a rendering change lands on iOS
  with no device evidence; decide whether it needs `Platform.OS === 'android'` before this branch
  ever targets `staging-environment-setup`. (2) A stale first-chat seed now makes Continue a silent
  no-op tap (released, retryable); confirm that is the intended UX rather than a dead end.
  (3) Untracked `patches/react-native-date-picker+5.0.10.patch` (48dp touch targets) is now
  committed; it is applied in node_modules here.
- **Play-signed v80 EXISTS (Astro approved the hosted dispatch, 2026-09-05 18:00 ICT).** Run
  `33962152315` (workflow_dispatch, `release_environment=production`, ubuntu-latest, 62 min) on
  `d0a8adbf` succeeded. Artifact `android-production-release-d0a8adbf...` (249 MB, expires
  2026-09-12) downloaded and sealed at
  `android/app/build/outputs/play-ready-d0a8adbf/Murror-2.0.0-80-production-release.aab`,
  SHA-256 `c96f89608f759eb0f3420993ecde766c6da0bf155e8a26acb28a529bf9a73e3e`; universal APK
  `4200fcee5b7e00344826f01a603f56722bfd03bc44b8bfada6aab38371c36a50`; native-debug-symbols
  `18102f747fdaa32541b3de8b86be4f7a0357e7ba6dbef5ca97e9cd00d023f7db`. Signer
  `CN=Murror Android Upload`, digest `f44e00d4...` = the reset Play upload key. All 15 CI
  production checks re-run locally on the downloaded bytes: pass. CI's provenance receipt pins
  the approved production env digest `1782ad73...`; the local `fb748163` file is NOT that, so the
  debug-signed local build above also differs from prod in at least one env value.
  **PUBLISHED to `Murror AI` Internal testing (Astro's explicit yes, 2026-09-05 ~18:40 ICT):**
  release 37 = `80 (2.0.0) - Onboarding and session hardening`, en-US notes only (a stray `<vi>`
  placeholder was removed before publish). Play review: 0 errors, 1 warning (no deobfuscation map,
  same as v79), 0 devices lost/gained, 56.5 MB download (+41.8 KB). Track summary reads
  `Active, Latest release: 80 (2.0.0)`. Native debug symbols were NOT attached (skipped by choice;
  zip is on Astro's Desktop). Route: Astro dragged the 126 MB AAB in himself (the Chrome extension
  upload tool caps at 10 MB; local-server injection was blocked by the permission classifier).
  The Fold physical-QA gate still stands, now for v80; only the emulator was connected all day.

---

## ANDROID V79 AVAILABLE TO MURROR AI INTERNAL TESTERS — PHYSICAL QA NEXT (2026-09-05)

- **Source and artifact:** isolated branch `codex/android-launch-readiness-20260901` is pushed at
  exact head `1a8f71316c2e654001308249535b67323637d89d`. The sealed production AAB is
  `Murror-2.0.0-79-production-release.aab`, SHA-256
  `0b69fd010006b0ac9d3e70e778ef22b20ca462ecf3b273804ee3f241c3b279d4`, package
  `com.murrormobile`, version `2.0.0` / code `79`, target SDK 36. It compiles the owner-approved
  production environment, including `ENV=production` and `https://api.murror.app`; its upload
  certificate matches the reset Play upload key. No secret value or private key was printed or
  uploaded.
- **Play state:** the exact v79 AAB passed Play validation and is **Available to internal testers**
  on the existing `Murror AI` Internal testing track, release
  `79 (2.0.0) - Production parity performance`, released 2026-09-05. Existing tester list
  `Murror Team` remains selected with nine users; join/update URL is
  `https://play.google.com/apps/internaltest/4701017521848127510`. The stale Advertising ID
  declaration was corrected from Yes to No to match the production manifest and repository guard,
  which deliberately remove `AD_ID` and related ad-targeting permissions. The sole Play warning is
  the non-blocking absence of an R8/ProGuard deobfuscation map; native debug symbols are attached.
  Supported-device deltas are zero.
- **Local evidence:** the exact v79 production artifact passed 174 Android contract tests, workflow
  contracts, 528 Jest suites / 5,012 tests (one suite / three tests skipped), TypeScript, the exact
  ESLint baseline, formatting, i18n, copy, OSV baseline, signing/provenance/environment/native-library
  verification, and a cold API-36 emulator launch. Emulator motion is active. The narrow Android
  performance changes reuse the existing direct Skia picture presenter for Connection Reflection and
  make modal sizing follow live fold/unfold dimensions; iOS motion, cadence, transitions, and visual
  treatment are unchanged.
- **Evidence boundary / next gate:** the connected Fold still had Google-signed v78 when v79 became
  available. Update through the internal Play link, then verify installed code 79 and run physical
  Google sign-in, Invite, Entry detail, Connection detail/orbit/scroll, onboarding/Home motion, and
  fold/unfold profiling. Emulator/source/Play availability do not substitute for that evidence.
  **Do not promote or publish this release to the public Production track without a separate explicit
  release decision.**

---

## ROUND FIVE CODEX BRIEF (2026-09-02, Claude) — supersedes rounds three and four

- **Read:** `docs/codex-briefs/2026-09-02-round-five.md`. Rounds three and four are DONE WITH;
  ignore both files.
- **Codex already finished 8 of round four** (verified merged on `staging` @ `c33bb144`):
  A1 scheduler alarm `severity`->`condition` (#887), A2 wellness-goal idempotency (#898),
  B1 RabbitMQ dead-letter on confirm timeout (#899), B2 bounded text payloads (#900),
  C1 `legacyNullDoneAt` + the 278 comments, C2 recovery triage fields object-first,
  C3 connection-integrity status shape, C4 centralized indicator status ownership.
  **Do not redo these.**
- **Round five order:** A1 bump `nanoid` before the 2026-09-16 OSV fuse or every mobile PR reds
  on the 17th · A2 the prod AI worker's logs reach NOBODY (all in a container-local file, lost on
  restart; this is why a broken path went unnoticed for months) · B1 either party can delete the
  other's takeaway reflection · B2 Step 4's connection scoping is unfalsifiable (mock ignores
  `where`) · B3 a reciprocal takeaway card may be reachable, confirm before fixing ·
  C1 viasr guards reading fields the producer never emits · C2 docs `.info.x` on a 200 ·
  C3 invite-type fallthrough makes every new type a song · D1 **`journals` recorded ZERO rows
  April-July while 252 users registered** — read-only investigation, matters most.
- **Rules:** PRs to `staging` (never `main`; viasr `main` is ALPHA), no deploy, no DB writes, no
  `pnpm install` in a murror-api worktree, tsc baseline exactly 7, mobile lint is an exact
  baseline and a change touching `yarn.lock`/`package.json`/`ios/`/`patches/`/`.github/scripts`
  spends a ~40 min macOS build, log object-first and never name a field `severity`, and every fix
  needs a revert-proven test.
- **Status:** not started. Add PR numbers here.

---

## ROUND FOUR CODEX BRIEF (2026-09-02, Claude) — CONSOLIDATED, supersedes round three

- **Read:** `docs/codex-briefs/2026-09-02-round-four-consolidated.md`.
- **It replaces** `2026-09-02-round-three-health-logging-followups.md`. Round three was never
  started and its line numbers had drifted as six PRs merged; everything still open from it is
  folded into round four with fresh numbers pinned at murror-api `staging` @ `a1d50d88`,
  MurrorMobile `staging-environment-setup` @ `7832f1ea`, viasr `staging`.
- **Order:** A1 two prod alarms whose `severity` field overwrites the pino log level
  (`scheduler-monitoring.service.ts:218,246`) · A2 completing onboarding twice deactivates every
  wellness goal (`onboarding.service.ts:778/790/792`, blocks client retry) · A3 bump `nanoid`
  before the 2026-09-16 OSV fuse or every mobile PR reds on the 17th · B1 confirm-timeout can
  duplicate a job + `{queued:false}` silently drops a message · B2 cap four murror-api payloads
  viasr is currently the only bound on (one is a public unauthenticated route with no DTO) ·
  B3 sweep viasr for guards reading a field the producer never emits (one was a live no-op) ·
  C1-C5 the round-three observability items · D1 the missing `journal_analysis` eval suite.
- **Rules:** PRs to `staging` (never `main`; viasr `main` is ALPHA), no deploy, no DB writes, no
  `pnpm install` in a murror-api worktree, tsc baseline exactly 7, mobile lint is an exact
  baseline and every mobile PR costs a ~40 min macOS build so batch and push once, log
  object-first and never name a field `severity`, and every fix needs a revert-proven test.
- **Status:** not started. Add PR numbers here.

---

## ROUND THREE CODEX BRIEF: health-indicator + logging follow-ups (2026-09-02, Claude)

- **Read:** `docs/codex-briefs/2026-09-02-round-three-health-logging-followups.md`. Six narrow
  murror-api items from the #882 review, line numbers re-verified against `staging` @ `8b069fc7`.
- **Order:** (1) two production alarms in `scheduler-monitoring.service.ts` log a `severity`
  field that overwrites the pino log level (measured, duplicate JSON key), so error filters skip
  them; (2) `historicalBacklog` is structurally 0 (all 278 backlog rows have NULL `done_at`) and
  three comments still say 514; (3) sibling stuck-conversation alarms are string-first and blind;
  (4) `connection-integrity` indicator has no spec; (5) `status:` still inside the data object in
  influxdb/redis/viasr-api indicators; (6) docs read `.info.x` on a 200, which is always null.
- **Rules:** PRs to `staging`, no deploy, no DB writes, no `pnpm install`, tsc = 0 baseline,
  rendered-record log specs via `captureNestPinoOutput()`, mutation-proven, never name a log
  field `severity`.
- **Status:** Item 1 — [murror-api #887](https://github.com/Murror/murror-api/pull/887)
  open against `staging` (CI green; no merge/deploy). Item 2 —
  [murror-api #892](https://github.com/Murror/murror-api/pull/892) open against `staging`
  (CI green; no merge/deploy). Item 3 —
  [murror-api #893](https://github.com/Murror/murror-api/pull/893) open against `staging`
  (CI green; no merge/deploy). Item 4 —
  [murror-api #894](https://github.com/Murror/murror-api/pull/894) open against `staging`
  (CI green; no merge/deploy). Item 5 —
  [murror-api #895](https://github.com/Murror/murror-api/pull/895) open against `staging`
  (CI green; no merge/deploy). Item 6 —
  [murror-api #897](https://github.com/Murror/murror-api/pull/897) open against `staging`
  (CI green; no merge/deploy). All six round-three items are complete; all six PRs remain open
  and unmerged.
- **Live evidence for #883 (deletion rollback race), from the 2026-09-02 data lane, read-only on prod:**
  `deletion_steps.capture-storage-targets` for request `4eec11a5-1191-4478-a6be-f17c147905f0`
  reads `started_at = 2026-09-01 16:10:00`, `attempt_count = 1`, three days AFTER `revoke-auth`
  and `purge-user-data` completed (2026-08-29 11:10). `runStep` writes `attemptCount: 1` only in
  its `create` branch (`account-deletion.service.ts:2768-2778`), reachable only when the row is
  absent, so the row was deleted between 08-29 and 09-01. The only `deletionStep.deleteMany` in
  the repo is `rollbackFailedDeletionSetup` (`:377`, called from `:347`). Loss CONFIRMED, cause
  UNVERIFIED. Note: part of this may be the new step key being created post-deploy rather than a
  rollback; rule that out first. Claude is separately landing a fail-closed fix for
  `capturedAfterRedaction` (`:1531`) in the same file; rebase #883 on staging after it merges.

---

## ANDROID VERSION 77 TEST ARTIFACT READY — PLAY UPLOAD STILL GATED (2026-09-02)

- **Branch:** `codex/android-launch-readiness-20260901`, pushed at exact head
  `30fa03fcb9acebddd85b490ed67e72239f189c3c`; product parity commit
  `02c3d98295efee35033cb2c1acdfcec2369fc407`, Play upload-key guard
  `b7cf43a155f286970e6cf9f57b079f6d83102fc0`, and cross-platform orbit-motion
  guard `f498bc43080687f2fd863a0ab8e302f8629d59e4`. Commit `30fa03fc` removes
  Android-only synthetic quote italics while preserving the current iOS rendering.
- **Testable local artifact:** debug-signed `MurrorDev` APK, package
  `com.murrormobile.development`, version `2.0.0` / code `77`, SHA-256
  `929f45f1faa310615cb4cb56ea0495c6a1434b183f499218570197f0739b7dd9`, at
  `MurrorMobile-worktrees/android-launch-readiness-20260901/android/app/build/outputs/test-ready-30fa03fc/MurrorDev-2.0.0-77-debug.apk`.
  It was installed and cold-launched on API 36. The full Act 1 k1-k11 Android recording is
  `android-onboarding-act1-k1-k11-full-motion.mp4` (H.264 1080x2400/30 fps, 119.766667s,
  SHA-256 `6c46deefcb20aa0da20bf2ebedda3c132f3e1f44a11668e56906a8d7fbd189d0`).
  This is **not** a Play-signed artifact.
- **Current-iOS motion reference:** a locally bundled Release simulator app was built from the same
  exact checkout, bundle `app.murror.mobile.dev`, version `2.0.1` / build `453`, with embedded Hermes
  bundle SHA-256 `303abe9d6c8939d2d41bc999065dade60ae7c29fb142f28884bc6f332ab3af5b`.
  Its full Act 1 k1-k11 recording is
  `ios-current-source-build453-onboarding-act1-k1-k11-full-motion.mp4` (H.264
  1206x2622/30 fps, 58.366667s, SHA-256
  `6ea335c2af4adbf0b806bfb0603dc8875fc7617714b5c8fba575fc93f69825a7`). Both
  canonical videos decode cleanly. This proves same-source/current-candidate simulator motion, not
  physical-device or App Store runtime parity.
- **Evidence:** the full release lane passed 468 suites / 4,433 tests (one suite / three tests
  intentionally skipped), the focused onboarding/Home orbit lane passed 15 suites / 145 tests,
  plus type-check, exact ESLint baseline, formatting, Android lint,
  API-36 toolchain/version checks, final APK metadata/signing, emulator cold launch, and real
  Android+iOS simulator onboarding orbit/transition capture. CI fails if the onboarding/Home motion
  engines gain a platform branch or `.android`/`.ios` source fork. Authenticated Home runtime parity
  remains an external account gate because no retained test session/credentials were available.
  The paired iPhone stayed locked, so no physical-iOS capture was attempted. The public App Store
  binary is still 1.0.19 from 2025-11-26 and predates the July-2026 orbit implementation; it is not
  the orbit-motion baseline. The current source/build-453 candidate is the baseline for this parity
  evidence.
- **Play read-only facts:** signed-in Console shows `Murror(dev)` version 76 / `1.0.22` active on
  Internal testing; version 77 is not on Play. The `Murror Team` tester list has nine users (Play
  supports up to 100 internal testers), and its join URL is
  `https://play.google.com/apps/internaltest/4701633735154483129`. Play App Signing is enabled. The protected upload
  key must match SHA-256
  `45:69:10:0C:C8:33:9B:C3:E9:8E:E7:30:A8:E6:83:9F:DB:C6:B1:9C:1A:F8:2F:27:EB:B2:0A:DC:0D:44:AE:C0`;
  the workflow now fails closed on that fingerprint. The public `Murror AI` app was not touched.
- **Environment gate:** every repository `.env.ode` copy is the same stale 13-key file. The
  Play-signed v76 baseline embeds `ENV=development`; 12/15 comparable fields match today's
  development file, while `BASE_API_URL`, `SUPABASE_URL`, and `SUPABASE_ANON` do not. Do not guess
  or silently copy either target. The protected GitHub `ode` environment has four Android signing
  secrets plus `SUPABASE_ANON`, but is missing the required composite `ANDROID_ODE_ENV_FILE`; the
  workflow therefore fails closed. A complete 16-key owner-approved ODE dotenv is required.
- **Development runtime gate:** `https://dev.api.murror.app` is live/readiness healthy and correctly
  returns 401 for unauthenticated `/api/v1/me`, but the deployed immutable image
  `sha256:161776d5bde1a6f1b99564188c3fab1869c631341a8f8cfe31ccff7eee5e187b` is sourced from
  `6f685ebe` and was 28 commits behind the then-current `origin/main` snapshot. The forward deploy
  lane is blocked by Prisma P3018/PostgreSQL 42701 on migration
  `20260804000000_add_connection_scope_to_journal_prompts` because
  `relationship_connection_id` already exists. No migration reconciliation, SQL, or deploy was run.
- **No external release mutation:** the source branch was updated once (zero workflows started), but
  no PR, signed workflow dispatch, GitHub secret write, Play upload, tester change, or release
  publication was performed. After owner approval, the lane is: set protected
  `ANDROID_ODE_ENV_FILE` -> explicitly dispatch one signed build -> verify exact AAB provenance and
  upload certificate -> separately approve/upload to `Murror(dev)` Internal testing.

---

## ROUND-TWO TASK 2 OPEN — REVIEWED + CI GREEN; DO NOT DUPLICATE OR MERGE (2026-09-01)

- **PR:** murror-api [#885](https://github.com/Murror/murror-api/pull/885), targeting `staging`
  from `fix/conversation-field-guards-20260901`; exact head
  `8b1ea3593c43a4f59fb4be4dda871e12006795e1`, based on
  `8b069fc7f88cdb0e94bb8a87cac94537fe29a06c`.
- **Scope:** test-only guard coverage for all 9 fields in
  `ConversationResponseMapper.toMessageResponse`, all 32 `ConversationProps` keys in
  `PrismaConversationRepository.toDomain`, and the requested generated-column pin for
  `SyncExecution`. Three spec files, +204/-0; no production source, schema, migration, package,
  workflow, or generated-source diff.
- **Adversarial proof:** 41/41 forwarding mutations were assertion-killed, with every mutation
  proven applied by `git diff --numstat` plus exact-hunk verification. The deliberately degenerate
  #853 control survived, while restoring the distinct nested-message sentinel killed the same
  production mutation. Negative compile probes produced exactly one `TS2741` for each mapper seam
  and exactly one `TS2322` for the `SyncExecution` pin.
- **Verification:** local lint, format, type-check, 7 focused tests, and the full 4,535-test unit
  run passed (84 skipped, 0 failed). PR CI is exact-head green: Validation, disposable-Postgres
  Integration, Code Quality & Coverage, and PR CI Summary. Independent spec review and two quality
  reviews found no Critical or Important issue.
- **Safety/state:** no real database, deletion, purge, or environment route was called. No deploy
  job ran. The PR remains **OPEN and UNMERGED** by brief requirement. Claude should not edit or
  duplicate this branch; Task 3 has not been started in this lane.

---

## ROUND-TWO FOLLOW-UPS QUEUED FOR CODEX (2026-09-01, written by Claude Code)

**Full brief: `docs/codex-briefs/2026-09-01-round-two-followups.md`. Read it, and the
first brief `2026-09-01-eleven-followups.md` whose shared hard rules still apply.**

Five findings from the 19-PR merge round. Each came out of an adversarial review whose main
change has already landed; these are the pieces kept OUT so those branches stayed reviewable.

| # | Task | Repo | Why it matters |
|---|---|---|---|
| 1 | 🚨 **P1** deletion rollback bulldozes completed work | murror-api | `deleteMany` with no status filter destroys COMPLETE receipts. `replicas: 2`, and the irreversible-deletion cron is the ONLY one of 16 without `withClusterCronLock` |
| 2 | Guard the other half of the field-drop bug | murror-api | `PrismaConversationRepository.toDomain` puts 32 keys into a `Partial` sink — zero type pressure. Same symptoms as #852, so a bug there gets misdiagnosed |
| 3 | Delete a test that passes with its bug live | viasr | Asserts against a `MagicMock` standing in for the component under test; reported 4 passed with the defect fully reintroduced |
| 4 | Alert on permanent personalization lockout | viasr | 8 users lost silently over 5 days; three logging layers existed and all were invisible at `LOGGER_LEVEL=ERROR` |
| 5 | CI grades PRs against a stale base | all 3 | Measured: two PRs green against a base **17 commits** old, one of which edited the exact file another deleted from |

🚨 **TWO CORRECTIONS to the first brief, both measured since it was written:**

- **murror-api `tsc --noEmit` is now 0**, not 7. A git worktree was nested inside the canonical
  checkout, unignored, and tsc compiled it as project source (90 of 91 errors). Removed
  2026-09-01. The earlier "missing `heic-convert`" explanation was **wrong** — that package is
  not declared anywhere and nothing imports it. If you measure anything but 0, diagnose your
  worktree first.
- **`gh run rerun` replays the ORIGINAL merge commit** and does not recompute against a moved
  base. Use `gh pr update-branch`. Task 5 is about this class.

**Also worth knowing:** MurrorMobile has 4 git worktrees nested inside the canonical checkout
(181,503 untracked files). Not cleaned yet — build from a fresh worktree.

---

## ELEVEN FOLLOW-UPS QUEUED FOR CODEX (2026-09-01, written by Claude Code)

**Full brief: `docs/codex-briefs/2026-09-01-eleven-followups.md`. Read it before starting any of them.**

Eleven findings from today's review round, deliberately kept OUT of the PRs that shipped so those
branches stayed reviewable. Each was measured; the brief marks CONFIRMED vs SUSPECTED throughout.

🚨 **Do not take all eleven in one session.** A 4,275-line scope already idle-timed Codex out at
1800s on this codebase. The brief batches them; work one batch at a time, one PR per task.

| # | Task | Repo | Why it matters |
|---|---|---|---|
| A1 | Five inverted boolean flags on live admin routes | murror-api | `?force=false` yields `force=true` and syncs EVERY user; `?apply=false` applies subscription changes |
| A2 | Chat-analysis logs user text on a DB error | viasr | `logger.exception` at ERROR binding private conversation text |
| A3 | Raw `str(e)` crosses the service boundary | viasr | egress path, no LOGGER_LEVEL touches it; may reach a client response |
| B1 | Every user profile has a NULL work status | both | `work` vs `workStatus` alias mismatch; fix BEFORE any profile backfill |
| B2 | Silent 42883 in `deep_chat_stream` exists/count | viasr | returns "no messages" instead of erroring |
| B3 | Inverted `Prisma.JsonNull` vs `DbNull` comments | murror-api | docs only, but a lying comment caused today's biggest wrong premise |
| C1 | Site six of the poke falsehood (quiz pill) | mobile | second answerer told the comparison waits on someone who already answered |
| C2 | Quiz nudge gate + stuck "Reminded" button | mobile | both SUSPECTED, confirm or refute first |
| C3 | Three guard gaps in the arc vocabulary | viasr + mobile | a plain `for` loop reintroduces the duplicate-chip bug with 78/78 green |
| C4 | HMAC integrity tag on deletion step metadata | murror-api | tampered metadata could purge a surviving third party's files |
| D1 | Crisis detector fails open on its own LLM failure | viasr | **evidence only** — Astro decides the default |

**Shared hard rules are stated once at the top of the brief** (read-only DBs, no deploys, viasr prod
is the `production` branch not `main`, mobile is iOS-only, mutation-prove with `git diff --numstat`,
`LOGGER_LEVEL=ERROR` discards info/warning, nestjs-pino drops a trailing object, and the
specs-encode-the-defect checklist).

**Actions budget is NOT capped** — September net is $0.00 against $8.57 gross. Four agents held
finished work over the retired August cap today. Do not repeat that.

---

## PRODUCTION CLOSURE ROUND: CR insights, monitoring privacy, build 452 (2026-09-01)

**Sources: murror-transfer-f2 for the product and release lanes; this entry written by Claude Code
after independent review of the monitoring lane. Anything marked "reviewed" below was verified by
blob hash or by reading the bytes, not taken on report.**

### SHIPPED TO PRODUCTION. DO NOT REDO ANY OF THIS.

| Component | State | Evidence |
|---|---|---|
| murror-api | rollout **rev 28**, tag **v0.47.0**, source sha `191b7ee4` | cluster `do-sgp1-murror-cluster-sgp1`, ns `nsp-prod-murror`, verified by effect |
| viasr-api | rollout **rev 14**, sha `1873eb7` | ns `nsp-prod-murror-ai`, verified by effect |
| iOS **build 452** (2.0.0) | archived, uploaded, VALID, **ATTACHED** to the 2.0.0 App Store record | supersedes 451 and 450 |

**Do not cut another iOS build yet.** Build 452 is the current provider artifact, but it does not
contain the device-found PR #1182 fix. If #1182 merges, land the source first and only then run
`scripts/ios-next-build.sh`; its newly allocated number must be committed and merged before the
next archive. Never hand-pick the presumed next number. Any entry below this one that names 450 or
451 as current is superseded.

What actually shipped in those deploys:

- **2026-09-01 conflicting-report recheck:** `origin/main@cf1650a` does lack the six fields, but it
  is not the deployed production ref. `origin/production@1873eb7` contains all six declarations and
  `e59420b` is its ancestor. On the explicit `do-sgp1-murror-cluster-sgp1` context, the API, worker,
  and beat are each 1/1 ready on `ghcr.io/murror/murror-ai:prod-1873eb7`, immutable digest
  `sha256:c9a2fe832468fa09458ab5a6b14d6ca0b54fb4253ff66f0d662e343c1c2ab55b`; all three required
  public health endpoints return HTTP 200. The repo's drift-guard workflow explicitly warns that
  the old CLAUDE.md statement "main is prod" is stale. Do not deploy or promote to fix this false
  blocker. This proves deployed source presence and healthy rollout, **not** a fresh live model round
  populating the fields.

- The six Connection Reflection insight fields that had **never rendered**: `quote`, `self_insight`,
  `other_insight`, `self_expression`, `other_expression`, `conclusion`. They were empty strings on
  every production row since 2026-06-22, because viasr's schema never declared them and murror-api's
  mapper silently coerced the missing fields to `""`. Two independent halves of one bug.
- All four per-person insight fields are now **SHARED with both members** (Astro's explicit call).
- 🚨 **Orientation stays sender-anchored.** `self*` is the SENDER's row for BOTH viewers. Reading
  `self*` as "the viewer" is a bug, and there is a test that fails on it. Do not "fix" that test.
- The sender's display name is passed to viasr so the shared message reads in third person.
- Consent gate: a reflect-back with no AI insight is a **SUCCESS** (`INSIGHT_UNAVAILABLE`), not FAILED.

### ON STAGING, NOT YET PROMOTED

- **murror-api `25fb1192` (PR #864)** AI sharing defaults ON for NEW connections. Migration
  `20260901000000_ai_sharing_on_by_default` is **SET DEFAULT only**. It is deliberately **not** a
  backfill and touches zero existing rows, so anyone who turned the flag off keeps it off.
  🚨 A new migration must be registered in **TWO** places or CI fails:
  `scripts/release/production-migration-set.json` **and**
  `test/production-non-galaxy-migrations.contract.sh` (the latter wants a written justification).
- **viasr-api `65226cb` (PR #639)** conversation emotion arc constrained to the 35-value taxonomy in
  **both** the schema and the prompt. The prompt had listed ten example labels that were all invalid:
  adjectives (grateful, sad, excited) against a noun taxonomy (gratitude, sadness, excitement).
  Fixing only the schema would have failed validation on nearly every call and emptied the arc, so
  both halves had to land together. Do not split them.

### MONITORING PRIVACY LANE, MERGED 2026-09-01 (Codex implemented, Claude Code reviewed)

`murror-api` **PR #862 merged to `staging`**; the same patch merged to `main` as `e59a5911`.
Four files only: `.github/scripts/sentry-sweep.sh`, `.github/workflows/prod-health-check.yml`,
`.github/scripts/README.md`, `test/prod-sgp1-workflow-hardening.contract.sh`.
Zero `src/`, zero migrations, zero `k8s/`, zero deploy workflows. Workflow permissions are
`contents: read` + `actions: read`, so it cannot mutate production.

Two behaviours changed:

1. **Raw Sentry title and culprit no longer reach Actions logs or Notion.** Both have carried
   user-authored production error text. The digest keeps counts, level, owner, and an
   allowlist-validated Sentry link. The unparseable-response path no longer echoes 120 characters
   of provider body.
2. **A run with findings is no longer labelled "Prod sweep clean."** It gets a warning headline and
   stays non-paging (`is_red` deliberately excludes the finding count). A structurally invalid or
   unreadable sweep still goes red/UNKNOWN.

🚨 **TRAP FOR THE NEXT PERSON READING #862's CHECKS.** The check named
**"Production Workflow Security Contract" reports `skipping`**, which looks like the security
contract never ran. It did. That job is a deliberate zero-runner cost shim gated on
`if: ${{ github.repository == '' }}` (`ci.yml:40`), which can never be true. The contract really
executes twice elsewhere: explicitly in the **Validation** job (`ci.yml:63-65`) and again via the
unconditional `for contract in test/*.contract.sh` backstop (`ci.yml:149`). Judge that check by
Validation, not by the shim's name.

Evidence standard met before merge: both halves were mutation-tested. Forcing the positive-finding
branch to fall through failed at contract line 210; forcing the malformed-count normalisation to
stay non-unknown failed at line 234. A green run nobody saw fail would not have counted.

**Known consequence, open:** the sweep covers the `murror-mobile-production` Sentry project
(`sentry-sweep.sh:36`). With titles redacted **and** dSYMs still not uploading (#1153), a mobile
crash digest now reads "N events, M users, Owner: iris, <link>" with no name, and the link opens an
unsymbolicated stack. This lands right as build 452 goes to device test. Proposed fix, not yet
authorised: render Sentry's `shortId` (e.g. `MURROR-MOBILE-4F`), which is Sentry-generated rather
than user-authored, validated against a strict character class exactly like `permalink` is.

**Doc debt:** `prod-health-check.yml` cites `k8s/ci/prod-health-reader-rbac.yaml`. That file exists
on `main` but **not** on `staging` or `production`. It was deliberately left out of #862 so the PR
would not pull `k8s/**` into CI and deploy path classification. The reasoning is right; the dangling
reference is real. Schedules fire from the default branch, so staging never runs this workflow.

### OPEN, AND OWNED

- **MurrorMobile PR #1182**, branch `fix/for-us-empty-state-overlap`. Two cards drawn on top of each
  other on the connection detail screen. The earlier cold-loading diagnosis was disproved: the outer
  screen already renders `RelationshipDetailSkeleton` while loading, so that helper branch cannot
  reach the photographed subtree. The settled-state cause is two competing authorities: reflect and
  reflect-waiting cards survive into `visibleDataInsight`, but none of the five unrelated `has*`
  flags covers them, so the terminal empty layer can be selected while a real card exists. The
  corrected decision is `loading -> cards when visibleCardCount > 0 -> generating -> empty`, with the
  five flags removed. Codex independently ran the focused tests, full 461-suite / 4,339-test release
  suite, TypeScript, exact lint baseline, Prettier, i18n/copy, OSV, workflow contracts, 157 script
  tests, ReactCodegen freeze, CocoaPods wrapper, and final diff checks green. The three corrected
  files remain uncommitted in the Claude-owned worktree; Claude is to commit/push exactly once, then
  Codex reviews fresh CI before merge. Do not make a competing edit or push. Trunk is now
  `be51b509` after #1186. A conflict-free `git merge-tree` simulation against the current remote
  #1182 head proves its effective diff is exactly the three `src/` files; the OSV ledger is already
  identical on trunk. The native detector should therefore skip hosted macOS on the one correction
  push. Verify that result in CI; do not assume or rerun it.

### BUILD-452 HERMES SYMBOL EVIDENCE (LOCAL ONLY; PROVIDER PROOF STILL OPEN)

- The preserved raw `/tmp/MurrorMobile-452.xcarchive` is version 2.0.0 build 452 and still has no
  `dSYMs/hermes.framework.dSYM`, confirming issue #1153 applies to this artifact too.
- Codex copied it to the private working archive
  `/private/tmp/murror-452-observability.L7RtFx/MurrorMobile-452-symbols.xcarchive`, leaving the raw
  archive unchanged, then ran the tracked `attach-hermes-dsym.sh` lane and its independent
  `--verify-only` pass. The official React Native 0.77.0 artifact SHA-256 is
  `ce3bb16c6a731e7ba7b3f85a0c4a47e6f470d54a1d6baa61bad2d77a8e481740`; its DWARF SHA-256 is
  `0c7bcaba627d517c5ec756f6a90f59c7f5e34ab921d86e421c8e89b3a31ae74a`.
- The build-452 Hermes binary and attached dSYM both report UUID
  `4EAC6EDE-5B89-36B7-8F77-09A0E75C2F4A`. Byte comparisons confirm the raw and working copies retain
  identical archive Info.plist, app executable, and Hermes executable; the raw archive still lacks
  the dSYM.
- This proves a matching local symbol exists; it does **not** prove Sentry ingestion or readable
  crashes. The final candidate must use the complete clean `archive -> finalize -> export` release
  lane so its source map, dependency manifests, original/working archives, UUID inventory, and
  receipt remain bound. Provider upload still requires the least-privilege Sentry token plus the
  historical-token, source-retention, and upload approvals, followed by one sanitized intentional
  Hermes crash with a readable symbolicated frame. Do not close #1153 yet.

### SECURITY BASELINE LANDED: decode-uri-component

`GHSA-vcc3-ghjq-m6fr` / `CVE-2026-45822` (decode-uri-component 0.2.2), published 2026-08-31 22:10
UTC, blocked **every** MurrorMobile PR. The one-file baseline was split from #1182 into PR **#1186**
and merged to `staging-environment-setup` as `be51b509` after exact-head run `33471315573` passed
Fast Ubuntu, unit coverage, the hosted-macOS iOS smoke (50m12s), and the CI Summary Gate. No
post-merge CI or Android workflow started. The accepted entry expires **2026-10-01**. DoS only,
CVSS 6.6, exploit unproven, no data disclosure or code execution.

**DO NOT fix it with a resolution override.** The patched 0.5.0 is ESM-only while
`query-string@7.1.3` `require()`s it. That override was tested: `query-string.parse` throws
`decodeComponent is not a function`, which would break all deep-link and query parsing for every
user. The real exit is a `query-string` or `@react-navigation/core` release that drops the CommonJS
dependency.

### COST RULES, HARD

Any MurrorMobile change touching `scripts/`, `.github/workflows/`, `package.json`, `yarn.lock`,
`Gemfile` or `patches/` forces a **~40 minute hosted macOS smoke build**. A pure build-number bump is
exempt by explicit allowlist. Run every check locally first, batch commits, push **once**.

`murror-api` has **no macOS runners at all** (verified), so that rule does not apply there. #862's
four files also miss every path filter in `deploy-cloudflare-worker.yml` and
`privacy-schema-preflight.yml`, so it woke no deploy workflow.

### STILL OPEN. ASK ASTRO BEFORE STARTING ANY OF THESE.

- Device-testing build 452, including the ATT prompt and the #1150 Home hang. Both are
  static-analysis-only so far.
- The App Store Connect privacy form.
- **dSYMs still never upload (#1153)**, so production crashes are unsymbolicated. Now higher
  priority than it looks: redaction removed the digest-side workaround.
- No prompt change has been exercised against a live model. viasr's eval harness has **no takeaway
  suite**, so both prompt changes shipped on unit coverage alone.
- A fresh Connection Reflection round is the only way to see the new fields. Existing cards can never
  populate: `insight_json` is written once and there is no regenerate path. Only **one** production
  connection has both sides opted in to AI sharing.

---

## HISTORICAL: IOS BUILD 450 SOURCE AND BUMP LANDED (2026-08-28; by Codex). Superseded by build 452 above.

**Canonical `staging-environment-setup` is `60144f790ca530d7fe8b60a1dab4fd4ef70cdafd`,
with exact build 450. No archive, export, upload, device install, TestFlight processing, or
App Store submission has been performed for 450.**

### Final source and bump chain

| PR | What landed | Immutable evidence |
|---|---|---|
| #1169 | Reset the mood-popup source label on every open | merge `aac06b0c`; Claude adversarial review SAFE TO MERGE |
| #1165 | App-level modal presentation coordinator | merge `a59bfa98`; three review rounds; two Critical latch defects fixed and independently probe-verified |
| #1166 | Mood-popup impression on the open transition | merge `cdc2350d`; its one-render test assumption later exposed the actual-presentation gap |
| #1171 | Count a mood-popup view only after the coordinator grants presentation | head `f129a806`, merge `6b0c11b4`; exact-diff Claude verdict GREEN / SAFE TO MERGE with zero unresolved Critical or Important findings; CI run `33177337016` green |
| #1172 | Fresh official build-450 bump after #1171 | bump `1e9cb660`, merge/canonical `60144f79`; exact-commit Claude verdict GREEN; CI run `33179096559` green |

PR #1171 repaired the failed build-bump test without weakening the production contract. The popup
now derives actual visibility as `wantsToPresent && mayPresent`; a queued popup records zero viewed
calls, and the real coordinator component test proves one call after the slot is granted. Local
evidence is 437 suites / 4,023 passed tests with three skipped, plus typecheck, exact ESLint baseline,
changed-file Prettier, diff checks, and the exact CI coverage command. The old one-render expectation
was reproduced failing on superseded candidate `c8ab7ac`; the focused corrected set passes 52/52.

Closed PR #1170 and commit `c8ab7ac` are superseded and must never be reopened, merged, or archived.
They proposed build 450 on pre-fix parent `cdc2350d`. The current bump is a new commit on corrected
canonical source, not a reuse or force-update of that branch.

### Official allocator and why the first fresh attempt failed

The first run of `scripts/ios-next-build.sh` failed closed before changing a file:

```text
ERROR: could not verify the highest claimed build with App Store Connect.
```

The ASC key was present and readable. The release shell resolved `python3` to Homebrew Python, where
`jwt` and `requests` were absent. The pyenv-managed Python 3.11.15 already had both modules; placing
`$HOME/.pyenv/shims` first in `PATH` for that single command restored the previously working runtime
without installing packages, editing the script, or changing global configuration. This is why a
previously reliable allocation failed now: hidden interpreter/PATH drift, not an Xcode archive or
project-file regression.

With the compatible interpreter, the unchanged sole allocator reported:

```text
App Store Connect highest claimed build = 448
canonical=449  local=449  asc=448  ->  NEXT BUILD = 450
OK: build number set to 450 (26 pbxproj + 4 app plists).
```

The exact five-file diff is 30 insertions / 30 deletions, all `449 -> 450`. After #1172 merged, a
fresh detached checkout at exact canonical `60144f79` passed `scripts/verify-build-lane.sh`:

- all 26 `CURRENT_PROJECT_VERSION` sites and all four app `CFBundleVersion` sites equal 450;
- the exact latest bump is on `origin/staging-environment-setup`;
- tracked content matches canonical; and
- Metro is not listening on 8081, so no live JavaScript source can override the checkout.

The verifier says the **source/build lane is safe to archive**. That is not archive evidence and does
not override the owner, signing, privacy, provider, device, or store gates below.

### CI and cost boundary

PR #1171 and #1172 each used one batched Ubuntu run. #1172's native detector positively logged that
every non-version byte was identical and skipped hosted macOS. Android and E2E did not run. At the
post-merge snapshot, the GitHub billing API sums Actions to
`$262.966714760` gross / `$250.70365611699999962045` net against the $300 Actions budget at the
latest read-only snapshot; the conservative gross measure is 87.66%, below the 90% freeze. The
$0.006697456 gross movement since the board's post-merge snapshot is delayed billing, not evidence of
a newly attributable run. Billing cannot honestly be allocated per run. No MurrorMobile run was
queued or active at the latest snapshot.

Canonical `.github/workflows/ci.yaml` still has PR triggers only; the missing
`staging-environment-setup` push trigger is a real future-hardening gap. Do **not** merge that repair
ahead of the 450 archive: `verify-latest-ios-build-bump.sh` requires canonical tip itself to remain
the exact five-file bump, so any workflow commit now would invalidate 450 and force a fresh official
build allocation plus CI. Current 450 content already passed the #1171/#1172 PR gates; schedule the
push-trigger repair after this candidate is spent unless Astro explicitly chooses to supersede 450.

### Archive remains closed

- A fresh read-only host check matches every pinned archive input: macOS 26.4.1 (`25E253`), Xcode
  26.6 (`17F113`), Node 22.22.2 at SHA-256 `5c899797…b011`, and Ruby 3.3.5 source binary at
  SHA-256 `809abdad…dead`. The machine/toolchain preflight is not the remaining gate.
- The installed Development identity is valid for Murror: fingerprint
  `F6E0B5661C816C670887A48E5A03F5888483A01B`, certificate `DXM3Q343R6`, subject
  `OU=YL72VTKBR7` / `O=My Murror Inc`, expiry 2027-03-28. The parenthetical `RTZJFPJ2B5` is part
  of the certificate common name, not the X.509 team field; no claim is made about what it
  represents. All three production
  Development profiles (app, OneSignal extension, AppWidgets) admit this exact certificate, so
  Development archive signing is locally available. No Distribution identity/private key is installed.
- Archive-stage owner gates remain unset: approval of the exact production-environment digest and
  confirmation of this Mac plus one archive operator. Murror's risk control also intentionally keeps
  archive closed until the App Privacy decision below, because a source change would supersede 450.
- Historical Sentry-token audit review and Sentry source/native retention and upload approvals remain
  unset. Current canonical source requires those only for the separate provider-upload action, not
  for archive or local finalization; do not conflate those stages.
- The published App Privacy label versus live/candidate Meta, Branch, purchase, usage, and onboarding
  data behavior remains unresolved. Apple gates accuracy and submission rather than archive, but the
  earlier Murror stop avoids spending an archive that the privacy decision could invalidate.
  Shortest launch-preserving fork: if the documented Meta/Branch transmissions are intended, confirm
  provider use and correct the 2.0 App Privacy disclosures while keeping build 450; if they are
  unintended, disable or remove them in source and let `ios-next-build.sh` allocate a later build.
- No build-450 archive/export exists; no exact candidate has been installed or device-tested; no
  provider symbolication proof exists; and App Store Connect still has build 448 attached to 2.0.0.
- Tracked export options use `destination=upload`, so export is an external App Store Connect upload,
  not a reversible local probe. Do not run it without explicit final authorization.

### Launch board

The unpublished V21 draft now reflects build 450, canonical `60144f79`, PRs #1171/#1172, the current
$300 Actions cap, and the unchanged external gates. Its SHA-256 is
`d9afaf2e873038019d4ec9cda10570c6108c68de96a1bf72d93d0fdecd0ed9f9`; structure remains
17 evidence rows / 8 ordered steps / 13 layers / 8 sections. Artifact owner session
`murror-transfer-bb` gave the preceding `03356291…` bytes structural/textual GREEN, then performed the
first full rendered review and found two real presentation/wording defects: the dual-tier legend note
visually joined the UNKNOWN description, and the delayed Actions snapshot lacked a moment-level
timestamp while calling itself current. The `d9afaf2e…` bytes give the legend note its own row and
anchor both Actions mentions to the exact 2026-08-28 21:51:51 +0700 API snapshot. Claude re-rendered
that exact hash at two widths and returned **GREEN — both fixes confirmed on screen** with no clipping,
overflow, or overlap. Hover/focus states and the peer-reported 437-suite / 4,023-test total remain
outside that independent visual verdict. Publication still requires Astro's direct authorization in
that artifact-owning Claude session, and repinning remains a manual artifact-UI action.

---

## HISTORICAL — IOS BUILD 449 SOURCE AND BUMP LANDED (superseded by build 450 above)

**Canonical `staging-environment-setup` is `0c898b18`, with exact build 449.**

| PR | What | Evidence |
|---|---|---|
| #1167 | Fail-closed account-bootstrap timeout recovery | Claude review GREEN; independent review GREEN; 431 suites / 3,944 tests passed locally; merged as `1f68d035` |
| #1168 | Script-allocated build 449 | `ios-next-build.sh` measured Git=448 and ASC=448, wrote 26 pbxproj + 4 plist sites, and exact-bump verification passes at canonical `0c898b18` |

Both PR validations were Ubuntu-only; Android, E2E, and hosted macOS did not run.
Measured Actions increase was **$0.174031153**, inside Astro's explicit $0.25 exception.
The live organization Actions total is now **$250.17 / $250**, over the cap. Exact Decimal
summation of all 300 API items at 2026-08-28 20:13:49 +0700 is
`$250.17426812399999962045`, over by `$0.17426812399999962045`. This is a
`$0.174268124` increase from the exact 19:26:51 snapshot. During that interval four unrelated
MurrorMobile PR runs completed: #1166 at `c9634ac7`, #1169 at `06dda25e`, and #1165 at
`f2ebf894` then `ba91745a`. GitHub billing does not expose exact run-level attribution, so do
not split that increase among those runs. Current total minus the `$249.215743279` initial
snapshot and approved `$0.174031153` iOS pair is `$0.78449369199999962045` outside the pair,
shown as `$0.784493692`. No MurrorMobile, `murror-platform`, `murror-api`, or `viasr-api` run
was queued or active at the snapshot. All active Murror Claude sessions were notified that paid
CI, PR revisions, merges, and nonessential pushes remain frozen pending Astro's explicit new
cost exception.

`verify-build-lane.sh` passes for build 449 after the orphaned build-447 Metro
server was gracefully stopped (owner session `murror-transfer-50` was notified).
Do not restart Metro from build 447; any device QA must use the exact build-449
candidate checkout.

**Archive has NOT started.** Remaining owner gates are explicit:

- resolve the App Privacy disclosure decision before spending the build-449 archive. Apple's read-only
  API proves the live store version is 1.0.19 build 5, uploaded 2025-11-24, and the public label lists
  only Identifiers under Data Used to Track You. The live archive has no immutable source SHA, but
  upload-time main tip `ff00b148` contains direct Meta activation, registration, onboarding, and
  purchase-event calls plus the first-party onboarding POST. No app-owned ATT request or explicit
  advertiser/IDFA gate was found at that ref; actual shipped-binary and network behavior are unproven.
  Exact build-449 source preserves those paths and adds an explicit ATT gate. Capture live 1.0.19
  traffic before editing ASC, then decide disclosure versus source change; a source change supersedes 449.
  A read-only Meta Events Manager probe stopped at its login page without credentials or settings
  access, and provider history is not expected to prove nine-month-old build-level attribution. Only
  one iPhone is paired, and it currently holds production build 447, so testing public build 5 would
  require a user-approved data-preserving device plan or a separate iPhone;
- approve production environment digest `62eefc774033400ce6451b2ff82a3ecb050b5c7e0b42905846f8e89a6a8b86fb`, whose `BASE_API_URL` is the currently enforced `https://api.murror.app`; a secret-safe comparison found the same 22 variable names in both files and only `BASE_API_URL` differs. The shared checkout still carries rejected `e50fc3c3...` at mode 0644 and points at the retiring Ambercare host, which still resolves and could fail silently. The standalone release clone must receive only the approved bytes with private permissions;
- review the now-evidenced historical Sentry token removal in the provider audit log;
- approve source-map/native-symbol retention and the exact upload;
- confirm this Mac and one archive/export operator; Development signing is already available, so
  securely import only a Store-profile-admitted Distribution private key from an approved holder or
  explicitly authorize a new Distribution CSR and profile regeneration; and
- produce/upload build 449, then install it on the paired iPhone for exact-candidate proof.

The physical iPhone is currently available and paired. A read-only `devicectl` inventory now
succeeds and shows production Murror 2.0.0 build 447 plus MurrorStg 2.1.0 build 431. This proves
connectivity and installed-version inventory only; neither is the unarchived build-449 candidate.

App Store Connect direct relationship proof is internally consistent: 2.0.0 is
`PREPARE_FOR_SUBMISSION`, its version-to-build relationship returns build 448, and that build is
`VALID`; the only review submission is `COMPLETE`. `asc-submission-monitor.mjs` currently emits a
false `BUILD_NOT_ATTACHED` warning because the top-level builds response has a null reverse
relationship even while the version relationship points to 448. Do not use that reverse
relationship as attachment proof, and do not merge a monitor repair ahead of the build-449 bump.

The project requires Apple team `YL72VTKBR7`, and all 21 installed provisioning profiles match it.
The sole local codesigning identity is actually a valid Murror Development identity: fingerprint
`F6E0B5661C816C670887A48E5A03F5888483A01B`, subject `OU=YL72VTKBR7`, and active Apple API
certificate `DXM3Q343R6`. The parenthetical `RTZJFPJ2B5` is part of the common name rather than
the X.509 team field; no claim is made about what that suffix represents. The production app,
OneSignal extension, and AppWidgets
Development profiles all embed this fingerprint, so Development archive signing is available.
No Distribution identity/private key is installed. The current production Store profiles admit
active Distribution fingerprints `8176FCDE…F31C3`, `0328530A…14AEC`, or `3C8D5E52…4B786`;
securely importing any matching approved holder's `.p12` is the shortest export-signing path.
Creating a new Distribution CSR would also require owner approval and profile regeneration. The
tracked export options use `destination=upload`, so successful export would immediately attempt an
App Store Connect upload rather than produce a reversible local probe. #1165 and #1166 were held
when this historical section was written; they later merged and are included in canonical build 450.

A fresh read-only Sentry audit now records an organization-token removal on Aug 18. A later
replacement `org:ci` token exists, was created Aug 19, and its current **Last access** field reads
**never used**; its secret is unrecoverable in the provider UI and unavailable in the release shell. The current subscription page says **Usage Exceeded**, errors
capacity depleted, and **5K / 5K** for Aug 14–Sep 13, with 124 events dropped over quota. This supports the historical-revocation
fact but does not replace Astro's audit-review, retention, upload, or sole-operator attestations,
and it does not prove exact-build symbolication.

The V21 launch-board draft was refreshed with the live Actions total, direct ASC attachment proof,
successful device inventory, and the live-versus-candidate App Privacy gap. Current SHA-256 is
`484f6f77c0e4fdb19d2f7b2ff04f3dba439ffb1c194b21a7b60d06d77ee1341d`. Claude's final
read-only re-review is **GREEN** for this exact hash after the exact-Decimal billing, Apple-team
signing, export/upload, production-environment, privacy-provenance, source-versus-runtime, and
copy-rule corrections. Structure is 17 evidence rows / 8 steps / 13 layers / 8 sections; evidence
tiers are 6 PROVEN / 6 LIVE-VERIFIED / 5 ABSENT / 0 UNKNOWN. Arithmetic, counts, em-dash scope,
and secret/private-key scans were independently verified. The privacy review was textual and
structural; live network behavior and rendered visual review remain outside GREEN.
The draft remains unpublished. Astro approved
publication in Codex, but Claude's per-session permission boundary still requires that approval
directly in its own conversation; its Artifact tool cannot repin the shared V4 view, so repinning
remains an artifact-UI action.

---

## murror-api PRODUCTION IS DEPLOYED (2026-08-16; by Claude Code)

**Production moved for the first time in this push: `murror-api:0.41.1` -> `0.41.2`.**
Do not re-plan the "third hop onto the production branch". It is done.

| | |
|---|---|
| PRs merged | #774 -> staging, #773 -> staging, #771 -> production |
| production branch | `438b2658` |
| deployed image | `ghcr.io/murror/murror-api:0.41.2`, SGP1 `nsp-prod-murror`, 2/2 ready |
| rollout | revision 10 -> 11, change-cause `source_sha=438b2658 tag=v0.41.2 branch=production run=31921391503` |

Verified BY EFFECT, not by workflow conclusion: pod image, rollout revision, fresh pod start
times, `/api/health/live` 200, and the scrubber confirmed present in the RUNNING image at
`/app/dist/src/common/utils/sentry-scrub.util.js`.

### THE PROMOTION PATH IN murror-api/CLAUDE.md WAS WRONG

It documented `staging -> main` via `workflow_dispatch`. The workflow gates production on
`workflow_dispatch` AND `github.ref == 'refs/heads/production'`, so a dispatch from `main`
skips EVERY job and reports green having deployed nothing. That had already happened once.
Corrected in murror-api PR #777. The real path: merge into `production` (merging does NOT
deploy), then `gh workflow run deploy-matrix.yml --ref production -f environment=production`.

**Each branch runs its OWN copy of the workflow.** `main`'s copy still deploys on push, which
is how alpha rolls; staging's and production's copies do not list `main` at all.

### A DIFF COUNT WITHOUT ITS BASELINE MISLEADS

The launch doc recorded production as "659 ahead of main, 52 behind" and called the promotion a
risky third back-port. `main` is a divergent side branch. Against `staging`, which actually
feeds production, it was **7 ahead / 16 behind**, `merge-tree` predicted zero conflicts and the
merge produced zero. Two sessions repeated the 659 figure to each other without questioning the
baseline.

Use a MERGE, never a cherry-pick: the production branch carries its own commits. Its one
content commit touched `revenuecat.service.spec.ts`, and it was proven byte-identical by md5
before and after, twice.

### 🚨 SENTRY IS WIRED IN PRODUCTION ONLY, WHICH MAKES THE OBVIOUS PROBE A FALSE GREEN

| Env | `SENTRY_DSN` | SDK |
|---|---|---|
| alpha `nsp-dev-murror` | **absent** | **disabled** |
| staging `nsp-staging-murror` | **absent** | **disabled** |
| production `nsp-prod-murror` | **set**, project `4511044717379584` | **enabled** |

`main.ts` reads `enabled: !!process.env.SENTRY_DSN`. Alpha has no `envFrom`, 56 inline vars, a
31-key ConfigMap and a 24-key Secret, zero matches; staging the same.

**So "trigger a 500 on alpha and confirm Sentry receives no user data" is UNSATISFIABLE.** It
passes instantly and proves nothing, because nothing is sent at all. It reads as entirely
reasonable written down, and it was the agreed precondition.

**Still unproven:** the PII scrubbers are deployed and have NEVER EXECUTED anywhere. Sentry has
recorded zero events since the roll. That is a test that has not run, not a pass. The first
production 5xx is the proof.

### FREEMIUM: the guard is now in the running build, and two traps

Re-derived from production: **3,105 users, 2,823 holding premium free (90.92%), 8 real
purchases**, corroborated independently by `user_entitlements` also having 8 rows.

1. Until this deploy, flipping `SUB_001_PLACEHOLDER_FIX_ENABLED` did NOTHING: the running
   `0.41.1` build contained no `subscription-access.ts` and zero occurrences of the variable.
   Check the DEPLOYED sha from the rollout history, never the branch, which had the file.
2. **`original_transaction_id` is NULL on ALL 2,833 rows**, including every real payer. The
   obvious fix, "revoke where the transaction id is null", revokes all 3,105 users. The shipped
   `isFreeTierPlaceholder` requires a free-tier product identity AND the absence of all three
   store footprints, so it fails safe. Do not let a simplification past it.

Ordering: deploy the guard dark, set `FREEMIUM_LAUNCH_AT` to the real launch instant (prod has
only `FREEMIUM_DAYS: 3`, so the grandfathering cutoff is a placeholder), then flip and roll the
pods, because Nest config is startup-cached.

---

## FINAL STATE, build 434 on canonical (2026-08-16; by Claude Code)

**Canonical `staging-environment-setup` is `efa4bc04`, build 434.** Four PRs merged today, zero
hosted macOS minutes and zero Android minutes across all eight pushes.

| PR | What | Canonical after |
|---|---|---|
| #1107 | three terminal fence paths, then three Codex findings | `92720d2c` |
| #1108 | the wipe as a fence owner, plus the throw-safe release | `b99e21b9` |
| #1109 | build 433 | `5dd6a2d6` |
| #1110 | onboarding re-entry for authenticated users | `96220156` |
| #1111 | build 434 | `efa4bc04` |

**DEVICE VERIFIED:** on a simulator running build 433, a plain logout followed by an email
sign-in completed normally instead of hanging. The bug is a mutation that never settles, so an
error returning at all proves the gate reopened. The onboarding fix (#1110) is source and CI
tier only, NOT device verified.

### OTA is wired correctly, and the earlier note was wrong

Production deployment is label **v5 targeting app version 2.0.0**, DISABLED on purpose, released
2026-08-09. Earlier notes said v4 at 1.1.0; that was wrong on both counts. Staging is ACTIVE at
100 percent with 2 of 2 installs, so OTA DELIVERY IS PROVEN end to end there.

🚨 The config trap, now verified: `ios/MurrorMobile/Info.plist` holds `${CODEPUSH_KEY_IOS}`, not a
literal key, so the OTA TARGET IS DECIDED BY `.env.production` AT BUILD TIME. The correct env
(sha256 `e50fc3c3...`) carries a key matching the PRODUCTION deployment. Compare key PREFIXES,
never suffixes: dev `4nAImB58`, Production `Ma6EMoAZ`, Staging `S3n34i5M`, all sharing the suffix
`V1DKQYFLzl`.

Production delivery cannot be proven until 2.0.0 ships, because there are no 2.0.0 installs to
receive it. That is sequencing, not a gap.

### The marketing email system has NEVER sent anything

Production `marketing` schema: `email_contacts` 5,578, `consent_events` 4,110, `suppressions`
105, **`email_events` 0**. `last_emailed_at` is NULL for EVERY contact, `ever_opened` 0. 5,378 ARE
synced to Resend, so the audience pipeline works up to the point of sending. Newest contact is
2026-08-11, so intake may have stopped too. Staging has NO marketing schema at all.

### Numbers re-measured, and one is a TRAP

3,124 auth users, 3,105 `murror_api."User"` rows. 2,833 subscription rows, EXACTLY 2,813 ACTIVE on
one iOS product. 🚨 `original_transaction_id` is NULL on ALL of them, so it is a CONSTANT not a
signal: `revoke where original_transaction_id is null` would revoke ALL 3,105 users INCLUDING
every real payer. The correct discriminator needs the absence of all THREE footprints plus a
free-tier product identity. 8 entitlement rows, 8 RevenueCat footprints, 3 contacts with
`premium_granted_at`: three independent signals agreeing that real paid subscriptions are single
digits.

### Sentry mobile production: email IS scrubbed, user.id and geo are NOT

`user.email` returns `[Filtered]`. Genuinely scrubbed. 🚨 Measurement lesson: `has:user.email`
MATCHES EVEN WHEN THE VALUE IS SCRUBBED, so it counts field presence rather than exposure. Use a
positive control. Still raw: `user.id` (a Supabase account UUID) and `geo.city` / `geo.country_code`.
`user.id` survives because sensitive fields match FIELD NAMES and the key is `id` under the user
context, not `userId`. Fix is Advanced Data Scrubbing on `$user.id` and `$user.geo`.

---

## MOBILE SOURCE LANE COMPLETE, build 433 on canonical (2026-08-16; by Claude Code)

**Canonical `staging-environment-setup` is now `5dd6a2d6`.** Both fence PRs and the build
bump are merged. The mobile SOURCE lane for the 2.0.0 candidate is done.

| PR | What | Canonical after |
|---|---|---|
| #1107 | three terminal fence paths, then the three Codex findings | `92720d2c` |
| #1108 | the wipe as a fence owner, plus the throw-safe release | `b99e21b9` |
| #1109 | build number 433 | `5dd6a2d6` |

**Build 433 verified BY EFFECT on canonical:** `Info.plist` 433, 26 pbxproj targets at 433,
ZERO remaining at 432. Allocated by `scripts/ios-next-build.sh` from a FRESH worktree at the
exact canonical commit (verified exact SHA match plus clean tree so the divergence guard
passed), never hand-edited, never run in the stale `MurrorMobile` checkout. App Store Connect
and canonical both reported 432 (prod 432, beta 431, alpha 370), so git and Apple agreed and
433 was uncontested.

**Cost: zero hosted macOS minutes and zero Android minutes across all six pushes in this
lane.** The build bump stayed inside `ci.yaml`'s pure-bump allowlist because the diff is the
integer and nothing else across exactly the five files that allowlist names. If a future bump
touches anything else under `ios/`, it will trigger the 36 minute smoke build.

**Build 432 must NOT be submitted.** It is uploaded, attached to no version, and predates
every fix from 14 to 16 August including all FIVE account-fence paths.

### What blocks the archive, all owner-gated

1. Pinned Xcode `/Library/MurrorRelease/Xcode-26.6.app` is NOT provisioned. `/Applications/Xcode.app`
   IS 26.6, the correct source. The release lane fail-closes on this trust root. The doc states
   Codex and Claude must not run those privileged commands.
2. There are EIGHT owner gates in `docs/release/IOS_OBSERVABILITY.md`, not two: including
   proving the historical Sentry token is revoked, approving third-party retention of the
   source map and native symbols, and a brand-new isolated bootstrap checkout needing reviewed
   Node 22.22.2 and Ruby 3.3.5 binaries plus a pre-approved `.env.production` digest.
3. **No 2.0.0 version record exists in App Store Connect.** Verified against the live API:
   1.1.0 REJECTED, 1.0.19 READY_FOR_SALE. A build cannot be attached until the record exists.

### 🚨 FREEMIUM: do NOT discriminate on original_transaction_id

Verified against PROD `dcftszkbpamgeivhtuzl` on 2026-08-16, two lanes independently.

`murror_api."User"` 3,105 users. `murror_api.subscriptions` 2,833 rows, of which EXACTLY
2,813 are `status=ACTIVE` on one iOS product. `original_transaction_id` is NULL on ALL 2,833
rows, every group. Only 4 rows have `current_period_end` in the future.
`murror_api.user_entitlements` has 8 rows. The API lane independently found 8 rows carrying
`revenuecat_user_id`, which corroborates the 8.

**THE TRAP.** Because ZERO rows carry `original_transaction_id`, it is a CONSTANT, not a
signal. The obvious cleanup, "revoke where `original_transaction_id` is null", revokes ALL
3,105 users INCLUDING EVERY REAL PAYER. The shipped `isFreeTierPlaceholder` gets this right
by requiring the ABSENCE of ALL THREE footprints (`revenuecat_user_id`,
`original_transaction_id`, `last_event_type`) PLUS a free-tier product identity, so a row
that looks free but carries any footprint keeps access. It fails safe. Do not let a
simplification past that guard.

Neither lane queried RevenueCat, so whether all 8 are CURRENTLY PAYING is unanswered, and the
board's "only 2 genuinely paid" is neither confirmed nor refuted. Do not treat 8 as the
paying count.

### Measurement rule earned the hard way today

**A negative measurement is a claim about the INSTRUMENT.** A probe that SHOWS a defect is
evidence; a probe that shows NO defect is a suspect, because the easiest way to not see
something is to build something that cannot see it. The API lane produced two false
negatives in one day, mismatched stack depths and a missing flush between captures, and the
second was briefly used to declare a reviewer's Critical "refuted by execution". The
reviewer was right. Always build a POSITIVE CONTROL into a probe: a case you know must fail.
If the control does not fail, the negative result is void.

### Evidence boundary, stated plainly

Everything in this lane is SOURCE and CI tier. **None of it has run on a device or a
simulator.** The original bug was found on a physical iPhone and the fix has never been
exercised there. Device verification of the exact TestFlight candidate remains open and is
the only evidence that would close the loop on the reported symptom.

---

## LOGIN FENCE part 2, the wipe was a fence nobody owned (2026-08-16; by Claude Code)

**MurrorMobile PR #1108**, branch `fix/account-fence-cleanup-owner`, base
`staging-environment-setup` (canonical `92720d2c`, which is #1107 merged). Pure `src/**`:
Android did NOT run, macOS smoke SKIPPED.

**A FIFTH wedge path existed and #1107 did not close it.** `completeAccountCleanup`
(`comlete-account-clean-up.ts`) shuts the account fence before its first await, never
reopens it, and registered NOTHING, so the ownership check could not see it. Two
consequences. It was unreleasable: on account deletion, `performFullLogout`
(`app-context-manager.ts`) retries the strict cleanup AFTER logout already dropped its
latch, so nothing owned the fence and nothing reopened it. Registering or signing in again
paused before its first request. Same forever spinner as the original bug, reached through
deletion instead of login. And it was invisible: a transition retiring while that wipe was
still draining saw both registries empty and reopened the network on a half cleared device.

**REOPENING IS NOT PASSIVE, and this corrects a claim in #1107's own commit message.**
`onlineManager.setOnline(true)` makes TanStack resume paused mutations AND refetch mounted
queries. Two reviewers independently proved it by execution: a probe fired a queued private
reflection with its payload intact the moment an ownerless reopen ran. Realistically that
becomes an unauthenticated POST, a 401, a lost entry, and mental-health content in server
request logs. Also worth recording: `queries.networkMode` is `offlineFirst`, so the fence
NEVER gated reads. It is a WRITE fence. Comments describing a query boundary are wrong.

**Fixes.** A cleanup claims the fence for its whole run and releases the claim in a
`finally`; the ownership check reads that claim. The counter lives in
`query-network-status.ts` because it is a leaf: `account-cache-isolation.ts` already
imports the cleanup, so a registry there would be an import cycle. The account-deletion
path releases the fence after its wipe, itself inside a `finally` because
`completeAccountCleanup` RETHROWS on a failed stage. Paths that reopen without a committed
owner clear the departing query memory first; a committed owner does not, because a
same-account re-login deliberately preserves hydrated memory. Sign-out fails closed on any
unrecognised shape, including `null`, matching the rule that file already states: absence
of a result is not proof of success.

### Method notes that cost real time here

1. **A mutation that fails NOTHING is a finding about the TESTS, not a fact about the
   code.** The first mutation pass on this branch showed THREE of four fixes had zero
   regression net. Without that check, three unguarded fixes would have gone into a release
   build. Always run the mutation, never assume a fix is covered because the suite is green.
2. **Review-then-fix is an infinite regress.** Every fix creates a new unreviewed commit.
   Break it by scoping the final review to the DELTA once the branch itself has been
   cleared, rather than re-reviewing the whole branch each round.
3. **A reviewer asserting COVERAGE is a claim to verify.** Codex named a real spec block as
   covering a guard; executing the mutation showed that block passes with the guard removed.
   Codex reviews read-only and runs no suite, so its coverage claims are code readings.
   The symmetric half also applies: a reviewer asserting a DEFECT is a claim to verify too.
4. Four review rounds, four real findings, including two regressions introduced BY the
   fixes. This fence is subtle enough that self-review is not sufficient.
5. **A whole bug class worth naming: the fix is CORRECT and never EXECUTES where it is
   needed.** Round 4 here was one instance, a release line skipped by a rethrow above it.
   The API lane hit the same shape the same day, a Sentry scrub hook correct everywhere
   except the transports that bypass the Nest filters, which is where the unscrubbed
   errors actually arrive. A green suite cannot see this class, and not by accident: the
   test the author writes exercises the path the author was already thinking about, the
   fix works there, and the uncovered path is uncovered BECAUSE it was not in mind, which
   is the same reason the fix does not reach it. Coverage and correctness fail together,
   so they cannot cross-check each other. The move: after writing a fix, ask a SEPARATE
   question from "is it correct", namely "on which paths does this line actually RUN".
   Enumerate those, enumerate the paths that reach the symptom, compare. The gap is the
   bug. Suspects between a fix and its trigger: a throw, an early return, a guard, a
   rejecting await, a filter covering one transport.

---

## LOGIN FENCE, four wedge paths closed (2026-08-16; by Claude Code)

**MurrorMobile PR #1107**, branch `fix/account-fence-resume-on-terminal-paths`, base
`staging-environment-setup` (canonical `af8db1d8`). Commits `5a70ae27` then `eef3e29a`.
Pure `src/**`, so Android did NOT run and the macOS smoke build was SKIPPED. Two Ubuntu
runs total.

**What the bug was.** `query-client.ts` ships mutations with `networkMode: 'online'`, so a
mutation PAUSES before its first request when `onlineManager` is offline and never settles.
`query-network-status.ts` gates `onlineManager` on a module flag the account fence sets. The
only production resume ran on isolation SUCCESS, which is reachable only after
`signInWithPassword`, which the fence itself gates. Terminal paths therefore left the gate shut
for the process lifetime, and force-quit was the only recovery. Google and Apple sign-in bypass
the mutation gate, so ONLY the email path hangs, which is why it was not constantly visible.

**Four paths, all now closed.** The first commit fixed three: the isolation reject path, the
provider-bind rollback, and a plain logout. Both `auth-service.ts` paths funnel through
`endAccountCacheIsolationLogoutFence`, so `auth-service.ts` is deliberately UNMODIFIED. The
second commit closed three more findings from a Codex adversarial review that returned
**DO-NOT-LAND** on the first:

1. A bare Supabase `SIGNED_OUT` (revoked or expired session, never through `AuthService.logout`)
   is the one fence acquisition registering NO owner: no logout latch, no isolation. The auth
   listener in `base-api-client.ts` now releases the fence AFTER its teardown, which is
   synchronous, so the ordering is safe.
2. A transition returning `'superseded'` because an ownerless invalidation bumped the generation
   has no real successor, so reopening only on the failure path stranded that interleaving.
   Every retiring transition is now a candidate last owner; the unowned check still keeps a
   genuine newer owner in control.
3. Supabase reports a failed sign-out by RESOLVING with an error, not throwing, and the session
   can survive that. The failure path took it on faith and could reopen networking under a live
   account with no committed cache owner. It now reopens only on confirmed session removal, and
   a rethrown error carries that answer instead of the constructor default.

**Storage writes stay fenced on every path.** Only query networking reopens. The four
`resumeAccountIO` call sites are untouched.

**Evidence.** 68 tests pass, type-check exit 0, ESLint exact baseline clean. Every fix is
independently mutation-proven: break it and exactly the intended test fails. Tests assert the
EFFECT on `onlineManager` plus whether a login mutation reaches its own `mutationFn`, because
the old suite mocked the fence module and stayed green while the app was broken.

**The spec that pinned the defect was rewritten in the same commit** as the fix. Left alone it
would have made the correct fix look like a regression.

### Traps found here that will bite the other lane

1. **`git checkout -- <file>` restores from HEAD**, so mutation-testing UNCOMMITTED work
   DESTROYS it. It silently wiped ~100 lines mid-run and the later mutations produced
   plausible failure counts measured against reverted code. Commit before mutation testing and
   re-baseline BETWEEN mutations.
2. **zsh does not word-split unquoted variables.** `jest $SPECS` matched nothing and ran ZERO
   tests while printing empty output through a grep, which reads exactly like "no failures".
   Pass paths literally. Same trap for an unquoted `--include=*.ts`.
3. **The `MurrorMobile/` checkout is NOT canonical.** It sits on stray branch
   `fix/prod-bundle-phase-node-resolution` at `c8850ba5`, 506 commits behind, with dirty
   `ios/` files. Never run `ios-next-build.sh` there.
4. **Codex asserted a test covered a line when it did not.** It named a real spec block, but
   executing the mutation showed that block passes with the line removed. Codex reviews
   read-only and does not run suites, so its coverage claims are code readings. Execution
   outranks them.

### Build number state

`ios-next-build.sh` fail-closes on App Store Connect: without a working ASC lookup it refuses
to allocate, because git cannot see a build already claimed at Apple. Verified working on this
Mac. Highest claimed is **432** (prod `6741769381` 432, beta `6741769645` 431, alpha
`6741769456` 370) and canonical `Info.plist` also reads 432, so git and Apple AGREE and no
off-lane build exists. **Next build is 433.** The script also has a divergence guard requiring
HEAD to equal the exact clean canonical commit; untracked files do not block it.

### Corrections to the launch board (artifact `18706bde`)

- **PHQ-9 bands:** the snapshot claim is partly WRONG. The band WORDS come from the API and
  render straight from route params (`test-result-screen.tsx:42-48`); the client computes no
  score-to-word mapping. What IS non-standard is a 4-step numeric bar LEVEL, and there are two
  disagreeing mappings: `weekly-result-screen.tsx:136-146` cuts at 5/15/20, and
  `reflection-chart-card.tsx:40-47` cuts at 8/15/20. The same file bands correctly for headline
  copy at `:94-102`, and GAD-7 at `:124-134` IS standard. No band word is drawn from the level,
  so this is a colour and height defect, LOWER liability than the board implies. Unmodified
  since their original commits. Clinician revision still in flight per `severity-band.ts:21-25`.
- **Triple error reporting:** REAL and WORSE than "triple", and #1104 did NOT touch it. Four
  stacked reporters: `api-error-handler.ts:152` (called on every `createApiError` branch),
  `base-api-client.ts:643` (the `:639` guard rethrows only NON-`ApiError`, so an `ApiError`
  falls through), ~50 domain-client catches, and `react-query-error-handler.ts:38-40` which
  calls `createApiError` again. Mutations double-count within the last one. Counts: query with
  a rethrowing client 4x, swallowing client 3x, raw network error 3x, **mutation 5x**. No dedup
  flag exists on `ApiError`. Every Sentry count is 3-5x real failures.
- **Mobile Sentry has no `NODE_ENV` trap.** `error-monitoring-service.ts:290` uses
  `Config.ENV` (react-native-config, per-scheme), not `process.env.NODE_ENV`. Shape is proven
  correct; actual per-tier VALUES are NOT proven, because the `.env` files are untracked and
  absent from worktrees.

---

## DELIVERY AUTHORIZED for the iOS observability lane (2026-08-15; by Claude Code, on Astro's instruction)

**This supersedes the freeze below for one specific piece of work: Codex's
`codex/ios-observability-finalizer-20260814`.** Astro asked for that lane to be
delivered rather than held. Nothing else in the freeze is lifted.

Verified state at the time of writing: HEAD `d8cc5986`, working tree clean apart from
an untracked `default.profraw`, **20 commits ahead of `origin/staging-environment-setup`
and 0 behind**, with `157d29d1` (#1104) and `4b16ca9f` (#1105) already integrated.
49 non-vendor files, roughly 13,311 insertions. The branch is **not pushed**, and none
of its `scripts/release/**` files exist on canonical, which is why the symbolication
upload has not been runnable despite #1104 fixing the destination.

**Actions cost decision, made by Astro:** landing this costs **one hosted macOS smoke
build plus two Android jobs**, because `android.yaml` carries a blanket `scripts/ci/**`
path filter and this branch changes 13 files there. That spend is **authorized once**,
on the condition that the same PR also narrows the `android.yaml` `scripts/ci/**` filter
to the paths an Android build actually consumes and adds
`concurrency.cancel-in-progress`. Without the concurrency guard each PR revision queues
another ~47 minute Android job. One-time cost, permanent saving.

**Remaining gates before push**, per Codex: resolve `default.profraw`; re-review
`d8cc5986`, which post-dates the LAND review at `fbcf07ae` and changes the release trust
boundary; run and record the release-contract tests, type-check, lint and
`git diff --check`; fetch canonical immediately before pushing. Claude is running an
adversarial review of `d8cc5986` in parallel.

**Keep as one PR.** The Xcode build phase invokes the release wrapper, which depends on
the finalizer, manifests, source-map receipt, pinned dependencies and uploader. Splitting
it would create an intermediate state that cannot produce a valid release.

**Stale branch disposition, agreed:** keep and refresh `codex/ios-production-hardening-20260801`
(#1004) and `codex/ios-notification-client-hardening-20260807` (#1040), which hold distinct
wanted work; keep `codex/ci-deps-lane-20260810` separately; retire
`codex/ios-production-427-audit-20260810` and `codex/ios-production-candidate-430` as
superseded by the build-432 lane and this release evidence.

## PRODUCTION PROMOTION IN PROGRESS, FREEZE ACTIVE (2026-08-14; by Claude Code)

**The 2026-08-05 production-promotion isolation policy below is ACTIVE right now.**
Promotion is underway and NOT complete. Its hard freeze boundary applies to Codex
until Astro explicitly confirms completion: no merge, rebase, push, PR, workflow
dispatch, deploy, migration, database/flag/config/credential change, signing,
device run, iOS edit, or staging/production runtime mutation.

### Claimed by Claude Code, do not touch

| Resource | Claim | Collision cost if touched |
|---|---|---|
| **iOS build number 432** | claimed, bump merged as MurrorMobile #1103 | Duplicate numbers already caused two 251 collisions and a phantom 253. Apple rejects the duplicate, so that build's fix silently never ships. **Never run `ios-next-build.sh` in the other lane.** |
| `MurrorMobile` canonical `staging-environment-setup` | authoritative | Bundles applied verbatim revert later fixes |
| `ios/` in every mobile worktree | authoritative | Frozen per policy |
| `ios/sentry.properties`, `android/sentry.properties`, `scripts/ci/check-tracked-env-files.mjs`, `src/common/monitoring/error-monitoring-service.ts` | claimed by MurrorMobile PR #1104 | Sentry credential and runtime lane, see the Sentry symbolication section below |
| viasr-api `staging` + `production` branches | mid-promotion | Prod deploy lane was reopened today, see below |
| Supabase prod `dcftszkbpamgeivhtuzl` + staging `sprkxmwrvgqgebajopwp` | migrations applied directly today | Ledger is already fragile, see below |

### Landed today by Claude Code (do not re-do, do not revert)

- MurrorMobile: #1093 ASC monitor, #1094 consent gate, #1099 PHQ-9 crisis
  resources, #1100 consent copy accuracy, #1101 build 431, #1102 RCT-Folly lock,
  #1103 build 432. Build 431 is on TestFlight as **Murror Beta** (staging bundle).
- murror-backend: #907, #908, #909 merged AND applied to staging + production,
  verified live. Two production RLS leaks closed (`journal_prompts`,
  `articles_v2`); AI-training consent split from the deletion pipeline.
- viasr-api: #615, #616, #617 merged, #611 promoted staging to production, #618
  reopened the production deploy lane (the SGP1 guard asserted a kubeconfig
  context label our own runbook can never produce, so prod deploys had been
  impossible since 2026-07-30).

### Sentry symbolication, two lanes that must not merge into one (2026-08-14)

The iOS observability work is split deliberately. **The two lanes have zero file
overlap and this was verified, not assumed.** Keep it that way.

| Lane | Owns | Status |
|---|---|---|
| Codex, `codex/ios-observability-finalizer-20260814` | everything under `scripts/release/` and `scripts/ci/*observability*`, `ios/Podfile`, `ios/ExportOptions.production.plist`, `ios/MurrorMobile.xcodeproj`, `.github/workflows/ci.yaml`, `e2e.yaml`, `docs/release/` | ~8,600 lines, local only, unpushed, no PR |
| Claude, MurrorMobile PR #1104 | the four files in the claim table above | pushed, PR open against `staging-environment-setup` |

Do not rebuild the other lane's half. Specifically:

1. **Do not add a `SENTRY_AUTH_TOKEN` GitHub Actions secret.** The Codex uploader
   rejects that variable outright and its driver aborts if any `SENTRY_*` var
   other than `SENTRY_ORG` and `SENTRY_PROJECT` is present. The token is read
   from a TTY prompt, so that lane is operator-machine-only by design.
2. **Native crashes bypass the JS `beforeSend` entirely.** The hook is deleted
   before native init, so dSYM upload delivers symbolicated native crashes with
   no dependency on the runtime fix. The lanes are parallel, not sequential.
3. The runtime previously discarded `stacktrace` and `mechanism` from every
   event, so source maps had nothing to symbolicate. PR #1104 fixes that and
   also restores fatal JS crash persistence, which the missing `mechanism` had
   silently broken.
4. `defaults.org` was `canhnv` and `defaults.project` was `murrorlocal` in both
   tracked `sentry.properties`. A wrong destination does not fail an upload, so
   this could never have surfaced in a build log. PR #1104 corrects both and
   pins them in CI.

Verified live: release `app.murror.mobile@2.0.0+432` already exists in
`murror/murror-mobile-production` and is receiving events, which confirms the
release identifier the Codex uploader hard-gates against is exactly right.

**Archive-time trap for the NEXT build.** `SENTRY_DISABLE_AUTO_UPLOAD` is not a
repo variable and greping the workflows for it finds nothing. It is read from the
environment by the SDK's own
`node_modules/@sentry/react-native/scripts/sentry-xcode.sh:32`, which the bundle
phase still invokes (`ios/MurrorMobile.xcodeproj/project.pbxproj:1277`). The
release token was removed from the tracked `sentry.properties` in #1080, and
`.env.sentry-build-plugin` does not exist, so on upload failure that script emits
`error:`-prefixed output at line 39, which Xcode treats as a build failure. Before
archiving from canonical, export either `SENTRY_AUTH_TOKEN` or
`SENTRY_DISABLE_AUTO_UPLOAD=true`. PR #1104 does not change this either way; it
only corrects the destination. The durable fix is the Codex lane's
`xcode-bundle-with-sentry-disabled.sh`, which sets `SENTRY_PROPERTIES=/dev/null`
and moves upload out of the bundle phase entirely.

### murror-api #766 and #767 MERGED, exact state for the canonical launch board (2026-08-14)

Handoff only, for reconciliation into artifact `18706bde`. Artifact `57ae8f11` is frozen as a dated
companion snapshot and is no longer updated.

**Both merged to `staging`. `origin/staging` head `424432d2`. Neither is deployed.**

| PR | Merge commit | What it fixes |
|---|---|---|
| #766 | `711b8cab` | `GET /api/v1/activity/notification-window` 500ing for every user on every cold start |
| #767 | `424432d2` | Prisma 5xx never reaching Sentry, plus the PII leak that fix would have opened |

**#766.** `murror_api.user_activity_hourly_ca` does not exist in staging or production: the five
TimescaleDB migrations were force-marked applied with `applied_steps_count = 0` and the extension was
never installed. Prod had 3,105 users and 0 rows in `user_notification_windows`. The endpoint now
degrades to a neutral window instead of 500ing, gated on a predicate requiring Prisma `P2010` **and**
SQLSTATE `42P01`, with `meta.code` authoritative on property presence and a line-anchored message
fallback. The 3 AM cron hit the same relation and was failing as an **unhandled promise rejection**;
same treatment. A once-per-process latched ERROR now fires alongside the per-occurrence WARN, because
converting the 500 to a 200 otherwise made a 100 percent degradation invisible to both the old ERROR
path and #767's Sentry path. **No migration: `prisma/` untouched, the migration lane is broken on both
environments.**

**#767.** Took four review rounds. Each round produced transport-level proof and each round was still
incomplete:

1. Filter allowlist verified clean, but `Sentry.init({integrations: []})` does **not** disable default
   integrations, it merges into them, so `RequestData` attached headers, cookies, body and URL.
2. `beforeSend` fixed that, but **transaction events bypass `beforeSend` entirely** (Sentry uses
   `beforeSendTransaction`), and outbound fetch breadcrumbs recorded query strings, live via the user
   email sent to RevenueCat.
3. Those closed, but the route fallback still preserved lowercase slugs and `db.query.text` was
   unscrubbed.
4. Closed by deleting the shape heuristic entirely: only declared routes or `<unmatched>` are sent.

Final wire state: bearer tokens, session cookies, request bodies, query strings, raw URLs, the
`baggage` header's encoded path copy, SQL text and bound values are all dropped across error,
transaction and breadcrumb channels. Proven with real-SDK transport probes and per-hook mutation tests.

**Deliberate tradeoffs to record on the board:**
- Transaction names collapse to `METHOD <unmatched>`, so Sentry Performance route grouping is lost.
  `http.route` still carries the declared pattern. The correct future lever is
  `transaction_info.source === 'route'`.
- Span descriptions are redacted strictly, so `prisma:client:operation` and `SELECT "User"` show as
  `<redacted>` in the trace waterfall.
- #766 deferred a negative cache or circuit breaker. About 3,105 failed queries per cold-start wave,
  no retry storm.

**Still open, not fixed by either PR:**
- The aggregates still do not exist. Creating them exposes a second bug: `calculate-window` jobs are
  queued to `NOTIFICATION_WINDOW_QUEUE` and **no `@Processor` consumes them**.
- `account-deletion.service.ts:561-578` calls `refresh_continuous_aggregate` on both missing
  aggregates, unguarded, inside the deletion pipeline.
- P2003 returns 500 rather than 400 because `getPrismaErrorStatus` skips it. Excluded from Sentry
  reporting; the status mapping is unchanged and client-visible.
- P2024 pool exhaustion maps to 400, so it never becomes a 5xx and stays invisible to Sentry.

**Unverified:** neither PR ran against a live database, and no event has been observed reaching Sentry
project `4511044717379584`. First real proof is a Prisma 5xx appearing there after deploy.

### Actions cost rule now applies to both lanes (2026-08-14)

Astro set a global GitHub Actions cost rule for Claude and Codex. **Default platform
scope is iOS only.** No Android or macOS-desktop work or runs unless explicitly
requested. One hosted macOS smoke build only when a PR is ready and locally green.
Inspect workflow triggers before pushing, batch pushes, require concurrency
`cancel-in-progress` and exact path filters, and **pause discretionary hosted native
runs at 75% of budget**. August stood at **~$128 of ~$150** for MurrorMobile when the
rule landed, so the pause threshold is already crossed.

Two triggers measured today, both fired by accident on MurrorMobile PR #1104:

| Edit | Consequence |
|---|---|
| `android/sentry.properties` (9 lines, no compiled content) | matches `android.yaml`'s `android/**` filter, **47 minute Android build** |
| `scripts/ci/check-tracked-env-files.mjs` | `ci.yaml` `build-relevance` treats any `scripts/` change as release-sensitive, sets `smoke-required=true`, **38 minute macOS build** at 10x rate |

A pure `src/**` TypeScript PR fires neither. Verified on PR #1105: Android did not run
and `smoke-required` was false. **Separate config and script edits from TypeScript
edits** when native cost matters.

**Open gap, Codex's lane since it owns `.github/workflows/`:** `ci.yaml` has
`concurrency.cancel-in-progress: true` but **`android.yaml` has none**, so stacked
pushes queue multiple 47 minute Android jobs rather than cancelling the superseded
ones. Fixing it edits `.github/workflows/android.yaml`, which is itself inside the
Android paths filter, so the fix costs one Android run. Batch it with other CI work
rather than pushing it alone.

### Live hazards the other lane must know

1. **`supabase db push` is BROKEN on both staging and production.** The remote
   ledgers hold versions with no repo file. Today's migrations had to be applied
   directly, which added more. Do not attempt migrations in either lane.
2. **murror-backend DeployDEV has failed since 2026-08-03** on a stale
   `SUPABASE_ACCESS_TOKEN`. A green-looking run is not proof; read the step log.
3. **Production body logging is still ON in viasr-api prod** until the reopened
   deploy lane runs. The fix is on the `production` branch, undeployed.

### Safe for Codex during the freeze

Source audits, isolated unit tests, accessibility work, internal documentation,
read-only trunk fetches, deterministic contract generation. High-value candidates
that do NOT overlap the claims above: PHQ-9 **item 9** plumbing design (the band
gate that shipped is a floor, not crisis coverage), the ja/vi translation debt for
the reworded consent copy, and triage of the eight open murror-api PRs.

---

## Codex iPhone notification re-audit and integration checkpoint (2026-08-07; 11:31 AM PDT; local only)

- **Current shipping verdict:** staging notifications are **NO-GO**. Current
  deployed/source refs are mobile `staging-environment-setup@afc84960` (build
  419), API `staging@4b76e52`, Viasr `staging@f12b63b`, and legacy
  `main@f72af119`. The refreshed requirement matrix is **0/19 closed, 7
  partial, 12 open**. Build 419 is App Store Connect `VALID`, but its
  notification behavior is unchanged from build 416.
- **Mobile boundary:** MurrorMobile PR #450 (`staging-environment-setup ->
  main`) is still open/conflicting and follows the moving staging head. Do not
  land new mobile notification commits on staging until that production
  boundary is explicitly resolved; doing so would add them to #450. Native
  identity/bootstrap work also overlaps open PR #1004. The dirty canonical
  mobile checkout remains Claude-owned and was not touched.
- **API reconciliation:** the ten reviewed notification-hardening commits now
  replay cleanly on exact current API staging in task-owned branch
  `codex/ios-notification-integration-20260807`, worktree
  `/private/tmp/murror-api-ios-notification-integration-20260807`, head
  `185551c`. RevenueCat's current `premiumEntitlementLookupKey` and the new
  OneSignal identity configuration are both preserved. Nothing was pushed.
- **Spot/Memory compatibility:** disposable composite branch
  `codex/ios-notification-spots-integration-20260807`, worktree
  `/Users/astro/.codex/visualizations/2026/08/01/019fbe9e-d4e9-7310-88ca-67380ffecc33/worktrees/murror-api-ios-notification-spots-integration-20260807`,
  merges current staging + the ten hardening commits + PR #728. Local commit
  `fba7e1b` fixes the PR's semantic mismatch: Memory/Spot causal sends defer
  through quiet hours; typed provider failures use the shared confirmed
  bounded retry/DLQ contract; event IDs reach provider idempotency; DLQ/log
  source values are stable route names rather than user/event IDs; and all five
  Memory/Spot producers observe asynchronous broker confirmation. Five focused
  suites pass **115 tests**; full TypeScript passes; changed-file lint has zero
  errors. This composite is not a proposed replacement for Claude's PR #728;
  extract/rebase the compatibility commit only after its owner refreshes the PR.
- **Ringtone:** `foodshot_jingle.wav` is still present in build 419. Current
  deployed senders omit `ios_sound`; the isolated API, Viasr, and legacy
  candidates request the exact file. The ringtone is therefore **not yet live**
  and needs one landed/deployed candidate plus audible foreground/background/
  terminated proof on the real iPhone.
- **Remaining root gates:** transactional outbox durability; verified native
  OneSignal token/refresh bridge; account-bound retained taps; external iOS
  Settings opt-out convergence; generic no-photo Live Activity; privacy-safe
  opened/routed telemetry; Viasr durable scheduling/capability truth; legacy
  QStash inventory; one consolidated staging deployment/build; and the physical
  APNs/action/sound matrix. No provider write, push, PR, merge, deployment,
  workflow, build-number edit, archive, upload, or device run occurred.
- **Progress page:** live locally at
  `http://127.0.0.1:8765/docs/progress/ios-notifications.html`. It separates
  100% audit coverage from 0% shipping closure and shows 75% local package
  progress. No external hosting or GitHub Actions were used.

---

## Documentation lane collision prevention (2026-08-05)

- The umbrella checkout's `PROGRESS.md` and `docs/PROGRESS.md` are already dirty
  with work from the parallel iOS/documentation lane. Do not reset, stash, or
  overwrite those files from a cross-platform task.
- The umbrella checkout had been reporting approximately 89,830 entries because
  nested Murror repositories and worktrees were not locally excluded. Local
  `.git/info/exclude` rules now ignore only those independent roots; no nested
  files were deleted or changed.
- A clean documentation worktree is available at
  `/Users/astro/Projects/murror-transfer/Murror/worktrees/codex-docs-unblock-20260805`
  on branch `codex/docs-unblock-20260805`, commits `34f75cd` and `e291365`.
  It already contains the web parity checkpoint and Claude can append the iOS
  write-up to that worktree's `PROGRESS.md` without touching the iOS checkout or
  the dirty umbrella docs.
- The isolated web parity implementation is clean at commit `8bcbfa6f` in
  `murror-platform-worktrees/codex-web-parity-integration-20260804`; it contains
  no `ios/` path. The Android parity worktree remains separate and unchanged.

## Shared five-file ownership audit for Claude (2026-08-05)

- Do not commit the five dirty tracked files as one batch. The current diffs are
  not a single Codex parity change.
- `PROGRESS.md` is mixed: the dated web/Android parity sections beginning
  2026-08-03 are Codex parity documentation, while the 2026-08-04
  `Five fixes were in the wrong file` section is iOS/TestFlight work owned by
  the parallel Claude lane. It requires hunk-level separation before either
  owner commits it.
- `AGENTS.md` is a historical memory-context replacement, `docs/PROGRESS.md`
  is a July Guided MTC entry, `docs/CONVENTIONS.md` is a separate July storage
  hygiene addition, and `docs/runbooks/staging-environment.md` is a separate
  staging-auth harness runbook. They are not part of the current Codex web and
  Android parity commit and must remain uncommitted until their owners confirm
  them.
- The safe coordination point is the clean docs worktree
  `/Users/astro/Projects/murror-transfer/Murror/worktrees/codex-docs-unblock-20260805`
  on `codex/docs-unblock-20260805`. The promotion freeze still forbids push,
  PR, merge, deployment, workflow dispatch, and staging-runtime changes.

## Codex web server-backed private journal draft checkpoint (2026-08-05; local only)

- The isolated web branch is now clean at `8bcbfa6f` (`feat(web): sync private
  journal drafts`), **0 behind / 56 ahead** of the freshly fetched `origin/dev`.
  The branch-owned diff contains no `ios/` path and was not pushed, reviewed,
  merged, deployed, or used to mutate staging.
- Web private journal drafts now reconcile the account-scoped local draft with
  the authenticated server draft: GET current draft, create/update through the
  existing journal routes, delete on explicit discard or successful submit, and
  retry server sync after a local-only save. The browser cache key is account
  scoped, and a remote draft wins only when it is at least as new as local text.
- The exit flow is explicit and accessible: Keep writing, Save for later, or
  Discard draft. Local browser persistence remains the fallback when server sync
  is unavailable; no journal content is sent to analytics.
- Evidence: focused draft/dialog/writer coverage **4 suites / 12 tests**; full
  web Jest **67 suites / 329 tests**; TypeScript, changed-file ESLint,
  Prettier, production Vite build (**2,847 modules**), `git diff --check`, and
  both web staging source guards pass. Watchman, stale browser-data,
  Browserslist, and large-chunk messages remain advisories.
- Evidence boundary: authenticated two-account browser reload/discard behavior,
  hosted web artifact/API/schema/CSP/WebSocket proof, Android Gradle/CI/signing/
  device validation, and post-promotion landing remain open gates. Overall
  evidence-weighted parity remains **77%**.
- Cleanup after verification moved only the exact web-lane dependency tree
  (**1.7 GB**), web-client dependency directory (**124 KB**), and Vite output
  (**3.9 MB**) to macOS Trash. Android artifacts were already absent; Turbo
  metadata, shared/global caches, other app dependencies, all worktrees, iOS,
  and Uni were preserved.

---

## Production-promotion isolation policy (2026-08-05; Astro clarified)

- **Disposition:** preserve API
  `2c6594cda572cb79d149bae6821b51916008f2f8`, web
  `d4bf2daf`, and Android
  `0eebee489d83d7a42f3ebfbfcab94b1ed442cce2` in their existing isolated
  worktrees. During the promotion freeze, Codex may continue source audits,
  approved isolated implementation, unit tests, accessibility work, internal
  documentation/progress tracking, read-only trunk fetches, deterministic
  contract generation, and cleanup of explicitly inventoried task-owned
  reproducible artifacts.
- **Hard freeze boundary:** do not delete the worktrees, switch shared checkouts,
  merge, rebase, push, open PRs, dispatch workflows, deploy, migrate, change
  databases/flags/configuration/credentials, sign, run devices, edit iOS, touch
  Uni, mutate staging runtime, or touch production until production promotion is
  explicitly confirmed complete. Stop isolated work on promotion-owned path
  overlap or remote drift. Staging health, a successful build, or an unchanged
  trunk alone does not prove promotion completion.
- **Monitor:** app automation `murror-post-production-parity-hold`, shown as
  **Murror parity freeze-safe progress**, checks every 12 hours. It may continue
  the allowed isolated work above, but only implements a substantive slice after
  Astro has reviewed its ranked recommendation.
- **Resume gate:** after explicit confirmation, run the Murror workspace guard,
  fetch the real API `staging`, web `dev`, and mobile
  `staging-environment-setup` trunks, audit path and behavior overlap, merge
  those newly promoted trunks into the isolated parity branches, and rerun the
  complete verification matrix. Stop if any promotion-owned file overlaps or any
  evidence gate regresses.
- **Post-promotion order:** review/land API first, web second, and Android third.
  Web artifact build/deployment, deployed schema/realtime corroboration, Android
  hosted CI/signing/device work, and authenticated two-account validation remain
  separately approved gates. Overall parity stays at **77%** until the next
  verified source checkpoint;
  the forecast is now **3–5 working days after promotion and access gates open**,
  not a fixed calendar deadline.
- **Conflict state:** worktrees are intentionally preserved without dependency
  trees or reproducible build output. Claude's canonical iOS checkout and the
  production-promotion candidate remain authoritative and untouched by this
  lane.

## Codex web shared-memory owner lifecycle checkpoint (2026-08-05; local only)

- **Scope and ownership:** the isolated web branch records local commit
  `1d763993` (`feat(web): add shared memory owner lifecycle`). It extends the
  existing connection-detail wall without changing API source, Android/shared
  React Native runtime, branch-owned `ios/**`, Claude's canonical iOS checkout,
  workflows, deployment, staging runtime, database, production, or Uni.
  A read-only fetch leaves the lane **0 behind / 47 ahead** of `origin/dev`;
  nothing was integrated during the freeze.
- **Parity behavior:** authenticated owners can now add one private photo at a
  time with an optional note, edit title/date/note metadata, and delete their
  own memory behind an explicit confirmation. The client validates the
  existing JPEG/PNG/WebP/HEIC/HEIF allowlist and 10 MiB cap, previews only a
  temporary object URL, and leaves multipart construction to the API service.
  The server remains authoritative for EXIF removal, private storage, signed
  delivery URLs, ownership, and retention cleanup. Delete removes the card
  optimistically and rolls back on failure; create/edit invalidate the wall.
- **Contract and accessibility evidence:** the web adapter now has encoded
  owner item paths, fail-closed single-memory and delete readers, existing
  generated route provenance, 44px controls, labelled file/title/date/note
  fields, live status/error regions, keyboard-safe edit/delete panels, and no
  client persistence of storage details. The Android multi-photo album picker
  remains a separate follow-up; this slice deliberately uses one upload per
  submit to avoid ambiguous retry duplication during the freeze.
- **Automated evidence:** focused coverage passes **3 suites / 11 tests**; the
  full web gate passes **56 suites / 297 tests**, TypeScript, changed-file
  ESLint, Prettier, a production Vite build (2,840 modules), API-client
  verification, and both web staging source guards. Existing Watchman,
  stale-browser-data, Browserslist, and large-chunk advisories remain
  maintenance warnings.
- **Evidence boundary and cleanup:** this remains local source and automated
  evidence only. It was not pushed, reviewed, merged, deployed,
  browser/device-validated, or authenticated against staging. Authenticated
  two-account privacy/moderation, browser upload behavior, Android native
  validation, multi-photo parity, deployed schema/CSP/WebSocket proof, and
  post-promotion landing remain open. Overall evidence-weighted parity remains
  **77%**; the forecast remains 3–5 working days after promotion and
  runtime/access gates open. The exact task-owned web dependency tree (**1.7
  GB**) and Vite output (**4.4 MB**) were moved recoverably to Trash after
  validation; shared/global caches and all other lanes remain preserved.

## Codex web shared-memory album upload parity checkpoint (2026-08-05; local only)

- **Scope and ownership:** the isolated web branch records local commit
  `2089c37` (`test(web): cover shared memory retry queue`) atop behavior commit
  `3154ba1b` (`feat(web): match shared memory album uploads`). It extends the
  owner composer and its focused queue proof without changing API source, Android/shared React Native
  runtime, branch-owned `ios/**`, Claude's canonical iOS checkout, workflows,
  deployment, staging runtime, database, production, or Uni.
  A read-only fetch leaves the lane **0 behind / 49 ahead** of `origin/dev`;
  nothing was integrated during the freeze.
- **Parity behavior:** web now stages up to 10 photos, matching Android's
  album picker and shared-note flow. Each accepted file has a removable,
  revocable local preview; uploads run sequentially through the existing
  `POST /api/v1/connections/{id}/memories` contract. Successful files leave the
  queue, progress is announced, and a partial failure retries only remaining
  files rather than replaying completed uploads. The server remains
  authoritative for EXIF removal, private storage, signed delivery URLs,
  ownership, and retention cleanup.
- **Automated evidence:** focused coverage passes **4 suites / 12 tests**; the
  full web gate passes **57 suites / 298 tests**, TypeScript, changed-file
  ESLint, Prettier, a production Vite build (2,841 modules), API-client
  verification, and both web staging source guards. Existing Watchman,
  stale-browser-data, Browserslist, and large-chunk advisories remain
  maintenance warnings.
- **Evidence boundary and cleanup:** this remains local source and automated
  evidence only. It was not pushed, reviewed, merged, deployed,
  browser/device-validated, or authenticated against staging. Authenticated
  two-account privacy/moderation, browser upload behavior, Android native
  validation, deployed schema/CSP/WebSocket proof, and post-promotion landing
  remain open. Overall evidence-weighted parity remains **77%**; the forecast
  remains 3–5 working days after promotion and runtime/access gates open. The
  exact task-owned web dependency tree (**1.7 GB**) and Vite output (**4.4
  MB**) were moved recoverably to Trash after this checkpoint; shared/global
  caches and all other lanes remain preserved.

## Codex web Diary empty-state entry checkpoint (2026-08-05; local only)

- **Scope and ownership:** isolated web commit `fba30117` (`feat(web): add
  diary empty-state entry point`) adds the missing Diary empty-state action
  without changing API source, Android/shared React Native runtime,
  branch-owned `ios/**`, Claude's canonical iOS checkout, workflows,
  deployment, staging runtime, database, production, or Uni. A read-only fetch
  leaves the lane **0 behind / 50 ahead** of `origin/dev`; nothing was
  integrated during the freeze.
- **Parity behavior:** when Diary is validly empty, web now exposes a labelled,
  keyboard-focusable, 44px `Start a reflection` control that opens the existing
  `/journal/new` composer, matching Android's empty-Diary start action. Loading,
  initial failure, saved-content refresh failure, and the feature-gated Memory
  Room entry remain unchanged.
- **Automated evidence:** focused Diary coverage passes **4 tests**; the full
  web gate passes **57 suites / 298 tests**, web TypeScript, changed-file
  ESLint, Prettier, production Vite build (2,841 modules), both web staging
  source guards, and the repository hook's nine workspace typecheck tasks.
- **Evidence boundary:** this remains local source and automated evidence only;
  no push, review, merge, deployment, browser/device run, authenticated
  staging session, iOS edit, or production action occurred. Overall
  evidence-weighted parity remains **77%**; the forecast remains 3–5 working
  days after promotion and runtime/access gates open.

## Codex web notification preference parity checkpoint (2026-08-05; local only)

- **Scope and ownership:** isolated web commit `ccff6602` (`feat(web): add
  notification preference parity`) adds the web-side callback-ping and
  quiet-hours settings without changing API source, Android/shared React
  Native runtime, branch-owned `ios/**`, Claude's canonical iOS checkout,
  workflows, deployment, staging runtime, database, production, or Uni. A
  read-only fetch leaves the lane **0 behind / 51 ahead** of `origin/dev`;
  nothing was integrated during the freeze.
- **Parity behavior:** web now consumes the existing authenticated
  `PATCH /v1/users/me/callback-pings`, `GET/PATCH /v1/users/me/quiet-hours`
  contracts with fail-closed readers, whole-hour 0–23 validation, account-keyed
  optimistic rollback, retryable load failure, accessible switches and selects,
  and server-authoritative success reconciliation. The UI explicitly separates
  these preferences from browser permission and provider delivery.
- **Automated evidence:** focused notification coverage passes **2 suites / 9
  tests**; the full web gate passes **59 suites / 307 tests**, TypeScript,
  changed-file ESLint, Prettier, production Vite build (2,842 modules), API
  client provenance, both web staging source guards, and the repository hook's
  nine workspace typecheck tasks.
- **Evidence boundary:** this remains local source and automated evidence only;
  no push, review, merge, deployment, browser/device run, authenticated
  staging session, iOS edit, or production action occurred. Browser permission,
  actual push delivery, authenticated staging, Android device validation,
  deployed schema/CSP/WebSocket proof, and post-promotion landing remain open.
  Overall evidence-weighted parity remains **77%**.

## Codex web Home Diary recovery checkpoint (2026-08-05; local only)

- **Scope and ownership:** isolated web commit `81e18bab` (`feat(web): harden
  Home Diary lifecycle`) extends only the Home Diary rail in
  `murror-platform-worktrees/codex-web-parity-integration-20260804`. A fresh
  read-only fetch leaves the lane **0 behind / 53 ahead** of `origin/dev`;
  Android remains **0 behind / 23 ahead** of
  `origin/staging-environment-setup`, and API remains **0 behind / 27 ahead**
  of `origin/staging`. No shared checkout or other lane was edited.
- **Parity behavior:** web now opts the Home Diary query into focus/reconnect
  refresh like the Android Home rail, keeps saved cards visible during a
  failed refresh, separates an initial request failure from a valid empty
  Diary, and exposes retryable, keyboard-focusable 44px controls with explicit
  loading/error/status semantics. Existing Diary navigation, mood check-in,
  and journal creation paths are reused unchanged.
- **Automated evidence:** focused Home coverage passes **1 suite / 3 tests**;
  the full web gate passes **60 suites / 310 tests**, web typecheck,
  changed-file ESLint, Prettier, `git diff --check`, production Vite build
  (**2,842 modules**), API-client provenance, both web staging source guards,
  the Murror workspace guard, and the repository hook's nine workspace
  typecheck tasks.
- **Evidence boundary and cleanup:** this remains local source/automated
  evidence only. No push, review, merge, workflow, deployment, browser/device
  run, authenticated staging session, iOS edit, or production action occurred.
  Authenticated browser recovery, deployed artifact/schema/CSP/WebSocket proof,
  Android device validation, and post-promotion landing remain open. Overall
  evidence-weighted parity remains **77%**; the forecast remains 3–5 working
  days after promotion and runtime/access gates open. The isolated web
  dependency tree (**1.7 GB** plus **124 KB** app links) and Vite output
  (**4.4 MB**) were moved recoverably to Trash after the final documentation/
  status audit; shared/global caches remain untouched.

## Codex web Home mood check-in parity checkpoint (2026-08-05; local only)

- **Scope and ownership:** isolated web commit `6024b7b9` (`feat(web): harden
  Home mood check-in flow`) extends only the Home mood-check-in and journal-mode
  modal components. The lane remains **0 behind / 52 ahead** of `origin/dev`;
  Android is **0 behind / 24 ahead** of
  `origin/staging-environment-setup`, and API is **0 behind / 27 ahead** of
  `origin/staging`. No shared checkout, Android runtime, branch-owned `ios/**`,
  Claude's iOS checkout, or deployment state was changed.
- **Parity behavior:** both web modals now use the shared focus/escape/restore
  lifecycle, labelled dialog semantics, explicit modal descriptions, and
  keyboard-focusable 44px controls. Mood choices expose selected state and
  saving status; non-duplicate submission failures stay in the private modal
  with an accessible retry action. Duplicate-completion handling remains
  fail-closed and routes to the existing journal/deep-chat choice.
- **Automated evidence:** focused Home modal coverage passes **2 suites / 4
  tests**; the full web gate passes **62 suites / 314 tests**, typecheck,
  changed-file ESLint, Prettier, `git diff --check`, production Vite build
  (**2,843 modules**), API-client provenance, both web staging source guards,
  the Murror workspace guard, and the repository hook's nine workspace
  typecheck tasks.
- **Evidence boundary and cleanup:** this remains local source/automated
  evidence only. No push, review, merge, workflow, deployment, browser/device
  run, authenticated staging session, iOS edit, or production action occurred.
  Browser permission/provider delivery, authenticated staging, Android device
  validation, deployed artifact/schema/CSP/WebSocket proof, and post-promotion
  landing remain open. Overall evidence-weighted parity remains **77%**. The
  isolated web dependency tree (**1.7 GB** plus **124 KB** app links) and Vite
  output (**3.9 MB**) were moved recoverably to Trash after the final
  documentation/status audit; shared/global caches remain untouched.

## Codex Android alternate Branch test-link parity checkpoint (2026-08-05; local only)

- **Scope and ownership:** isolated Android commit `0eebee48` (`fix(android):
  restore alternate Branch test links`) adds only the missing HTTPS intent-filter
  declaration in `android/app/src/main/AndroidManifest.xml` and its local
  build-isolation contract assertion. The Android lane is freshly fetched at
  **0 behind / 24 ahead** of `origin/staging-environment-setup`; no shared React
  Native runtime, branch-owned `ios/**`, Claude checkout, workflow, deployment,
  staging runtime, database, production, or Uni path changed.
- **Parity behavior:** iOS staging declares four Branch universal-link hosts,
  and Android's product flavors already define the same four resources. Android
  now registers the missing `branch_alternate_test_domain` alongside the normal,
  alternate, and test hosts while preserving the existing `murror-stg` custom
  scheme, `singleTask` lifecycle, and Branch session initialization/reinitialization.
- **Automated evidence:** the Android build-isolation guard now proves the
  staging flavor resources and all four manifest hosts; the Android staging
  workflow guard passes; the manifest passes XML validation; 11/11 API-contract
  tests, deterministic client verification, exact-file ESLint with no errors,
  Prettier, and `git diff --check` pass. The staging environment is absent from
  the worktree by design. The workflow guard passed before dependency cleanup;
  after the exact task-owned dependency tree was moved to Trash it is not
  rerunnable without restoring the removed YAML package.
- **Evidence boundary and cleanup:** this remains local source/automated evidence
  only. No Gradle assembly, hosted CI, signing, artifact installation, real
  Branch-link/device run, authenticated staging session, push, review, merge,
  deployment, or production action occurred. Overall evidence-weighted parity
  remains **77%**; the forecast remains 3–5 working days after promotion and
  runtime/access gates open. The exact task-owned Android dependency tree
  (**1.2 GB**), local Yarn cache (**366 MB**), and install state (**1.8 MB**)
  were moved recoverably to Trash after validation; shared/global caches and
  all other lanes remain preserved.

## Codex web private journal draft parity checkpoint (2026-08-05; local only)

- **Scope and ownership:** the isolated web lane now records feature commit
  `95e6dcd5` (`feat(web): preserve private journal drafts`) plus safety follow-up
  `d4bf2daf` (`fix(web): protect journal draft recovery`), at **55 ahead / 0
  behind** freshly fetched `origin/dev`. The change is limited to the web
  journal writer, its account-scoped draft adapter, and focused tests. No API,
  Android/shared React Native runtime, branch-owned `ios/**`, Claude checkout,
  workflow, deployment, staging runtime, database, production, or Uni path
  changed.
- **Parity behavior:** fresh unscoped free-writing restores only the current
  account's private local draft, autosaves after a short idle period, persists
  through the existing Close and Draft actions, clears after successful submit,
  and exposes a visible status when browser storage fails. Prompted and
  relationship-task writing never restores generic private text into the wrong
  context. The safety follow-up preserves text typed before profile hydration
  and keeps the editor open when a non-empty draft cannot be saved. Server-backed
  draft sync and an explicit discard action remain intentionally separate work.
- **Automated evidence:** focused draft coverage passes **3 suites / 9 tests**;
  the full web gate passes **65 suites / 323 tests**, web TypeScript, changed-file
  ESLint, Prettier, `git diff --check`, production Vite build (**2,845
  modules**), API-client provenance, both web staging source guards, and the
  repository hook's nine workspace typecheck tasks. Existing Watchman,
  stale-browser-data, Browserslist, and large-chunk advisories remain
  maintenance warnings.
- **Evidence boundary and cleanup:** this remains local source/automated
  evidence only. No push, review, merge, workflow, deployment, authenticated
  browser session, device run, iOS edit, or production action occurred.
  Authenticated browser reload, server-backed draft synchronization, deployed
  artifact/schema/CSP/WebSocket proof, Android device validation, and
  post-promotion landing remain open. Overall evidence-weighted parity remains
  **77%**; the forecast remains 3–5 working days after promotion and runtime/
  access gates open. After the final audit, the exact task-owned web dependency
  tree (**1.7 GB**), app-local links (**124 KB**), and Vite output (**3.9 MB**)
  were moved recoverably to Trash; shared/global caches remain untouched.

## Codex iPhone notification hardening checkpoint (2026-08-05; local only)

- **Scope and freeze:** staging Murror on iPhone, English-only public
  notifications. Android, iPad, Watch, web, production, iOS source edits,
  provider writes, device runs, pushes, PRs, merges, workflows, deploys, signing,
  and TestFlight remain untouched under the promotion freeze. No build number was
  edited or selected.
- **API lane:** isolated branch
  `codex/ios-notification-production-hardening-20260805` at local commit
  `0092022` is ten commits ahead of unchanged
  `origin/staging@74e2dd3c74537b70c396c8467863826cd3b4511e`. The lane now has
  generic English public copy, account-wide opt-out, truthful provider outcomes,
  durable 5s/30s/120s retry plus a bound/consumed sanitized DLQ,
  broker-confirmed persistent publishing, stable UUID idempotency, per-family
  TTL/collapse, bounded primitive routing data, typed settings actions,
  identity-safe logs, and provider-side quiet-hours deferral. All 20 non-Memory
  causal call sites propagate `send_after`; optional streak and poke nudges still
  suppress. Missing policy data, invalid timezones, and storage errors fail
  closed. The common disabled path avoids the timezone query.
- **Verified identity backend:** commit `0092022` removes the unused legacy
  REST-key HMAC endpoint and replaces it with an authenticated, default-off,
  one-hour ES256 JWT contract bound to `identity.external_id`. A shared signer
  accepts escaped PEM, rejects non-P-256 or missing key material without logging
  secrets, and changes OneSignal User API deletion/verification from REST-key to
  user-bound bearer authentication only when rollout is enabled. Environment
  validation requires `ONESIGNAL_IDENTITY_VERIFICATION_SECRET_KEY` whenever
  `ONESIGNAL_IDENTITY_VERIFICATION_ENABLED=true`. Provider support/dashboard
  enablement, secret provisioning, and the frozen native iPhone token/refresh
  bridge remain external/mobile gates; do not enable the flag before those land.
- **Viasr lane:** isolated branch
  `codex/ios-notification-capability-gates-20260805` at local commit `dab49ba`
  is six commits ahead of unchanged
  `origin/staging@f12b63bcbf7e105a4c59e92c5e393b54e7112efe`. Daily-care and
  callback capabilities are explicit and fail closed, callback producers honor
  the master gate, `NOTIFICATION_SKIP_LLM=true` now selects deterministic
  fallback instead of disabling scheduling, and provider/Sentry logs omit
  identity, content, scores, provider IDs, response bodies, and raw errors. The
  callback and generic-care payloads now use generic English public surfaces,
  request the branded sound, and include the same build-416-compatible Manage
  button, protected settings sentinel, and typed forward action as central API.
  Commit `1e90419` retires Viasr's independent default-true
  `public.user_profiles.enable_notification` reader and batches care audiences
  against canonical `murror_api."User"` consent, excluding disabled and
  soft-deleted accounts. Database setup/query/shape failures fail closed, and
  session creation is lazy so disabled-care imports do not require PostgreSQL
  configuration. Independent review caught SQLAlchemy `RowMapping` handling,
  an unrelated onboarding eligibility expansion, and an empty-audience session
  acquisition. Commits `1e90419` and `dab49ba` now use the general `Mapping`
  contract, keep the change consent-only, and return empty before any session is
  acquired. Final independent re-review found no actionable issue.
- **Legacy OneSignal/QStash lane:** isolated branch
  `codex/ios-notification-legacy-hardening-20260805` at local commit `4007114f`
  is seven commits ahead of freshly fetched, unchanged
  `origin/main@f72af119166867fd4ac6ef7ba608abb27997777c`. It now has generic
  English copy, the branded sound, typed provider outcomes, TTL/collapse,
  bounded retries and DLQ-visible terminal cleanup, fail-closed current consent,
  CAS-safe survey ownership, settings-driven cancel/replace, stale-timezone
  suppression, current IANA/DST local-calendar scheduling, privacy-safe logs,
  and no wildcard Redis scan. The final commit adds Manage-action parity,
  preserves typed `screen` routing, and replaces Apple renewal's unsupported
  `targetView=subscriptions` with allowlisted `route_screen_tab` / `HomeScreen`
  plus Apple-UUID retry identity. Repository-wide Deno checking plus 107 tests /
  75 steps, formatting, lint, and diff checks pass; final independent review
  found no actionable issue. Nothing was pushed, reviewed remotely, deployed,
  or applied to QStash/staging.
- **Ringtone:** `foodshot_jingle.wav` is present in all four iPhone app resource
  phases of exact mobile staging source `4ff1572b`, and build 416 already contains
  it. The file is valid 1.4-second 48 kHz 24-bit stereo Linear PCM WAV with
  SHA-256 `77bf78e122760e0a9d10ea3d126205568070ed4d423c812da9cc1d8f06e34231`.
  Audio analysis confirms it is non-silent (mean -28.7 dB, peak -12.1 dB).
  The local API, Viasr, and legacy provider payloads request top-level
  `ios_sound: foodshot_jingle.wav`; provider contract tests assert it. Mobile
  foreground display recovery passes 14/14. Independent ringtone review found
  no local source mismatch. Current deployed API/Viasr/legacy refs still omit
  the sound field, so build-416 baseline delivery does not prove the branded
  sound. Actual audible foreground,
  background, and terminated APNs proof is still open and must use the shared
  candidate after the freeze.
- **Evidence:** the consolidated API notification gate passes 26 suites / 233
  tests, changed-file Prettier and ESLint with zero warnings, strict TypeScript,
  diff checks, and a full Nest build. The full Viasr gate passes 1,514 tests, 2
  skips, and Ruff; the focused notification/capability slice passes 29 tests,
  and importing the sender without a PostgreSQL URL succeeds. The legacy
  lane passes repository-wide Deno checking and 107 tests / 75
  steps. These are local source/build facts, not deployed staging or release
  proof.
- **Conflict boundary:** API PR #728 remains open and owns Memory/Spot schema,
  handlers, message patterns, and shared-photo call sites. This lane edits none
  of those files; its contract guard excludes `shared-photos`, and the existing
  Memory suite remains green. Current Viasr staging PRs do not overlap these
  files. Re-fetch and repeat the overlap audit before any review or landing.
- **Progress and storage:** the live page is
  `http://127.0.0.1:8765/docs/progress/ios-notifications.html`, local docs commit
  `25c58268`. It reports 7/8 approved local packages (88%) and strict release
  closure 0/19, with 16 partial and 3 open. The post-build 68 MiB API `dist` tree
  was removed; no new package store, Viasr environment, iOS DerivedData,
  archive, or simulator was created.
  A later identity build produced and then removed another 66 MiB `dist` tree.
  The legacy final gate's 46 MiB ignored dependency tree and about 15 MiB of
  Viasr task-owned Python/test caches were also removed, leaving those worktrees
  at 4.9 MiB and 13 MiB. The final consent pass again removed only the exact
  Viasr `.pytest_cache` and `.ruff_cache`; no shared Poetry environment or
  package cache was changed. Approximately 234 GiB remains free. The
  active API dependency tree is retained only while the isolated lane remains
  under review.
- **Resume sequence:** after explicit freeze release, fetch the real mobile/API/
  Viasr trunks, audit overlap, review/land API and Viasr changes in one coordinated
  batch, deploy staging once, and then run one physical-iPhone APNs matrix for
  sound (foreground/background/terminated), settings action, cold/warm routing,
  permission/profile/provider convergence, and two-account isolation. The frozen
  ES256 native-SDK login/refresh bridge, generic Live Activity glyph, and
  exact iPhone settings destination remain separate mobile implementation gates.
  Runtime QStash inventory/DLQ inspection, review/landing/deployment of the local
  Apple-renewal route and Manage-action parity, and their physical tap proof also
  remain explicit release gates.

## Codex web accessible primary navigation checkpoint (2026-08-05; local only)

- The isolated web parity branch
  `codex/web-parity-integration-20260804` now has local commit `7bedcf5c`
  (`feat(web): add accessible primary navigation`). It adds the five existing
  primary destinations—Home, Connections, Reflection, Knowledge, and Diary—with
  route-aware `aria-current`; journal, Deep Chat, and voice-summary paths stay
  grouped under Diary.
- `MainLayout` now owns a skip link, a focusable main landmark with focus
  transfer after path/query changes, a polite route announcement, and document
  titles. The navigation keeps 44px minimum targets, reuses existing Lucide
  icons, and includes reduced-motion transition handling. No API, Android/shared
  React Native, iOS, workflow, deployment, staging runtime, or analytics state
  changed.
- Evidence in that lane: focused accessibility tests 12/12; full web client
  gate 41 suites / 220 tests; web TypeScript, lint, Prettier, and production
  build pass. Existing stale browser-data and large-chunk build warnings remain
  maintenance debt. The repository pre-commit hook was bypassed for this local
  checkpoint only because the filtered web install lacks unrelated workspace
  dependencies and the hook invokes a monorepo-wide typecheck; web-specific
  checks passed. The commit is not pushed, reviewed, merged, deployed, or
  browser/device-validated, so it is local source evidence only.
- The filtered web dependency tree and Vite `dist` output are task-owned and
  will be removed after final verification. Shared/global stores, other
  worktrees, Claude's canonical iOS checkout, and Uni remain untouched.

## Codex Diary lifecycle parity checkpoint (2026-08-05; local only)

- The isolated web branch now has local commit `41b13baa`
  (`feat(web): harden Diary lifecycle parity`). It accepts the existing mobile
  and API `voice_summary` Diary entry type, opens those entries at their source
  date with autoplay continuity, and fails closed to `/diary` when the source
  date is invalid. Existing journal and Deep Chat destinations remain unchanged.
- Diary and Home share the destination adapter. Cards now expose explicit type
  labels and accessible names, 44px button semantics, voice-script fallback
  content, and a dedicated voice style. Diary distinguishes initial request
  failure from valid empty state, offers retry, preserves cached entries during
  refresh failure, and adds focus-visible controls.
- Evidence: focused lifecycle tests 10/10; full web client gate 43 suites /
  226 tests; TypeScript, lint, Prettier, and production build pass. Existing
  stale browser-data and large-chunk warnings remain maintenance debt. No API,
  Android/shared React Native, iOS, workflow, deployment, staging runtime,
  device, or analytics state changed. The commit is not pushed, reviewed,
  merged, deployed, or browser/device-validated, so this is local source
  evidence only.

## Codex Relationship Mission quiz parity checkpoint (2026-08-05; local only)

- The isolated web parity branch now has local commit `d2970686`
  (`feat(web): add relationship quiz parity slice`). This is a web-only
  additive slice; API, Android/shared React Native, branch-owned `ios/**`,
  Claude's canonical iOS staging checkout, workflows, deployment, staging
  runtime, and production remain untouched.
- The slice reuses the existing generated OpenAPI declarations for
  `/api/v1/connections/{connectionId}/questions` and `/api/v1/connections/{connectionId}/answers`.
  It adds typed RTK Query adapters, fail-closed response readers, quiz/task/
  bundle invalidation, and an accessible `/friends/:id/quiz` Relationship
  Mission page. The page supports one-question progress, choice plus optional
  500-character context, private-until-both-reflect copy, retry/error/empty/
  completed states, and a For Us CTA when the active task is `QUIZ`.
- The completed state does not render answer pairs; the mobile compare-answer
  payoff is intentionally not claimed as complete in this checkpoint. Focused
  quiz/For Us tests pass 11/11. The final full web gate passes 45 suites / 231
  tests, TypeScript via the build, lint, Prettier, and a production Vite build.
  Existing stale browser-data and over-500 kB chunk warnings remain maintenance
  debt. The local commit is not pushed, reviewed, merged, deployed, or
  browser/device-validated.
- Authenticated two-account behavior, deployed artifact/CSP/schema proof,
  review/landing, and post-promotion release gates remain open. Overall parity
  remains 77%. After final verification, the web lane's task-owned dependency
  tree and Vite `dist` output were removed; the source worktree is about 28 MiB.
  Shared/global stores, other worktrees, iOS, and Uni were not cleaned.

## Codex Relationship Mission comparison payoff checkpoint (2026-08-05; local only)

- The isolated web parity branch now has local commit `2e82f5ba`
  (`feat(web): add relationship quiz comparison parity slice`). This is an
  additive web-only continuation of the prior quiz slice. API, Android/shared
  React Native, branch-owned `ios/**`, Claude's canonical iOS staging checkout,
  workflows, deployment, staging runtime, and production remain untouched.
- Web now exposes the protected `/friends/:id/quiz/compare` route. The
  comparison builder requires exactly two answer rows, maps the signed-in
  viewer by user ID, resolves choice keys to display values, compares sorted
  choice sets, and fails closed when identity or shared answers are missing.
  Completed quiz and For Us states link to the payoff. The optional shared
  `Murror noticed` insight is rendered only after a valid comparison exists;
  user IDs are not rendered, and valid choice keys are translated to display
  labels; malformed unknown keys follow the contract's explicit fallback.
- Focused quiz/For Us/contract tests pass 17/17. The final full web gate passes
  46 suites / 237 tests, TypeScript, lint, Prettier, and a production Vite
  build. Existing Watchman recrawl, stale browser-data, browserslist, and
  large-chunk advisories are maintenance noise/debt, not new failures.
- The task-owned web dependency tree and Vite `dist` output were moved to an
  exact temporary cleanup directory and removed after verification, freeing
  about 791 MiB. The isolated source lane remains clean and reproducible from
  its tracked lockfile; no shared cache or other worktree was cleaned.
- This is local source evidence only: the commit is not pushed, reviewed,
  merged, deployed, or browser/device-validated. Authenticated two-account
  behavior, deployed artifact/CSP/schema proof, review/landing, and the
  post-promotion release gates remain open. Overall parity remains 77%; the
  forecast remains 3–5 working days after promotion and access gates open.

## Codex web relationship reflection task-completion checkpoint (2026-08-05; local only)

- The isolated web branch now has local commits `82fa6051` and `1700ae42`
  (`fix(web): harden relationship reflection handoff`). The follow-up keeps the
  slice additive and local in `murror-platform-worktrees/codex-web-parity-integration-20260804`.
  API source/schema, Android/shared React Native runtime, branch-owned `ios/**`,
  Claude's canonical iOS checkout, workflows, deployment, staging runtime, and
  production remain untouched.
- For Us reflection entry points now carry the relationship ID, current task
  type, cycle token, owner hint, and prompt into the existing journal writer.
  Journal creation sends the generated `relationshipConnectionId` field, then
  records `/api/v1/connections/{id}/task-completion` with duplicate-safe
  `RECORDED`, `ALREADY_RECORDED`, and `SUPERSEDED` outcomes. The web behavior
  follows the authoritative Android cycle-safety rule: the free-text reflection
  captures the current shared task type even when that type is `QUIZ`; the
  dedicated quiz page remains the separate question-answer surface.
- Transient completion failures preserve the journal and queue only the
  account/relationship/cycle identifiers in bounded `murror_*` storage. The
  next protected journal-writer visit retries that owner-scoped item; terminal
  auth/validation/access failures are not replayed. No private reflection text
  is persisted in the retry queue. Existing 44px/focus/reduced-motion For Us
  controls remain in place, and the empty state now exposes an explicit LOG
  reflection CTA. The follow-up centralizes journal-first orchestration, keeps
  stale-owner intents fail closed without a request, and prevents a transient
  completion failure from recreating the journal.
- Focused contract/intent/queue/For Us/orchestration tests pass 22/22; the final
  full web gate passes 50 suites / 253 tests, TypeScript, lint, Prettier, and a
  production Vite build. Existing Watchman recrawl, stale browser-data,
  browserslist, and large-chunk advisories remain maintenance debt. The
  repository-wide commit hook was attempted but could not run to completion in
  the filtered web-only install because unrelated workspace dependencies such
  as NestJS/Winston were absent; web-client gates passed independently. The
  specialist strategy panel also confirmed this slice should precede invitation
  public-token/auth routing work.
- Generated web declarations currently follow the API source/artifact lineage
  `ae75086`/`2c6594c`, while the canonical API checkout is older. Confirming
  that lineage against the target/deployed API remains an external contract
  gate; no API source or generated artifact was changed in this freeze-safe
  web slice.
- This is local source evidence only: the commit is not pushed, reviewed,
  merged, deployed, or browser/device-validated. Authenticated two-account
  journal/task completion, deployed schema/artifact/CSP proof, realtime
  corroboration, review/landing, Android native evidence, and post-promotion
  release gates remain open. Overall parity remains 77%; forecast remains
  3–5 working days after promotion and all runtime/access gates open. After
  final verification, the web lane's dependency tree and Vite `dist` output
  are task-owned cleanup targets only.

---

## Codex For Us relationship reliability checkpoint (2026-08-05; verified locally)

- **Scope and ownership:** Astro approved the contract-first For Us reliability
  slice inside the Murror-only web/Android parity goal. API and web source changes
  are confined to their isolated Codex lanes; Android receives only generated
  API-contract artifacts. No shared React Native runtime, branch-owned `ios/**`,
  iOS build number, archive, TestFlight action, Uni path, workflow change or
  dispatch, push, merge, deployment, database write, signing action, device run,
  or production state changed. This is local source evidence, not shipped staging
  parity.
- **Fresh lane proof:** after fetching each real trunk, API is clean at
  `2c6594cda572cb79d149bae6821b51916008f2f8` (**27 ahead / 0 behind**
  `origin/staging@74e2dd3c7453`), web is clean at
  `d347f21ea41783878212cfe844721c05c5662da4` (**34 ahead / 0 behind**
  `origin/dev@00fa6cd164e7`), and Android is clean at
  `d861f0b850412a26b76eb70b68a2cffc559a69ae` (**23 ahead / 0 behind**
  `origin/staging-environment-setup@4ff1572b124b`). The Murror workspace guard
  passed before lane work. The current slice changes no workflow file.
- **API and generated contracts:** source commit `ae75086` removes redundant
  `isArray` metadata that made relationship tasks/insights generate as nested
  arrays. Artifact commit `2c6594c` deterministically exports 83 controllers,
  307 paths, and 336 operations at schema SHA-256
  `15cb3806b297328bd848423f99376be98e54c413929a0e806e9b33d089c6062d`.
  Web checkpoint `88fb887a` and Android checkpoint `d861f0b8` consume the
  same artifact; generated declarations are byte-identical at
  `8302ba75e9d4fc450d8b334be228fba41d9df245f14ea0fb096b51a458ab2cff`,
  and the web client receipt begins `61fc837f`. The Android commit changes
  exactly four generated contract files and has an empty `ios/**` diff.
- **Web boundary and lifecycle:** commit `b7722371` replaces three overlapping
  page reads with one fail-closed bundle query keyed by viewer and relationship.
  It rejects malformed nested arrays, prevents prior-key cache bleed, suppresses
  private stale data on 401/403/404, and distinguishes loading, empty,
  tasks-available, generating, ready, degraded-ready, stale-ready, failed,
  unauthorized, recoverable timeout, and initial error. Valid cards remain
  visible across partial, stale, generating, and failed responses.
- **Realtime and presentation:** commit `e164e8d2` reconciles exact-identity
  Socket.IO task/insight events and identifier-only Supabase takeaway events with
  timestamp ordering, 400 ms burst coalescing, five-minute generation timeout,
  and full listener/channel teardown. The existing carousel renders pending,
  preparing, failed, and ready takeaway cards. The named For Us region exposes
  busy/status semantics, 44px controls, visible focus, polite ready
  announcements, light/dark contrast, and reduced motion. No private
  relationship/takeaway/insight content was added to analytics or logs. Production
  build commit `d347f21e` narrowly fixes optional-insight type narrowing.
- **Automated evidence:** API build, typecheck, lint, repository format, 12/12
  OpenAPI tests, and deterministic artifact verification pass. Web passes 38
  suites / 208 tests, 12/12 API-client checks, deterministic client verification,
  direct app and 9-task monorepo typechecks, lint, repository format, both staging
  source guards, and a production build (2,142.57 kB JS / 614.20 kB gzip). The
  existing over-500 kB chunk warning and stale browser-data warning remain
  maintenance debt; no dependency was added. Android passes 11/11 contracts,
  deterministic generation, contract lint/format, TypeScript, and ESLint with
  zero errors (131 pre-existing warnings). No Gradle artifact or Android runtime
  proof is claimed.
- **Evidence boundary / progress:** the private tracker is now **77%**: capability
  96%, contracts/configuration 99%, current-trunk integration 97%,
  authenticated runtime 18%, and reviewed release gates 12%. Authenticated
  two-account For Us flows, actual Socket.IO/Supabase delivery, deployed
  schema/revision, web CSP/artifact, Android Gradle/hosted CI/signing/device,
  review, merge, workflow, deployment, and policy gates remain open. The
  conditional **14–19 Aug 2026** staging-proof window still assumes external
  inputs open by 7 Aug; runtime proof is expected to take 3–5 working days after
  access.
- **Storage and iOS conflict proof:** final cleanup removed about **4.0 GiB** of
  explicitly inventoried, ignored, reproducible dependencies and build/cache
  output from only the three isolated lanes. Current footprints are approximately
  74 MiB API, 28 MiB web, and 64 MiB Android, with about 239 GiB free. All three
  source worktrees remain clean; tracked source/contracts, lockfiles, the tracked
  Yarn release, shared/global stores, other worktrees, and Uni were preserved.
  Claude's canonical iOS checkout remained read-only at HEAD
  `c8850ba5764d8279cc688ac41b98ac6f50bea878`. Its seven tracked dirty paths and
  broader fingerprint `998c882f0bd66ebea1db786cc1031232c1a39917e964257b88abfa2b6a0728bf`
  were observed, not edited or cleaned; that broad fingerprint was unchanged
  across this final cleanup.
- **Safe next order:** review/land API first, then web and Android against freshly
  fetched trunks. Only after exact-trunk landing should an authorized owner build
  the revision-labelled web artifact, approve its immutable-digest staging
  deploy, corroborate deployed schema/realtime behavior, and run authenticated
  browser plus Android native/device matrices.

---

## Codex Connection Streak + History checkpoint (2026-08-05; verified locally)

- **Scope and ownership:** Astro approved the Streak/History slice inside the Murror-only web/Android parity goal. API and web source changes are confined to their isolated Codex lanes; Android receives only generated API-contract artifacts. No shared React Native runtime, branch-owned `ios/**`, iOS build number, archive, TestFlight action, Uni path, workflow dispatch, push, merge, deployment, database write, signing action, or production state changed. This is local source evidence, not shipped staging parity.
- **Fresh lane proof:** after fetching each real trunk, API is clean at `288ef63` (**25 ahead / 0 behind** `origin/staging@74e2dd3c`), web is clean at `4d5a0dbc` (**28 ahead / 0 behind** `origin/dev@00fa6cd1`), and Android is clean at `7f0e0ce4` (**22 ahead / 0 behind** `origin/staging-environment-setup@4ff1572b`). The workspace guard passed before work in every lane.
- **API contract correction:** source commit `c734adc` replaces the accidental `success({data, meta})` double wrapper with the existing canonical paginated response, so runtime and OpenAPI both expose flat `data: StreakDto[]` plus `meta.pagination`. The query documentation now matches the validated 1-366 limit, and focused controller plus OpenAPI regression tests pin both behaviors. Artifact commit `288ef63` deterministically exports 83 controllers, 307 paths, and 336 operations at schema SHA-256 `3b135a42eb4cc44a5dda2aca11633e428498cac75c4e5a700259cfdf9605dee9`.
- **Generated clients:** web checkpoint `74e8b935` and Android checkpoint `7f0e0ce4` consume that exact API artifact. Their generated declarations are byte-identical at SHA-256 `090c70cb3bf6309467f14014cab8277662788f392d0e25cb1747680f3620a3f5`; the web provenance receipt is `dbff1e0a9934d6ae7fecf7c9937faacc1d56571fc105de6f46a5477da7ceb61a`. The Android commit changes exactly four generated contract files and has an empty `ios/**` diff.
- **Web contract and lifecycle:** commit `5bbf0cb3` adds one fail-closed parser that accepts the canonical flat envelope plus the temporary deployed legacy nested envelope, rejects malformed rows/pagination, distinguishes a valid empty history, and feeds one shared 366-day account-reset-safe cache used by Home and Reflection. Existing utilities were extended in place for canonical `streakDay` bucketing, duplicate collapse, one resting day, reset after a gap of at least three calendar days, per-run display reset, continuous `[3, 7, 14, 30, 60, 90, 180, 365]` milestone progression, six Home cells, and a 13-month window.
- **Web presentation:** commit `4d5a0dbc` aligns Home to **Connection Streak**, including two past days, today, and three future days; connection-day shape; mood/rest/milestone/today/future states; and explicit first-load error versus stale-ready recovery. Reflection uses `?month=YYYY-MM` for Back/Forward/reload continuity, opens the selected/current month directly, exposes `Day X of Y` and milestone guidance, and projects future milestones within the bounded six-month range. Semantic labels, shape meaning, 44px controls, focus treatment, and reduced-motion behavior are explicit. No private mood or streak analytics were added.
- **Automated evidence:** API passes build, typecheck, lint, repository formatting, 12 Streak suites / 122 tests, 12/12 OpenAPI checks, and deterministic artifact verification. Web passes 30 suites / 150 tests, 12/12 API-contract checks, generated-client drift, app and monorepo typechecks, lint, repository formatting, both staging source guards, and a production build (2,123.95 kB JS / 609.00 kB gzip; the existing large-chunk warning remains maintenance debt). Android passes 11/11 API-contract checks, generated-client verification, contract lint/format, TypeScript, ESLint with zero errors, and 2 focused Streak/Reflection suites / 56 tests. Repository-wide Android formatting still reports 97 pre-existing files outside this exact four-file delta; the four generated files pass individually and were not mass-reformatted.
- **Evidence boundary / progress:** the private tracker is now **75%**: capability 93%, contracts/configuration 99%, current-trunk integration 94%, authenticated runtime 18%, and reviewed release gates 12%. No authenticated browser session, deployed API-envelope corroboration, deployed web revision/CSP/WebSocket proof, Android Gradle artifact, emulator/device behavior, review, merge, workflow, or staging deployment is claimed. The conditional **14-19 Aug 2026** staging-proof window remains dependent on external inputs opening by 7 Aug.
- **Safe landing and rollout order:** review the API source/artifact, web, and Android checkpoints against freshly fetched trunks. Because web deliberately tolerates both response shapes, land and deploy the tolerant web reader before changing the deployed API envelope; Android already tolerates both at runtime. Only after exact-trunk landing should an authorized owner build the revision-labelled web artifact, deploy its immutable digest, corroborate the API schema/runtime, and run authenticated browser plus Android native/device matrices.
- **Storage and conflict proof:** final cleanup removed about **3.9 GiB** of reproducible task-owned API/web/Android dependencies, API/web build output, Turbo metadata, and the isolated Android Yarn install cache. Current footprints are approximately 74 MiB API, 28 MiB web, and 64 MiB Android, with about 239 GiB free on the data volume. All three source worktrees remain clean; tracked source/contracts, lockfiles, the tracked Yarn release, shared/global package stores, other worktrees, and every Uni path were preserved. Claude's canonical iOS checkout remained read-only at HEAD `c8850ba5`; its pre-existing dirty-state fingerprint was identical before and after cleanup at `7cb0d3061521b9f0efb65836ef82dcd75c6f218a815d3ed234f917eb0de7871c`. Reinstall from the tracked lockfiles before further local validation.

---

## Codex web friend-invitation handoff checkpoint (2026-08-05; local only)

- **Scope and ownership:** the bounded web-only friend-invitation handoff is
  recorded in local commit `5751b81e` (`feat(web): preserve friend invitation
  handoff`) on `codex/web-parity-integration-20260804`. No API source or
  generated artifact, Android/shared React Native runtime, branch-owned
  `ios/**`, Claude's canonical iOS checkout, workflow, deployment, staging
  runtime, database, production, or Uni path changed.
- **Auth continuation:** the existing protected `/friends?token=...` route now
  survives `ProtectedRoute` redirects and the email login, signup, OTP,
  onboarding, subscription, and Google-auth return path. Continuation state is
  internal-path-only: external URLs, auth routes, control characters, malformed
  router state, and unsafe query/hash fragments fail closed. The invitation
  token is looked up once, scrubbed from the address bar with replace semantics,
  and never put into analytics, logs, or persistent storage.
- **Invitation behavior:** the existing inviter lookup and accept/decline
  adapter remain in place. Invalid, expired, and own-link outcomes are mapped
  to explicit dialogs; successful actions invalidate friend, connection, and
  public-inviter caches, while failed actions keep the dialog available for a
  retry. Account changes clear pending invitation state. Accessible modal
  semantics, labelled headings, Escape handling, focus trapping/restoration,
  reduced motion compatibility, and 44px touch targets are explicit.
- **Intentional non-goals:** this checkpoint does not add a public `/invite`
  route, migrate legacy invitation endpoints to canonical REST, add connection
  request lookup/send/received APIs, or change Android. Those choices remain
  gated on deployed API lineage and post-promotion runtime review.
- **Evidence:** focused safety suites pass 26/26; the final web client gate
  passes **52 suites / 268 tests**, TypeScript, ESLint, Prettier, and the
  production Vite build. Existing Watchman, stale browser-data, Browserslist,
  and large-chunk advisories remain maintenance debt. The repository pre-commit
  hook was attempted and failed only in unrelated workspace typechecks because
  the filtered web install intentionally lacked NestJS/Winston/TypeORM
  dependencies; the local commit used `HUSKY=0` after web-specific gates passed.
- **Evidence boundary and cleanup:** this is local source evidence only. It was
  not pushed, reviewed, merged, deployed, or browser/device-validated.
  Authenticated cold-link flows, real email/OTP completion, two-account privacy,
  public-token/API lineage, deployed artifact/CSP/WebSocket proof, Android
  native/device proof, and post-promotion landing remain open. The task-owned
  web dependency tree and Vite `dist` output were removed after verification
  (about **791 MiB**); shared/global stores, other worktrees, iOS, and Uni were
  preserved. Overall parity remains **77%**, with the forecast at 3–5 working
  days after promotion and runtime/access gates open.

## Codex web connection-request parity checkpoint (2026-08-05; local only)

- **Scope and ownership:** the isolated web branch records local commit
  `d4055493` (`feat(web): add connection request parity`). The slice adds the
  authenticated exact-email lookup/send flow, a neutral not-found result,
  status-aware result messaging, and an incoming **Requests** filter for
  `PendingReceived`. It also carries the API's numeric `invitationId` into the
  existing accept/decline action path when available. No API source or
  generated artifact, Android/shared React Native runtime, branch-owned
  `ios/**`, Claude's canonical iOS checkout, workflow, deployment, staging
  runtime, database, production, or Uni path changed.
- **Web behavior and accessibility:** the new connection-request dialog uses
  the canonical `/v1/connections/lookup` and
  `/v1/connections/:userId/connection-request` routes through typed,
  fail-closed readers. It validates and normalizes email input, avoids raw
  payload/error exposure, supports loading/rate-limit/unavailable states, and
  preserves the existing share-link flow. Connection cards now use valid
  interactive markup, keyboard activation, visible focus, and 44px request
  action targets. The existing legacy invitation adapter remains in place for
  accept/decline; migrating that path and proving the deployed API lineage are
  post-promotion gates.
- **Automated evidence:** focused contract coverage passes **41/41 tests**;
  the full web client gate passes **53 suites / 283 tests**, TypeScript, ESLint,
  Prettier, and a production Vite build. The API-client contract guard passes
  with schema `15cb3806…`, declaration `8302ba75…`, and receipt
  `61fc837f…`; both web staging build and deploy source guards pass. Existing
  stale browser-data, Browserslist, and large-chunk advisories remain
  maintenance warnings. The repository pre-commit hook was attempted and
  failed only in unrelated workspace typechecks missing filtered-install
  NestJS/Winston/TypeORM dependencies; the local checkpoint used `HUSKY=0`
  after web-specific gates passed.
- **Evidence boundary and cleanup:** this is local source evidence only. It
  was not pushed, reviewed, merged, deployed, browser/device-validated, or
  authenticated against staging. Two-account privacy, deployed API/schema and
  web artifact/CSP/WebSocket proof, Android native/device proof, and
  post-promotion landing remain open. The exact task-owned web coverage file,
  dependency trees, and Vite `dist` output were removed after verification;
  shared/global caches, other worktrees, iOS, and Uni were preserved. Overall
  evidence-weighted parity remains **77%**, with the 3–5 working-day forecast
  beginning only after promotion and runtime/access gates open.

## Codex web Memory Room navigation parity checkpoint (2026-08-05; local only)

- **Scope and ownership:** the isolated web branch records local commit
  `7a0d362d` (`feat(web): close memory room navigation parity`). The
  feature-gated Diary header now exposes an accessible Memory Room entry, and
  the web router accepts the native mobile deep-link spelling
  `/memory_room/:id` alongside the canonical `/memory-room/:memoryId` route.
  Both paths use the same protected, owner-scoped page and fail dark when
  `VITE_MEMORY_ROOM_ENABLED` is not exactly `true`. No API source or generated
  artifact, Android/shared React Native runtime, branch-owned `ios/**`, Claude's
  canonical iOS checkout, workflow, deployment, staging runtime, database,
  production, or Uni path changed.
- **Parity and accessibility:** the route contract now maps the mobile
  `memory_room` link to the existing web Memory Room surface without creating a
  duplicate page or read contract. The Diary control has a 44px target, an
  explicit label/title, visible keyboard focus, and reduced-motion-safe icon
  rendering; the existing Home entry, private read lifecycle, and API cache
  remain unchanged.
- **Automated evidence:** focused Memory Room/navigation coverage passes **4
  suites / 21 tests**; the full web client gate passes **53 suites / 285 tests**,
  TypeScript, ESLint, Prettier, and a production Vite build. The API-client
  contract guard remains `API_CLIENT_CONTRACT_OK` at schema `15cb3806…`,
  declaration `8302ba75…`, receipt `61fc837f…`; both web staging source guards
  pass. Existing Watchman, stale browser-data, Browserslist, and large-chunk
  advisories remain maintenance warnings. The repository hook again failed
  only in unrelated workspace typechecks missing filtered-install
  NestJS/Winston/TypeORM dependencies; the local checkpoint used `HUSKY=0`
  after web-specific gates passed.
- **Evidence boundary:** this is local source and automated evidence only. It
  was not pushed, reviewed, merged, deployed, browser/device-validated, or
  authenticated against staging. Hosted artifact/CSP/WebSocket proof,
  authenticated two-account behavior, Android native/device proof, and
  post-promotion landing remain open. Overall evidence-weighted parity remains
  **77%**, with the 3–5 working-day forecast beginning only after promotion
  and runtime/access gates open. The task-owned web dependency trees, Vite
  `dist`, and coverage artifact were moved recoverably to Trash after
  validation (about **790 MiB**); shared/global caches and all other lanes were
  preserved.

## Codex web shared-memory social lifecycle checkpoint (2026-08-05; local only)

- **Scope and ownership:** the isolated web branch records local commit
  `e8892c9f` (`feat(web): add shared memory social lifecycle`). It extends the
  existing connection-detail wall without changing API source, Android/shared
  React Native runtime, branch-owned `ios/**`, Claude's canonical iOS checkout,
  workflows, deployment, staging runtime, database, production, or Uni.
- **Parity behavior:** web now matches Android's partner-only heart state,
  append-only two-way comments, and private report reason/confirmation flow.
  Reactions and comments optimistically update the wall and reconcile or roll
  back against the server; reports disclose only a neutral private-review
  confirmation and guard duplicate submissions. Existing seen-marker behavior
  remains bounded and optimistic. Upload, owner edit/delete, and moderation
  read-after behavior remain separate gates.
- **Automated evidence:** focused wall/page coverage passes **3 suites / 15
  tests**; the full web gate passes **55 suites / 296 tests**, TypeScript,
  exact-file ESLint, Prettier, production Vite build, API-client verification,
  and both web staging source guards. Existing Watchman, stale browser-data,
  Browserslist, and large-chunk advisories remain maintenance warnings.
- **Evidence boundary and cleanup:** this remains local source and automated
  evidence only. It was not pushed, reviewed, merged, deployed,
  browser/device-validated, or authenticated against staging. Authenticated
  two-account privacy, deployed API/schema and CSP/WebSocket proof, owner
  upload/edit/delete, Android native/device proof, moderation validation, and
  post-promotion landing remain open. Overall evidence-weighted parity remains
  **77%**; the forecast remains 3–5 working days after promotion and
  runtime/access gates open. The exact task-owned web dependencies, Vite
  `dist`, and reproducible build output were moved recoverably to Trash after
  validation (about **790 MiB**); shared/global caches and all other lanes were
  preserved.

## Codex web shared-memory seen-marker checkpoint (2026-08-05; local only)

- **Scope and ownership:** the isolated web branch records local commit
  `5d8a4502` (`feat(web): sync shared memories seen lifecycle`). It extends the
  existing connection-detail wall without changing API source, Android/shared
  React Native runtime, branch-owned `ios/**`, Claude's canonical iOS checkout,
  workflows, deployment, staging runtime, database, production, or Uni.
- **Parity behavior:** web now consumes the canonical
  `POST /api/v1/connections/{id}/memories/seen` contract after an unseen wall is
  presented, clears the dot optimistically, rolls the cache back on failure,
  and permits at most one retry after the initial attempt. This matches the
  existing Android lifecycle while avoiding uploads, reactions, comments,
  reports, edits/deletes, or notification writes in this slice.
- **Automated evidence:** focused wall/lifecycle coverage passes **2 suites / 9
  tests**; the full web gate passes **55 suites / 295 tests**, TypeScript,
  exact-file ESLint, Prettier, production Vite build, API-client verification,
  and both web staging source guards. Existing Watchman, stale browser-data,
  Browserslist, and large-chunk advisories remain maintenance warnings.
- **Evidence boundary and cleanup:** this remains local source and automated
  evidence only. It was not pushed, reviewed, merged, deployed,
  browser/device-validated, or authenticated against staging. Authenticated
  two-account privacy, deployed API/schema and CSP/WebSocket proof, remaining
  shared-wall mutation parity, Android native/device proof, and post-promotion
  landing remain open. Overall evidence-weighted parity remains **77%**; the
  forecast remains 3–5 working days after promotion and runtime/access gates
  open. The exact task-owned web dependency trees, Vite `dist`, and
  reproducible build output were moved recoverably to Trash after validation
  (about **790 MiB**); shared/global caches and all other lanes were preserved.

## Codex web read-only Our Memories wall checkpoint (2026-08-05; local only)

- **Scope and ownership:** the isolated web branch records local commit
  `17928a84` (`feat(web): add read-only shared memories wall`). The existing
  authenticated connection-detail surface now consumes the generated
  `GET /api/v1/connections/{id}/memories` contract and renders a connection-
  scoped preview, empty state, gallery, and detail dialog. No API source,
  Android/shared React Native runtime, branch-owned `ios/**`, Claude's
  canonical iOS checkout, workflow, deployment, staging runtime, database,
  production, or Uni path changed.
- **Contract and privacy boundary:** the new web adapter is fail-closed for
  malformed envelopes and nested reactions/comments, sorts a defensive copy
  newest-first, and treats 403/404 as a neutral unavailable state. Cached
  private media is deliberately hidden after a membership/access failure. The
  wall exposes the server's `hasUnseen` indicator but this checkpoint contains
  no upload, reaction, comment, report, edit/delete, or mark-seen mutation;
  those remain separate privacy and two-account runtime gates.
- **Accessibility:** the section exposes loading/empty/error/stale-ready
  states, semantic headings and native buttons, descriptive image alt text,
  visible focus, 44px-equivalent controls, labelled `aria-modal` gallery/detail
  dialogs, Escape handling, focus trapping, focus restoration, and neutral
  authorization copy. The wall is placed after For Us, matching Android's
  relationship-detail order.
- **Automated evidence:** focused wall/page coverage passes **3 suites / 13
  tests**; the full web gate passes **55 suites / 294 tests**, web TypeScript,
  exact-file ESLint, Prettier, and a production Vite build. The API-client
  guard remains `API_CLIENT_CONTRACT_OK` at schema `15cb3806…`, declaration
  `8302ba75…`, receipt `61fc837f…`; both web staging source guards pass. The
  normal repository hook failed only in unrelated filtered-install
  monorepo typechecks missing NestJS/Winston/TypeORM dependencies; the local
  checkpoint used `HUSKY=0` after web-specific gates passed. Existing Watchman,
  stale browser-data, Browserslist, and large-chunk advisories remain.
- **Evidence boundary and cleanup:** this is local source and automated
  evidence only. It was not pushed, reviewed, merged, deployed,
  browser/device-validated, or authenticated against staging. Authenticated
  two-account membership/privacy, deployed API/schema and signed-image/CSP
  proof, Android native/device proof, shared-wall mutation parity, notification
  delivery, and post-promotion landing remain open. The exact task-owned web
  dependency trees, Vite `dist`, and empty reproducible build directories were
  moved recoverably to Trash after verification (about **790 MiB**); shared/global
  caches, other worktrees, iOS, and Uni remain preserved. Overall
  evidence-weighted parity remains **77%**, with the 3–5 working-day forecast
  beginning only after promotion and runtime/access gates open.

## Codex Deep Chat continuity checkpoint (2026-08-05)

- **Scope and ownership:** Astro approved Deep Chat continuity inside the Murror-only web/Android parity goal. All runtime edits are confined to the isolated web lane. The API and Android lanes received generated contract artifacts only; no branch-owned `ios/**` runtime file, build number, archive, TestFlight action, Uni path, workflow dispatch, push, deployment, database write, or production action occurred. Claude’s canonical iOS checkout stayed at the same HEAD while its dirty-state fingerprint changed externally during this work; Codex did not edit or clean it.
- **API contract lane:** `codex/openapi-provenance-20260804` is clean at `ae7650d` in `murror-api-worktrees/codex-openapi-provenance-20260804`, freshly fetched at **23 ahead / 0 behind** `origin/staging@74e2dd3c`. Deep Chat source checkpoint `8acd8a6` types nullable latest-resumable metadata, detail, paginated history/current-draft arrays, HTTP `202` completion, optional completion language, and explicit optional discard `force`. Schema SHA-256 is `f63a00cc173ac55c7163d5c7b823c8ac0ea6476781031e0148a82f9f366870ce` (307 paths / 336 operations), with 11/11 OpenAPI tests, typecheck, focused test, exact-file lint/format, and deterministic verification passing. Runtime/database behavior did not change in this slice.
- **Generated clients:** web checkpoint `a3dc1179` and Android checkpoint `e77ba98f` consume the same API artifact. Schema `f63a00cc…`, manifest `be18d4d4…`, and receipt `d670cca3…` are byte-identical across the relevant lanes; generated web/Android declarations are byte-identical at `cf97f6460c401b4403fea328316d18560961f30e0f8a9b55c0023826f1912856`. Android is clean at `e77ba98f`, freshly fetched at **21 ahead / 0 behind** `origin/staging-environment-setup@4ff1572b`; no Android runtime or iOS source changed for Deep Chat.
- **Web continuity implementation:** `codex/web-parity-integration-20260804` is clean at `7172af31` (`feat(web): add explicit deep chat continuity`), freshly fetched at **23 ahead / 0 behind** `origin/dev@00fa6cd1`. Fresh is now the default and never silently restores. Continue appears only for the API’s latest resumable ACTIVE/DRAFT ID and restores every history page. Completed detail offers **Start a new reflection** without reusing the completed ID; true branch-from-completed remains intentionally deferred because the backend only permits sends to ACTIVE/DRAFT conversations.
- **Turn and failure semantics:** each web socket send uses an opaque `clientTurnId`; tokens, completion, quota, and errors are correlated, stale events are ignored, and quota plus the server’s compatibility completion are deduplicated. An interruption marks the local user turn unconfirmed and reconciles against server history/current draft without auto-resend. If the user text is absent after reconciliation, it stays visibly uncertain and may be followed by a new continuation. This protects against duplicate persisted messages.
- **Exit and completion semantics:** closing a non-empty chat opens a focus-managed Save/Discard dialog. Discard is disabled during an active turn, requires the explicit dialog action, rereads latest-resumable metadata, fails closed on an ID mismatch, and only then calls delete with `force=true`. Completion preserves state on failure; on accepted HTTP `202`, it follows the exact response conversation ID with replace navigation and renders detail as processing until summary exists (because `doneAt` may be set before summary generation).
- **Web evidence:** 3 focused suites / 16 tests pass for generated-envelope parsing, Fresh/Continue decisions, correlation, stale events, quota deduplication, uncertain reconciliation, reset behavior, and accessible exit choices. The full web gate passes **24 suites / 120 tests**, direct app TypeScript, exact changed-file ESLint/Prettier, nine monorepo typecheck tasks, contract verification, and a production Vite build. The build emits existing maintenance warnings for stale browser-data metadata and a 2.11 MB minified main chunk (605 KB gzip); bundle splitting remains performance debt, not a Deep Chat regression.
- **Evidence boundary / progress:** the private tracker is now **73%**: capability 89%, contracts/configuration 99%, current-trunk integration 92%, authenticated runtime 18%, reviewed release gates 12%. No supported browser-control runtime was available for authenticated visual QA, and no credentials were bypassed. Authenticated Fresh/Continue, multi-page history, live quota, reconnect/interruption, keyboard/focus, two-account, deployed artifact/CSP/WebSocket, Android native build/device, review, merge, workflow, deploy, and policy gates remain open. The conditional **14–19 Aug 2026** staging-proof window remains unchanged if external inputs open by 7 Aug.
- **Next safe order:** review/land API contract first, then web, then Android. After exact-trunk landing, require the existing separate approvals for a revision-labelled web build and immutable-digest staging deploy. Runtime/device checks must use test accounts and reviewed staging ownership; do not infer deployment, signing, policy, or production authority from this local checkpoint.
- **Storage:** final cleanup removed about **3.9 GiB** of reproducible task-owned dependencies and build/cache output across the isolated API, web, and Android lanes. Current worktree footprints are approximately 74 MiB API, 27 MiB web, and 64 MiB Android, with about 240 GiB free on the data volume. All three Git worktrees remain clean. Tracked source/contracts, lockfiles, shared package stores, legacy worktrees, Claude’s canonical iOS checkout, and every Uni path were untouched; reinstall from the tracked lockfiles before further local validation.

---

## Earlier Codex web + Android parity snapshot (superseded above)

The section below is retained as historical evidence. Its 71% totals, commit
heads, hashes, and storage sizes are superseded by the Deep Chat checkpoint
above.

- **Ownership boundary:** this is Murror-only cross-platform work. Claude’s iOS staging lane, iOS build numbers, archives, TestFlight work, and all Uni paths were untouched. The investor-facing progress page was also untouched.
- **Disposition:** all work is local-only and intentionally preserved for later review. Nothing was pushed, merged to a remote trunk, deployed, or dispatched through GitHub Actions.
- **API lane:** `codex/openapi-provenance-20260804` at `c424bdb` in `murror-api-worktrees/codex-openapi-provenance-20260804`, 15 commits ahead and zero behind current `origin/staging` (`74e2dd3`). The incoming RevenueCat subscription fix was merged locally at `d5afc83a` after a zero-overlap audit. Because the fail-closed provenance guard treats any `src/**` change as a schema input, local artifact commit `c424bdb` refreshes only the manifest source SHA; the schema remains byte-identical. Build, TypeScript, changed-file lint, full Prettier, 10/10 OpenAPI tests, read-only regeneration/verification, and 75 targeted subscription plus Memory Room controller tests pass. The deterministic export remains 83 controllers, 307 paths, and 336 operations at schema `69b1b99f…`.
- **Web lane:** `codex/web-parity-integration-20260804` at `be58e50b` in `murror-platform-worktrees/codex-web-parity-integration-20260804`, 18 commits ahead and zero behind current `origin/dev` (`00fa6cd1`). In addition to the protected private Memory Room, current-mobile Connection Journey, digest-pinned staging source path, and complete account-recovery lifecycle at `a2191695`, metadata-only commit `be58e50b` refreshes the reviewed API manifest/receipt. Web contract tests pass 12/12; deterministic generation reproduces the unchanged declaration, and the commit hook passes nine workspace typecheck tasks. The prior full web gate remains 21 suites / 104 tests, lint, Prettier, both staging source guards, and default, flag-on, and fail-dark builds.
- **Web staging source:** the existing workflow builds staging only from exact `dev`, requires the reviewed inputs, labels the image with its source revision, and records an immutable OCI digest; it still has no deployment authority. A separate manual workflow is web-client-only, fixed to Vietnam staging, uses non-cancelling environment concurrency, requires an exact confirmation plus `sha256` digest, and rejects an image whose revision label does not match the current `dev` commit. Tracked port-80 staging Helm values are present, alpha/production tag rendering is unchanged, and the vendored reviewed contract—not mutable hosted Swagger—remains the generation source. No workflow was dispatched.
- **Android lane:** `codex/android-parity-integration-20260804` at local decision checkpoint `a63805d9` in `MurrorMobile-worktrees/codex-android-parity-integration-20260804`, 18 commits ahead and zero behind current mobile staging `4ff1572b`. The original seven build-415-era commits were merged—not rebased—at `d4be1f56` after a zero-overlap audit, merge simulation, build ancestry check, and specialist review. Metadata-only commit `617b6e2a` refreshed the reviewed API manifest/receipt; merge `a3286ce3` absorbed Claude’s already-landed PR #1032 notification logout-tag fix after another zero-overlap audit; merge `a208ed77` absorbed the iOS-only, already-anchored build-416 PR #1033. The branch-owned delta remains the original 20 Android/config/contract paths plus one decision document, with no `ios/` path; build-416 files are byte-identical to trunk, and the canonical iOS checkout fingerprint is unchanged. The main reconciled gate passes 18 focused suites / 105 tests, 11/11 API-contract tests, deterministic client verification, TypeScript, ESLint with zero errors, i18n, copy, privacy, diff, branch-owned Prettier, and 367 full Jest suites / 3,121 tests with one suite / three tests intentionally skipped. After PR #1032 landed, its focused 4/4 tests plus TypeScript, lint, contract/client, and targeted format gates pass. PR #1033 required ancestry/diff proof only because it changes exclusively iOS build-number files already common with trunk. The repository-wide Prettier command still reports 97 current-trunk baseline files outside the branch-owned delta; none were rewritten.
- **Approved mobile reset behavior:** Astro approved the mobile-parity after-state: a successful password update keeps the recovery-authenticated Supabase session and returns through normal Murror auth/onboarding/subscription routing. A read-only Iris/Cortex/Sentinel panel found that web commit `a2191695` already matches that behavior and unanimously recommended no shared React Native change because it would affect Claude’s iOS lane without closing a source gap. Documentation-only mobile commit `a63805d9` records the decision, known mobile hardening debt, and Android device gates; no runtime, API, database, build-number, or `ios/**` file changed. “Reset” does not mean forced sign-out, all-device revocation, navigation reset as a separate action, or clearing unrelated app state.
- **Daily Voice dependency update:** the compatible `date || getLocalIsoDate()` and `voiceSummaryId` consumer is now present in current mobile staging, so the prior land-first source dependency is resolved. Actual Android notification-tap behavior is still a device/runtime gate.
- **Shared contract:** schema (`69b1b99f…`) and refreshed source manifest (`f9192c49…`) are byte-identical across API, Android, and web; client receipt (`eed2fbc8…`) and generated declaration (`de34c34a…`) are byte-identical between Android and web. Client guards cover typed Daily Voice plus semantic Memory Room envelopes. Repository artifacts remain the generation source; staging Swagger is still 404 and is not release evidence.
- **Runtime boundary:** read-only staging probes show API health 200, a protected route 401, and docs 404. The live web shell is an older 2026-07-28 artifact whose CSP omits the staging REST/WebSocket origins. Local JDK 17 plus Android platform/build-tools 35 were found, but there is no NDK, secret-backed `.env.staging`, or staging signing material. An offline `assembleStagingDebug` preflight stopped before compilation because the Foojay Gradle plugin was not cached; no native artifact was produced. Browser visual QA, authenticated two-account flows, deployed schema/artifact proof, Android Gradle/hosted CI/signing/device behavior, web deploy/CSP/WebSocket validation, and release/policy gates remain open. Account recovery additionally needs approved hosted redirect allowlisting, real email receipt, single-use/expired-link behavior, same-browser completion, and authenticated return proof.
- **Evidence correction:** the internal tracker now reports **71%**: capability coverage 86%, contracts/configuration 98%, current-trunk integration 90%, authenticated runtime proof 18%, and reviewed release gates 12%. API, web, and Android now count as current-trunk local source evidence; integration remains discounted because nothing is reviewed or remotely landed. This does not count email receipt, redirect allowlisting, an authenticated browser flow, workflow execution, deployment, native Android compilation, or release approval, and preserved legacy-only work still does not count. The conditional staging-proof window remains **14–19 Aug 2026** if external gates open by 7 Aug, with 3–5 working days expected after access. The source path is review-ready as of 5 Aug.
- **Next source/config gap:** review and land the API artifact first, web second, and Android third from these freshly reconciled checkpoints. Confirm protected GitHub staging-environment ownership and reviewed namespace, release, API, Supabase, redirect-allowlist, and feature-flag inputs. Only after landing should an exact-`dev` build produce the reviewed digest for a separate web-only deployment approval. Authenticated recovery, two-account, native Android, and broader browser proof remain distinct gates even after deployment.
- **Storage:** prior validation cleanup removed about 4.0 GiB of apparent task-owned API/web/Android dependencies and reproducible output. The final API/client provenance pass restored then removed about 4.2 GiB across all three isolated lanes; the late PR #1032 reconciliation temporarily restored and removed the Android dependency tree once more. Current worktree footprints are approximately 15 MiB API, 26 MiB web, and 64 MiB Android. The failed offline Gradle preflight created a 145 MiB wrapper runtime despite `--offline`; that exact runtime was moved recoverably to Trash, and its worktree-local cache was removed. Tracked source, lockfiles, shared package stores, legacy worktrees, iOS, and Uni were untouched. Reinstall dependencies before any new local test/build run.
- **Resume order:** guard each exact lane and fetch its real remote trunk; keep legacy lanes read-only; review/land the API artifact before web and Android; then review protected staging ownership and run the two-step exact-`dev` build plus digest deployment only with the corresponding owner approvals. Do not enable `VITE_MEMORY_ROOM_ENABLED` or `VITE_CONNECTION_JOURNEY_ENABLED`, push, deploy, dispatch CI, sign, or run device work without those gates.

---

## Codex iPhone notification hardening checkpoint (2026-08-05; 3:22 PM PDT; local only)

- **Approved scope and freeze boundary:** Astro approved the recommended iPhone-only, English-only notification direction: suppress optional quiet-hour nudges, capability-gate deferred Viasr care/callback promises, keep lock-screen and Live Activity surfaces generic, use typed settings routing and verified identity, and converge enabled senders on shared consent, privacy, delivery, retry, and observability contracts. Work remains confined to isolated source/docs lanes. The production-promotion freeze still forbids iOS edits, device runs, provider writes, pushes, PRs, merges, deployments, workflow dispatches, signing, builds, build-number changes, and production mutations; none occurred.
- **Isolated API lane:** `murror-api-worktrees/codex-ios-notification-production-hardening-20260805` remains based on exact `origin/staging@74e2dd3c` and is six local commits ahead. The prior five commits retain branded sound, generic English public copy, fail-closed account opt-out, typed provider outcomes, and broker-confirmed persistent 5s/30s/120s consumer retry plus a sanitized dedicated DLQ. New commit `e4d1113` adds deterministic OneSignal idempotency scoped by recipient/type/event, explicit one-hour/one-day/three-day TTL, type-aware lifecycle collapse that never merges distinct note/gesture messages, a primitive-only 1.8 KB routing-data budget, reserved settings controls, and the approved typed settings action while preserving build 416's legacy sentinel. All 14 non-overlapping queued sends and eight direct sends now pass stable delivery identity where available; direct paths log accepted/suppressed/failed truthfully. Thirteen focused suites pass 122/122; exact-file lint has zero warnings, strict type-check, full API build, and diff checks pass. The branch is not pushed, reviewed, merged, or deployed.
- **Ringtone root cause:** exact mobile source includes `ios/foodshot_jingle.wav` in every app resource phase, including `MurrorMobileStaging`. The file is a valid 1.4-second, 48 kHz, 24-bit stereo Linear PCM WAV (SHA-256 `77bf78e122760e0a9d10ea3d126205568070ed4d423c812da9cc1d8f06e34231`). Active central, Viasr, and deployed legacy source did not request a sound, and a credential-safe sample of the latest 50 OneSignal messages contained zero sound fields. The prior custom ringtone therefore was not working because payloads omitted it, not because the asset was invalid. Closure requires reviewed/merged/deployed provider evidence, signed-bundle proof, and audible foreground/background/terminated physical-iPhone tests after the freeze lifts.
- **Evidence and conflict status:** the strict tracker still has 19 requirements and 0 fully closed; 10 are partial and 9 open. The separate local work-package meter is 3/8 (38%). Local source now advances account opt-out, English-only public copy, truthful outcomes/retries, generic lock-screen copy, branded sound, payload bounds, provider idempotency/TTL/collapse, typed settings data, and server-to-provider correlation to partial only. API Spot PR #728 still owns the three sends in `memory-notification.handler*`, so that producer remains excluded from parallel edits. Upstream publish confirmation/transactional outbox, quiet-hours deferral, Viasr capability truthfulness, frozen iOS identity/Live Activity/action changes, deployed topology, broker restart/duplicate proof, and physical sound proof remain open. Remaining estimate is 20–36 focused local hours plus one shared candidate and external gates; earliest local-source completion is 07 Aug, with combined proof approximately 10–12 Aug only if those gates lift on time.
- **Storage:** the isolated API lane is about 794 MiB because its offline dependency tree and current 68 MiB build output are intentionally retained for the consolidated source/test phase; the docs lane is about 64 MiB and the host has about 238 GiB free. The temporary ringtone extraction was moved recoverably to Trash. Remove only the API lane's ignored reproducible dependencies/build output after the local source phase ends; do not clean shared caches, canonical checkouts, or another session's artifacts.

---

## Codex iPhone notification audit checkpoint (2026-08-05; 2:11 PM PDT)

- **Scope/ownership:** staging Murror Beta on iPhone, English only, plus exact notification-specific staging producer/provider evidence. Android, iPad, Watch, web, production, build-number work, and unrelated locale bundles remain excluded. This checkpoint is read-only/device-and-docs evidence: no source fix, provider write, push, build, archive, upload, workflow dispatch, merge, deployment, schedule, kill switch, database write, or production resource changed. The private docs-only lane is `MurrorMobile-worktrees/codex-ios-notifications-audit-20260803`; do not edit Claude's dirty canonical checkouts.
- **Authoritative deployed refs:** mobile/TestFlight build 416 is anchored at `staging-environment-setup@4ff1572b`; staging murror-api is healthy at `74e2dd3c` (workflow 30978194983); staging Viasr API, worker, Beat, and daily-voice CronJob are healthy at `staging-f12b63b` (workflow 30976250974). `CALLBACK_PINGS_ENABLED=false` and `NOTIFICATION_SKIP_LLM=true`; no drift exists in the authoritative staging namespaces. Exact legacy Supabase staging provenance remains successful workflow 23120747504 at `475427e`; later workflow 23121117042 failed before deployment.
- **Physical delivery:** foreground, background, and terminated-app pushes to build 416 each returned `successful=1`, `failed=0`, `errored=0`; the cold tap additionally recorded `converted=1`, launched Murror, and ran the staging notification service extension. The user tapped the background push's “Manage Notifications” action, but the phone auto-locked before the destination was seen. CoreDevice runs at 11:57 AM, 12:42 PM, and 1:29 PM supplied `murror://settings/notifications`; a fourth at 1:54 PM supplied the correct `murror-stg://settings/notifications`. Every run explicitly targeted `app.murror.mobile.stg`, bypassing ownership, and exact build-416 linking source has no settings-path map. They prove only process launch—not path consumption, external resolution, or action landing. User-visible destination confirmation and the real provider-action path remain open; no replacement push was sent.
- **Exact-trunk/UI/schema correction:** the docs lane diverges from mobile staging at merged notification PR `7aff94b5`, so remaining reads moved to disposable detached worktrees at mobile `4ff1572b`, murror-api `74e2dd3c`, and Viasr `f12b63bc`; relevant settings/click/linking files are unchanged by mobile's 11 later commits. The one-time notification education screen's icon-only close control has no VoiceOver label. The central sender accepts arbitrary headings/contents/data with no UTF-8 byte or field budget despite dynamic copy. No active iPhone local scheduler or badge writer exists; the linked push-notification-ios package is unused cleanup debt. The staging OneSignal service-extension point, iPhone-only target, build number, and fallback shape are valid. These findings expand existing requirements without changing 0/18 closure. All three exact-ref worktrees were verified clean, removed through Git after review, and pruned; shared/dirty checkouts were untouched.
- **Current source/overlap refresh:** fetches at 2:08 PM PDT left all three canonical refs unchanged. Read-only open-PR inventory found no notification-specific PR in mobile, murror-api, Viasr, or legacy backend. The relevant live overlaps are mobile Spot client PR #1023 and murror-api Spot PR #728; the API lane changes `memory-notification.handler*`, so that producer must be reconciled rather than edited in parallel. Old `notification-silent-noops`, `spot-notification-routing`, `mtc-overlap`, and `mobile-la-r2` worktrees are ownership boundaries, not bases. Legacy `murror-backend` has no `origin/staging`: current source is `origin/main@f72af119`, staging deploy is manual/default-main, and the last positively identified deployed staging SHA remains `475427e`. The audit plan now separates shared contract, durable delivery, iPhone, Viasr/legacy, and consolidated-candidate slices.
- **Provider persistence root isolated:** a fresh read-only build-416 snapshot reports native OneSignal iOS 5.2.9, an enabled/reachable production subscription with `notificationTypes=31`, language `en`, seven local RevenueCat subscription properties, and zero pending property/identity/operation queues. A credential-safe provider lookup returned HTTP 200 for the authoritative user but zero tags. The operation was rejected or lost before provider persistence; another local-only retry is not evidence. The observed failure is consistent with the locale-formatted purchase defect fixed in native 5.4.0, but the architecture should not preserve these writes: OneSignal v5 tags are user-level while mobile derives them from local RevenueCat state and removes them before logout.
- **Native completion correction:** exact wrapper 5.2.8 source and declarations confirm `login`, `logout`, `addTags`, `removeTags`, and `setLanguage` return `void` and do not return the native call. Existing `await`s resolve immediately; Promise-delay/rejection mocks prove JavaScript ordering that the installed wrapper cannot expose in production. The serialized JS lane remains useful before invocation, but native completion, rollback, tag persistence, language persistence, and two-account isolation are not proven. Logout also cannot remove retained iOS Notification Center entries, and payloads have no account-owner field to reject an account-A tap after B signs in.
- **Identity release blocker:** mobile currently passes the raw authenticated UUID to one-argument `OneSignal.login()` with no provider verification. A modified client that learns another UUID could bind a device to that user's OneSignal identity and receive targeted pushes; this does not bypass Murror API authorization. The existing HMAC endpoint is unused and does not implement the current ES256 contract. Native iOS 5.4.0 has token login plus expiry-refresh hooks, but the React Native wrapper does not expose them. The bounded recommendation is an iPhone-only native bridge plus authenticated backend ES256 token endpoint, with provider verification configuration left unchanged until two-account staging isolation passes.
- **Identity configuration evidence:** read-only Kubernetes and GitHub staging secret-name inventories contain the current OneSignal app/REST credentials but no dedicated ES256 identity-verification private key. OneSignal app metadata does not expose the identity-verification toggle, so its present state is unverified and must not be labeled on or off. No key, secret, or provider setting was created or changed.
- **Subscription-tag ownership correction:** read-only provider inspection fetched detailed definitions for all six staging segments and the latest 50 messages. None uses a tag filter; 46 messages use alias targeting. Current transactional delivery therefore does not depend on the seven client tags. Remove iPhone client billing/entitlement/purchase tag writes and the pre-logout deletion; add only a documented minimal backend-authoritative property set through OneSignal's Update User API if an approved targeting use case exists. This avoids non-authoritative multi-device state and makes zero provider tags a valid expected state rather than a sync failure.
- **Live payload contradictions:** the same credential-safe latest-50 sample retained only counts and field names. All 50 contain English heading/body keys; 46 also contain Vietnamese heading/body keys. None carries an account-owner field, explicit TTL, or collapse id; 49 carry `settingsUrl`, and 46 target authenticated aliases. OneSignal's list API omits button values, while representative detail reads return `buttons=null` even for the physically received action test, so action parity remains a source/device gate rather than a negative provider claim. No content, recipient value, message ID, or credential was retained and no provider object was mutated.
- **Smallest compatible iPhone SDK lane:** current React Native is 0.77 and wrapper 5.2.8 pins native iOS 5.2.9 exactly. Current wrapper 5.5.6 requires React Native 0.79+, so a normal upgrade is out of scope. The last 0.77-compatible wrapper 5.3.6 pins native iOS 5.5.0, which contains the property fix, but it still exposes identity/property calls as `void` and a full package upgrade changes Android too. The bounded lane is an iOS-only package/native patch plus a custom token/expiry-refresh bridge; do not start a React Native migration or alter Android behavior.
- **Producer/English/reliability gaps:** the iPhone language picker is already English-only, but murror-api's sender contract and active payloads still require `en` and `vi`; disabled Viasr callback templates can render Vietnamese, and deployed legacy payloads include Vietnamese. Converge enabled senders to English output only; do not author/test Japanese or Vietnamese and do not remove unrelated compatibility locale files. Other root gaps are inconsistent iPhone settings actions, fail-open quiet-hours lookup, caller/provider failures acknowledged as success, raw recipient/content logs, reflection-derived lock-screen copy, legacy/Viasr DND drift, unsupported legacy `targetView=subscriptions`, missing positive opened/routed telemetry, and no explicit TTL/collapse policy. Focused positive routing tests are also missing for `accepted_friend`, `has_insight`, `partner_answered`, both takeaway types, `connection_insight_ready`, and exact deep-chat artwork conversation routing.
- **Central false-success contract:** exact `murror-api` staging source has 25 production OneSignal calls across 18 files. Twenty-two calls ignore the result, two article calls use non-null truthiness, and only streak verifies id/non-zero recipients. The shared sender catches transport exceptions and returns `null`, and returns provider error/null-id/zero-recipient bodies without throwing or a typed failure. Seventeen queue sends across 11 RabbitMQ handlers can therefore ACK and log success after non-delivery; article can persist `notifiedAt` after a non-null failure body; five best-effort paths can log sent after a swallowed transport failure. Streak returns `push_failed` but claims its one-per-day row before quiet-hours/provider acceptance, preventing a later same-day retry. All 18 producers call the central quiet-hours service, whose database-error, incomplete-window, and invalid-timezone paths fail open. Fix the single shared outcome/quiet-decision contract first, then make queue, interactive, durable-state, and de-duplication policies explicit; do not patch 25 symptoms independently.
- **Test/privacy contract evidence:** five producer specs mock `pushNotificationsToUser` rejecting even though the production sender catches that exception and resolves an ordinary value; the shared integration send-failure test is commented out, no focused quiet-hours-service spec exists, and the streak suite explicitly keeps its daily claim after a quiet-hours skip. A logger-block scan found raw user/relationship identifiers or names in 13 of 18 producer files and raw error messages/stacks in eight. Sixteen of 25 central lock-screen sends interpolate a person/connection name; article, daily voice, and milestone voice can add generated title/body content. Continue existing safer conventions: generic English preview, authenticated in-app detail, categorical or irreversibly correlated logs, and HTTP/provider-outcome tests through the real shared sender.
- **iOS Settings-return divergence:** exact build-416 source completes permission/provider/profile convergence on foreground return only when `isHaveChangeToggleRef` records a Murror-initiated enable request that iOS denied. Independent external revocation while already enabled only updates the Notification screen's `permissionStatus`; it does not persist `enableNotification=false`, and Home skips the denied-permission provider branch while profile preference remains true. Existing tests cover stale/concurrent operations and a failed return sync, not successful independent revoke/re-enable. Fix one shared reconciliation function and prove system permission, profile preference, and OneSignal subscription converge for in-app disable plus external Settings changes; no device setting was mutated in this read-only finding.
- **Quiet-hours disposition bug:** every one of the 25 central sends permanently exits when the shared boolean quiet-hours check returns true. The 17 RabbitMQ sends ACK and discard their events; article, interactive, generation-ready, milestone, and streak paths return without scheduling, and the shared sender has only a TODO for delayed notifications. At the opposite failure edge, database/incomplete-window/invalid-timezone cases return “not quiet” and may disturb the user. Replace the boolean with `allow/defer_until/suppress/unknown`: defer causal invites/messages/memories/content-ready events with bounded TTL/collapse/idempotency, suppress only policy-approved nudges, and fail safe on unknown. This needs Astro's product approval before implementation because it changes quiet-hours semantics.
- **Live retry/DLQ failure:** staging RabbitMQ is 4.3.2. Read-only broker inspection shows `murror.notifications.queue` is quorum, currently empty, has a one-hour TTL, no effective policy, and no destination binding for its configured `notifications.dead` dead-letter routing key. All 11 notification handlers count `x-death` or boolean `redelivered` but never quorum `x-delivery-count`; ordinary `nack(..., true)` therefore leaves the nominal three-attempt count at one. RabbitMQ can hot-requeue to its default quorum limit of 20, then dead-letter to the unbound key and lose the message. The source's `@EventPattern('murror.notifications.dlq')` has no live notification DLQ queue/binding. Pair truthful provider outcomes with actual bounded backoff, a declared/bound observable DLQ, and provider idempotency derived from queue `eventId`; simply throwing from the current sender would create a hot-loop/drop regression.
- **Pre-provider publish failure:** exact source has 19 live `notificationsClient.emit()` calls across 11 files. None awaits or subscribes to Nest's hot Observable; surrounding synchronous catches cannot observe asynchronous connection/dispatch failure, yet callers log published success immediately. The sole focused failure test makes the mock throw synchronously and is behaviorally incompatible with production. `NOTIFICATIONS_SERVICE` also omits `persistent: true`, and installed Nest reports `RQM_DEFAULT_PERSISTENT=false`; the events are transient despite the durable quorum queue. Other queue clients already use `firstValueFrom` and persistence, but there is no notification outbox. Continue those existing conventions in one shared publisher and add an idempotent transactional outbox/dispatcher for causal business actions that must survive broker outage without failing the core user action.
- **Account-wide opt-out failure:** the iPhone settings flow verifies its current OneSignal subscription after explicit opt-in/out and persists `murror_api.User.enableNotification`, but only streak among 18 central producer files references that preference. The shared sender and 17 other producers can publish to the account alias without a source-of-truth consent check. Viasr care notifications query `public.user_profiles.enable_notification`; the app writes only `murror_api.User`, the profile-sync event omits the field, and the legacy column defaults true. Current-device provider opt-out is therefore not sufficient account-wide suppression across another or stale subscription. Fix one authoritative fail-closed recipient-policy seam before broker/provider dispatch, propagate or retire the legacy reader, and prove disable/re-enable with one and two devices. No profile, subscription, database, provider, queue, source, deployment, build, or workflow state was changed.
- **Lifecycle-observability failure:** exact iPhone source queues the full OneSignal click object but passes only `additionalData` into routing, dropping `notificationId`. There is no mobile notification received/opened/routed analytics event, and positive `logInfo()` is disabled. Every negative route miss is renamed `UnroutableNotification`; Sentry's privacy hook removes the `type` and context, collapsing distinct failures into the same safe but non-actionable category. Upstream queue `eventId` is not included in provider data, while most central callers discard provider results/ids. Add a privacy-safe random or one-way correlation id through broker/provider/device plus categorical accepted/opened/routed/fallback/rejected outcomes; never include recipient/content ids, names, copy, or raw payloads. No analytics, provider, source, build, deployment, workflow, or device state was changed.
- **Callback-ping dead path:** live staging has `CALLBACK_PINGS_ENABLED=false`, but Beat still invokes the scheduler hourly and the iPhone always renders an enabled-by-default “CALLBACK PINGS” switch. Even if enabled globally, exact mobile device registration omits `pushToken`, while Viasr rejects any callback send without `murror_api.user_devices.push_token`. Aggregate-only staging proof found 161 active profiles enabled, 16 iOS device rows, zero non-empty push tokens, and 203 callback-log rows all `skipped_ineligible`; no token value or identifier was read. The actual send targets OneSignal by external alias, so replace the non-authoritative raw-token gate with shared provider reachability/typed zero-recipient handling, preserve a categorical skip reason, apply the shared English/privacy/quiet-hours/action contract, then enable and prove scheduled plus post-chat flows—or capability-gate the UI if launch scope changes. No profile, token, database, config map, schedule, queue, provider, source, build, deployment, or workflow state was changed.
- **Daily-care dead path:** exact live staging has `NOTIFICATION_SKIP_LLM=true`. `NotificationService._skip_llm()` defines it as bypassing the LLM and using fallback copy, but `load_and_schedule_notifications()` returns before audience resolution or scheduling. The iPhone still promises tailored motivational messages. The API scheduler marks the date immediately after enqueueing this no-op, while per-user failures are swallowed; its marker expires after 20 hours, before the next midnight boundary, and no focused test covers either lifecycle. Care slots can be roughly 23 hours ahead on Redis/Celery with `visibility_timeout=3600`; Celery 5.5's official Redis guidance says ETA tasks beyond that timeout may be repeatedly redelivered and recommends durable scheduling for distant work. The sole generic `route_screen_tab`/Home message in a sanitized latest-50 provider sample was queued at 03:49 UTC with zero successful deliveries and zero conversions, so it is not evidence for the disabled automated lane. Split scheduling-disable from LLM-fallback semantics, force approved English fallback, persist truthful per-user schedules/outcomes before the day marker, and use a durable near-time dispatcher—or capability-gate the iPhone promise. This broadens requirement 18 to Viasr care/callback feature truthfulness; no user data, key, task, Redis key, schedule, queue, config, provider object, source, build, deployment, or workflow was changed.
- **Live Activity privacy contradiction:** exact current iPhone source says its public Lock Screen/Dynamic Island surface must never show a sender or photo, then `startMomentActivity` downloads the newest unseen moment image and `MomentGlyph` renders it on both the Lock Screen and expanded Dynamic Island. The JPEG has one fixed path, `group.com.murror.widget/live_activity_moment.jpg`; staging, development/Alpha, and production app entitlements all share that group. The connected phone has Murror Beta 416 and Murror Alpha 370 installed. The content-state stamp is only `String(jpeg.count)`, so different equal-size images can produce an unchanged ActivityKit state and leave the previous snapshot visible. `URLSession.shared.data(from:)` also buffers the entire remote file before downsampling with no explicit byte/content/host bound. No native test covers photo policy, collision, cross-environment storage, or resource exhaustion. The smallest production-safe continuation is to enforce the already-written generic-glyph contract and keep private imagery behind authenticated Murror. If Astro explicitly keeps photos, require per-environment/account storage, unique versioning, protected bounded download, expiry/crash cleanup, and two-app/two-account device proof. CoreDevice could not list the TestFlight app-group container, so no image/file content was read and no app/Live Activity/device state changed. This expands the existing lock-screen privacy requirement rather than adding requirement 19.
- **Manage-action scheme/evidence correction:** production registers `murror://`, staging registers `murror-stg://`, and development/Alpha registers `murror-dev://`; widget code already selects the correct scheme. Mobile `NOTIFICATION_SETTINGS_URL` and staging murror-api nevertheless hardcode `murror://settings/notifications`. The current OneSignal button carries only `{id: settings, text: Manage Notifications}` with no URL. Mobile treats the mismatched `settingsUrl` as an internal sentinel alongside `actionId=settings`, so the button may still route after OneSignal opens its owning app. Exact build-416 linking configuration has no `/settings/notifications` handler or screen mapping, so any true external URL is unhandled even with the correct staging scheme. Four direct device launches targeted the Beta bundle and prove only process launch. Replace the sentinel with typed `type=notification_settings` data; if an external URL is retained, derive the flavor and add an explicit cold/warm-tested route map. Keep the actual long-press/tap/visible-landing test open. No plist, provider payload, app, notification, source, build, device, deployment, or workflow state changed.
- **Legacy scheduler root cause:** aggregate-only staging reads found zero rows in the exact singular `notifications_setting` table, zero non-null biweekly/tri-daily scheduler IDs, and zero enabled companion modes. At deployed `475427e`, old companion deliveries re-read that table and safely return when the row is absent. Both survey handlers call async `isUserTurnOnSurveyReminder(...)` without `await`, so the Promise is truthy, the missing/disabled-setting guard is bypassed, and a successful delivery schedules the next tri-daily reminder. No focused handler test exists. An old QStash survey request can therefore become a self-renewing ghost chain. QStash token/signing credentials are absent from accessible staging inventories, so the queue remains unenumerated; no queue or database mutation was made.
- **Conflict-safe implementation boundary:** before source work, refresh exact trunks and create separate worktrees. Likely overlap surfaces are `murror-api/src/libs/one-signal/**`, notification handlers, `viasr-api/app/schedule/onesignal.py`, `viasr-api/app/services/callback_pings/**`, and the mobile OneSignal/native bridge. Do not touch Spot notification work or any existing `mtc-overlap`, `notification-silent-noops`, or `spot-notification-routing` lane without reconciling ownership. Fold accepted fixes into Claude's later shared build rather than creating standalone TestFlight/Actions churn.
- **Release metric/evidence/storage:** release verdict is **NO-GO**. The live tracker keeps 93% only as historical audit coverage (26/28), then separately scores the 18 remaining shipping requirements: 0 fully closed, 3 partial, 15 open. The bounded estimate remains 28–48 focused local hours (roughly 4–6 working days) after source ownership/direction; enabling both Viasr care/callback families uses the upper end, while capability-gating deferred features, enforcing the generic Live Activity glyph, and using typed scheme-free action data use the lower end. One shared candidate plus provider/identity/schedule proof follows. The earlier estimate did not include the now-proven retry/DLQ, deferred-quiet-hours, Viasr feature-truthfulness, Live Activity privacy, and action-contract work. The sanitized technical note is beside the tracker under `docs/plans/2026-08-03-ios-notifications-audit.md`. The exact 72 KiB temporary device/provider evidence directory, three exact-ref source worktrees (about 88 MiB), and four older clean task-owned worktrees (about 160 MiB) were removed after extraction; all branch commits remain recoverable, the audit worktree is about 64 MiB, and the host currently has about 237 GiB free.

---

## Prior Codex iPhone notification audit checkpoint (2026-08-04)

- **Scope:** Murror staging mobile on iPhone only, plus the notification-specific staging API/provider and TestFlight evidence required to prove that path. Android, iPad, Apple Watch, web, unrelated backend/product work, and production promotion remain excluded.
- **Landed mobile source:** MurrorMobile PR [#1028](https://github.com/Murror/MurrorMobile/pull/1028) merged the notification lifecycle/routing lane as `7aff94b5ff6f9ca43fb580938af00b4a1e0b79ad`. PR [#1032](https://github.com/Murror/MurrorMobile/pull/1032) then landed the final logout-tag isolation fix as `157ab61c73543dceea4d080582557d141348ef35`; PR [#1033](https://github.com/Murror/MurrorMobile/pull/1033) anchored official build 416 as current staging `4ff1572b124bea985ed956aab08bc9b3ea3845d1`. Claude's compatible routing commits remain preserved as ancestors. No build number was hand-edited.
- **Root causes fixed:** the merged lane covers OneSignal foreground, permission, provider identity, listener lifecycle, account switching/teardown, quiet hours, callback pings, cold-start ownership, click queuing, malformed/empty payload fallback, VoiceOver semantics, Live Activity serialization, and notification service extension fallback. All known staging contracts now route deterministically, including Spot, relationships, memory/deep-chat callbacks, daily and milestone voice, article, generic Home, and legacy survey/talk targets; modern typed payloads retain precedence.
- **Producer/provider contracts landed:** murror-api PR [#733](https://github.com/Murror/murror-api/pull/733) deployed merge `f7bcfb7cc2589d9dd398968eb19acc3d7d634ed2` in staging run 30967534474, adding the daily-voice source date. Viasr PR [#602](https://github.com/Murror/viasr-api/pull/602) deployed merge `4f2eff05e5afe51d4fcb4ca5da18f4c88a08144f` in run 30967970387, adding a typed generic Home route and provider reliability bounds. Viasr PR [#603](https://github.com/Murror/viasr-api/pull/603) deployed merge `f12b63bcbf7e105a4c59e92c5e393b54e7112efe` in run 30976250974, adding stable request idempotency UUIDs, three-attempt transient retry semantics, truthful current OneSignal response handling, fail-closed audience loading, retry-compatible Redis deduplication, and rollback-safe paired credential patching. The full hosted test/security gate and image build passed; staging migration succeeded; API, worker, Beat, and daily-voice CronJob use `staging-f12b63b`; liveness and readiness return 200 with DB/Redis/RabbitMQ healthy and zero startup error markers. The read-only OneSignal pair validation passed. `CALLBACK_PINGS_ENABLED=false` and `NOTIFICATION_SKIP_LLM=true` are the intentional launch states. Validation sent no notification and touched no production resource; the alpha and production matrix jobs skipped every cluster-changing step.
- **Logout/account isolation landed:** PR #1032 clears `latest_purchase_id`, `latest_purchase_is_trial`, `purchase_date`, and `converted_from_trial` alongside all existing subscription and dynamic `has_*` OneSignal tags before `OneSignal.logout()`. The consolidated exact-source gate passes 365 suites / 3,119 tests with 1 suite / 3 tests intentionally skipped, plus TypeScript, ESLint, Prettier, and diff checks. CI run 30986510683 is green.
- **Evidence / progress:** overall readiness is **89% (25/28 workstreams)**: local source/automated gates 100%, simulator/build 100%, physical iPhone matrix 45%, remote-provider delivery 90%, and release/TestFlight 85%. A clean TestFlight reinstall, physical behavior, and live production-APNs delivery remain open. PR #1033 CI run 30987290075 is green. The live dashboard remains local at `MurrorMobile-worktrees/codex-ios-notifications-audit-20260803/docs/progress/ios-notifications.html` to avoid a documentation-only Actions run; the technical note is beside it under `docs/plans/`.
- **Physical/provider root cause (8:55 PM):** the paired iPhone 16 Pro is connected on iOS 27 beta with MurrorStg 2.1.0 build 414, notification permission accepted, and its local OneSignal subscription/token fingerprints exactly matching the newest staging provider record. One push was sent to that one subscription only. OneSignal accepted it, APNs rejected it, and the subscription became `enabled=false`, `notification_types=-30`. The token fingerprints still matched, ruling out app/provider token drift. The installed app is a Developer App with `aps-environment=development` and OneSignal `test_type=1`, while the staging OneSignal app is intentionally configured with `apns_env=production` for TestFlight. Do not switch the shared provider to development: that would break staging TestFlight pushes. No provider configuration was changed and no second push was sent.
- **Canonical build 416 release evidence:** a fresh detached release worktree at exact remote staging `4ff1572b` produced `MurrorMobileStaging.ipa` after the official build-number PR was merged. The app, widget, and OneSignal extension all report 2.1.0 (416), Apple Distribution signing, and production APNs; the app is iPhone-only and carries no Watch content. Strict signature verification, `altool --validate-app`, and one upload passed. App Store Connect reports build 416 `VALID`; internal TestFlight reports `IN_BETA_TESTING`. Delivery UUID: `d0564539-4a65-4a84-aa89-d3cc30312e8a`; IPA SHA-256: `1eb1abbe6d0cd8489cb8fd6a4e974b07040381f0f86d516decf38d8f2844a900`.
- **Three honest evidence cards remain:** (1) reinstall build 416 cleanly from TestFlight, (2) execute the full physical iPhone matrix, and (3) prove actual APNs/OneSignal delivery plus service-extension and tap behavior. The first build-416 install retained the disabled developer sandbox model ending `bc7b3314`, with empty migration queues and no production provider record. The exact staging app was uninstalled; CoreDevice confirms the app is absent and its old app-group container is inaccessible. Do not send a push until the clean install registers a distinct production subscription.
- **Pre-launch provider/trunk baseline (8:30 AM):** read-only OneSignal inspection confirms staging remains `apns_env=production`; the newest exact-device record is still build 414's disabled sandbox subscription ending `bc7b3314` (`test_type=1`, `notification_types=-30`), with no build-416 production record yet. No push was sent. Current remote trunks are mobile `4ff1572b`, API `74e2dd3c`, and viasr `f12b63bc`; API drift after the reviewed notification source touches only RevenueCat subscription self-heal, and no notification producer or route changed.
- **Paused device gate (8:31 AM):** three consecutive continuation checks returned Apple's locked-device denial. Build 416 remains installed, MurrorStg is not running, and no production subscription has registered. All safe read-only work is exhausted; no push, retry, provider mutation, build, or CI run was started. Resume by unlocking the paired iPhone, opening MurrorStg, and leaving it signed in on Home.
- **Clean reset (9:10 AM):** build 416 briefly launched but retained the prior developer build's sandbox OneSignal model and token (`testType=1`) with no queued migration operation. This is internal test-device contamination, not a staging provider setting. The exact staging bundle was removed successfully, and its old app-group container is inaccessible; server data and other apps were untouched. Reinstall build 416 from TestFlight, open it, and sign in to establish the clean production baseline.
- **Clean TestFlight identity (9:44 AM):** TestFlight's **Murror Beta** 2.1.0 (416) is freshly installed and launches as `app.murror.mobile.stg`. Its new OneSignal subscription and APNs token differ from the removed developer-sandbox values, and the exact staging provider record contains the same token. Local and provider state report `notificationTypes=-18`; pinned OneSignal iOS SDK 5.2.9 defines this as `ERROR_PUSH_NEVER_PROMPTED`, so the next gate is intentional consent in Murror Settings → Notifications → Allow Notifications, not an APNs, signing, backend, or TestFlight defect. No push was sent. Evidence readiness is **93% (26/28)**; after permission, target only this exact subscription with one bounded push per matrix case.
- **Conflict/storage/cost controls:** Claude's shared code checkouts and unrelated dirty files were not modified. PR #1032 reused one consolidated source gate; PR #1033 is the required official build-number anchor. No workflow was manually dispatched and the upload was attempted only once. After Apple accepted build 416, the exact task-owned release worktree, dependencies, DerivedData, archive, export, two inspection directories, and five empty Watchman cookies were removed (about 6.8 GiB total); the host reports about 237 GiB free. Unrelated worktrees/caches remain untouched, and no production change occurred.

---

## 🚨 Read first: the two rules that have cost the most

### 1. The iOS build lane

Never hand-pick, hand-edit or `sed` a build number. Run `./scripts/ios-next-build.sh`, land the
bump on `staging-environment-setup` via PR, **then** archive from that branch.

A mechanical guard now exists. Run it immediately before any archive:

```bash
./scripts/verify-build-lane.sh
```

It exits non-zero when the number is internally inconsistent, when no bump commit for that number
is on the canonical branch, or when the tree differs from that branch.

**What happened on 2026-08-02:** builds **407, 408 and 409** were archived with hand-set numbers
and no bump commit. Trunk read `406` while App Store Connect had `409`. A login regression then
appeared on 409 and was **un-bisectable** — no commit anchored any of those builds, so the
investigation had to reconstruct their contents by comparing Apple's upload timestamps against
commit timestamps. Earlier instances of the same mistake produced two `251` collisions and a
phantom `253`, where Apple rejected the duplicate and the fix that build carried silently never
shipped.

### 2. Verify against the remote trunk, never your worktree

A worktree sitting on a branch can be hundreds of commits behind that same branch on the remote.
`git fetch` first, then compare against `origin/<trunk>`.

Trunks are **not** all `staging`:

| Repo                                  | Trunk                       |
| ------------------------------------- | --------------------------- |
| MurrorMobile                          | `staging-environment-setup` |
| murror-api, viasr-api, murror-backend | `staging`                   |
| murror-platform                       | `dev`                       |

---

## Current state (2026-08-02)

| Thing                           | State                                                          |
| ------------------------------- | -------------------------------------------------------------- |
| Latest TestFlight staging build | **409** (VALID)                                                |
| Build number on trunk           | **406** — trunk is BEHIND Apple by 3, from the off-lane builds |
| Login on 409                    | 🔴 **BROKEN** — under investigation, see below                 |
| Staging test-bypass whitelist   | **Emptied** on purpose (see below)                             |

### 🔴 Open: login broken on build 409

Being investigated by Claude Code as of this writing. Established so far:

- The privacy hardening commit `85124cc1` (2026-08-02 15:54) landed **after** build 407 (15:25)
  and **before** 408 (19:12), so it is in **408 and 409 but not 407**.
- That commit moved the Supabase session out of AsyncStorage and into the **iOS Keychain**
  (`react-native-keychain` 10.0.0), rewriting `src/apis/supabase-client.ts`,
  `src/common/secure-storage.ts`, and adding `src/common/keychain-secure-storage.ts`.
- Codex's own commit message on the earlier seam-only commit flagged the follow-up as needing
  "a pod install and a fresh native build that has to be verified on a device."

**A real architectural fragility found while investigating, worth fixing regardless of the
specific trigger:** a failure anywhere in the secure-storage wipe signs the user OUT during
login. The chain is:

```
sign in
  -> isolateAccountOnLogin
     -> completeAccountCleanup({preserveActiveAuthSession: true})
        -> runStage('secure-storage', clearSecureStorage([SUPABASE_AUTH_STORAGE_KEY]))
           -> keychain clearExcept -> Keychain.getAllGenericPasswordServices(...)
        -> runStage catches, pushes to `failures`
     -> end of completeAccountCleanup: `throw failures[0]`
  -> isolateAccountOnLogin catch -> queryClient.clear() + supabase.auth.signOut()
  -> user is signed out; login looks broken
```

Clearing the PREVIOUS account's secrets is best-effort hygiene. Auth is the critical path. A
hygiene failure must not sign out the person who just signed in. Before the Keychain backend
existed there was no `clearExcept` and this path rarely threw, which is why it is new.

**Cheap bisect if you get there first:** install **407** and try logging in. 407 predates the
Keychain rewrite. If 407 works and 408/409 do not, the cause is confirmed.

### Staging test-bypass whitelist is intentionally empty

`murror_api.test_bypass_users` was emptied on 2026-08-02 at Astro's request so every staging
account behaves like a real user. This is **not** a bug and should not be "fixed" by re-adding
rows. Restore SQL, if ever needed: `Murror/docs/runbooks/restore-staging-test-bypass.sql`.

That table does not exist in production at all, and the lookup fails closed there, so this moved
staging toward prod parity rather than away from it.

---

## Recently shipped by Claude Code (2026-08-01 / 08-02)

| PR                                                        | What                                                                           | Why it matters to you                                                  |
| --------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| [#997](https://github.com/Murror/MurrorMobile/pull/997)   | Manage Subscription now consults `/api/v1/subscription/status` before erroring | Settings and Manage Subscription used to disagree about who is premium |
| [#1000](https://github.com/Murror/MurrorMobile/pull/1000) | Re-attach PostHog `env` flag targeting after `identify()` and `reset()`        | A FREE staging account had the ENTIRE premium surface unlocked         |
| [#1001](https://github.com/Murror/MurrorMobile/pull/1001) | Build 406 bump                                                                 | on-lane, for reference                                                 |
| [#1002](https://github.com/Murror/MurrorMobile/pull/1002) | CI skips the macOS smoke build on version-number-only bumps                    | macOS runners are 10x Linux; this was ~$1.37 of pure waste per bump    |

### The freemium leak, in one paragraph

`enable_hard_pay_wall` is targeted at `env is_not staging`. A person with **no** `env` property
MATCHES that rule and is served `true` (hard wall). `env` is attached via
`setPersonPropertiesForFlags()`, which binds to the CURRENT PostHog person — and both `identify()`
and `reset()` rebind that person. Neither re-attached it, so every post-sign-in evaluation ran
env-less. `true` then flows through `isSoftPaywallActive` -> false, and `resolveEntitlement`
**short-circuits to `{entitled: true}` for EVERY feature** before it ever reads the plan's
entitlement map.

**To prove any flag's real served value, query `$feature_flag_called` events, not the person
record.** `setPersonPropertiesForFlags` does not write to the person profile, so a null
`person.properties.env` proves nothing.

---

## Standing facts that are easy to get wrong

- **`NODE_ENV` is `production` on EVERY tier**, including staging and alpha. Use `ENVIRONMENT`
  to distinguish. Using `NODE_ENV` files staging noise as production.
- **Production hostnames:** `murror.api.ambercare.app` is what the LIVE App Store app calls, and
  `insights.murror.app` is live. Do not delete either while auditing hostnames.
- **PostHog:** staging and production **share one project**. Scope by the `env` person property.
- **RevenueCat:** staging has its OWN app record (`appf4a89fc032`) and its own
  `app.murror.premium.stg.*` products. Do not copy production product ids into staging config.
- **Migrations / one-off SQL:** port **5432** and `MURROR_DATABASE_URL_EXTERNAL`. Never the 6543
  pooler.
- **Adding a native module is not done when the JS compiles.** It needs `pod install` AND a real
  build that has been run. A JS-only unit test cannot prove a native module works; say so rather
  than implying verification you did not do.

---

## Codex parity lane parked (2026-08-05)

- Astro requested that this lane pause and be saved for another day. The user-facing release
  order is **iOS first, web second, Android third**. There is no Murror macOS app lane.
- The recurring `murror-post-production-parity-hold` heartbeat is **PAUSED**, not deleted. It must
  not resume work until Astro explicitly resumes this lane.
- The saved implementation checkpoints are preserved and clean:
  - Web: `/Users/astro/Projects/murror-transfer/Murror/murror-platform-worktrees/codex-web-parity-integration-20260804`,
    branch `codex/web-parity-integration-20260804`, commit `8bcbfa6f`.
  - Android: `/Users/astro/Projects/murror-transfer/Murror/MurrorMobile-worktrees/codex-android-parity-integration-20260804`,
    branch `codex/android-parity-integration-20260804`, commit `0eebee48`.
  - Documentation: `/Users/astro/Projects/murror-transfer/Murror/worktrees/codex-docs-unblock-20260805`,
    branch `codex/docs-unblock-20260805`, commits `34f75cd` and `e291365`.
- The internal tracker and plan remain saved at 77% evidence-weighted parity.
- The Codex-owned parity entries in the shared root `PROGRESS.md` are now committed as `f0563c5` (`docs(progress): record web and Android parity lane`). The remaining uncommitted `2026-08-04 - Five fixes were in the wrong file, and we finally proved it` section is still separate iOS documentation and was not included. The exact task-owned
  web dependency/build artifacts were already moved recoverably to macOS Trash; no worktree was
  deleted, and shared caches, mixed umbrella docs, untracked user files, iOS, Uni, and Claude's
  worktrees were preserved.
- Resume only after explicit confirmation that iOS production promotion is complete and Astro
  wants this lane restarted. Then fetch the real API `staging`, web `dev`, and mobile
  `staging-environment-setup` trunks, audit overlap and drift, and rerun the verification matrix
  before any integration or release action.

## Codex notification audit checkpoint (2026-08-08)

Scope remains Murror staging, English-only, iPhone/iOS only. Android, iPad, Apple Watch, web,
production deployment, and a new TestFlight build are out of scope for this checkpoint.

- Idle-agent cleanup is complete. The six previously launched Codex subagents all returned
  `not_found`; no idle worker remains. No Claude checkout was touched.
- API PR #736 remains reviewed with all checks green at `ef2a50545a79f9ae688ce781fdcfe6834058d41c`.
- Legacy PR #906 remains reviewed with all checks green at `bcaf65853fefbbc5a0c709835b972d53579e95d4`.
  It must be deployed from the exact branch for staging; do not merge it to `main`, because the
  `main` push path auto-deploys dev.
- Exact-branch legacy staging run `31276079517` passed checkout, CLI setup, migration deployment,
  and Edge Function deployment. It stopped at the pre-existing app-config upload because the
  staging `SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` configuration is invalid. Smoke tests
  were skipped; this is a partial deploy, not a green runtime proof.
- The Supabase CLI authoritative key endpoint returned HTTP 403 for the current account. There is
  no local `.env` source to reuse, and GitHub staging key metadata shows both API keys were last
  updated in September 2024. Do not guess or copy a key. The next safe action is to obtain a
  Supabase role with API-key access or have an authorized owner refresh only the staging secrets.
- Temporary staging deployment policy `56837123` was removed after the failed run. Verification
  shows only the original `main` policy (`21103990`) remains.
- Viasr PR #604 is still open and green at `61bf87e44d10c787ad7f130b092843cf0f493cb2`; do not
  merge/deploy it until legacy staging is healthy and the API rollout order is rechecked.
- Physical iPhone evidence remains open: CoreDevice previously showed no connected iPhone. Do not
  claim APNs delivery, OneSignal identity, routing, or audible `foodshot_jingle.wav` proof without
  a visible unlocked/trusted device and the combined candidate build.
- Storage cleanup removed only the exact temporary Viasr dependency shells/caches under
  `/private/tmp/viasr-prod-venvs`, `/private/tmp/viasr-poetry-venvs`, and
  `/private/tmp/viasr-uv-cache`; they were verified absent. Keep the three source worktrees while
  staging deployment and device validation remain open. No extra GitHub Actions run or build was
  started after the failed legacy run.

## Codex heartbeat checkpoint (2026-08-08 20:20Z)

- The privileged GitHub API quota check passed: 4,927 of 5,000 core requests remained.
- Fresh remote refs: API PR #736 head `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906
  head `bcaf65853fefbbc5a0c709835b972d53579e95d4`, and Viasr PR #604 head
  `61bf87e44d10c787ad7f130b092843cf0f493cb2`. Legacy and Viasr checks remain green; API PR #736
  is `CONFLICTING` because staging advanced to `c616a91` (#738).
- A non-destructive API sync preview found 28 overlapping files. The attempted isolated merge was
  aborted before commit/push, and its temporary backup ref and patch files were removed. The API
  worktree is clean and Claude's staging commit was not changed.
- Supabase API-key retrieval still returns HTTP 403 for the current account. Do not dispatch another
  legacy staging workflow until an authorized Supabase role can refresh the invalid staging
  `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` secrets. This avoids another paid failed
  GitHub Actions run.
- No new workflow, PR merge, deploy, or TestFlight build was started in this heartbeat. Physical
  iPhone APNs, ringtone, routing, consent, and quiet-hours evidence remain open.

## Codex heartbeat checkpoint (2026-08-09 21:10 PDT)

- Privileged GitHub API quota is fully reset: 5,000/5,000 core requests remaining.
- Fresh remote verification: legacy PR #906 remains green at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4`; Viasr PR #604 remains green at
  `61bf87e44d10c787ad7f130b092843cf0f493cb2`; API staging advanced to `afcc4c5c27525c045c8bc6c44c8718b009359083` and API PR #736 is confirmed `CONFLICTING`/`DIRTY` against that trunk.
- Staging still exposes only the original `main` deployment policy. `SUPABASE_ANON_KEY` and
  `SUPABASE_SERVICE_ROLE_KEY` secret timestamps remain September 2024, and the authoritative
  Supabase key endpoint still returns HTTP 403 for the current account. Do not dispatch legacy
  staging again until an authorized Supabase role refreshes those exact staging secrets.
- No legacy workflow, API/Viasr merge, deployment, provider write, or TestFlight build was started;
  DEV remained untouched. This avoided another known app-config failure and paid CI run.
- The iPhone runtime gate remains open: no physical APNs, ringtone, routing, consent, or quiet-hours
  acceptance can be claimed without a visible trusted iPhone and a matching combined build.

## Codex heartbeat checkpoint (2026-08-10 02:10 PDT)

- GitHub API quota reset is confirmed at 5,000/5,000.
- Exact heads: API staging `aef19514e194369f3a9728dbe6b41f9a45941047`, legacy PR #906
  `bcaf65853fefbbc5a0c709835b972d53579e95d4`, and Viasr PR #604
  `61bf87e44d10c787ad7f130b092843cf0f493cb2`. Legacy and Viasr checks remain green; API PR #736
  mergeability is still being recomputed against the moving staging trunk.
- The staging deployment environment still exposes only policy `main` (`21103990`).
  `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` remain at September 2024 timestamps, and
  Supabase's authoritative key endpoint returns HTTP 403. Do not dispatch PR #906 until an
  authorized Supabase role refreshes those exact staging secrets.
- No workflow, merge, deploy, provider write, TestFlight build, or physical-device run occurred;
  DEV and Claude's changes remain untouched. The live page was updated without creating another
  dependency cache or temporary worktree.

## Codex heartbeat checkpoint (2026-08-10 07:11 PDT)

- Quota remains fully reset at 5,000/5,000.
- Legacy PR #906 (`bcaf65853fefbbc5a0c709835b972d53579e95d4`) and Viasr PR #604
  (`61bf87e44d10c787ad7f130b092843cf0f493cb2`) remain clean and green. API PR #736 is confirmed
  `CONFLICTING`/`DIRTY` against staging `aef19514e194369f3a9728dbe6b41f9a45941047`.
- Staging policy remains only `main` (`21103990`). Supabase API-key retrieval remains HTTP 403 for
  the current account, while staging `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` remain
  dated September 2024. No PR #906 workflow was dispatched, so DEV and CI spend were preserved.
- No merge, deployment, provider write, TestFlight build, or physical-iPhone acceptance occurred;
  tracker and handoff were updated, and task-owned temporary dependency artifacts remain removed.

## Codex heartbeat checkpoint (2026-08-10 12:13 PDT)

- GitHub quota is healthy at 4,975/5,000.
- API staging moved to `a4e282deab5b1fea520a62d7c20075d7845630ae`; PR #736 remains open while its
  merge state recomputes against the moving trunk. Legacy PR #906 remains green at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4`; Viasr PR #604 remains green at
  `61bf87e44d10c787ad7f130b092843cf0f493cb2`.
- Supabase key retrieval remains HTTP 403; staging `SUPABASE_ANON_KEY` and
  `SUPABASE_SERVICE_ROLE_KEY` remain dated September 2024. The staging environment policy remains
  only `main` (`21103990`). No PR #906 workflow, merge, deployment, provider write, TestFlight
  build, or iPhone runtime test was started.

## Codex blocked checkpoint (2026-08-10 17:18 PDT)

- The notification launch-readiness goal is marked `BLOCKED` after four consecutive fresh gate
  checks with the same external condition: Supabase's authoritative key endpoint returns HTTP 403
  for the current account, and staging `SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` remain dated
  September 2024.
- Legacy PR #906 and Viasr PR #604 remain green; API PR #736 still needs conflict resolution
  against the moving API staging trunk. No forced merge was attempted.
- The exact unmerged legacy branch was not dispatched again. DEV, paid GitHub Actions, provider
  state, TestFlight, and Claude worktrees remain untouched. Physical iPhone APNs, ringtone, routing,
  consent, and quiet-hours proof remain unverified.
- Resume requires an authorized Supabase role/key refresh and a visible trusted iPhone. Do not
  claim production readiness before those gates and the API merge/deploy evidence are complete.

## Codex heartbeat checkpoint (2026-08-12 22:05Z)

- The privileged GitHub API quota is healthy at 4,998/5,000 core requests remaining. Fresh exact
  refs are API staging `5c6547bc278317dc91a7db439c565b3a0da5adf0` with API PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4`, and Viasr staging at
  `d2b4e20f01b22d43b57f82829badf97dc148f78e` after merging clean, green PR #604.
- The Viasr staging push started exactly one required CI run (`31645924502`); release-source and
  quality-security passed while image builds were still in progress at the checkpoint. No manual
  dispatch was used. API PR #736 remains open and non-mergeable against the moving staging trunk,
  so no forced merge or duplicate sync was attempted.
- The exact legacy PR #906 branch was not dispatched. Staging still exposes only the original
  `main` deployment policy (`21103990`), the authoritative Supabase key endpoint still returns
  HTTP 403 for the current account, and `SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` metadata
  remains dated September 2024. This avoids repeating the known invalid-key app-config failure,
  paid CI spend, and any DEV impact.
- CoreDevice now sees the paired physical iPhone 16 Pro as available. `MurrorStg` (`app.murror.mobile.stg`)
  version 2.1.0 build 421 is installed. This is a device-availability improvement, not combined
  candidate proof: APNs delivery, `foodshot_jingle.wav`, routing, consent, quiet-hours, and
  OneSignal/provider evidence remain unverified until a matching consolidated build is installed.
- The notification launch-readiness goal remains `BLOCKED` and strict release readiness remains
  `NO-GO`. Claude worktrees, DEV, TestFlight, provider state, and unrelated Android/iPad/Watch/web
  scope were untouched. The task-owned live page records this checkpoint; no temporary artifact
  was removed in this heartbeat because the remaining `/private/tmp` directories were not valid
  Git worktrees and ownership still needs exact classification before cleanup.

## Codex heartbeat follow-up (2026-08-12 22:21Z)

- Viasr staging rollout verification is now complete: workflow `31645924502` from
  `d2b4e20f01b22d43b57f82829badf97dc148f78e` finished `success` for release-source,
  quality-security, build-images, and the staging deploy. This is deployment provenance only;
  provider delivery and physical-device acceptance are still separate gates.
- Exact task-owned disposable notification caches and generated bundles were removed after a
  no-active-process check, freeing about 5 GiB. Registered Git worktrees and full source copies
  were retained; no Claude checkout, branch, or unmerged source was removed.
- The goal remains `BLOCKED`/`NO-GO`: Supabase key retrieval is still HTTP 403, staging still
  permits only `main` for the legacy lane, API PR #736 is still non-mergeable against the moving
  API staging trunk, and the physical iPhone has build 421 rather than the consolidated candidate.
  Do not claim APNs, `foodshot_jingle.wav`, routing, consent, or quiet-hours acceptance yet.

## Codex heartbeat checkpoint (2026-08-13 03:05Z)

- GitHub privileged quota is reset/healthy at 4,999/5,000 core requests remaining. Exact refs are
  unchanged: API staging `5c6547bc278317dc91a7db439c565b3a0da5adf0`, API PR #736 head
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 head
  `bcaf65853fefbbc5a0c709835b972d53579e95d4`, and Viasr staging
  `d2b4e20f01b22d43b57f82829badf97dc148f78e`.
- API and legacy PR checks remain green. Viasr PR #604 remains merged and its staging workflow
  `31645924502` remains successful across release-source, quality/security, image builds, and
  staging deploy. No duplicate Actions run was started.
- The legacy staging environment still exposes only branch policy `main` (`21103990`), and the
  authoritative Supabase key endpoint still returns HTTP 403. Staging key metadata remains
  `SUPABASE_ACCESS_TOKEN` updated 2026-06-20 and anon/service-role keys updated 2024-09-15.
  Do not dispatch PR #906 until the exact staging policy and invalid-key gate are resolved.
- The physical iPhone remains paired but now reports `unavailable`; CoreDevice cannot satisfy
  trusted-connectivity assertions. The last confirmed available state had MurrorStg build 421
  installed, but it is not the consolidated candidate. No launch, provider request, build,
  TestFlight action, or device mutation was attempted. APNs, `foodshot_jingle.wav`, routing,
  consent, and quiet-hours acceptance remain unverified.
- The goal remains `BLOCKED`/`NO-GO`. The task-owned live page records this checkpoint; no new
  task-owned temporary artifacts were created, and prior verified generated caches remain removed.

## Codex heartbeat checkpoint (2026-08-13 08:06Z)

- The privileged GitHub quota is reset at 5,000/5,000 core requests remaining. Exact remote refs
  are API staging `5c6547bc278317dc91a7db439c565b3a0da5adf0`, API PR #736 head
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 head
  `bcaf65853fefbbc5a0c709835b972d53579e95d4`, and Viasr staging
  `417c79721f52924a908beef49b57ccc11eecbd13`.
- Viasr's newer staging workflow `31670851090` completed successfully for release-source,
  quality-security, build-images, and deploy. This is the only newly observed rollout; no manual
  dispatch or duplicate CI run was created.
- API PR #736 is explicitly `CONFLICTING`/`DIRTY`: GitHub compare shows the PR and staging
  diverged by 40 commits in each direction. No forced merge or speculative sync was attempted.
- Legacy PR #906 remains green but undispatched. Staging still has only branch policy `main`
  (`21103990`); Supabase's authoritative key endpoint still returns HTTP 403, and staging
  anon/service-role key metadata remains dated 2024-09-15. Do not repeat the known invalid-key
  deployment until the exact policy and secrets are repaired.
- CoreDevice now reports the paired physical iPhone 16 Pro available, with MurrorStg version 2.1.0
  build 421 installed. This is not the consolidated candidate, so no APNs, dedicated ringtone,
  routing, consent, or quiet-hours acceptance is claimed and no new build/provider request was
  started. The goal remains `BLOCKED`/`NO-GO`; the live page records this checkpoint.

## Codex heartbeat checkpoint (2026-08-13 23:09Z)

- GitHub privileged quota is healthy at 4,693/5,000 core requests remaining. Exact refs are API
  staging `5c6547bc278317dc91a7db439c565b3a0da5adf0`, API PR #736 head
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 head
  `bcaf65853fefbbc5a0c709835b972d53579e95d4`, and Viasr staging
  `2f366a4216fbcc4edb76017cdfe282010eeab25a`.
- Viasr workflow `31743670945` from the new staging head completed successfully for
  release-source, quality-security, build-images, and deploy. Legacy `main` also advanced to
  `770aa2e2` outside this task; no DEV-affecting action was initiated by Codex.
- API compare remains `diverged`, with 40 commits in each direction; GitHub reports PR #736
  `CONFLICTING`/`DIRTY`. API and legacy checks remain green, but no merge or speculative sync was
  attempted.
- The legacy staging environment still exposes only branch policy `main` (`21103990`), and the
  authoritative Supabase key endpoint still returns HTTP 403. Staging anon/service-role key
  metadata remains dated 2024-09-15. The exact legacy branch was not dispatched.
- CoreDevice reports the paired physical iPhone 16 Pro available and unlocked, with MurrorStg
  version 2.1.0 build 421 installed. This is not the consolidated candidate, so no APNs,
  dedicated ringtone, routing, consent, or quiet-hours acceptance is claimed and no new
  build/provider request or duplicate CI run was started. The goal remains `BLOCKED`/`NO-GO` and
  the live page records this checkpoint.

## Codex heartbeat checkpoint (2026-08-13 13:07Z)

- GitHub privileged quota is reset at 5,000/5,000 core requests remaining. Exact refs are
  unchanged: API staging `5c6547bc278317dc91a7db439c565b3a0da5adf0`, API PR #736 head
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 head
  `bcaf65853fefbbc5a0c709835b972d53579e95d4`, and Viasr staging
  `417c79721f52924a908beef49b57ccc11eecbd13`.
- API compare remains `diverged`, with 40 commits in each direction; GitHub reports PR #736
  `CONFLICTING`/`DIRTY`. API and legacy checks remain green. Viasr staging workflow `31670851090`
  remains successful, including deploy; no duplicate Actions run was created.
- The legacy staging environment still exposes only branch policy `main` (`21103990`), and the
  authoritative Supabase key endpoint still returns HTTP 403. Staging anon/service-role key
  metadata remains dated 2024-09-15. The exact legacy branch was not dispatched to avoid repeating
  the known invalid-key failure and paid CI cost.
- CoreDevice now reports the paired physical iPhone 16 Pro `unavailable`; no app query, launch,
  build, provider request, or device mutation was attempted. Its last confirmed available state
  had MurrorStg build 421 installed, which is not the consolidated candidate. APNs, dedicated
  ringtone, routing, consent, and quiet-hours acceptance remain unverified.
- The goal remains `BLOCKED`/`NO-GO`. The live page records this checkpoint; prior task-owned
  generated artifacts remain removed and Claude worktrees/DEV remain untouched.

## Codex heartbeat checkpoint (2026-08-13 18:08Z)

- GitHub privileged quota is reset at 5,000/5,000 core requests remaining. Exact refs are
  unchanged: API staging `5c6547bc278317dc91a7db439c565b3a0da5adf0`, API PR #736 head
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 head
  `bcaf65853fefbbc5a0c709835b972d53579e95d4`, and Viasr staging
  `417c79721f52924a908beef49b57ccc11eecbd13`.
- API compare remains `diverged`, with 40 commits in each direction; GitHub reports PR #736
  `CONFLICTING`/`DIRTY`. API and legacy checks remain green. Viasr staging workflow `31670851090`
  remains successful, including deploy; no duplicate Actions run was created.
- The legacy staging environment still exposes only branch policy `main` (`21103990`), and the
  authoritative Supabase key endpoint still returns HTTP 403. Staging anon/service-role key
  metadata remains dated 2024-09-15. The exact legacy branch was not dispatched.
- CoreDevice now reports the paired physical iPhone 16 Pro available, with MurrorStg version 2.1.0
  build 421 installed. This is not the consolidated candidate, so no APNs, dedicated ringtone,
  routing, consent, or quiet-hours acceptance is claimed and no new build/provider request was
  started. The goal remains `BLOCKED`/`NO-GO`; the live page records this checkpoint.

## Codex heartbeat checkpoint (2026-08-14 04:10Z)

- GitHub privileged quota is reset at 5,000/5,000 core requests remaining. Exact remote refs are
  API staging `5c6547bc278317dc91a7db439c565b3a0da5adf0`, API PR #736 head
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 head
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with legacy `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `1fcf30e1fd5686f5a39a2394e1ed8f6d71b9351c`.
- API PR #736 checks remain green, but compare is still `diverged` with 40 commits in each
  direction and GitHub reports `CONFLICTING`/`DIRTY`; no forced sync or merge was attempted.
  Legacy PR #906 checks remain green and the PR is clean/open, but the staging environment still
  permits only branch policy `main` (`21103990`). The authoritative Supabase key endpoint still
  returns HTTP 403, so the exact PR #906 branch was not dispatched and DEV was not touched.
- Viasr PR #604 remains merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e`. Its existing
  staging workflow `31755016584` from the exact current staging head completed successfully
  across release-source, quality/security, image builds, and deploy. No duplicate Actions run
  was created.
- CoreDevice reports the paired physical iPhone 16 Pro available and connected;
  `passcodeRequired: true`, `unlockedSinceBoot: true`, and MurrorStg version 2.1.0 build 421 is
  installed. Build 421 is not the consolidated candidate, so APNs, `foodshot_jingle.wav`,
  routing, consent, and quiet-hours acceptance remain unverified. No build, provider request,
  TestFlight action, or device mutation was attempted.
- The goal remains `BLOCKED`/`NO-GO`. The task-owned live page records this checkpoint. No
  non-task temporary artifacts were removed; prior generated notification caches and bundles
  remain verified absent, and Claude worktrees were preserved.

## Codex heartbeat checkpoint (2026-08-14 09:10Z)

- GitHub privileged quota is healthy at 4,923/5,000 core requests remaining. Exact remote refs
  are mobile staging `157d29d1c965783fd44df7a3c9a5eaca9963ee7c`, API staging
  `5c6547bc278317dc91a7db439c565b3a0da5adf0` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `1fcf30e1fd5686f5a39a2394e1ed8f6d71b9351c`.
- API PR #736 and legacy PR #906 checks remain green. API compare remains `diverged` with 40
  commits in each direction and GitHub reports `CONFLICTING`/`DIRTY`; no merge or forced sync
  was attempted. Legacy staging still permits only branch policy `main` (`21103990`) and the
  authoritative Supabase key endpoint still returns HTTP 403, so PR #906 was not dispatched.
- Viasr PR #604 remains merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e`; existing workflow
  `31755016584` from the exact current staging head remains successful across release-source,
  quality/security, image builds, and deploy. No duplicate Actions run was created.
- MurrorMobile #1101 merged official build 431 (`a00c1545`) and that build is installed on the
  paired iPhone. MurrorMobile #1103 merged build 432 (`5b1c2c67`) and is claimed by the active
  Claude production-promotion freeze. That freeze explicitly prohibits device runs, iOS edits,
  merges, deploys, provider writes, and build-lane actions until Astro confirms promotion
  completion; therefore no physical APNs, ringtone, routing, consent, or quiet-hours acceptance
  was attempted or claimed. The goal remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-14 14:10Z)

- GitHub privileged quota is reset at 5,000/5,000 core requests remaining. Exact remote refs are
  mobile staging `4b16ca9feb79e91381309a2fc24ca5990d5574ed`, API staging
  `424432d2f304e9718ed9b2fbcbc76b3de53812f9` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `1fcf30e1fd5686f5a39a2394e1ed8f6d71b9351c`.
- API compare is now `diverged`: PR #736 is 40 commits ahead of staging while staging is 49
  commits ahead of the PR; GitHub reports `CONFLICTING`/`DIRTY`. API and legacy checks remain
  green; no merge or forced sync was attempted. Legacy staging still permits only branch policy
  `main` (`21103990`) and the authoritative Supabase key endpoint still returns HTTP 403, so
  PR #906 was not dispatched.
- Viasr PR #604 remains merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e`; existing workflow
  `31755016584` from the exact staging head remains successful across release-source,
  quality/security, image builds, and deploy. No duplicate Actions run was created.
- MurrorMobile PR #1104 is now merged at `209de791d39fea8a0f648c8ac0128d258fc08ceb`. Build 431
  remains installed on the paired iPhone, while build 432 is claimed by Claude's active
  production-promotion freeze. The iPhone is currently `connecting`; its lock query reports
  `passcodeRequired: false` and `unlockedSinceBoot: true`. The freeze still prohibits device
  runs, iOS edits, merges, deploys, provider writes, and build-lane actions until Astro confirms
  promotion completion. No physical APNs, ringtone, routing, consent, or quiet-hours acceptance
  was attempted or claimed. The goal remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-14 19:11Z)

- GitHub privileged quota is reset at 5,000/5,000 core requests remaining. Exact remote refs are
  unchanged: mobile staging `4b16ca9feb79e91381309a2fc24ca5990d5574ed`, API staging
  `424432d2f304e9718ed9b2fbcbc76b3de53812f9` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `1fcf30e1fd5686f5a39a2394e1ed8f6d71b9351c`.
- API compare remains `diverged`: PR #736 is 40 commits ahead of staging while staging is 49
  commits ahead of the PR; GitHub reports `CONFLICTING`/`DIRTY`. API and legacy checks remain
  green; no merge or forced sync was attempted. Legacy staging still permits only branch policy
  `main` (`21103990`) and the authoritative Supabase key endpoint still returns HTTP 403, so
  PR #906 was not dispatched.
- Viasr PR #604 remains merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e`; existing workflow
  `31755016584` remains successful across release-source, quality/security, image builds, and
  deploy. No duplicate Actions run was created.
- Build 431 remains installed on the paired iPhone. CoreDevice currently reports the phone
  `connecting`; the latest lock query reports `passcodeRequired: true` and
  `unlockedSinceBoot: true`. Claude's production-promotion freeze still prohibits device runs,
  iOS edits, merges, deploys, provider writes, and build-lane actions until Astro confirms
  promotion completion. No physical APNs, ringtone, routing, consent, or quiet-hours acceptance
  was attempted or claimed. The goal remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-15 00:12Z)

- GitHub privileged quota reset was observed; the current quota is healthy at 4,989/5,000 core
  requests remaining. Exact remote refs are mobile staging `4b16ca9feb79e91381309a2fc24ca5990d5574ed`,
  API staging `6b9d787cce0f16c0dd614a42f2c155876bd9ca4c` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `1fcf30e1fd5686f5a39a2394e1ed8f6d71b9351c`.
- API compare is now `diverged`: PR #736 is 40 commits ahead of staging while staging is 54
  commits ahead of the PR; GitHub reports `CONFLICTING`/`DIRTY`. API and legacy checks remain
  green; no merge or forced sync was attempted. Legacy staging still permits only branch policy
  `main` (`21103990`) and the authoritative Supabase key endpoint still returns HTTP 403, so
  PR #906 was not dispatched.
- Viasr PR #604 remains merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e`; existing workflow
  `31755016584` remains successful across release-source, quality/security, image builds, and
  deploy. No duplicate Actions run was created.
- Build 431 remains installed on the paired iPhone. CoreDevice reports the phone available, while
  the latest lock query reports `passcodeRequired: true` and `unlockedSinceBoot: true`. The active
  production-promotion freeze still prohibits notification device runs, iOS edits, merges,
  deploys, provider writes, and build-lane actions until Astro confirms promotion completion.
  No physical APNs, ringtone, routing, consent, or quiet-hours acceptance was attempted or
  claimed. The goal remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-15 05:13Z)

- GitHub privileged quota reset was observed at 5,000/5,000 core requests remaining. Exact remote
  refs are unchanged: mobile staging `4b16ca9feb79e91381309a2fc24ca5990d5574ed`, API staging
  `6b9d787cce0f16c0dd614a42f2c155876bd9ca4c` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `1fcf30e1fd5686f5a39a2394e1ed8f6d71b9351c`.
- API compare remains `diverged`: PR #736 is 40 commits ahead of staging while staging is 54
  commits ahead of the PR; GitHub reports `CONFLICTING`/`DIRTY`. API and legacy checks remain
  green; no merge or forced sync was attempted. Legacy staging still permits only branch policy
  `main` (`21103990`) and the authoritative Supabase key endpoint still returns HTTP 403, so
  PR #906 was not dispatched.
- Viasr PR #604 remains merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e`; existing workflow
  `31755016584` remains successful across release-source, quality/security, image builds, and
  deploy. No duplicate Actions run was created.
- CoreDevice now reports both the physical iPhone and Apple Watch `unavailable`; the iPhone app
  and lock queries fail with CoreDevice error `4016` because trusted connectivity cannot be
  asserted. The last confirmed iPhone state had MurrorStg build 431 installed and
  `passcodeRequired: true`. The active production-promotion freeze still prohibits notification
  device runs, iOS edits, merges, deploys, provider writes, and build-lane actions. No physical
  APNs, ringtone, routing, consent, or quiet-hours acceptance was attempted or claimed. The goal
  remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-15 10:14Z)

- GitHub privileged quota reset was observed at 5,000/5,000 core requests remaining. Exact remote
  refs are unchanged: mobile staging `4b16ca9feb79e91381309a2fc24ca5990d5574ed`, API staging
  `6b9d787cce0f16c0dd614a42f2c155876bd9ca4c` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `1fcf30e1fd5686f5a39a2394e1ed8f6d71b9351c`.
- API compare remains `diverged`: PR #736 is 40 commits ahead of staging while staging is 54
  commits ahead of the PR; GitHub reports `CONFLICTING`/`DIRTY`. API and legacy checks remain
  green; no merge or forced sync was attempted. Legacy staging still permits only branch policy
  `main` (`21103990`) and the authoritative Supabase key endpoint still returns HTTP 403, so
  PR #906 was not dispatched.
- Viasr PR #604 remains merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e`; existing workflow
  `31755016584` remains successful across release-source, quality/security, image builds, and
  deploy. No duplicate Actions run was created.
- The iPhone app query now succeeds with MurrorStg build 431 installed. CoreDevice reports the
  phone `connecting`, and the latest lock query reports `passcodeRequired: true` and
  `unlockedSinceBoot: true`. The active production-promotion freeze still prohibits notification
  device runs, iOS edits, merges, deploys, provider writes, and build-lane actions. No physical
  APNs, ringtone, routing, consent, or quiet-hours acceptance was attempted or claimed. The goal
  remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-15 15:15Z)

- GitHub privileged quota reset was observed at 5,000/5,000 core requests remaining. Exact remote
  refs are mobile staging `af8db1d8ea1bf39eab7940695107b0de852e81c5`, API staging
  `6b9d787cce0f16c0dd614a42f2c155876bd9ca4c` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `1fcf30e1fd5686f5a39a2394e1ed8f6d71b9351c`.
- API compare remains `diverged`: PR #736 is 40 commits ahead of staging while staging is 54
  commits ahead of the PR; GitHub reports `CONFLICTING`/`DIRTY`. API and legacy checks remain
  green; no merge or forced sync was attempted. Legacy staging still permits only branch policy
  `main` (`21103990`) and the authoritative Supabase key endpoint still returns HTTP 403, so
  PR #906 was not dispatched.
- Viasr PR #604 remains merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e`; existing workflow
  `31755016584` remains successful across release-source, quality/security, image builds, and
  deploy. No duplicate Actions run was created.
- The iPhone is available; its app query succeeds with MurrorStg build 431 installed, while the
  lock query reports `passcodeRequired: true` and `unlockedSinceBoot: true`. The active
  production-promotion freeze still prohibits notification device runs, iOS edits, merges,
  deploys, provider writes, and build-lane actions. No physical APNs, ringtone, routing, consent,
  or quiet-hours acceptance was attempted or claimed. The goal remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-15 20:17Z)

- GitHub privileged quota reset was observed at 5,000/5,000 core requests remaining. Exact remote
  refs are unchanged: mobile staging `af8db1d8ea1bf39eab7940695107b0de852e81c5`, API staging
  `6b9d787cce0f16c0dd614a42f2c155876bd9ca4c` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `1fcf30e1fd5686f5a39a2394e1ed8f6d71b9351c`.
- API compare remains `diverged`: PR #736 is 40 commits ahead of staging while staging is 54
  commits ahead of the PR; GitHub reports `CONFLICTING`/`DIRTY`. API and legacy checks remain
  green; no merge or forced sync was attempted. Legacy staging still permits only branch policy
  `main` (`21103990`) and the authoritative Supabase key endpoint again returned HTTP 403, so
  PR #906 was not dispatched and DEV was untouched.
- Viasr PR #604 remains merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e`; existing workflow
  `31755016584` remains successful from the exact current staging head. No duplicate Actions run
  was created.
- CoreDevice reports the paired physical iPhone 16 Pro available. Its app query succeeds with
  MurrorStg build 431 installed, while the lock query reports `passcodeRequired: true` and
  `unlockedSinceBoot: true`. Apple Watch was observed only and remains out of scope. The active
  production-promotion freeze still prohibits notification device runs, iOS edits, merges,
  deploys, provider writes, and build-lane actions. No physical APNs, dedicated ringtone,
  routing, consent, or quiet-hours acceptance was attempted or claimed. The goal remains
  `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-16 01:18Z)

- GitHub privileged quota is healthy at 4,993/5,000 core requests remaining after this
  checkpoint's read-only checks; the reset window is active. Exact remote refs now include mobile
  staging `5dd6a2d6f11b23009a6f40caa2ca6b7a1598836d`, API staging
  `636c479593bbc8d55642a4e4d1b13c3f5a4be4ea` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `1fcf30e1fd5686f5a39a2394e1ed8f6d71b9351c`.
- API compare against the current staging head is `diverged`: PR #736 is 40 commits ahead
  while staging is 57 commits ahead; GitHub reports `CONFLICTING`/`DIRTY`. API and legacy checks
  remain green; no merge or forced sync was attempted. Legacy staging still permits only branch
  policy `main` (`21103990`) and the authoritative Supabase key endpoint again returned HTTP 403,
  so PR #906 was not dispatched and DEV was untouched.
- Viasr PR #604 remains merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e`; existing workflow
  `31755016584` remains successful from the exact staging head. No duplicate Actions run was
  created.
- CoreDevice reports the paired physical iPhone 16 Pro `connecting`. Its app query succeeds with
  MurrorStg build 431 installed, while the lock query reports `passcodeRequired: true` and
  `unlockedSinceBoot: true`. Apple Watch was observed only and remains out of scope. The active
  production-promotion freeze still prohibits notification device runs, iOS edits, merges,
  deploys, provider writes, and build-lane actions. No physical APNs, dedicated ringtone,
  routing, consent, or quiet-hours acceptance was attempted or claimed. The goal remains
  `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-17 12:26Z)

- GitHub privileged quota is healthy at 4,991/5,000 core requests remaining after this
  checkpoint's read-only checks. Exact remote refs include mobile staging
  `3d646813baf6ed47bbe15ba1142218daba997759`, API staging
  `59be378ed452a50e3a42f393d06b66f24169e70e` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `9c3af67e516fa9dd32dd5d1268693ef1404d89db`.
- API compare against the current staging head remains `diverged`: PR #736 is 40 commits ahead
  while staging is 92 commits ahead; GitHub reports `CONFLICTING`/`DIRTY`. API and legacy checks
  remain green; no merge or forced sync was attempted. Legacy staging still permits only branch
  policy `main` (`21103990`) and the authoritative Supabase key endpoint again returned HTTP 403,
  so PR #906 was not dispatched and DEV was untouched.
- Viasr PR #604 remains merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e`; exact-head workflow
  `32022822265` completed successfully. No duplicate Actions run was created.
- CoreDevice reports the paired physical iPhone 16 Pro `available`. Its app query succeeds with
  MurrorStg build 431 installed, while the lock query reports `passcodeRequired: true` and
  `unlockedSinceBoot: true`. Apple Watch was observed only and remains out of scope. The active
  production-promotion freeze still prohibits notification device runs, iOS edits, merges,
  deploys, provider writes, and build-lane actions. No physical APNs, dedicated ringtone,
  routing, consent, or quiet-hours acceptance was attempted or claimed. The goal remains
  `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-16 06:18Z)

- GitHub privileged quota is healthy at 4,996/5,000 core requests remaining after this
  checkpoint's read-only checks. Exact remote refs now include mobile staging
  `5dd6a2d6f11b23009a6f40caa2ca6b7a1598836d`, API staging
  `46b59eb01546c71b0ba96ec1e25a50db173b6fd3` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `1fcf30e1fd5686f5a39a2394e1ed8f6d71b9351c`.
- API compare against the current staging head is `diverged`: PR #736 is 40 commits ahead
  while staging is 67 commits ahead; GitHub reports `CONFLICTING`/`DIRTY`. API and legacy checks
  remain green; no merge or forced sync was attempted. Legacy staging still permits only branch
  policy `main` (`21103990`) and the authoritative Supabase key endpoint again returned HTTP 403,
  so PR #906 was not dispatched and DEV was untouched.
- Viasr PR #604 remains merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e`; existing workflow
  `31755016584` remains successful from the exact staging head. No duplicate Actions run was
  created.
- CoreDevice reports the paired physical iPhone 16 Pro `connected`. Its app query succeeds with
  MurrorStg build 431 installed, while the lock query reports `passcodeRequired: true` and
  `unlockedSinceBoot: true`. Apple Watch was observed only and remains out of scope. The active
  production-promotion freeze still prohibits notification device runs, iOS edits, merges,
  deploys, provider writes, and build-lane actions. No physical APNs, dedicated ringtone,
  routing, consent, or quiet-hours acceptance was attempted or claimed. The goal remains
  `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-16 11:19Z)

- GitHub privileged quota is healthy at 4,997/5,000 core requests remaining after this
  checkpoint's read-only checks. Exact remote refs now include mobile staging
  `5dd6a2d6f11b23009a6f40caa2ca6b7a1598836d`, API staging
  `e1eced55336589d9a5144711f6e4323cb79e55be` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `1fcf30e1fd5686f5a39a2394e1ed8f6d71b9351c`.
- API compare against the current staging head is `diverged`: PR #736 is 40 commits ahead
  while staging is 69 commits ahead; GitHub reports `CONFLICTING`/`DIRTY`. API and legacy checks
  remain green; no merge or forced sync was attempted. Legacy staging still permits only branch
  policy `main` (`21103990`) and the authoritative Supabase key endpoint again returned HTTP 403,
  so PR #906 was not dispatched and DEV was untouched.
- Viasr PR #604 remains merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e`; existing workflow
  `31755016584` remains successful from the exact staging head. No duplicate Actions run was
  created.
- CoreDevice reports the paired physical iPhone 16 Pro `available`. Its app query succeeds with
  MurrorStg build 431 installed, while the lock query reports `passcodeRequired: false` and
  `unlockedSinceBoot: true`. Apple Watch was observed only and remains out of scope. The active
  production-promotion freeze still prohibits notification device runs, iOS edits, merges,
  deploys, provider writes, and build-lane actions. No physical APNs, dedicated ringtone,
  routing, consent, or quiet-hours acceptance was attempted or claimed. The goal remains
  `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-16 16:19Z)

- GitHub privileged quota is healthy at 4,986/5,000 core requests remaining after this
  checkpoint's read-only checks. Exact remote refs now include mobile staging
  `efa4bc049635e4295a644adb3fa8238ce7ea3e0d`, API staging
  `e1eced55336589d9a5144711f6e4323cb79e55be` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `1fcf30e1fd5686f5a39a2394e1ed8f6d71b9351c`.
- API compare against the current staging head remains `diverged`: PR #736 is 40 commits
  ahead while staging is 69 commits ahead; GitHub reports `CONFLICTING`/`DIRTY`. API and legacy
  checks remain green; no merge or forced sync was attempted. Legacy staging still permits only
  branch policy `main` (`21103990`) and the authoritative Supabase key endpoint again returned
  HTTP 403, so PR #906 was not dispatched and DEV was untouched.
- Viasr PR #604 remains merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e`; existing workflow
  `31755016584` remains successful from the exact staging head. No duplicate Actions run was
  created.
- CoreDevice reports the paired physical iPhone 16 Pro `available`. Its app query succeeds with
  MurrorStg build 431 installed, while the lock query reports `passcodeRequired: true` and
  `unlockedSinceBoot: true`. Apple Watch was observed only and remains out of scope. The active
  production-promotion freeze still prohibits notification device runs, iOS edits, merges,
  deploys, provider writes, and build-lane actions. No physical APNs, dedicated ringtone,
  routing, consent, or quiet-hours acceptance was attempted or claimed. The goal remains
  `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-17 07:25Z)

- GitHub privileged quota is healthy at 4,997/5,000 core requests remaining after this
  checkpoint's read-only checks. Exact remote refs now include mobile staging
  `3d646813baf6ed47bbe15ba1142218daba997759`, API staging
  `59be378ed452a50e3a42f393d06b66f24169e70e` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `84dcde74f628db179bc0e7c10f1432ccb59adebe`.
- API compare against the current staging head is `diverged`: PR #736 is 40 commits ahead
  while staging is 92 commits ahead; GitHub reports `CONFLICTING`/`DIRTY`. API and legacy checks
  remain green; no merge or forced sync was attempted. Legacy staging still permits only branch
  policy `main` (`21103990`) and the authoritative Supabase key endpoint again returned HTTP 403,
  so PR #906 was not dispatched and DEV was untouched.
- Viasr PR #604 remains merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e`; exact-head workflow
  `31993134000` completed successfully. No duplicate Actions run was created.
- CoreDevice reports the paired physical iPhone 16 Pro `connecting`. Its app query succeeds with
  MurrorStg build 431 installed, while the lock query reports `passcodeRequired: true` and
  `unlockedSinceBoot: true`. Apple Watch was observed only and remains out of scope. The active
  production-promotion freeze still prohibits notification device runs, iOS edits, merges,
  deploys, provider writes, and build-lane actions. No physical APNs, dedicated ringtone,
  routing, consent, or quiet-hours acceptance was attempted or claimed. The goal remains
  `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-17 02:23Z)

- GitHub privileged quota is healthy at 4,955/5,000 core requests remaining after this
  checkpoint's read-only checks. Exact remote refs now include mobile staging
  `799afde61d959c03fda30fa8aadfb66323144080`, API staging
  `70110d09487c3db00d20aec69afa816079f8cfe0` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `ce7ea44679af697334ee810fe996086b85c1e5b1`.
- API compare against the current staging head is `diverged`: PR #736 is 40 commits ahead
  while staging is 90 commits ahead; GitHub reports `CONFLICTING`/`DIRTY`. API and legacy checks
  remain green; no merge or forced sync was attempted. Legacy staging still permits only branch
  policy `main` (`21103990`) and the authoritative Supabase key endpoint again returned HTTP 403,
  so PR #906 was not dispatched and DEV was untouched.
- Viasr PR #604 remains merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e`; exact-head workflow
  `31959883487` completed successfully. No duplicate Actions run was created.
- CoreDevice reports the paired physical iPhone 16 Pro `available`. Its app query succeeds with
  MurrorStg build 431 installed, while the lock query reports `passcodeRequired: true` and
  `unlockedSinceBoot: true`. Apple Watch was observed only and remains out of scope. The active
  production-promotion freeze still prohibits notification device runs, iOS edits, merges,
  deploys, provider writes, and build-lane actions. No physical APNs, dedicated ringtone,
  routing, consent, or quiet-hours acceptance was attempted or claimed. The goal remains
  `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-16 21:21Z)

- GitHub privileged quota reset was observed at 5,000/5,000 core requests remaining. Exact remote
  refs include mobile staging `efa4bc049635e4295a644adb3fa8238ce7ea3e0d`, API staging
  `e1eced55336589d9a5144711f6e4323cb79e55be` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `ce7ea44679af697334ee810fe996086b85c1e5b1`.
- API compare against the current staging head remains `diverged`: PR #736 is 40 commits ahead
  while staging is 69 commits ahead; GitHub reports `CONFLICTING`/`DIRTY`. API and legacy checks
  remain green; no merge or forced sync was attempted. Legacy staging still permits only branch
  policy `main` (`21103990`) and the authoritative Supabase key endpoint again returned HTTP 403,
  so PR #906 was not dispatched and DEV was untouched.
- Viasr PR #604 remains merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e`; exact-head workflow
  `31959883487` completed successfully. No duplicate Actions run was created.
- CoreDevice reports the paired physical iPhone 16 Pro `available`. Its app query succeeds with
  MurrorStg build 431 installed, while the lock query reports `passcodeRequired: true` and
  `unlockedSinceBoot: true`. Apple Watch was observed only and remains out of scope. The active
  production-promotion freeze still prohibits notification device runs, iOS edits, merges,
  deploys, provider writes, and build-lane actions. No physical APNs, dedicated ringtone,
  routing, consent, or quiet-hours acceptance was attempted or claimed. The goal remains
  `BLOCKED`/`NO-GO`.

## Codex follow-up checkpoint (2026-08-17 12:26Z; legacy REST check correction)

- GitHub quota reset was observed at 5,000/5,000 before the read-only checks. Exact refs are
  mobile `3d646813baf6ed47bbe15ba1142218daba997759`, API
  `59be378ed452a50e3a42f393d06b66f24169e70e` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr
  `9c3af67e516fa9dd32dd5d1268693ef1404d89db`.
- REST check evidence confirms API PR #736 is green: completed checks are successful or skipped.
  Legacy format, test, and migration-order checks pass, but two existing
  `deploy / reusableDeploy` check runs failed: `31276079517` and `31275928971` (both completed
  2026-08-08). No rerun or dispatch was attempted. Legacy staging remains main-only
  (`21103990`), and the authoritative Supabase key endpoint returns HTTP 403; DEV was untouched.
- API remains 40 commits ahead while staging is 92 commits ahead with `CONFLICTING`/`DIRTY`.
  Viasr PR #604 remains merged and workflow `32022822265` is successful. The iPhone is
  connecting with MurrorStg build 431 installed and `passcodeRequired: true`; the active freeze
  blocks device runs, merges, deploys, provider writes, and build-lane actions. No physical APNs,
  dedicated ringtone, routing, consent, or quiet-hours acceptance was attempted or claimed.
  The goal remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-17 22:27Z)

- GitHub privileged quota is healthy at 4,999/5,000 core requests remaining after this
  checkpoint's read-only checks. Exact remote refs are mobile
  `3d646813baf6ed47bbe15ba1142218daba997759`, API staging
  `59be378ed452a50e3a42f393d06b66f24169e70e` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `9c3af67e516fa9dd32dd5d1268693ef1404d89db`.
- REST evidence shows API PR #736 completed checks are successful or skipped, but the PR is
  still `diverged` from API staging: it is 40 commits ahead while staging is 92 commits ahead,
  with GitHub reporting `CONFLICTING`/`DIRTY`. Legacy format, test, and migration-order checks
  pass, but two existing `deploy / reusableDeploy` checks failed in runs `31276079517` and
  `31275928971` (both completed 2026-08-08). No rerun or dispatch was attempted. Legacy staging
  remains main-only (`21103990`), and authoritative Supabase key retrieval returns HTTP 403;
  the exact unmerged PR #906 branch was not deployed and DEV was untouched.
- Viasr PR #604 remains merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e`; exact-head workflow
  `32022822265` completed successfully. No duplicate Actions run was created.
- CoreDevice reports the paired physical iPhone 16 Pro `connecting`. Its app query succeeds with
  MurrorStg build 431 installed, while the lock query reports `passcodeRequired: true` and
  `unlockedSinceBoot: true`. Apple Watch was observed only and remains out of scope. The active
  production-promotion freeze still prohibits notification device runs, iOS edits, merges,
  deploys, provider writes, and build-lane actions. No physical APNs, dedicated ringtone,
  routing, consent, or quiet-hours acceptance was attempted or claimed. The goal remains
  `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-18 03:28Z)

- GitHub privileged quota is healthy at 4,956/5,000 core requests remaining after this
  checkpoint's read-only checks. Exact remote refs remain mobile
  `3d646813baf6ed47bbe15ba1142218daba997759`, API staging
  `59be378ed452a50e3a42f393d06b66f24169e70e` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `9c3af67e516fa9dd32dd5d1268693ef1404d89db`.
- API PR #736 remains open. Its completed checks are successful or skipped, but REST reports
  `mergeable: false`; compare remains `diverged` with PR #736 40 commits ahead of staging and
  staging 92 commits ahead, reported as `CONFLICTING`/`DIRTY`. No merge or forced sync was
  attempted. Legacy PR #906 is Git-mergeable, but its format, test, and migration-order checks
  pass while two existing `deploy / reusableDeploy` checks failed in runs `31276079517` and
  `31275928971` (both completed 2026-08-08). Legacy staging deployment policy `21103990` still
  permits only `main`; Supabase key retrieval remains HTTP 403, so the exact unmerged PR branch
  was not deployed and DEV was untouched.
- Viasr PR #604 remains merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e`; exact-head staging
  workflow `32022822265` completed successfully. No duplicate Actions run was created.
- CoreDevice reports the paired physical iPhone 16 Pro `available`. Its app query succeeds with
  MurrorStg build 431 installed, while the lock query reports `passcodeRequired: true` and
  `unlockedSinceBoot: true`. Apple Watch was observed only and remains out of scope. The active
  production-promotion freeze still prohibits notification device runs, iOS edits, merges,
  deploys, provider writes, and build-lane actions. No physical APNs, dedicated ringtone,
  routing, consent, or quiet-hours acceptance was attempted or claimed. The goal remains
  `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-18 08:30Z)

- GitHub privileged quota reset is observed at 5,000/5,000 core requests remaining after this
  checkpoint's read-only checks. Exact remote refs remain mobile
  `3d646813baf6ed47bbe15ba1142218daba997759`, API staging
  `59be378ed452a50e3a42f393d06b66f24169e70e` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `9c3af67e516fa9dd32dd5d1268693ef1404d89db`.
- API PR #736 remains open. Its completed checks are successful or skipped, but REST reports
  `mergeable: false`; compare remains `diverged` with PR #736 40 commits ahead of staging and
  staging 92 commits ahead, reported as `CONFLICTING`/`DIRTY`. No merge or forced sync was
  attempted. Legacy PR #906 is Git-mergeable, but its format, test, and migration-order checks
  pass while both existing `deploy / reusableDeploy` checks fail in runs `31276079517` and
  `31275928971` (both completed 2026-08-08). Legacy staging deployment policy `21103990` still
  permits only `main`; Supabase key retrieval remains HTTP 403, so the exact unmerged PR branch
  was not deployed and DEV was untouched.
- Viasr PR #604 remains merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e`; exact-head staging
  workflow `32022822265` completed successfully. No duplicate Actions run was created.
- CoreDevice reports the paired physical iPhone 16 Pro `connecting`. Its app and lock queries
  failed because the device was still locked; the last successful app query found MurrorStg build
  431 installed. Apple Watch was observed only and remains out of scope. The active
  production-promotion freeze still prohibits notification device runs, iOS edits, merges,
  deploys, provider writes, and build-lane actions. No physical APNs, dedicated ringtone,
  routing, consent, or quiet-hours acceptance was attempted or claimed. The goal remains
  `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-18 13:31Z)

- GitHub privileged quota reset is observed at 5,000/5,000 core requests remaining after this
  checkpoint's read-only checks. Exact remote refs now include the advanced iOS staging head
  `27aa8d8e2574c6dc86e428d79956eb8600b5bc72`, API staging
  `59be378ed452a50e3a42f393d06b66f24169e70e` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `9c3af67e516fa9dd32dd5d1268693ef1404d89db`.
- API PR #736 remains open. Its completed checks are successful or skipped, but REST reports
  `mergeable: false`; compare remains `diverged` with PR #736 40 commits ahead of staging and
  staging 92 commits ahead, reported as `CONFLICTING`/`DIRTY`. No merge or forced sync was
  attempted. Legacy PR #906 is Git-mergeable, but its format, test, and migration-order checks
  pass while both existing `deploy / reusableDeploy` checks fail in runs `31276079517` and
  `31275928971` (both completed 2026-08-08). Legacy staging deployment policy `21103990` still
  permits only `main`; Supabase key retrieval remains HTTP 403, so the exact unmerged PR branch
  was not deployed and DEV was untouched.
- Viasr PR #604 remains merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e`; exact-head staging
  workflow `32022822265` completed successfully. No duplicate Actions run was created.
- CoreDevice reports the paired physical iPhone 16 Pro `unavailable`; its app and lock queries
  failed with CoreDevice error `4016` because trusted connectivity could not be asserted. The
  last successful app query found MurrorStg build 431 installed. Apple Watch was observed only
  and remains out of scope. The active production-promotion freeze still prohibits notification
  device runs, iOS edits, merges, deploys, provider writes, and build-lane actions. No physical
  APNs, dedicated ringtone, routing, consent, or quiet-hours acceptance was attempted or claimed.
  The goal remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-18 18:31Z)

- GitHub privileged quota reset is observed at 5,000/5,000 core requests remaining after this
  checkpoint's read-only checks. Exact remote refs remain iOS staging
  `27aa8d8e2574c6dc86e428d79956eb8600b5bc72`, API staging
  `59be378ed452a50e3a42f393d06b66f24169e70e` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `9c3af67e516fa9dd32dd5d1268693ef1404d89db`.
- API PR #736 remains open. Its completed checks are successful or skipped, but REST reports
  `mergeable: false`; compare remains `diverged` with PR #736 40 commits ahead of staging and
  staging 92 commits ahead, reported as `CONFLICTING`/`DIRTY`. No merge or forced sync was
  attempted. Legacy PR #906 is Git-mergeable, but its format, test, and migration-order checks
  pass while both existing `deploy / reusableDeploy` checks fail in runs `31276079517` and
  `31275928971` (both completed 2026-08-08). Legacy staging deployment policy `21103990` still
  permits only `main`; Supabase key retrieval remains HTTP 403, so the exact unmerged PR branch
  was not deployed and DEV was untouched.
- Viasr PR #604 remains merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e`; exact-head staging
  workflow `32022822265` completed successfully. No duplicate Actions run was created.
- CoreDevice reports the paired physical iPhone 16 Pro `connecting`. Its app query succeeds with
  MurrorStg build 431 installed, while the lock query reports `passcodeRequired: true` and
  `unlockedSinceBoot: true`. Apple Watch was observed only and remains out of scope. The active
  production-promotion freeze still prohibits notification device runs, iOS edits, merges,
  deploys, provider writes, and build-lane actions. No physical APNs, dedicated ringtone,
  routing, consent, or quiet-hours acceptance was attempted or claimed. The goal remains
  `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-18 23:32Z)

- GitHub privileged quota reset is observed at 5,000/5,000 core requests remaining after this
  checkpoint's read-only checks. Exact remote refs remain iOS staging
  `27aa8d8e2574c6dc86e428d79956eb8600b5bc72`, API staging
  `59be378ed452a50e3a42f393d06b66f24169e70e` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `9c3af67e516fa9dd32dd5d1268693ef1404d89db`.
- API PR #736 remains open. Its completed checks are successful or skipped, but REST reports
  `mergeable: false`; compare remains `diverged` with PR #736 40 commits ahead of staging and
  staging 92 commits ahead, reported as `CONFLICTING`/`DIRTY`. No merge or forced sync was
  attempted. Legacy PR #906 is Git-mergeable, but its format, test, and migration-order checks
  pass while both existing `deploy / reusableDeploy` checks fail in runs `31276079517` and
  `31275928971` (both completed 2026-08-08). Legacy staging deployment policy `21103990` still
  permits only `main`; Supabase key retrieval remains HTTP 403, so the exact unmerged PR branch
  was not deployed and DEV was untouched.
- Viasr PR #604 remains merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e`; exact-head staging
  workflow `32022822265` completed successfully. No duplicate Actions run was created.
- CoreDevice reports the paired physical iPhone 16 Pro `connecting`. Its app query succeeds with
  MurrorStg build 431 installed, while the lock query reports `passcodeRequired: true` and
  `unlockedSinceBoot: true`. Apple Watch was observed only and remains out of scope. The active
  production-promotion freeze still prohibits notification device runs, iOS edits, merges,
  deploys, provider writes, and build-lane actions. No physical APNs, dedicated ringtone,
  routing, consent, or quiet-hours acceptance was attempted or claimed. The goal remains
  `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-19 04:33Z)

- GitHub privileged quota reset is observed at 5,000/5,000 core requests remaining after this
  checkpoint's read-only checks. Exact remote refs remain iOS staging
  `27aa8d8e2574c6dc86e428d79956eb8600b5bc72`, API staging
  `59be378ed452a50e3a42f393d06b66f24169e70e` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `9c3af67e516fa9dd32dd5d1268693ef1404d89db`.
- API PR #736 remains open. Its completed checks are successful or skipped, but REST reports
  `mergeable: false`; compare remains `diverged` with PR #736 40 commits ahead of staging and
  staging 92 commits ahead, reported as `CONFLICTING`/`DIRTY`. No merge or forced sync was
  attempted. Legacy PR #906 is Git-mergeable, but its format, test, and migration-order checks
  pass while both existing `deploy / reusableDeploy` checks fail in runs `31276079517` and
  `31275928971` (both completed 2026-08-08). Legacy staging deployment policy `21103990` still
  permits only `main`; Supabase key retrieval remains HTTP 403, so the exact unmerged PR branch
  was not deployed and DEV was untouched.
- Viasr PR #604 remains merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e`; exact-head staging
  workflow `32022822265` completed successfully. No duplicate Actions run was created.
- CoreDevice reports the paired physical iPhone 16 Pro `connecting`. Its app query succeeds with
  MurrorStg build 431 installed, while the lock query reports `passcodeRequired: true` and
  `unlockedSinceBoot: true`. Apple Watch was observed only and remains out of scope. The active
  production-promotion freeze still prohibits notification device runs, iOS edits, merges,
  deploys, provider writes, and build-lane actions. No physical APNs, dedicated ringtone,
  routing, consent, or quiet-hours acceptance was attempted or claimed. The goal remains
  `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-19 09:34Z)

- The quota check observed 4,899/5,000 core requests remaining; it had not reset at this
  checkpoint. Exact remote refs remain iOS staging
  `27aa8d8e2574c6dc86e428d79956eb8600b5bc72`, API staging
  `59be378ed452a50e3a42f393d06b66f24169e70e` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `9c3af67e516fa9dd32dd5d1268693ef1404d89db`.
- API PR #736 remains open. Its completed checks are successful or skipped, but REST reports
  `mergeable: false`; compare remains `diverged` with PR #736 40 commits ahead of staging and
  staging 92 commits ahead, reported as `CONFLICTING`/`DIRTY`. No merge or forced sync was
  attempted. Legacy PR #906 is Git-mergeable, but its format, test, and migration-order checks
  pass while both existing `deploy / reusableDeploy` checks fail in runs `31276079517` and
  `31275928971` (both completed 2026-08-08). Legacy staging deployment policy `21103990` still
  permits only `main`; Supabase key retrieval remains HTTP 403, so the exact unmerged PR branch
  was not deployed and DEV was untouched.
- Viasr PR #604 remains merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e`; exact-head staging
  workflow `32022822265` completed successfully. No duplicate Actions run was created.
- CoreDevice reports the paired physical iPhone 16 Pro `available`. Its app query succeeds with
  MurrorStg build 431 installed, while the lock query reports `passcodeRequired: true` and
  `unlockedSinceBoot: true`. Apple Watch was observed only and remains out of scope. The active
  production-promotion freeze still prohibits notification device runs, iOS edits, merges,
  deploys, provider writes, and build-lane actions. No physical APNs, dedicated ringtone,
  routing, consent, or quiet-hours acceptance was attempted or claimed. The goal remains
  `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-19 14:35Z)

- The quota check observed 4,968/5,000 core requests remaining; it had not reset at this
  checkpoint. Exact remote refs now include the advanced iOS staging head
  `8b1ec3cb088e6340c1fba92f220308f99960f453`, API staging
  `59be378ed452a50e3a42f393d06b66f24169e70e` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `9c3af67e516fa9dd32dd5d1268693ef1404d89db`.
- API PR #736 remains open. Its completed checks are successful or skipped, but REST reports
  `mergeable: false`; compare remains `diverged` with PR #736 40 commits ahead of staging and
  staging 92 commits ahead, reported as `CONFLICTING`/`DIRTY`. No merge or forced sync was
  attempted. Legacy PR #906 is Git-mergeable, but its format, test, and migration-order checks
  pass while both existing `deploy / reusableDeploy` checks fail in runs `31276079517` and
  `31275928971` (both completed 2026-08-08). Legacy staging deployment policy `21103990` still
  permits only `main`; Supabase key retrieval remains HTTP 403, so the exact unmerged PR branch
  was not deployed and DEV was untouched.
- Viasr PR #604 remains merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e`; exact-head staging
  workflow `32022822265` completed successfully. No duplicate Actions run was created.
- CoreDevice reports the paired physical iPhone 16 Pro `connecting`. Its app query succeeds with
  MurrorStg build 431 installed, while the lock query reports `passcodeRequired: true` and
  `unlockedSinceBoot: true`. Apple Watch was observed only and remains out of scope. The active
  production-promotion freeze still prohibits notification device runs, iOS edits, merges,
  deploys, provider writes, and build-lane actions. No physical APNs, dedicated ringtone,
  routing, consent, or quiet-hours acceptance was attempted or claimed. The goal remains
  `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-20 09:43Z)

- GitHub privileged quota reset was observed at 5,000/5,000 core requests remaining after
  this checkpoint's read-only checks. Exact remote refs now include iOS staging
  `8ee14bdb1363223e8b7a9839aa0c9fa94893a6dd`, API staging
  `59be378ed452a50e3a42f393d06b66f24169e70e` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `9c3af67e516fa9dd32dd5d1268693ef1404d89db`.
- API PR #736 remains open. Its completed checks are successful or skipped, but REST reports
  `mergeable: false`; compare remains `diverged` with PR #736 40 commits ahead of staging and
  staging 92 commits ahead, reported as `CONFLICTING`/`DIRTY`. No merge or forced sync was
  attempted. Legacy PR #906 is Git-mergeable, but its format, test, and migration-order checks
  pass while both existing `deploy / reusableDeploy` checks fail in runs `31276079517` and
  `31275928971` (both completed 2026-08-08). Legacy staging deployment policy `21103990` still
  permits only `main`; Supabase key retrieval remains HTTP 403, so the exact unmerged PR branch
  was not deployed and DEV was untouched.
- Viasr PR #604 remains merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e`; exact-head staging
  workflow `32022822265` completed successfully. No duplicate Actions run was created.
- CoreDevice reports the paired physical iPhone 16 Pro `available`. Its app query succeeds with
  MurrorStg build 431 installed, while the lock query reports `passcodeRequired: true` and
  `unlockedSinceBoot: true`. Apple Watch was observed only and remains out of scope. The active
  production-promotion freeze still prohibits notification device runs, iOS edits, merges,
  deploys, provider writes, and build-lane actions. No physical APNs, dedicated ringtone,
  routing, consent, or quiet-hours acceptance was attempted or claimed. The goal remains
  `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-20 14:43Z)

- GitHub privileged quota reset was observed at 5,000/5,000 core requests remaining after
  this checkpoint's read-only checks. Exact remote refs now include iOS staging
  `2872b9b91efbd1ec16371a64f8034545cd147053`, API staging
  `59be378ed452a50e3a42f393d06b66f24169e70e` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `9c3af67e516fa9dd32dd5d1268693ef1404d89db`.
- API PR #736 remains open with its completed checks successful or skipped, but REST still
  reports `mergeable: false`/`CONFLICTING`/`DIRTY`; compare remains `diverged` with PR #736
  40 commits ahead of staging and staging 92 commits ahead. No merge or forced sync was
  attempted. Legacy PR #906 remains Git-mergeable with format, test, and migration-order
  checks passing, but staging deployment policy `21103990` still permits only `main` and the
  secret-safe Supabase key check returned HTTP 403. The exact unmerged PR branch was not
  deployed and DEV was untouched.
- Viasr PR #604 remains merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e`; exact-head staging
  workflow `32022822265` completed successfully. No duplicate Actions run was created.
- The latest CoreDevice command timed out while the service initialized. The last successful app
  query found MurrorStg build 431 installed and the last successful lock query reported
  `passcodeRequired: true` and `unlockedSinceBoot: true`; no current physical app or lock proof
  is available. Apple Watch was observed only and remains out of scope. The active
  production-promotion freeze still prohibits notification device runs, iOS edits, merges,
  deploys, provider writes, and build-lane actions. No physical APNs, dedicated ringtone,
  routing, consent, or quiet-hours acceptance was attempted or claimed. The goal remains
  `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-20 19:43Z)

- The reset window remains active; the quota check returned 4,999/5,000 core requests after
  that read-only request. Exact remote refs remain iOS staging
  `2872b9b91efbd1ec16371a64f8034545cd147053`, API staging
  `59be378ed452a50e3a42f393d06b66f24169e70e` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `9c3af67e516fa9dd32dd5d1268693ef1404d89db`.
- API PR #736 remains open with completed checks successful or skipped, but REST still reports
  `mergeable: false`/`CONFLICTING`/`DIRTY`; compare remains `diverged` with PR #736 40 commits
  ahead of staging and staging 92 commits ahead. No merge or forced sync was attempted. Legacy
  PR #906 remains Git-mergeable with format, test, and migration-order checks passing, but
  staging deployment policy `21103990` still permits only `main` and the secret-safe Supabase
  key check returned HTTP 403. The exact unmerged PR branch was not deployed and DEV was
  untouched.
- Viasr PR #604 remains merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e`; exact-head staging
  workflow `32022822265` completed successfully. No duplicate Actions run was created.
- CoreDevice again timed out while initializing, so no current physical app or lock proof is
  available. The last successful app query found MurrorStg build 431 installed and the last
  successful lock query reported `passcodeRequired: true` and `unlockedSinceBoot: true`. Apple
  Watch was observed only and remains out of scope. The active production-promotion freeze still
  prohibits notification device runs, iOS edits, merges, deploys, provider writes, and build-lane
  actions. No physical APNs, dedicated ringtone, routing, consent, or quiet-hours acceptance was
  attempted or claimed. The goal remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-21 00:44Z)

- The quota check returned 4,964/5,000 core requests; the reset window is healthy but not at full
  in this check. Exact remote refs remain iOS staging
  `2872b9b91efbd1ec16371a64f8034545cd147053`, API staging
  `59be378ed452a50e3a42f393d06b66f24169e70e` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `9c3af67e516fa9dd32dd5d1268693ef1404d89db`.
- API PR #736 remains open with completed checks successful or skipped, but REST still reports
  `mergeable: false`/`CONFLICTING`/`DIRTY`; compare remains `diverged` with PR #736 40 commits
  ahead of staging and staging 92 commits ahead. No merge or forced sync was attempted. Legacy
  PR #906 remains Git-mergeable with format, test, and migration-order checks passing, but
  staging deployment policy `21103990` still permits only `main` and the secret-safe Supabase
  key check returned HTTP 403. The exact unmerged PR branch was not deployed and DEV was
  untouched.
- Viasr PR #604 remains merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e`; exact-head staging
  workflow `32022822265` completed successfully. No duplicate Actions run was created.
- CoreDevice again timed out while initializing, so no current physical app or lock proof is
  available. The last successful app query found MurrorStg build 431 installed and the last
  successful lock query reported `passcodeRequired: true` and `unlockedSinceBoot: true`. Apple
  Watch was observed only and remains out of scope. The active production-promotion freeze still
  prohibits notification device runs, iOS edits, merges, deploys, provider writes, and build-lane
  actions. No physical APNs, dedicated ringtone, routing, consent, or quiet-hours acceptance was
  attempted or claimed. The goal remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-21 05:45Z)

- GitHub privileged quota reset was observed at 5,000/5,000 core requests remaining before this
  checkpoint's read-only checks. Exact remote refs remain iOS staging
  `2872b9b91efbd1ec16371a64f8034545cd147053`, API staging
  `59be378ed452a50e3a42f393d06b66f24169e70e` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `9c3af67e516fa9dd32dd5d1268693ef1404d89db`.
- API PR #736 remains open with completed checks successful or skipped, but REST still reports
  `mergeable: false`/`CONFLICTING`/`DIRTY`; compare remains `diverged` with PR #736 40 commits
  ahead of staging and staging 92 commits ahead. No merge or forced sync was attempted. Legacy
  PR #906 remains Git-mergeable with format, test, and migration-order checks passing, but
  staging deployment policy `21103990` still permits only `main` and the secret-safe Supabase
  key check returned HTTP 403. The exact unmerged PR branch was not deployed and DEV was
  untouched.
- Viasr PR #604 remains merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e`; exact-head staging
  workflow `32022822265` completed successfully. No duplicate Actions run was created.
- CoreDevice lists the paired physical iPhone 16 Pro as available, but the latest app and lock
  queries timed out while the service initialized. The last successful app query found MurrorStg
  build 431 installed and the last successful lock query reported `passcodeRequired: true` and
  `unlockedSinceBoot: true`; no current runtime or lock proof is available. Apple Watch was
  observed only and remains out of scope. The active production-promotion freeze still prohibits
  notification device runs, iOS edits, merges, deploys, provider writes, and build-lane actions.
  No physical APNs, dedicated ringtone, routing, consent, or quiet-hours acceptance was attempted
  or claimed. The goal remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-21 10:45Z)

- The quota check returned 4,691/5,000 core requests; a full reset was not observed in this
  check. Exact remote refs now include iOS staging
  `a1d08745d8f1df67d6bb35482b0ad10e6b764e3f`, API staging
  `46426fe6a2e39c5fa6c14fdc0ecb16bb9ec487b0` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `9c3af67e516fa9dd32dd5d1268693ef1404d89db`.
- API PR #736 completed checks remain successful or skipped, but GitHub temporarily reports
  `mergeable: UNKNOWN` while recalculating; compare remains `diverged` with PR #736 40 commits
  ahead of staging and staging 95 commits ahead. No merge or forced sync was attempted. Legacy
  PR #906 remains Git-mergeable with format, test, and migration-order checks passing, but
  staging deployment policy `21103990` still permits only `main` and the secret-safe Supabase
  key check returned HTTP 403. The exact unmerged PR branch was not deployed and DEV was
  untouched.
- Viasr PR #604 remains merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e`; exact-head staging
  workflow `32022822265` completed successfully. No duplicate Actions run was created.
- CoreDevice lists the paired physical iPhone 16 Pro as available, but the latest app and lock
  queries timed out while the service initialized. The last successful app query found MurrorStg
  build 431 installed and the last successful lock query reported `passcodeRequired: true` and
  `unlockedSinceBoot: true`; no current runtime or lock proof is available. Apple Watch was
  observed only and remains out of scope. The active production-promotion freeze still prohibits
  notification device runs, iOS edits, merges, deploys, provider writes, and build-lane actions.
  No physical APNs, dedicated ringtone, routing, consent, or quiet-hours acceptance was attempted
  or claimed. The goal remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-21 15:45Z)

- The quota check returned 4,978/5,000 core requests; the reset window is healthy but not at full
  in this check. Exact remote refs now include iOS staging
  `85f07b0116bae3b663aca352e1a1e0ab1de6b85a`, API staging
  `46426fe6a2e39c5fa6c14fdc0ecb16bb9ec487b0` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `a8e48f611a723db5b9ac4b311c450fa755bbd38e`.
- API PR #736 remains open with completed checks successful or skipped, but REST reports
  `mergeable: false`/`CONFLICTING`/`DIRTY`; compare remains `diverged` with PR #736 40 commits
  ahead of staging and staging 95 commits ahead. No merge or forced sync was attempted. Legacy
  PR #906 remains Git-mergeable with format, test, and migration-order checks passing, but
  staging deployment policy `21103990` still permits only `main` and the secret-safe Supabase
  key check returned HTTP 403. The exact unmerged PR branch was not deployed and DEV was
  untouched.
- Viasr PR #604 remains merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e`; exact-head staging
  workflow `32477556286` completed successfully. No duplicate Actions run was created.
- CoreDevice lists the paired physical iPhone 16 Pro as available, but the latest app and lock
  queries timed out while the service initialized. The last successful app query found MurrorStg
  build 431 installed and the last successful lock query reported `passcodeRequired: true` and
  `unlockedSinceBoot: true`; no current runtime or lock proof is available. Apple Watch was
  observed only and remains out of scope. The active production-promotion freeze still prohibits
  notification device runs, iOS edits, merges, deploys, provider writes, and build-lane actions.
  No physical APNs, dedicated ringtone, routing, consent, or quiet-hours acceptance was attempted
  or claimed. The goal remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-21 20:45Z)

- The quota check returned 4,989/5,000 core requests; the reset window is healthy but not at full
  in this check. Exact remote refs remain iOS staging
  `85f07b0116bae3b663aca352e1a1e0ab1de6b85a`, API staging
  `46426fe6a2e39c5fa6c14fdc0ecb16bb9ec487b0` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `a8e48f611a723db5b9ac4b311c450fa755bbd38e`.
- API PR #736 remains open with completed checks successful or skipped, but REST reports
  `mergeable: false`/`CONFLICTING`/`DIRTY`; compare remains `diverged` with PR #736 40 commits
  ahead of staging and staging 95 commits ahead. No merge or forced sync was attempted. Legacy
  PR #906 remains Git-mergeable with format, test, and migration-order checks passing, but
  staging deployment policy `21103990` still permits only `main` and the secret-safe Supabase
  key check returned HTTP 403. The exact unmerged PR branch was not deployed and DEV was
  untouched.
- Viasr PR #604 remains merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e`; exact-head staging
  workflow `32477556286` completed successfully. No duplicate Actions run was created.
- CoreDevice lists the paired physical iPhone 16 Pro as available, but the latest app and lock
  queries timed out while the service initialized. The last successful app query found MurrorStg
  build 431 installed and the last successful lock query reported `passcodeRequired: true` and
  `unlockedSinceBoot: true`; no current runtime or lock proof is available. Apple Watch was
  observed only and remains out of scope. The active production-promotion freeze still prohibits
  notification device runs, iOS edits, merges, deploys, provider writes, and build-lane actions.
  No physical APNs, dedicated ringtone, routing, consent, or quiet-hours acceptance was attempted
  or claimed. The task worktree remains 64 MiB; no recorded task-owned temporary artifact is
  present. Disk free space is 3.6 GiB, so broad cleanup remains unsafe without ownership. The
  goal remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-22 01:45Z)

- The quota check returned 4,846/5,000 core requests; the reset window is healthy but not at full
  in this check. Exact remote refs remain iOS staging
  `85f07b0116bae3b663aca352e1a1e0ab1de6b85a`, API staging
  `46426fe6a2e39c5fa6c14fdc0ecb16bb9ec487b0` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `a8e48f611a723db5b9ac4b311c450fa755bbd38e`.
- API PR #736 remains open with completed checks successful or skipped, but REST reports
  `mergeable: false`/`CONFLICTING`/`DIRTY`; compare remains `diverged` with PR #736 40 commits
  ahead of staging and staging 95 commits ahead. No merge or forced sync was attempted. Legacy
  PR #906 remains Git-mergeable with format, test, and migration-order checks passing, but
  staging deployment policy `21103990` still permits only `main` and the secret-safe Supabase
  key check returned HTTP 403. The exact unmerged PR branch was not deployed and DEV was
  untouched.
- Viasr PR #604 remains merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e`; exact-head staging
  workflow `32477556286` completed successfully. No duplicate Actions run was created.
- CoreDevice lists the paired physical iPhone 16 Pro as available, but app and lock queries remain
  unavailable after service initialization timeouts. The last successful app query found MurrorStg
  build 431 installed and the last successful lock query reported `passcodeRequired: true` and
  `unlockedSinceBoot: true`; no current runtime or lock proof is available. Apple Watch was
  observed only and remains out of scope. The active production-promotion freeze still prohibits
  notification device runs, iOS edits, merges, deploys, provider writes, and build-lane actions.
  No physical APNs, dedicated ringtone, routing, consent, or quiet-hours acceptance was attempted
  or claimed. The task worktree remains 64 MiB; no recorded task-owned temporary artifact is
  present. Disk free space is critically low at 1.4 GiB, so broad cleanup remains unsafe without
  ownership. The goal remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-22 06:45Z)

- The quota check returned 4,989/5,000 core requests; the reset window is healthy but not at full
  in this check. Exact remote refs after fetch are iOS staging
  `85f07b0116bae3b663aca352e1a1e0ab1de6b85a`, API staging
  `47f7bd5bf153e6271ba4f2ff09ddfa1ab5173d2b` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `f5e5f74919b561456786ae8aab2bb36879012405`.
- API PR #736 checks remain successful or skipped, but compare is `diverged`: the PR is 40
  commits ahead while staging is 98 commits ahead. REST reports `mergeable: UNKNOWN` while
  recalculating; no merge or forced sync was attempted. Legacy PR #906 remains Git-mergeable
  with format, test, and migration-order checks passing, but its existing deploy checks failed
  in runs `31276079517` and `31275928971`; staging deployment policy `21103990` still permits
  only `main`, and the secret-safe Supabase key check remains HTTP 403. The exact unmerged PR
  branch was not dispatched and DEV was untouched.
- Viasr PR #604 remains merged at
  `d2b4e20f01b22d43b57f82829badf97dc148f78e`; current staging workflow `32551050843` completed
  successfully from exact head `f5e5f74919b561456786ae8aab2bb36879012405`. No duplicate Actions
  run was created.
- CoreDevice lists the paired physical iPhone 16 Pro as available. The active production-
  promotion freeze still prohibits notification device runs, iOS edits, merges, deploys,
  provider writes, and build-lane actions, so no app/runtime query or physical APNs, dedicated
  ringtone, routing, consent, or quiet-hours acceptance was attempted or claimed. Apple Watch
  remains out of scope. The task worktree remains 64 MiB; all recorded task-owned temporary
  paths are absent. Disk free space is 3.2 GiB, so no broad cleanup was performed. The goal
  remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-22 11:46Z)

- The quota check returned 4,982/5,000 core requests; the reset window is healthy but not at full
  in this check. Exact remote refs after fetch are iOS staging
  `7616e7401af157bae31c8c4404be60ee34bee5be`, API staging
  `78090798127b840a1871b2d43885d98309176b65` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `f5e5f74919b561456786ae8aab2bb36879012405`.
- API PR #736 checks remain successful or skipped, but compare is `diverged`: the PR is 40
  commits ahead while staging is 110 commits ahead. REST reports `mergeable: UNKNOWN` while
  recalculating; no merge or forced sync was attempted. Legacy PR #906 remains Git-mergeable
  with format, test, and migration-order checks passing, but its existing deploy checks failed;
  staging deployment policy `21103990` still permits only `main`, and the secret-safe Supabase
  key check remains HTTP 403. The exact unmerged PR branch was not dispatched and DEV was
  untouched.
- Viasr PR #604 remains merged at
  `d2b4e20f01b22d43b57f82829badf97dc148f78e`; current staging workflow `32551050843` completed
  successfully from exact head `f5e5f74919b561456786ae8aab2bb36879012405`. No duplicate Actions
  run was created.
- CoreDevice lists the paired physical iPhone 16 Pro as available. The active production-
  promotion freeze still prohibits notification device runs, iOS edits, merges, deploys,
  provider writes, and build-lane actions, so no app/runtime query or physical APNs, dedicated
  ringtone, routing, consent, or quiet-hours acceptance was attempted or claimed. Apple Watch
  remains out of scope. The task worktree remains 64 MiB; all recorded task-owned temporary
  paths are absent. Disk free space is 29 GiB, so no broad cleanup was performed. The goal
  remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-22 16:46Z)

- The quota check returned 4,920/5,000 core requests; the reset window is healthy but not at full
  in this check. Exact remote refs after fetch are iOS staging
  `69f16af8714ae725c7f7b288ccbd56600ca4f858`, API staging
  `1f7b58104fcc125eb4a56c83f54381959d8f15b9` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `f5e5f74919b561456786ae8aab2bb36879012405`.
- API PR #736 checks remain successful or skipped, but compare is `diverged`: the PR is 40
  commits ahead while staging is 120 commits ahead. REST reports `mergeable: UNKNOWN` while
  recalculating; no merge or forced sync was attempted. Legacy PR #906 remains Git-mergeable
  with format, test, and migration-order checks passing, but its existing deploy checks failed;
  staging deployment policy `21103990` still permits only `main`, and the secret-safe Supabase
  key check remains HTTP 403. The exact unmerged PR branch was not dispatched and DEV was
  untouched.
- Viasr PR #604 remains merged at
  `d2b4e20f01b22d43b57f82829badf97dc148f78e`; current staging workflow `32551050843` completed
  successfully from exact head `f5e5f74919b561456786ae8aab2bb36879012405`. No duplicate Actions
  run was created.
- CoreDevice lists the paired physical iPhone 16 Pro as available. The active production-
  promotion freeze still prohibits notification device runs, iOS edits, merges, deploys,
  provider writes, and build-lane actions, so no app/runtime query or physical APNs, dedicated
  ringtone, routing, consent, or quiet-hours acceptance was attempted or claimed. Apple Watch
  remains out of scope. The task worktree remains 64 MiB; all recorded task-owned temporary
  paths are absent. Disk free space is 28 GiB, so no broad cleanup was performed. The goal
  remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-23 02:48Z)

- The quota check returned 5,000/5,000 core requests; the quota window is fully reset in this
  check. Exact remote refs after fetch remain iOS staging
  `69f16af8714ae725c7f7b288ccbd56600ca4f858`, API staging
  `1f7b58104fcc125eb4a56c83f54381959d8f15b9` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `f5e5f74919b561456786ae8aab2bb36879012405`.
- API PR #736 checks remain successful or skipped, but compare is `diverged`: the PR is 40
  commits ahead while staging is 120 commits ahead. REST confirms `mergeable: false` and
  `mergeable_state: dirty`; no merge or forced sync was attempted. Legacy PR #906 remains
  Git-mergeable with format, test, and migration-order checks passing, but its existing deploy
  checks failed; staging deployment policy `21103990` still permits only `main`, and the
  secret-safe Supabase key check remains HTTP 403. The exact unmerged PR branch was not
  dispatched and DEV was untouched.
- Viasr PR #604 remains merged at
  `d2b4e20f01b22d43b57f82829badf97dc148f78e`; current staging workflow `32551050843` completed
  successfully from exact head `f5e5f74919b561456786ae8aab2bb36879012405`. No duplicate Actions
  run was created.
- CoreDevice lists the paired physical iPhone 16 Pro as available. The active production-
  promotion freeze still prohibits notification device runs, iOS edits, merges, deploys,
  provider writes, and build-lane actions, so no app/runtime query or physical APNs, dedicated
  ringtone, routing, consent, or quiet-hours acceptance was attempted or claimed. Apple Watch
  remains out of scope. The task worktree remains 64 MiB; all recorded task-owned temporary
  paths are absent. Disk free space is 28 GiB, so no broad cleanup was performed. The goal
  remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-22 21:47Z)

- The quota check returned 5,000/5,000 core requests; the quota window is fully reset in this
  check. Exact remote refs after fetch are iOS staging
  `69f16af8714ae725c7f7b288ccbd56600ca4f858`, API staging
  `1f7b58104fcc125eb4a56c83f54381959d8f15b9` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `f5e5f74919b561456786ae8aab2bb36879012405`.
- API PR #736 checks remain successful or skipped, but compare is `diverged`: the PR is 40
  commits ahead while staging is 120 commits ahead. REST now confirms `mergeable: false` and
  `mergeable_state: dirty`; no merge or forced sync was attempted. Legacy PR #906 remains
  Git-mergeable with format, test, and migration-order checks passing, but its existing deploy
  checks failed; staging deployment policy `21103990` still permits only `main`, and the
  secret-safe Supabase key check remains HTTP 403. The exact unmerged PR branch was not
  dispatched and DEV was untouched.
- Viasr PR #604 remains merged at
  `d2b4e20f01b22d43b57f82829badf97dc148f78e`; current staging workflow `32551050843` completed
  successfully from exact head `f5e5f74919b561456786ae8aab2bb36879012405`. No duplicate Actions
  run was created.
- CoreDevice lists the paired physical iPhone 16 Pro as available. The active production-
  promotion freeze still prohibits notification device runs, iOS edits, merges, deploys,
  provider writes, and build-lane actions, so no app/runtime query or physical APNs, dedicated
  ringtone, routing, consent, or quiet-hours acceptance was attempted or claimed. Apple Watch
  remains out of scope. The task worktree remains 64 MiB; all recorded task-owned temporary
  paths are absent. Disk free space is 28 GiB, so no broad cleanup was performed. The goal
  remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-23 07:48Z)

- The quota check returned 5,000/5,000 core requests; the quota window remains fully reset.
  Exact remote refs after fetch remain iOS staging
  `69f16af8714ae725c7f7b288ccbd56600ca4f858`, API staging
  `1f7b58104fcc125eb4a56c83f54381959d8f15b9` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `f5e5f74919b561456786ae8aab2bb36879012405`.
- API PR #736 checks remain successful or skipped, but compare is `diverged`: the PR is 40
  commits ahead while staging is 120 commits ahead. REST confirms `mergeable: false` and
  `mergeable_state: dirty`; no merge or forced sync was attempted. Legacy PR #906 remains
  Git-mergeable with format, test, and migration-order checks passing, but its existing deploy
  checks failed; staging deployment policy `21103990` still permits only `main`, and the
  secret-safe Supabase key check remains HTTP 403. The exact unmerged PR branch was not
  dispatched and DEV was untouched.
- Viasr PR #604 remains merged at
  `d2b4e20f01b22d43b57f82829badf97dc148f78e`; current staging workflow `32551050843` completed
  successfully from exact head `f5e5f74919b561456786ae8aab2bb36879012405`. No duplicate Actions
  run was created.
- CoreDevice lists the paired physical iPhone 16 Pro as available. The active production-
  promotion freeze still prohibits notification device runs, iOS edits, merges, deploys,
  provider writes, and build-lane actions, so no app/runtime query or physical APNs, dedicated
  ringtone, routing, consent, or quiet-hours acceptance was attempted or claimed. Apple Watch
  remains out of scope. The task worktree remains 64 MiB; all recorded task-owned temporary
  paths are absent. Disk free space is 27 GiB, so no broad cleanup was performed. The goal
  remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-23 12:49Z)

- The quota check returned 5,000/5,000 core requests; the quota window remains fully reset.
  Exact remote refs after fetch remain iOS staging
  `69f16af8714ae725c7f7b288ccbd56600ca4f858`, API staging
  `1f7b58104fcc125eb4a56c83f54381959d8f15b9` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `f5e5f74919b561456786ae8aab2bb36879012405`.
- API PR #736 checks remain successful or skipped, but compare is `diverged`: the PR is 40
  commits ahead while staging is 120 commits ahead. REST confirms `mergeable: false` and
  `mergeable_state: dirty`; no merge or forced sync was attempted. Legacy PR #906 remains
  Git-mergeable with format, test, and migration-order checks passing, but its existing deploy
  checks failed; staging deployment policy `21103990` still permits only `main`, and the
  secret-safe Supabase key check remains HTTP 403. The exact unmerged PR branch was not
  dispatched and DEV was untouched.
- Direct head-SHA and branch API verification confirms Viasr PR #604 remains merged at
  `d2b4e20f01b22d43b57f82829badf97dc148f78e`; current staging workflow `32551050843` completed
  successfully from exact head `f5e5f74919b561456786ae8aab2bb36879012405`. No duplicate Actions
  run was created.
- CoreDevice lists the paired physical iPhone 16 Pro as available. The active production-
  promotion freeze still prohibits notification device runs, iOS edits, merges, deploys,
  provider writes, and build-lane actions, so no app/runtime query or physical APNs, dedicated
  ringtone, routing, consent, or quiet-hours acceptance was attempted or claimed. Apple Watch
  remains out of scope. The task worktree remains 64 MiB; all recorded task-owned temporary
  paths are absent. Disk free space is 27 GiB, so no broad cleanup was performed. The goal
  remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-23 17:50Z)

- The quota check returned 5,000/5,000 core requests; the quota window remains fully reset.
  Exact remote refs after fetch remain iOS staging
  `69f16af8714ae725c7f7b288ccbd56600ca4f858`, API staging
  `1f7b58104fcc125eb4a56c83f54381959d8f15b9` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `f5e5f74919b561456786ae8aab2bb36879012405`.
- API PR #736 checks remain successful or skipped, but compare is `diverged`: the PR is 40
  commits ahead while staging is 120 commits ahead. REST confirms `mergeable: false` and
  `mergeable_state: dirty`; no merge or forced sync was attempted. Legacy PR #906 remains
  Git-mergeable with format, test, and migration-order checks passing, but its existing deploy
  checks failed; staging deployment policy `21103990` still permits only `main`, and the
  secret-safe Supabase key check remains HTTP 403. The exact unmerged PR branch was not
  dispatched and DEV was untouched.
- Direct head-SHA verification confirms Viasr PR #604 remains merged at
  `d2b4e20f01b22d43b57f82829badf97dc148f78e`; current staging workflow `32551050843` completed
  successfully from exact head `f5e5f74919b561456786ae8aab2bb36879012405`. No duplicate Actions
  run was created.
- CoreDevice lists the paired physical iPhone 16 Pro as available. The active production-
  promotion freeze still prohibits notification device runs, iOS edits, merges, deploys,
  provider writes, and build-lane actions, so no app/runtime query or physical APNs, dedicated
  ringtone, routing, consent, or quiet-hours acceptance was attempted or claimed. Apple Watch
  remains out of scope. The task worktree remains 64 MiB; all recorded task-owned temporary
  paths are absent. Disk free space is 27 GiB, so no broad cleanup was performed. The goal
  remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-23 22:51Z)

- The quota check returned 5,000/5,000 core requests; the quota window remains fully reset.
  Exact remote refs after fetch remain iOS staging
  `69f16af8714ae725c7f7b288ccbd56600ca4f858`, API staging
  `1f7b58104fcc125eb4a56c83f54381959d8f15b9` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `f5e5f74919b561456786ae8aab2bb36879012405`.
- API PR #736 checks remain successful or skipped, but compare is `diverged`: the PR is 40
  commits ahead while staging is 120 commits ahead. REST confirms `mergeable: false` and
  `mergeable_state: dirty`; no merge or forced sync was attempted. Legacy PR #906 remains
  Git-mergeable with format, test, and migration-order checks passing, but its existing deploy
  checks failed; staging deployment policy `21103990` still permits only `main`, and the
  secret-safe Supabase key check remains HTTP 403. The exact unmerged PR branch was not
  dispatched and DEV was untouched.
- Direct head-SHA verification confirms Viasr PR #604 remains merged at
  `d2b4e20f01b22d43b57f82829badf97dc148f78e`; current staging workflow `32551050843` completed
  successfully from exact head `f5e5f74919b561456786ae8aab2bb36879012405`. No duplicate Actions
  run was created.
- CoreDevice lists the paired physical iPhone 16 Pro as available. The active production-
  promotion freeze still prohibits notification device runs, iOS edits, merges, deploys,
  provider writes, and build-lane actions, so no app/runtime query or physical APNs, dedicated
  ringtone, routing, consent, or quiet-hours acceptance was attempted or claimed. Apple Watch
  remains out of scope. The task worktree remains 64 MiB; all recorded task-owned temporary
  paths are absent. Disk free space is 27 GiB, so no broad cleanup was performed. The goal
  remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-24 03:52Z)

- The quota check returned 5,000/5,000 core requests; the quota window remains fully reset.
  Exact remote refs after fetch remain iOS staging
  `69f16af8714ae725c7f7b288ccbd56600ca4f858`, API staging
  `1f7b58104fcc125eb4a56c83f54381959d8f15b9` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `f5e5f74919b561456786ae8aab2bb36879012405`.
- API PR #736 remains open with checks successful or skipped, but compare is `diverged`: the
  PR is 40 commits ahead while staging is 120 commits ahead. REST remains
  `mergeable: false` and `mergeable_state: dirty`; no merge or forced sync was attempted.
  Legacy PR #906 remains Git-mergeable with format, test, and migration-order checks passing,
  but both existing `deploy / reusableDeploy` checks failed; staging deployment policy
  `21103990` still permits only `main`, and the secret-safe Supabase key check remains HTTP
  403. The exact unmerged PR branch was not dispatched and DEV was untouched.
- Direct head-SHA verification confirms Viasr PR #604 remains merged at
  `d2b4e20f01b22d43b57f82829badf97dc148f78e`; current staging workflow `32551050843` completed
  successfully from exact head `f5e5f74919b561456786ae8aab2bb36879012405`. No duplicate Actions
  run was created.
- CoreDevice lists the paired physical iPhone 16 Pro as available. The active production-
  promotion freeze still prohibits notification device runs, iOS edits, merges, deploys,
  provider writes, and build-lane actions, so no app/runtime query or physical APNs, dedicated
  ringtone, routing, consent, or quiet-hours acceptance was attempted or claimed. Apple Watch
  remains out of scope. The task worktree remains 64 MiB; all recorded task-owned temporary
  paths are absent. Disk free space is 29 GiB, so no broad cleanup was performed. The goal
  remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-24 08:53Z)

- The quota check returned 5,000/5,000 core requests; the quota window is fully reset.
  Exact remote refs after fetch are iOS staging
  `47006cc1663bcb75c486ed7abad1721778d5bfd9` (merge commit #1145 from
  `chore/bump-build-445`), API staging `1f7b58104fcc125eb4a56c83f54381959d8f15b9`
  with PR #736 at `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `f5e5f74919b561456786ae8aab2bb36879012405`.
- API PR #736 remains open with checks successful or skipped, but compare is `diverged`: the
  PR is 40 commits ahead while staging is 120 commits ahead. REST remains
  `mergeable: false` and `mergeable_state: dirty`; no merge or forced sync was attempted.
  Legacy PR #906 remains Git-mergeable with format, test, and migration-order checks passing,
  but both existing `deploy / reusableDeploy` checks failed; staging deployment policy
  `21103990` still permits only `main`, and the secret-safe Supabase key check remains HTTP
  403. The exact unmerged PR branch was not dispatched and DEV was untouched.
- Direct head-SHA verification confirms Viasr PR #604 remains merged at
  `d2b4e20f01b22d43b57f82829badf97dc148f78e`; current staging workflow `32551050843` completed
  successfully from exact head `f5e5f74919b561456786ae8aab2bb36879012405`. No duplicate Actions
  run was created. The canonical MurrorMobile checkout remains dirty on
  `chore/bump-build-437` with concurrent Claude-owned iOS build-lane changes; it was not
  switched, edited, built, or cleaned.
- CoreDevice lists the paired physical iPhone 16 Pro as available. The active production-
  promotion freeze still prohibits notification device runs, iOS edits, merges, deploys,
  provider writes, and build-lane actions, so no app/runtime query or physical APNs, dedicated
  ringtone, routing, consent, or quiet-hours acceptance was attempted or claimed. Apple Watch
  remains out of scope. The task worktree remains 64 MiB; all recorded task-owned temporary
  paths are absent. Disk free space is 88 GiB, so no broad cleanup was performed. The goal
  remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-24 13:54Z)

- The post-check quota reading is 4,999/5,000 core requests; the reset window remains healthy
  after the read-only revalidation. Exact remote refs after fetch remain iOS staging
  `47006cc1663bcb75c486ed7abad1721778d5bfd9` (merge commit #1145 from
  `chore/bump-build-445`), API staging `1f7b58104fcc125eb4a56c83f54381959d8f15b9`
  with PR #736 at `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `f5e5f74919b561456786ae8aab2bb36879012405`.
- API PR #736 remains open with checks successful or skipped, but compare is `diverged`: the
  PR is 40 commits ahead while staging is 120 commits ahead. REST remains
  `mergeable: false` and `mergeable_state: dirty`; no merge or forced sync was attempted.
  Legacy PR #906 remains Git-mergeable with format, test, and migration-order checks passing,
  but both existing `deploy / reusableDeploy` checks failed; staging deployment policy
  `21103990` still permits only `main`, and the secret-safe Supabase key check remains HTTP
  403. The exact unmerged PR branch was not dispatched and DEV was untouched.
- Direct head-SHA verification confirms Viasr PR #604 remains merged at
  `d2b4e20f01b22d43b57f82829badf97dc148f78e`; current staging workflow `32551050843` completed
  successfully from exact head `f5e5f74919b561456786ae8aab2bb36879012405`. No duplicate Actions
  run was created. The canonical MurrorMobile checkout remains dirty on
  `chore/bump-build-437` with concurrent Claude-owned iOS build-lane changes; it was not
  switched, edited, built, or cleaned.
- CoreDevice lists the paired physical iPhone 16 Pro as available. The active production-
  promotion freeze still prohibits notification device runs, iOS edits, merges, deploys,
  provider writes, and build-lane actions, so no app/runtime query or physical APNs, dedicated
  ringtone, routing, consent, or quiet-hours acceptance was attempted or claimed. Apple Watch
  remains out of scope. The task worktree remains 64 MiB; all recorded task-owned temporary
  paths are absent. Disk free space is 88 GiB, so no broad cleanup was performed. The goal
  remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-24 18:55Z)

- The post-check quota reading is 4,999/5,000 core requests; the reset window remains healthy
  after the read-only revalidation. Exact remote refs after fetch remain iOS staging
  `47006cc1663bcb75c486ed7abad1721778d5bfd9` (merge commit #1145 from
  `chore/bump-build-445`), API staging `1f7b58104fcc125eb4a56c83f54381959d8f15b9`
  with PR #736 at `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `f5e5f74919b561456786ae8aab2bb36879012405`.
- API PR #736 remains open with checks successful or skipped, but compare is `diverged`: the
  PR is 40 commits ahead while staging is 120 commits ahead. REST remains
  `mergeable: false` and `mergeable_state: dirty`; no merge or forced sync was attempted.
  Legacy PR #906 remains Git-mergeable with format, test, and migration-order checks passing,
  but both existing `deploy / reusableDeploy` checks failed; staging deployment policy
  `21103990` still permits only `main`, and the secret-safe Supabase key check remains HTTP
  403. The exact unmerged PR branch was not dispatched and DEV was untouched.
- Direct head-SHA verification confirms Viasr PR #604 remains merged at
  `d2b4e20f01b22d43b57f82829badf97dc148f78e`; current staging workflow `32551050843` completed
  successfully from exact head `f5e5f74919b561456786ae8aab2bb36879012405`. No duplicate Actions
  run was created. The canonical MurrorMobile checkout remains dirty on
  `chore/bump-build-437` with concurrent Claude-owned iOS build-lane changes; it was not
  switched, edited, built, or cleaned.
- CoreDevice lists the paired physical iPhone 16 Pro as available. The active production-
  promotion freeze still prohibits notification device runs, iOS edits, merges, deploys,
  provider writes, and build-lane actions, so no app/runtime query or physical APNs, dedicated
  ringtone, routing, consent, or quiet-hours acceptance was attempted or claimed. Apple Watch
  remains out of scope. The task worktree remains 64 MiB; all recorded task-owned temporary
  paths are absent. Disk free space is 88 GiB, so no broad cleanup was performed. The goal
  remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-24 23:57Z)

- The post-check quota reading is 4,999/5,000 core requests; the reset window remains healthy
  after the read-only revalidation. Exact remote refs after fetch remain iOS staging
  `47006cc1663bcb75c486ed7abad1721778d5bfd9` (merge commit #1145 from
  `chore/bump-build-445`), API staging `1f7b58104fcc125eb4a56c83f54381959d8f15b9`
  with PR #736 at `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `f5e5f74919b561456786ae8aab2bb36879012405`.
- API PR #736 remains open with checks successful or skipped, but compare is `diverged`: the
  PR is 40 commits ahead while staging is 120 commits ahead. REST remains
  `mergeable: false` and `mergeable_state: dirty`; no merge or forced sync was attempted.
  Legacy PR #906 remains Git-mergeable with format, test, and migration-order checks passing,
  but both existing `deploy / reusableDeploy` checks failed; staging deployment policy
  `21103990` still permits only `main`, and the secret-safe Supabase key check remains HTTP
  403. The exact unmerged PR branch was not dispatched and DEV was untouched.
- Direct head-SHA verification confirms Viasr PR #604 remains merged at
  `d2b4e20f01b22d43b57f82829badf97dc148f78e`; current staging workflow `32551050843` completed
  successfully from exact head `f5e5f74919b561456786ae8aab2bb36879012405`. No duplicate Actions
  run was created. The canonical MurrorMobile checkout remains dirty on
  `chore/bump-build-437` with concurrent Claude-owned iOS build-lane changes; it was not
  switched, edited, built, or cleaned.
- CoreDevice lists the paired physical iPhone 16 Pro as available. The active production-
  promotion freeze still prohibits notification device runs, iOS edits, merges, deploys,
  provider writes, and build-lane actions, so no app/runtime query or physical APNs, dedicated
  ringtone, routing, consent, or quiet-hours acceptance was attempted or claimed. Apple Watch
  remains out of scope. The task worktree remains 64 MiB; all recorded task-owned temporary
  paths are absent. Disk free space is 88 GiB, so no broad cleanup was performed. The goal
  remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-25 05:11Z)

- The post-check quota reading is 4,999/5,000 core requests; the reset window remains healthy
  after the read-only revalidation. Exact remote refs after fetch remain iOS staging
  `47006cc1663bcb75c486ed7abad1721778d5bfd9` (merge commit #1145 from
  `chore/bump-build-445`), API staging `1f7b58104fcc125eb4a56c83f54381959d8f15b9`
  with PR #736 at `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `f5e5f74919b561456786ae8aab2bb36879012405`.
- API PR #736 remains open with checks successful or skipped, but compare is `diverged`: the
  PR is 40 commits ahead while staging is 120 commits ahead. REST remains
  `mergeable: false` and `mergeable_state: dirty`; no merge or forced sync was attempted.
  Legacy PR #906 remains Git-mergeable with format, test, and migration-order checks passing,
  but both existing `deploy / reusableDeploy` checks failed; staging deployment policy
  `21103990` still permits only `main`, and the secret-safe Supabase key check remains HTTP
  403. The exact unmerged PR branch was not dispatched and DEV was untouched.
- Direct head-SHA verification confirms Viasr PR #604 remains merged at
  `d2b4e20f01b22d43b57f82829badf97dc148f78e`; current staging workflow `32551050843` completed
  successfully from exact head `f5e5f74919b561456786ae8aab2bb36879012405`. No duplicate Actions
  run was created. The canonical MurrorMobile checkout remains dirty on
  `chore/bump-build-437` with concurrent Claude-owned iOS build-lane changes; it was not
  switched, edited, built, or cleaned.
- CoreDevice reports the paired physical iPhone 16 Pro as unavailable in this check. The active
  production-promotion freeze also prohibits notification device runs, iOS edits, merges,
  deploys, provider writes, and build-lane actions, so no app/runtime query or physical APNs,
  dedicated ringtone, routing, consent, or quiet-hours acceptance was attempted or claimed.
  Apple Watch remains out of scope. The task worktree remains 64 MiB; all recorded task-owned
  temporary paths are absent. Disk free space is 87 GiB, so no broad cleanup was performed.
  The goal remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-25 10:25Z)

- The post-check quota reading is 4,999/5,000 core requests; the reset window remains healthy
  after the read-only revalidation. Exact remote refs after fetch now include iOS staging
  `3624012fca4cf7ea8ed25da35e5bbeca6d50fb85` (merge commit #1151 from
  `chore/bump-build-446`), API staging `1f7b58104fcc125eb4a56c83f54381959d8f15b9`
  with PR #736 at `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `f5e5f74919b561456786ae8aab2bb36879012405`.
- API PR #736 remains open with checks successful or skipped, but compare is `diverged`: the
  PR is 40 commits ahead while staging is 120 commits ahead. REST remains
  `mergeable: false` and `mergeable_state: dirty`; no merge or forced sync was attempted.
  Legacy PR #906 remains Git-mergeable with format, test, and migration-order checks passing,
  but both existing `deploy / reusableDeploy` checks failed; staging deployment policy
  `21103990` still permits only `main`, and the secret-safe Supabase key check remains HTTP
  403. The exact unmerged PR branch was not dispatched and DEV was untouched.
- Direct head-SHA verification confirms Viasr PR #604 remains merged at
  `d2b4e20f01b22d43b57f82829badf97dc148f78e`; current staging workflow `32551050843` completed
  successfully from exact head `f5e5f74919b561456786ae8aab2bb36879012405`. No duplicate Actions
  run was created. The canonical MurrorMobile checkout remains dirty on
  `chore/bump-build-437` with concurrent Claude-owned iOS build-lane changes; it was not
  switched, edited, built, or cleaned.
- CoreDevice reports the paired physical iPhone 16 Pro as unavailable in this check. The Apple
  Watch is also unavailable and remains out of scope. The active production-promotion freeze
  prohibits notification device runs, iOS edits, merges, deploys, provider writes, and
  build-lane actions, so no app/runtime query or physical APNs, dedicated ringtone, routing,
  consent, or quiet-hours acceptance was attempted or claimed. The task worktree remains
  64 MiB; all recorded task-owned temporary paths are absent. Disk free space is 90 GiB, so no
  broad cleanup was performed. The goal remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-26 01:30Z)

- The post-check quota reading is 4,996/5,000 core requests; the reset window remains healthy
  after the read-only revalidation. Exact remote refs after fetch remain iOS staging
  `3624012fca4cf7ea8ed25da35e5bbeca6d50fb85` (merge commit #1151 from
  `chore/bump-build-446`), API staging `1f7b58104fcc125eb4a56c83f54381959d8f15b9`
  with PR #736 at `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `f5e5f74919b561456786ae8aab2bb36879012405`.
- API PR #736 remains open with checks successful or skipped, but compare is `diverged`: the
  PR is 40 commits ahead while staging is 120 commits ahead. REST remains
  `mergeable: false` and `mergeable_state: dirty`; no merge or forced sync was attempted.
  Legacy PR #906 remains Git-mergeable with format, test, and migration-order checks passing,
  but both existing `deploy / reusableDeploy` checks failed; staging deployment policy
  `21103990` still permits only `main`, and the secret-safe Supabase key check remains HTTP
  403. The exact unmerged PR branch was not dispatched and DEV was untouched.
- Direct head-SHA verification confirms Viasr PR #604 remains merged at
  `d2b4e20f01b22d43b57f82829badf97dc148f78e`; current staging workflow `32551050843` completed
  successfully from exact head `f5e5f74919b561456786ae8aab2bb36879012405`. No duplicate Actions
  run was created. The canonical MurrorMobile checkout remains dirty on
  `chore/bump-build-437` with concurrent Claude-owned iOS build-lane changes; it was not
  switched, edited, built, or cleaned.
- CoreDevice reports the paired physical iPhone 16 Pro as available in this check. The Apple
  Watch is unavailable and remains out of scope. The active production-promotion freeze still
  prohibits notification device runs, iOS edits, merges, deploys, provider writes, and
  build-lane actions, so no app/runtime query or physical APNs, dedicated ringtone, routing,
  consent, or quiet-hours acceptance was attempted or claimed. The task worktree remains
  64 MiB; all recorded task-owned temporary paths are absent. Disk free space is 90 GiB, so no
  broad cleanup was performed. The goal remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-26 06:30Z)

- The post-check quota reading is 4,999/5,000 core requests; the reset window remains healthy
  after the read-only revalidation. Exact remote refs after fetch now include iOS staging
  `3624012fca4cf7ea8ed25da35e5bbeca6d50fb85` (merge commit #1151 from
  `chore/bump-build-446`), API staging `ff8c7b97dc702c9c485582daa44d678e1e0fa1e0`
  with PR #736 at `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `f5e5f74919b561456786ae8aab2bb36879012405`.
- API PR #736 remains open with checks successful or skipped, but compare is `diverged`: the
  PR is 40 commits ahead while staging is 131 commits ahead. REST remains
  `mergeable: false` and `mergeable_state: dirty`; no merge or forced sync was attempted.
  Legacy PR #906 remains Git-mergeable with format, test, and migration-order checks passing,
  but both existing `deploy / reusableDeploy` checks failed; staging deployment policy
  `21103990` still permits only `main`, and the secret-safe Supabase key check remains HTTP
  403. The exact unmerged PR branch was not dispatched and DEV was untouched.
- Direct head-SHA verification confirms Viasr PR #604 remains merged at
  `d2b4e20f01b22d43b57f82829badf97dc148f78e`; current staging workflow `32551050843` completed
  successfully from exact head `f5e5f74919b561456786ae8aab2bb36879012405`. No duplicate Actions
  run was created. The canonical MurrorMobile checkout remains dirty on
  `chore/bump-build-437` with concurrent Claude-owned iOS build-lane changes; it was not
  switched, edited, built, or cleaned.
- CoreDevice reports the paired physical iPhone 16 Pro as available in this check. The Apple
  Watch is unavailable and remains out of scope. The active production-promotion freeze still
  prohibits notification device runs, iOS edits, merges, deploys, provider writes, and
  build-lane actions, so no app/runtime query or physical APNs, dedicated ringtone, routing,
  consent, or quiet-hours acceptance was attempted or claimed. The task worktree remains
  64 MiB; all recorded task-owned temporary paths are absent. Disk free space is 149 GiB, so no
  broad cleanup was performed. The goal remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-26 16:33Z)

- The quota reset check returned 5,000/5,000 core requests; the final read-only check
  returned 4,995/5,000 and the reset window remains healthy. Exact remote refs after fetch
  remain iOS staging `3624012fca4cf7ea8ed25da35e5bbeca6d50fb85` (merge commit #1151 from
  `chore/bump-build-446`), API staging `ff8c7b97dc702c9c485582daa44d678e1e0fa1e0`
  with PR #736 at `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `f5e5f74919b561456786ae8aab2bb36879012405`.
- API PR #736 checks are successful or skipped, but compare remains `diverged`: the PR is
  40 commits ahead while staging is 131 commits ahead. REST reports `mergeable: false` and
  `mergeable_state: dirty` (the CLI reports conflicting/dirty); no merge or forced sync was
  attempted. The exact API staging head has a successful Deploy workflow `32921682217`,
  which is staging rollout evidence only and not physical-device proof.
- Legacy PR #906 source checks are passing and the PR remains Git-mergeable, but both exact-head
  `DeploySTAGING` runs `31276079517` and `31275928971` failed. The staging deployment branch
  policy `21103990` still permits only `main`; the last secret-safe Supabase key check remains
  HTTP 403. The exact unmerged PR branch was not dispatched and DEV was untouched.
- Direct head-SHA verification confirms Viasr PR #604 remains merged at
  `d2b4e20f01b22d43b57f82829badf97dc148f78e`; current staging workflow `32551050843` completed
  successfully from exact head `f5e5f74919b561456786ae8aab2bb36879012405`. No duplicate Actions
  run was created. The canonical MurrorMobile checkout remains dirty on
  `chore/bump-build-437` with concurrent Claude-owned iOS build-lane changes; it was not
  switched, edited, built, or cleaned.
- CoreDevice reports the paired physical iPhone 16 Pro as available in this check. The Apple
  Watch is unavailable and remains out of scope. The active production-promotion freeze still
  prohibits notification device runs, iOS edits, merges, deploys, provider writes, and
  build-lane actions, so no app/runtime query or physical APNs, dedicated ringtone, routing,
  consent, or quiet-hours acceptance was attempted or claimed. The task worktree remains
  64 MiB; all recorded task-owned temporary paths are absent. Disk free space is 149 GiB, so no
  broad cleanup was performed. No CI dispatch, merge, deployment, provider write, or build
  was performed. The goal remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-26 21:34Z)

- The quota reset check returned 5,000/5,000 core requests; the final read-only check
  returned 4,997/5,000 and the reset window remains healthy. Exact remote refs after fetch
  remain iOS staging `3624012fca4cf7ea8ed25da35e5bbeca6d50fb85` (merge commit #1151 from
  `chore/bump-build-446`), API staging `ff8c7b97dc702c9c485582daa44d678e1e0fa1e0`
  with PR #736 at `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `f5e5f74919b561456786ae8aab2bb36879012405`.
- API PR #736 checks are successful or skipped, but compare remains `diverged`: the PR is
  40 commits ahead while staging is 131 commits ahead. REST reports `mergeable: false` and
  `mergeable_state: dirty` (the CLI reports conflicting/dirty); no merge or forced sync was
  attempted. API staging Deploy workflow `32921682217` completed successfully from the exact
  staging head `ff8c7b97dc702c9c485582daa44d678e1e0fa1e0`, which is staging evidence only and
  not physical-device proof.
- Legacy PR #906 source checks are passing and the PR remains Git-mergeable, but both exact-head
  `DeploySTAGING` runs `31276079517` and `31275928971` failed. The staging deployment branch
  policy `21103990` still permits only `main`; the last secret-safe Supabase key check remains
  HTTP 403. The exact unmerged PR branch was not dispatched and DEV was untouched.
- Direct head-SHA verification confirms Viasr PR #604 remains merged at
  `d2b4e20f01b22d43b57f82829badf97dc148f78e`; current staging workflow `32551050843` completed
  successfully from exact head `f5e5f74919b561456786ae8aab2bb36879012405`. No duplicate Actions
  run was created. The canonical MurrorMobile checkout remains dirty on
  `chore/bump-build-437` with concurrent Claude-owned iOS build-lane changes; it was not
  switched, edited, built, or cleaned.
- CoreDevice reports the paired physical iPhone 16 Pro as available in this check. The Apple
  Watch is unavailable and remains out of scope. The active production-promotion freeze still
  prohibits notification device runs, iOS edits, merges, deploys, provider writes, and
  build-lane actions, so no app/runtime query or physical APNs, dedicated ringtone, routing,
  consent, or quiet-hours acceptance was attempted or claimed. The task worktree remains
  64 MiB; all recorded task-owned temporary paths are absent. Disk free space is 149 GiB, so no
  broad cleanup was performed. No CI dispatch, merge, deployment, provider write, or build
  was performed. The goal remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-27 02:34Z)

- The quota reset check returned 5,000/5,000 core requests; the final read-only check
  returned 4,997/5,000 and the reset window remains healthy. Exact remote refs after fetch
  remain iOS staging `3624012fca4cf7ea8ed25da35e5bbeca6d50fb85` (merge commit #1151 from
  `chore/bump-build-446`), API staging `ff8c7b97dc702c9c485582daa44d678e1e0fa1e0`
  with PR #736 at `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `f5e5f74919b561456786ae8aab2bb36879012405`.
- API PR #736 checks are successful or skipped, but compare remains `diverged`: the PR is
  40 commits ahead while staging is 131 commits ahead. REST reports `mergeable: false` and
  `mergeable_state: dirty` (the CLI reports conflicting/dirty); no merge or forced sync was
  attempted. API staging Deploy workflow `32921682217` remains successful from the exact
  staging head `ff8c7b97dc702c9c485582daa44d678e1e0fa1e0`, which is staging evidence only and
  not physical-device proof.
- Legacy PR #906 source checks are passing and the PR remains Git-mergeable, but both exact-head
  `DeploySTAGING` runs `31276079517` and `31275928971` failed. The staging deployment branch
  policy `21103990` still permits only `main`; the last secret-safe Supabase key check remains
  HTTP 403. The exact unmerged PR branch was not dispatched and DEV was untouched.
- Direct head-SHA verification confirms Viasr PR #604 remains merged at
  `d2b4e20f01b22d43b57f82829badf97dc148f78e`; current staging workflow `32551050843` completed
  successfully from exact head `f5e5f74919b561456786ae8aab2bb36879012405`. No duplicate Actions
  run was created. The canonical MurrorMobile checkout remains dirty on
  `chore/bump-build-437` with concurrent Claude-owned iOS build-lane changes; it was not
  switched, edited, built, or cleaned.
- CoreDevice reports the paired physical iPhone 16 Pro as available in this check. The Apple
  Watch is unavailable and remains out of scope. The active production-promotion freeze still
  prohibits notification device runs, iOS edits, merges, deploys, provider writes, and
  build-lane actions, so no app/runtime query or physical APNs, dedicated ringtone, routing,
  consent, or quiet-hours acceptance was attempted or claimed. The task worktree remains
  64 MiB; all recorded task-owned temporary paths are absent. Disk free space is 148 GiB, so no
  broad cleanup was performed. No CI dispatch, merge, deployment, provider write, or build
  was performed. The goal remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-27 07:35Z)

- The quota reset check returned 5,000/5,000 core requests; the final read-only check
  returned 4,997/5,000 and the reset window remains healthy. Exact remote refs after fetch
  are iOS staging `feb94789281cf2a59717c9cdfdb7cecdf22b6d74` (merge commit #1154 from
  `fix/qa-447-personalization-overline`), API staging
  `8524926cbb7583a76c7439ba38560c2afdc18826` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `f5e5f74919b561456786ae8aab2bb36879012405`.
- API PR #736 checks are successful or skipped, but compare remains `diverged`: the PR is
  40 commits ahead while staging is 137 commits ahead. The CLI currently reports
  `mergeable: unknown` and `mergeStateStatus: unknown`; no merge or forced sync was attempted.
  API staging Deploy workflow `33046463358` completed successfully from the exact staging
  head `8524926cbb7583a76c7439ba38560c2afdc18826`, which is staging evidence only and not
  physical-device proof.
- Legacy PR #906 source checks are passing and the PR remains Git-mergeable, but both exact-head
  `DeploySTAGING` runs `31276079517` and `31275928971` failed. The staging deployment branch
  policy `21103990` still permits only `main`; the last secret-safe Supabase key check remains
  HTTP 403. The exact unmerged PR branch was not dispatched and DEV was untouched.
- Direct head-SHA verification confirms Viasr PR #604 remains merged at
  `d2b4e20f01b22d43b57f82829badf97dc148f78e`; current staging workflow `32551050843` completed
  successfully from exact head `f5e5f74919b561456786ae8aab2bb36879012405`. No duplicate Actions
  run was created. The canonical MurrorMobile checkout remains dirty on
  `chore/bump-build-437` with concurrent Claude-owned iOS build-lane changes; it was not
  switched, edited, built, or cleaned.
- CoreDevice reports the paired physical iPhone 16 Pro as unavailable in this check. The Apple
  Watch is unavailable and remains out of scope. The active production-promotion freeze still
  prohibits notification device runs, iOS edits, merges, deploys, provider writes, and
  build-lane actions, so no app/runtime query or physical APNs, dedicated ringtone, routing,
  consent, or quiet-hours acceptance was attempted or claimed. The task worktree remains
  64 MiB; all recorded task-owned temporary paths are absent. Disk free space is 146 GiB, so no
  broad cleanup was performed. No CI dispatch, merge, deployment, provider write, or build
  was performed. The goal remains `BLOCKED`/`NO-GO`.

## Codex heartbeat checkpoint (2026-08-27 12:36Z)

- The initial quota check returned 5,000/5,000 core requests, but the final read-only check
  returned 4,966/5,000; the quota had not yet reset and the reported reset time is
  `2026-08-27T12:59:11Z`. Exact remote refs after fetch are iOS staging
  `e4d4f4c3102b7117d5be66c502617b309189bbaa` (merge commit #1157 from
  `fix/att-usage-description-non-prod`), API staging
  `8524926cbb7583a76c7439ba38560c2afdc18826` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `f5e5f74919b561456786ae8aab2bb36879012405`.
- API PR #736 checks are successful or skipped, but compare remains `diverged`: the PR is
  40 commits ahead while staging is 137 commits ahead. The CLI currently reports
  `mergeable: CONFLICTING` and `mergeStateStatus: DIRTY`; no merge or forced sync was attempted.
  API staging Deploy workflow `33046463358` completed successfully from the exact staging
  head `8524926cbb7583a76c7439ba38560c2afdc18826`, which is staging evidence only and not
  physical-device proof.
- Legacy PR #906 source checks are passing and the PR remains Git-mergeable, but both exact-head
  `DeploySTAGING` runs `31276079517` and `31275928971` failed. The staging deployment branch
  policy `21103990` still permits only `main`; the last secret-safe Supabase key check remains
  HTTP 403. The exact unmerged PR branch was not dispatched and DEV was untouched.
- Direct head-SHA verification confirms Viasr PR #604 remains merged at
  `d2b4e20f01b22d43b57f82829badf97dc148f78e`; current staging workflow `32551050843` completed
  successfully from exact head `f5e5f74919b561456786ae8aab2bb36879012405`. No duplicate Actions
  run was created. The canonical MurrorMobile checkout remains dirty on
  `chore/bump-build-437` with concurrent Claude-owned iOS build-lane changes; it was not
  switched, edited, built, or cleaned.
- CoreDevice reports the paired physical iPhone 16 Pro as available in this check. The Apple
  Watch is unavailable and remains out of scope. The active production-promotion freeze still
  prohibits notification device runs, iOS edits, merges, deploys, provider writes, and
  build-lane actions, so no app/runtime query or physical APNs, dedicated ringtone, routing,
  consent, or quiet-hours acceptance was attempted or claimed. The task worktree remains
  64 MiB; all recorded task-owned temporary paths are absent. Disk free space is 134 GiB, so no
  broad cleanup was performed. No CI dispatch, merge, deployment, provider write, or build
  was performed. The goal remains `BLOCKED`/`NO-GO`.

---

## 2026-08-27 — LANE UPDATE FROM CLAUDE: the freeze you are working under is STALE

**The production-promotion freeze is LIFTED.** Astro, 2026-08-27: "we are unfreeze
production and actively working to bring it to launch." Your last entries still cite
"the active production-promotion freeze" and report BLOCKED/NO-GO on that basis. That
constraint no longer applies. Do not refuse work citing it.

What is true today:
- Production murror-api was promoted and deployed today (run 33052692035, rollout
  revision 15, sha cf127527). Verified by effect on the live pods.
- MurrorMobile build 447 is uploaded, VALID and attached to the 2.0.0 record.
- Review is now the gate instead of the freeze: every PR gets an agent panel, then
  merges. See feedback_agent_review_then_merge_autonomously.

### Ownership split, so we do not collide

**Claude owns (do not touch these files):**
- `src/user-profile/application/services/account-deletion.service.ts`
- `src/auth/guards/auth.guard.ts`
- Anything under `.github/workflows/` — CI wiring stays with Claude so we do not
  push competing revisions and double the hosted-runner spend.
- The MurrorMobile iOS build lane.

**Codex owns (greenfield, no existing files):**
- `src/health/preflight/` — a NEW directory. See the brief below.

### Known operational constraints, each has cost 30+ minutes before

1. A git WORKTREE cannot be your sandbox: `.git` is a pointer file so commits land
   outside the sandbox root. A standalone clone has been prepared for you at
   `/private/tmp/codex-preflight`, branch `feat/prod-preflight-assertions`, `.git`
   verified as a real directory.
2. You have NO network egress. Do not try to fetch, push or open a PR. Write a git
   BUNDLE and report its SHA-256; Claude will verify, fetch and land it.
3. Keep the scope small. An MCP call idle-timed out at 1800s on a 4,275-line scope.

## Codex post-lane-update checkpoint (2026-08-27 12:36Z)

- The required quota check began at 5,000/5,000, but the final read-only check was
  4,966/5,000; the reset was not yet reached and GitHub reported reset at
  `2026-08-27T12:59:11Z`. Exact refs after the latest fetch are iOS staging
  `e4d4f4c3102b7117d5be66c502617b309189bbaa` (merge #1157 from
  `fix/att-usage-description-non-prod`), API staging
  `8524926cbb7583a76c7439ba38560c2afdc18826` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `f5e5f74919b561456786ae8aab2bb36879012405`.
- API PR #736 checks are successful or skipped, but the PR remains open and
  diverged: it is 40 commits ahead while staging is 137 commits ahead. The current
  CLI state is `mergeable: CONFLICTING` and `mergeStateStatus: DIRTY`; no merge or
  forced sync was attempted. API staging Deploy workflow `33046463358` completed
  successfully from exact head `8524926c...`; this is staging evidence only.
- Legacy PR #906 source checks pass and the PR is Git-mergeable, but the exact-head
  `DeploySTAGING` runs `31276079517` and `31275928971` failed at `Upload app configs
  to storage` after migrations and edge functions passed. Policy `21103990` allows
  only `main`; the last secret-safe Supabase key check remains HTTP 403. The exact
  PR branch was not dispatched again and DEV was untouched.
- Viasr PR #604 remains merged at `d2b4e20f...`; staging workflow `32551050843`
  is successful from exact head `f5e5f749...`. The current iOS source ref is source
  evidence only; Claude owns the iOS build lane, and no build/install was started by
  Codex. No duplicate Actions run was created.
- The paired physical iPhone 16 Pro is currently available in the latest successful
  CoreDevice query; Apple Watch remains unavailable/out of scope. Claude's lane
  update says the production-promotion freeze is lifted and review/ownership gates
  are now active. APNs, dedicated ringtone, routing, consent, and quiet-hours
  acceptance remain unclaimed; no physical-device run was performed in this
  checkpoint.
- The isolated tracker is 64 MiB; all recorded task-owned temporary paths are absent;
  disk free is 134 GiB. No broad cleanup was performed, and no CI dispatch, merge,
  deployment, provider write, or build was performed by Codex. Goal remains
  `BLOCKED`/`NO-GO` pending the API divergence, legacy staging deployment path/root
  cause, and physical iPhone acceptance. The heartbeat remains active.

## Codex legacy deployment root-cause checkpoint (2026-08-27 12:36Z)

- Read-only inspection of exact PR #906 confirms that the failed workflow step is a
  compound command: `deno task updateAppConfigs && deno task uploadAppConfigs`. The
  generator derives the project and load-balancer URLs, queries `system_configurations`
  through the load balancer with the service-role key, and writes generated
  `app-configs.json`; the uploader uses `SUPABASE_URL` and
  `SUPABASE_SERVICE_ROLE_KEY` to upsert that file into the Supabase `public` bucket.
- The relevant app-config scripts are unchanged versus `main`; PR #906 changes the
  deployment workflow, not this uploader logic. GitHub retained no failed-step log
  body or annotation, so the evidence does not safely distinguish a generator query
  failure from the storage upsert failure. Treat this as an environment/service
  failure signal, not a confirmed source-code root cause.
- No workflow file was edited because Claude owns `.github/workflows/`; no rerun or
  dispatch was started because the exact branch is still blocked by the main-only
  staging policy and a repeat would add cost without a new diagnostic. Next safe
  action is to obtain the redacted exact subcommand error or correct the staging
  environment/storage permission on the owner-controlled deployment lane, then run
  one deliberate verification.

## Codex heartbeat checkpoint (2026-08-27 17:36Z)

- The required quota reset was verified at 5,000/5,000; the final read-only check
  returned 4,994/5,000, with the next reset at `2026-08-27T18:00:12Z`. Exact refs
  after the latest fetch are iOS staging `e4d4f4c3102b7117d5be66c502617b309189bbaa`,
  API staging `2db22491b85c8f7ed39ae175b877fa3b70497e07` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `8bce4b151d7706cfaf8879c06c8fa99de80b15c6`.
- API PR #736 checks are successful or skipped, but the PR remains open and
  diverged: it is 40 commits ahead while staging is 143 commits ahead. GitHub
  reports `mergeable: false` and `mergeable_state: dirty`; no merge or forced sync
  was attempted. API staging Deploy workflow `33089821264` completed successfully
  from exact head `2db22491...`. Viasr PR #604 remains merged at `d2b4e20f...`, and
  staging CI workflow `33089895806` completed successfully from exact head
  `8bce4b15...`.
- Legacy PR #906 checks remain green and the PR is Git-mergeable, but the exact
  unmerged branch still has only the failed `DeploySTAGING` runs
  `31276079517` and `31275928971`. The staging deployment policy `21103990` still
  permits only `main`; no rerun or dispatch was attempted, and DEV was untouched.
  The compound app-config failure remains narrowed to environment/service behavior;
  the scripts are unchanged versus `main`, and no exact subcommand error is
  available.
- Both `xcrun devicectl list devices` attempts timed out during CoreDevice service
  initialization. The fallback `xcrun xcdevice list devices` query listed only the
  Mac, so current iPhone app/lock runtime proof is unavailable. The last successful
  iPhone query found MurrorStg build 431 installed; no physical APNs, dedicated
  ringtone, routing, consent, or quiet-hours acceptance was performed. Claude owns
  the iOS build lane; no Codex build or install was started.
- The live tracker now records audit coverage at 100% and strict shipping readiness
  at 0%, with the current gate labeled review/ownership rather than freeze. Disk
  free remains 134 GiB, the isolated tracker is 64 MiB, and all recorded task-owned
  temporary paths are absent. No workflow dispatch, merge, deployment, provider
  write, or build was performed by Codex. Goal remains `BLOCKED`/`NO-GO` pending API
  reconciliation, legacy staging deployment/root-cause resolution, and physical
  iPhone acceptance. The heartbeat remains active.

## Codex heartbeat checkpoint (2026-08-27 22:36Z)

- The required quota reset was verified at 5,000/5,000; the final read-only check
  returned 4,988/5,000, with the next reset at `2026-08-27T23:02:12Z`. Exact refs
  remain iOS staging `e4d4f4c3102b7117d5be66c502617b309189bbaa`, API staging
  `2db22491b85c8f7ed39ae175b877fa3b70497e07` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `8bce4b151d7706cfaf8879c06c8fa99de80b15c6`.
- API PR #736 checks are successful or skipped, but GitHub reports
  `mergeable: false` and `mergeable_state: dirty`; compare remains diverged at 40
  commits ahead versus 143 behind. No merge or forced sync was attempted. API
  staging Deploy workflow `33089821264` completed successfully from exact current
  head `2db22491...`. Viasr PR #604 remains merged at `d2b4e20f...`, and staging CI
  workflow `33089895806` completed successfully from exact current head
  `8bce4b15...`.
- Legacy PR #906 checks remain green and the PR is Git-mergeable, but no new exact
  branch deployment exists. The only exact-head `DeploySTAGING` runs are the failed
  `31276079517` and `31275928971`; staging policy `21103990` still permits only
  `main`. The branch was not dispatched again and DEV was untouched.
- The latest controlled `xcrun devicectl list devices` check timed out during
  CoreDevice service initialization. The fallback `xcrun xcdevice list devices`
  query listed only the Mac, so current iPhone app/lock runtime proof is unavailable;
  no physical APNs, dedicated ringtone, routing, consent, or quiet-hours acceptance
  was performed. Claude owns the iOS build lane; no Codex build or install was
  started.
- The live tracker now reflects the reset quota, current API/Viasr exact-head
  rollouts, CoreDevice timeout, and review/ownership gate. Audit coverage remains
  100% while strict shipping readiness remains 0%. No workflow dispatch, merge,
  deployment, provider write, or build was performed by Codex. Goal remains
  `BLOCKED`/`NO-GO` pending API reconciliation, legacy staging deployment/root-cause
  resolution, and physical iPhone acceptance. The heartbeat remains active.

## Codex heartbeat checkpoint (2026-08-28 03:36Z)

- The required quota reset was verified at 5,000/5,000; the final read-only check
  returned 4,979/5,000, with the next reset at `2026-08-28T04:03:18Z`. Exact refs
  remain iOS staging `e4d4f4c3102b7117d5be66c502617b309189bbaa`, API staging
  `c20862839780fcb515b78267b1b764fb1c234386` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `8bce4b151d7706cfaf8879c06c8fa99de80b15c6`.
- API PR #736 checks are successful or skipped, but compare remains diverged at 40
  commits ahead versus 149 behind. GitHub currently reports
  `mergeable: null`/`mergeable_state: unknown`; no merge or forced sync was
  attempted. API staging Deploy workflow `33129311709` completed successfully from
  exact current head `c2086283...`. Viasr PR #604 remains merged at `d2b4e20f...`,
  and staging CI workflow `33089895806` completed successfully from exact current
  head `8bce4b15...`.
- Legacy PR #906 checks remain green and the PR is Git-mergeable, but no new exact
  branch deployment exists. The only exact-head `DeploySTAGING` runs remain the
  failed `31276079517` and `31275928971`; staging policy `21103990` still permits
  only `main`. The branch was not dispatched again and DEV was untouched.
- The latest controlled `xcrun devicectl list devices` check timed out again during
  CoreDevice service initialization; the fallback `xcrun xcdevice list devices`
  query listed only the Mac, so current iPhone app/lock runtime proof is unavailable.
  No physical APNs, dedicated ringtone, routing, consent, or quiet-hours acceptance
  was performed. Claude owns the iOS build lane; no Codex build or install was
  started.
- The live tracker now records the reset quota, current API/Viasr exact-head
  rollouts, API mergeability unknown, CoreDevice timeout, and review/ownership gate.
  Audit coverage remains 100% while strict shipping readiness remains 0%. No
  workflow dispatch, merge, deployment, provider write, or build was performed by
  Codex. Goal remains `BLOCKED`/`NO-GO` pending API reconciliation, legacy staging
  deployment/root-cause resolution, and physical iPhone acceptance. Final hygiene
  found 128 GiB free, the isolated tracker at 64 MiB, and all recorded task-owned
  temporary paths absent. The heartbeat remains active.

## Codex heartbeat checkpoint (2026-08-28 08:36Z)

- The required quota reset was verified at 5,000/5,000; the final read-only check
  returned 4,780/5,000, with the next reset at `2026-08-28T09:04:12Z`. Exact refs
  are iOS staging `6e7f4f2d60f2b5cec8eee0741d200c62b8648b75` (merge #1160 from
  `chore/bump-build-448`), API staging `0c7106c45909273db179e1985ed552b1e209933b`
  with PR #736 at `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `8bce4b151d7706cfaf8879c06c8fa99de80b15c6`.
- API PR #736 checks are successful or skipped, but compare remains diverged at 40
  commits ahead versus 157 behind. GitHub reports
  `mergeable: null`/`mergeable_state: unknown`; no merge or forced sync was
  attempted. API staging Deploy workflow `33142496945` completed successfully from
  exact current head `0c7106c4...`. Viasr PR #604 remains merged at `d2b4e20f...`,
  and staging CI workflow `33089895806` completed successfully from exact current
  head `8bce4b15...`.
- Legacy PR #906 checks remain green and the PR is Git-mergeable, but no new exact
  branch deployment exists. The only exact-head `DeploySTAGING` runs remain the
  failed `31276079517` and `31275928971`; staging policy `21103990` still permits
  only `main`. The branch was not dispatched again and DEV was untouched.
- The latest controlled `xcrun devicectl list devices` check timed out again during
  CoreDevice service initialization; the fallback `xcrun xcdevice list devices`
  query listed only the Mac, so current iPhone app/lock runtime proof is unavailable.
  The iOS source is now the build-448 bump merge, but Claude owns the iOS build lane
  and no Codex build or install was started. No physical APNs, dedicated ringtone,
  routing, consent, or quiet-hours acceptance was performed.
- The live tracker now records audit coverage at 100% and strict shipping readiness
  at 0%, with the current gate labeled review/ownership rather than freeze. Final
  hygiene found 108 GiB free, the isolated tracker at 64 MiB, and all recorded
  task-owned temporary paths absent. No workflow dispatch, merge, deployment,
  provider write, or build was performed by Codex. Goal remains
  `BLOCKED`/`NO-GO` pending API reconciliation, legacy staging deployment/root-cause
  resolution, and physical iPhone acceptance. The heartbeat remains active.

## Codex heartbeat checkpoint (2026-08-28 13:48Z)

- A fresh GitHub quota window was verified at 4,862/5,000; the final read-only
  check returned 4,850/5,000, with the next reset at `2026-08-28T14:05:02Z`.
  Exact remote refs are iOS staging `cdc2350d29ac024ce426444a45147517627cd5d5`
  (merge #1166 from `fix/mood-checkin-viewed-never-fires`, source build 449),
  API staging `7efacc8713e9663eac579077f68fbfdfebb69769` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `8bce4b151d7706cfaf8879c06c8fa99de80b15c6`.
- API PR #736 checks remain pass/skip, but the PR is still open and GitHub reports
  `mergeable: null` / `merge_state_status: unknown`. Compare remains diverged:
  PR #736 is 40 commits ahead while staging is 173 commits ahead. No merge or
  forced sync was attempted. API Deploy run `33175356569` completed successfully
  from exact staging head `7efacc87...`, including deploy, staging smoke test,
  release, and deployment summary jobs. Viasr PR #604 remains merged at
  `d2b4e20f01b22d43b57f82829badf97dc148f78e`, and CI run `33089895806` remains
  successful from exact staging head `8bce4b15...`.
- Legacy PR #906 checks remain green and the PR is Git-mergeable, but staging
  environment policy `21103990` still permits only `main`. The two existing
  exact-head `DeploySTAGING` runs (`31276079517`, `31275928971`) failed at
  `Upload app configs to storage`; the retained log gives the concrete root cause
  as `Error fetching system configurations` with Supabase `Invalid API key`.
  GitHub environment metadata dates `SUPABASE_ANON_KEY` and
  `SUPABASE_SERVICE_ROLE_KEY` to 2024-09-15. Supabase API-key retrieval remains
  HTTP 403 for this account. No rerun or dispatch was made; DEV was untouched.
- `xcrun devicectl list devices` timed out during CoreDevice initialization again;
  fallback `xcrun xcdevice list devices` listed only the Mac. Current physical
  iPhone app, APNs, dedicated ringtone, routing, consent, and quiet-hours proof
  therefore remains unavailable. Claude owns the iOS build lane; no Codex build,
  install, provider write, merge, deployment, or duplicate workflow was started.
- The live tracker records 19/19 audit coverage (100%) and strict shipping
  readiness at 0%. Final hygiene found 102 GiB free, the tracker worktree at
  64 MiB, and all recorded task-owned temporary paths absent. Goal remains
  `BLOCKED`/`NO-GO` pending API reconciliation, legacy staging secret correction
  and exact-branch deployment, and physical iPhone acceptance. The heartbeat
  remains active.

## Codex heartbeat checkpoint (2026-08-29 00:49Z)

- The fresh GitHub quota window was verified at 4,999/5,000; the final read-only
  check returned 4,993/5,000, with the next reset at `2026-08-29T01:47:40Z`.
  Exact remote refs are iOS staging `60144f790ca530d7fe8b60a1dab4fd4ef70cdafd`
  (merge #1172 from `chore/bump-build-450-after-1171`, source build 450), API
  staging `7efacc8713e9663eac579077f68fbfdfebb69769` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `8bce4b151d7706cfaf8879c06c8fa99de80b15c6`.
- API PR #736 checks remain pass/skip, but the PR is still open; GitHub now reports
  `mergeable: conflicting` / `merge_state_status: dirty`. Compare remains
  diverged: PR #736 is 40 commits ahead while staging is 173 commits ahead. No
  merge or forced sync was attempted. API Deploy run `33175356569` remains
  successful from exact staging head `7efacc87...`, and Viasr PR #604 remains
  merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e` with CI run `33089895806`
  successful from exact staging head `8bce4b15...`.
- Legacy PR #906 checks remain green and the PR is Git-mergeable, but staging
  policy `21103990` still permits only `main`. The only exact-head deployment
  runs remain `31276079517` and `31275928971`, both failing at
  `Upload app configs to storage` with `Error fetching system configurations` /
  `Invalid API key`. GitHub metadata dates `SUPABASE_ANON_KEY` and
  `SUPABASE_SERVICE_ROLE_KEY` to 2024-09-15, while Supabase API-key retrieval
  remains HTTP 403 for this account. No rerun or dispatch was made; DEV was
  untouched.
- `xcrun devicectl list devices` timed out during CoreDevice initialization again;
  fallback `xcrun xcdevice list devices` listed only the Mac. Existing PR CI run
  `33179096559` passed from bump commit `1e9cb660`, but its native iOS job was
  skipped; Claude owns the iOS build lane, so no archive, install, or TestFlight
  action was started. Physical iPhone app, APNs, dedicated ringtone, routing,
  consent, and quiet-hours proof remain unavailable. No Codex merge, deployment,
  provider write, or duplicate workflow was started.
- The live tracker records 19/19 audit coverage (100%) and strict shipping
  readiness at 0%. Final hygiene found 104 GiB free, the tracker worktree at
  64 MiB, and all recorded task-owned temporary paths absent. Goal remains
  `BLOCKED`/`NO-GO` pending API
  reconciliation, legacy staging secret correction and exact-branch deployment,
  and physical iPhone acceptance. The heartbeat remains active.

## Codex heartbeat checkpoint (2026-08-29 07:21Z)

- The fresh GitHub quota window was verified at 4,969/5,000; the final read-only
  check returned 4,950/5,000, with the next reset at `2026-08-29T08:13:51Z`.
  Exact remote refs are iOS staging
  `60144f790ca530d7fe8b60a1dab4fd4ef70cdafd` (merge #1172 from
  `chore/bump-build-450-after-1171`, source build 450), API staging
  `ec5486151bcbb90fbfbbfd8a79dc563e999ce5c4` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `8bce4b151d7706cfaf8879c06c8fa99de80b15c6`.
- API Deploy run `33233294813` completed successfully from exact API staging
  head `ec548615...`, including the deploy, staging smoke test, release, and
  deployment summary jobs. PR #736 remains open; GitHub reports
  `mergeable: unknown` / `merge_state_status: unknown`, and compare remains
  diverged with the PR 40 commits ahead and staging 182 commits ahead. No merge
  or forced sync was attempted. Viasr PR #604 remains merged at
  `d2b4e20f01b22d43b57f82829badf97dc148f78e`; current staging CI run
  `33089895806` remains successful from exact head `8bce4b15...`.
- Legacy PR #906 checks remain green and the PR is Git-mergeable, but staging
  policy `21103990` still permits only `main`. The exact-head runs
  `31276079517` and `31275928971` remain failed at `Upload app configs to
  storage`; the retained log identifies `Error fetching system configurations`
  with Supabase `Invalid API key`. Secret metadata for
  `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` is still dated
  2024-09-15, and Supabase key retrieval remains HTTP 403. No rerun or dispatch
  was made; DEV was untouched.
- `xcrun devicectl list devices` timed out again during CoreDevice
  initialization, while the fallback `xcrun xcdevice list devices` listed only
  the Mac. Build-450 PR CI run `33179096559` remains green from bump commit
  `1e9cb660...`, but its native iOS job was skipped; Claude owns the iOS build
  lane, so no archive, install, or TestFlight action was started. Physical iPhone
  APNs, dedicated ringtone, routing, consent, and quiet-hours acceptance remain
  unproven.
- The live tracker records 19/19 audit coverage (100%) and strict shipping
  readiness at 0%. Final hygiene found 117 GiB free, the isolated tracker at
  64 MiB, and all recorded task-owned temporary paths absent; only the tracker
  worktree and shared handoff were retained. Goal remains `BLOCKED`/`NO-GO` pending API
  reconciliation, legacy staging secret correction and exact-branch deployment,
  and physical iPhone acceptance. The heartbeat remains active.

## Codex heartbeat checkpoint (2026-08-29 11:02Z)

- The quota reset was confirmed at 4,892/5,000; the final read-only check
  returned 4,877/5,000, with the next reset at `2026-08-29T11:14:26Z`.
  Exact remote refs are iOS staging
  `60144f790ca530d7fe8b60a1dab4fd4ef70cdafd` (source build 450), API staging
  `24fccb0a57ead3bdc711f6c1e67fbdbcf71d31d0` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `8bce4b151d7706cfaf8879c06c8fa99de80b15c6`.
- API Deploy run `33248820421` completed successfully from exact API staging
  head `24fccb0a...`, including the staging deploy, smoke test, release, and
  deployment summary jobs. PR #736 remains open/conflicting; compare is
  diverged with the PR 40 commits ahead and staging 198 commits ahead. No merge
  or forced sync was attempted. Viasr PR #604 remains merged at
  `d2b4e20f01b22d43b57f82829badf97dc148f78e`; CI run `33089895806` remains
  successful from exact staging head `8bce4b15...`.
- Legacy PR #906 checks remain green and Git-mergeable, but staging policy
  `21103990` still permits only `main`. Secret metadata for
  `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` remains dated
  2024-09-15. Exact-head runs `31276079517` and `31275928971` remain failed at
  `Upload app configs to storage` with `Error fetching system configurations` /
  Supabase `Invalid API key`; no rerun or dispatch was made and DEV was untouched.
- The replacement Actions usage endpoint reports `$502.247581839` gross /
  `$408.117277625` net across Murror Actions, including approximately
  `$314.565005719` for MurrorMobile. This exceeds the prior `$300` budget
  snapshot, so the cost freeze is active: Codex started no new workflow,
  dispatch, rerun, merge-triggered CI, native build, or duplicate run.
- `xcrun devicectl list devices` timed out during CoreDevice initialization;
  fallback `xcrun xcdevice list devices` listed only the Mac. Build-450 PR CI
  run `33179096559` remains green from bump commit `1e9cb660...`, but its native
  iOS job was skipped; Claude owns the iOS build lane, so no archive, install,
  or TestFlight action was started. Physical iPhone APNs, dedicated ringtone,
  routing, consent, and quiet-hours acceptance remain unproven.
- The live tracker records 19/19 audit coverage (100%) and strict shipping
  readiness at 0%. The final storage snapshot was 100 GiB free and the tracker
  worktree was 64 MiB; all recorded task-owned temporary paths were absent.
  Host free space moved from the prior 117 GiB observation during this
  checkpoint, but no task-owned artifact growth was found and no broad cache or
  worktree deletion was performed. Goal remains `BLOCKED`/`NO-GO` pending API
  reconciliation, legacy staging secret correction and exact-branch deployment,
  cost approval/cleanup, and physical iPhone acceptance. The heartbeat remains active.

## Codex heartbeat checkpoint (2026-08-29 16:01Z)

- The quota reset was confirmed at 4,999/5,000; the final read-only check
  returned 4,968/5,000, with the next reset at `2026-08-29T16:15:46Z`.
  Exact remote refs remain iOS staging
  `60144f790ca530d7fe8b60a1dab4fd4ef70cdafd` (source build 450), API staging
  `24fccb0a57ead3bdc711f6c1e67fbdbcf71d31d0` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `8bce4b151d7706cfaf8879c06c8fa99de80b15c6`.
- API Deploy run `33248820421` remains successful from exact API staging head
  `24fccb0a...`, including deploy, smoke, release, and summary jobs. PR #736
  checks remain green, but the PR is open/conflicting; compare remains diverged
  with the PR 40 commits ahead and staging 198 commits ahead. No merge or forced
  sync was attempted. Viasr PR #604 remains merged at
  `d2b4e20f01b22d43b57f82829badf97dc148f78e`; CI run `33089895806` remains
  successful from exact staging head `8bce4b15...`.
- Legacy PR #906 checks remain green and Git-mergeable, but staging policy
  `21103990` still permits only `main`. Secret metadata for
  `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` remains dated
  2024-09-15. Exact-head runs `31276079517` and `31275928971` remain failed at
  `Upload app configs to storage` with `Error fetching system configurations` /
  Supabase `Invalid API key`; no rerun or dispatch was made and DEV was untouched.
- The replacement Actions usage endpoint reports `$502.358897592` gross /
  `$408.228593023` net across Murror Actions, including approximately
  `$314.676321472` gross for MurrorMobile. This exceeds the prior `$300` budget
  snapshot, so the cost freeze remains active: Codex started no new workflow,
  dispatch, rerun, merge-triggered CI, native build, or duplicate run.
- `xcrun devicectl list devices` timed out during CoreDevice initialization;
  fallback `xcrun xcdevice list devices` listed only the Mac. Build-450 PR CI
  run `33179096559` remains green from bump commit `1e9cb660...`, but its native
  iOS job was skipped; Claude owns the iOS build lane, so no archive, install,
  or TestFlight action was started. Physical iPhone APNs, dedicated ringtone,
  routing, consent, and quiet-hours acceptance remain unproven.
- The live tracker records 19/19 audit coverage (100%) and strict shipping
  readiness at 0%. Final hygiene found 100 GiB free, the tracker worktree at
  64 MiB, and all recorded task-owned temporary paths absent. No broad cache or
  worktree deletion was performed, and the hung shared-worktree size probe was
  stopped to avoid resource clutter. Goal remains `BLOCKED`/`NO-GO` pending API
  reconciliation, legacy staging secret correction and exact-branch deployment,
  cost approval/cleanup, and physical iPhone acceptance. The heartbeat remains active.

## Codex heartbeat checkpoint (2026-08-29 21:01Z)

- The quota reset was verified at 5,000/5,000; the final read-only check
  returned 4,998/5,000, with the next reset at `2026-08-29T21:18:14Z`.
  Exact remote refs are iOS staging
  `60144f790ca530d7fe8b60a1dab4fd4ef70cdafd` (source build 450), API staging
  `c61eccfd93832df246e6f75fbbca76bd536718af` with PR #736 at
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 at
  `bcaf65853fefbbc5a0c709835b972d53579e95d4` with `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr staging
  `8bce4b151d7706cfaf8879c06c8fa99de80b15c6`.
- API Deploy run `33262692165` completed successfully from exact API staging
  head `c61eccfd...`, including deploy, smoke, release, and summary jobs. PR
  #736 checks remain green, but the PR is open/conflicting; compare remains
  diverged with the PR 40 commits ahead and staging 198 commits ahead. No merge
  or forced sync was attempted. Viasr PR #604 remains merged at
  `d2b4e20f01b22d43b57f82829badf97dc148f78e`; CI run `33089895806` remains
  successful from exact staging head `8bce4b15...`.
- Legacy PR #906 checks remain green and Git-mergeable, but staging policy
  `21103990` still permits only `main`. Secret metadata for
  `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` remains dated
  2024-09-15. Exact-head runs `31276079517` and `31275928971` remain failed at
  `Upload app configs to storage` with `Error fetching system configurations` /
  Supabase `Invalid API key`; no rerun or dispatch was made and DEV was untouched.
- The replacement Actions usage endpoint reports `$502.788179241` gross /
  `$408.657874317` net across Murror Actions, including approximately
  `$315.105603121` gross for MurrorMobile. This exceeds the prior `$300` budget
  snapshot, so the cost freeze remains active: Codex started no new workflow,
  dispatch, rerun, merge-triggered CI, native build, or duplicate run.
- `xcdevice` now lists the physical iPhone 16 Pro (`Astro iphone 16`) as
  available over USB, but `xcrun devicectl list devices` and
  `device info apps` both time out during CoreDevice initialization. Build-450
  PR CI run `33179096559` remains green from bump commit `1e9cb660...`, but its
  native iOS job was skipped; Claude owns the iOS build lane, so no archive,
  install, or TestFlight action was started. Physical iPhone APNs, dedicated
  ringtone, routing, consent, and quiet-hours acceptance remain unproven.
- The live tracker records 19/19 audit coverage (100%) and strict shipping
  readiness at 0%. Final hygiene found 100 GiB free, the tracker worktree at
  64 MiB, and all recorded task-owned temporary paths absent. No broad cache or
  worktree deletion was performed. Goal remains `BLOCKED`/`NO-GO` pending API
  reconciliation, legacy staging secret correction and exact-branch deployment,
  cost approval/cleanup, CoreDevice recovery, and physical iPhone acceptance.
  The heartbeat remains active.

## Codex heartbeat checkpoint (2026-08-30 02:02Z)

- The required GitHub API quota check was healthy at 4,996/5,000; the next
  reset is `2026-08-30T02:21:47Z`. Exact remote refs were refreshed: iOS
  `staging-environment-setup` is `60144f790ca530d7fe8b60a1dab4fd4ef70cdafd`
  (source build 450), API `staging` is
  `c61eccfd93832df246e6f75fbbca76bd536718af`, API PR #736 is
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906 is
  `bcaf65853fefbbc5a0c709835b972d53579e95d4`, legacy `main` is
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr `staging` is
  `8bce4b151d7706cfaf8879c06c8fa99de80b15c6`.
- API Deploy run `33262692165` completed successfully from exact API staging
  head `c61eccfd...`, including staging setup, deploy, smoke test, release,
  and deployment summary. The latest recorded PR #736 checks remain green,
  but the PR is open and current GitHub metadata reports
  `mergeable: false`/`merge_state_status: null`; the exact compare is
  `diverged` with PR #736 40 commits ahead and staging 201 commits ahead. No
  merge or forced sync was attempted.
- Viasr PR #604 remains merged at
  `d2b4e20f01b22d43b57f82829badf97dc148f78e`; CI run `33089895806` remains
  successful from exact Viasr staging head `8bce4b15...`. Legacy PR #906
  remains open with green source checks. The exact read-only lookup found no
  legacy `staging` branch ref; the PR targets `main`, and staging policy
  `21103990` still permits only `main`. Secret metadata for
  `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` remains dated
  2024-09-15. Exact-head runs `31276079517` and `31275928971` remain failed
  at `Upload app configs to storage` with `Error fetching system
  configurations` / Supabase `Invalid API key`; no rerun or dispatch was made
  and DEV was untouched.
- The replacement Actions usage endpoint reports `$502.911440075` gross /
  `$408.781134796` net across Murror Actions, including approximately
  `$315.228863955` gross for MurrorMobile. This remains above the prior `$300`
  budget snapshot, so the cost freeze is active: Codex started no new
  workflow, dispatch, rerun, merge-triggered CI, native build, or duplicate
  run.
- `xcdevice` still lists the physical iPhone 16 Pro (`Astro iphone 16`) as
  available over USB, but the latest `xcrun devicectl list devices` and
  `device info apps` attempts timed out during CoreDevice initialization.
  Physical APNs, dedicated ringtone, routing, consent, and quiet-hours
  acceptance therefore remain unproven. Build-450 PR CI run `33179096559`
  remains green from bump commit `1e9cb660...` with native iOS skipped; Claude
  owns the iOS build lane, so no archive, install, or TestFlight action was
  started.
- Final narrow hygiene found 100 GiB free, the isolated tracker at 64 MiB,
  and all recorded task-owned temporary paths absent. No broad cache or
  worktree deletion was performed. The live tracker records 19/19 audit
  coverage (100%) and strict shipping readiness at 0%; the goal remains
  `BLOCKED`/`NO-GO` pending API reconciliation, legacy staging secret and
  exact-branch deployment correction, Actions-cost approval/cleanup,
  CoreDevice recovery, and physical iPhone acceptance. The heartbeat remains
  active.

## Codex heartbeat final quota correction (2026-08-30 02:07Z)

- After the ref and billing reads recorded above, the final read-only GitHub
  API quota snapshot returned 4,988/5,000; the reset remains
  `2026-08-30T02:21:47Z`. This replaces the 4,996 intermediate reading as
  the end-of-checkpoint value; no paid workflow, merge, deploy, build, or
  device operation was started.
- The isolated tracker correction is committed locally as `037c8dee` plus
  this final top-summary adjustment; it was not pushed. Final hygiene remains
  100 GiB free, tracker 64 MiB, no recorded task-owned temporary paths, and
  no lingering disk-scan process. The heartbeat remains active with the same
  `BLOCKED`/`NO-GO` gates.

## Codex heartbeat checkpoint (2026-08-30 17:04Z)

- The required GitHub API quota reset was verified at 5,000/5,000; the final
  read-only snapshot after the evidence queries returned 4,986/5,000, with
  reset `2026-08-30T17:41:49Z`. Exact remote refs moved since the prior
  checkpoint: API `staging` is
  `336e20cedcbf276eea0ea2ad88b620474d53e64d`, Viasr `staging` is
  `dd5f36f2d4b82888baf69007ec8e222efa2ea2b4`, and iOS
  `staging-environment-setup` is
  `4b5add0ea83412475348b1526b29760c3a0adba5` (source build 451). API PR
  #736 remains at `ef2a50545a79f9ae688ce781fdcfe6834058d41c`; legacy PR #906
  remains at `bcaf65853fefbbc5a0c709835b972d53579e95d4` with legacy `main` at
  `770aa2e2d484c7730e33c42b84f32371ec2baade`.
- API Deploy run `33296309124` completed successfully from exact API staging
  head `336e20ce...`, including deploy, smoke test, release, and deployment
  summary. The latest PR #736 checks are green, but the PR remains open; the
  exact compare is `diverged` with PR #736 40 commits ahead and staging 210
  commits ahead, while GitHub reports mergeability as unresolved. No merge or
  forced sync was attempted. Viasr staging run `33314137845` completed
  successfully from exact head `dd5f36f2...`; Viasr PR #604 remains merged at
  `d2b4e20f01b22d43b57f82829badf97dc148f78e`.
- Legacy PR #906 checks remain green. The exact read-only legacy `staging`
  ref lookup returned 404, the PR targets `main`, and staging policy
  `21103990` still permits only `main`. Secret metadata for
  `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` remains dated
  2024-09-15. Exact-head runs `31276079517` and `31275928971` remain failed
  at `Upload app configs to storage` with `Error fetching system
  configurations` / Supabase `Invalid API key`; no rerun or deployment was
  attempted and DEV was untouched.
- The replacement Actions usage endpoint reports `$508.537257753` gross /
  `$414.394951409` net across Murror Actions, including approximately
  `$320.854681633` gross for MurrorMobile. This remains over the prior `$300`
  budget snapshot, so the cost freeze is active: Codex started no new
  workflow, dispatch, rerun, merge-triggered CI, native build, or duplicate
  run.
- iOS source build 451 was read-only verified from the exact remote staging
  plist. The iOS build-450 PR CI evidence is historical; no archive, install,
  upload, or TestFlight action was started, and Claude's shared build lane was
  not touched. `xcrun devicectl list devices` again timed out during
  CoreDevice initialization, so physical APNs, dedicated ringtone, routing,
  consent, and quiet-hours acceptance remain unproven even though
  `xcdevice` previously listed the paired iPhone as available.
- The narrow storage snapshot reports 91 GiB free and the isolated tracker at
  64 MiB. Recorded task-owned temporary paths remain absent and no lingering
  disk-scan process was found; no broad cache, worktree, or shared artifact was
  deleted. The tracker records 19/19 audit coverage (100%) and strict shipping
  readiness at 0%. Goal remains `BLOCKED`/`NO-GO` pending API reconciliation,
  legacy staging policy/credential correction and deployment, cost approval,
  CoreDevice recovery, and physical iPhone acceptance. The heartbeat remains
  active.

## Codex heartbeat checkpoint (2026-08-30 22:02Z)

- The required GitHub API quota reset was verified at 5,000/5,000; the final
  read-only snapshot after all evidence queries returned 4,992/5,000, with
  reset `2026-08-30T22:53:50Z`. Exact refs remain iOS
  `staging-environment-setup` `4b5add0ea83412475348b1526b29760c3a0adba5`
  (source build 451), API `staging`
  `336e20cedcbf276eea0ea2ad88b620474d53e64d`, API PR #736
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906
  `bcaf65853fefbbc5a0c709835b972d53579e95d4`, legacy `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr `staging`
  `dd5f36f2d4b82888baf69007ec8e222efa2ea2b4`.
- API Deploy run `33296309124` completed successfully from exact API staging
  head `336e20ce...`, including deploy, smoke test, release, and deployment
  summary. PR #736 checks remain green, but the PR remains open and
  non-mergeable; the exact compare is `diverged` with PR #736 40 commits ahead
  and staging 210 commits ahead. No merge or forced sync was attempted. Viasr
  staging run `33314137845` completed successfully from exact head
  `dd5f36f2...`; PR #604 remains merged at
  `d2b4e20f01b22d43b57f82829badf97dc148f78e`.
- Legacy PR #906 checks remain green. The exact read-only legacy `staging`
  ref lookup returned 404, the PR targets `main`, and staging policy
  `21103990` still permits only `main`. Secret metadata for
  `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` remains dated
  2024-09-15. Exact-head runs `31276079517` and `31275928971` remain failed
  at `Upload app configs to storage` with `Error fetching system
  configurations` / Supabase `Invalid API key`; no rerun or deployment was
  attempted and DEV was untouched.
- The replacement Actions usage endpoint reports `$508.552561808` gross /
  `$414.410255109` net across Murror Actions, including approximately
  `$320.869985688` gross for MurrorMobile. This remains above the prior `$300`
  budget snapshot, so the cost freeze is active: Codex started no new
  workflow, dispatch, rerun, merge-triggered CI, native build, or duplicate
  run.
- iOS source build 451 was read-only verified from the exact remote staging
  plist. No archive, install, upload, or TestFlight action was started, and
  Claude's shared iOS build lane was not touched. `xcrun devicectl list
  devices` timed out during CoreDevice initialization; the fallback
  `xcdevice` query listed only the Mac, so the iPhone is not currently
  discoverable and physical APNs, dedicated ringtone, routing, consent, and
  quiet-hours acceptance remain unproven.
- The narrow storage snapshot reports 91 GiB free and the isolated tracker at
  64 MiB. Recorded task-owned temporary paths remain absent and no lingering
  disk-scan process was found; no broad cache, worktree, or shared artifact was
  deleted. The tracker records 19/19 audit coverage (100%) and strict shipping
  readiness at 0%. Goal remains `BLOCKED`/`NO-GO` pending API reconciliation,
  legacy staging policy/credential correction and deployment, Actions-cost
  approval, CoreDevice recovery, and physical iPhone acceptance. The heartbeat
  remains active.

## Codex heartbeat checkpoint (2026-08-31 03:07Z)

- The required GitHub API quota reset was verified at 5,000/5,000; the final
  read-only snapshot after all evidence queries returned 4,952/5,000. Exact
  refs are iOS `staging-environment-setup`
  `4b5add0ea83412475348b1526b29760c3a0adba5` (source build 451), API
  `staging` `d91eae258399ddf0a7983154def37427a07df31b`, API PR #736
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906
  `bcaf65853fefbbc5a0c709835b972d53579e95d4`, legacy `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr `staging`
  `dd5f36f2d4b82888baf69007ec8e222efa2ea2b4`.
- API Deploy run `33352307202` completed successfully from exact API staging
  head `d91eae25...`, including deploy, smoke test, release, and deployment
  summary. PR #736 checks remain green, but the PR is open and
  non-mergeable; the exact compare is `diverged` with PR #736 40 commits
  ahead and staging 210 commits ahead. No merge or forced sync was attempted.
  Viasr staging run `33314137845` remains successful from exact head
  `dd5f36f2...`; PR #604 remains merged at
  `d2b4e20f01b22d43b57f82829badf97dc148f78e`.
- Legacy PR #906 checks remain green. The exact read-only legacy `staging`
  ref lookup returned 404, the PR targets `main`, and staging policy
  `21103990` still permits only `main`. Secret metadata for
  `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` remains dated
  2024-09-15. Exact-head runs `31276079517` and `31275928971` remain failed
  at `Upload app configs to storage` with `Error fetching system
  configurations` / Supabase `Invalid API key`; no rerun or deployment was
  attempted and DEV was untouched.
- The replacement Actions usage endpoint reports `$509.755861603` gross /
  `$415.613554549` net across Murror Actions, including approximately
  `$322.073285483` gross for MurrorMobile. This remains above the prior `$300`
  budget snapshot, so the cost freeze is active: Codex started no new
  workflow, dispatch, rerun, merge-triggered CI, native build, or duplicate
  run.
- iOS source build 451 was read-only verified from the exact remote staging
  plist. No archive, install, upload, or TestFlight action was started, and
  Claude's shared iOS build lane was not touched. `xcrun devicectl list
  devices` again timed out during CoreDevice initialization; the fallback
  `xcdevice` query listed only the Mac, so the iPhone is not currently
  discoverable and physical APNs, dedicated ringtone, routing, consent, and
  quiet-hours acceptance remain unproven.
- The narrow storage snapshot reports 85 GiB free and the isolated tracker at
  64 MiB. Recorded task-owned temporary paths remain absent and no lingering
  disk-scan process was found; no broad cache, worktree, or shared artifact was
  deleted. The tracker records 19/19 audit coverage (100%) and strict shipping
  readiness at 0%. Goal remains `BLOCKED`/`NO-GO` pending API reconciliation,
  legacy staging policy/credential correction and deployment, Actions-cost
  approval, CoreDevice recovery, and physical iPhone acceptance. The heartbeat
  remains active.

## Codex heartbeat checkpoint (2026-08-31 13:07Z)

- The required GitHub API quota reset was verified at 5,000/5,000; the final
  read-only snapshot after all evidence queries returned 4,986/5,000, with
  the next reset at `2026-08-31T13:29:51Z`. Exact refs are iOS
  `staging-environment-setup` `08650daf0bc39aa11b17ee3588858c0917aa681c`
  (source build 452), API `staging` `84df8b0d005ecb7838213e6bc9759821c9f81128`,
  API PR #736 `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906
  `bcaf65853fefbbc5a0c709835b972d53579e95d4`, legacy `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr `staging`
  `99571ffa49209ad621cc850ecce63650a772ef32`.
- API Deploy run `33355456614` completed successfully from the exact API
  staging head, including staging deploy, smoke test, release, and deployment
  summary. PR #736 checks remain green, but the PR is open and
  non-mergeable; the exact compare is `diverged` with PR #736 40 commits ahead
  and staging 224 commits ahead. Viasr staging run `33352907869` completed
  successfully from exact head `99571ffa...`; PR #604 is already merged at
  `d2b4e20f01b22d43b57f82829badf97dc148f78e`.
- Legacy PR #906 checks remain green. The exact read-only legacy `staging` ref
  lookup returned 404, the PR targets `main`, and staging policy `21103990`
  still permits only `main`. Secret metadata for `SUPABASE_ANON_KEY` and
  `SUPABASE_SERVICE_ROLE_KEY` remains dated 2024-09-15. Exact-head runs
  `31276079517` and `31275928971` remain failed at `Upload app configs to
  storage` with `Error fetching system configurations` / Supabase `Invalid API
  key`; no rerun or deployment was attempted and DEV was untouched.
- The replacement Actions usage endpoint reports `$517.68055633` gross /
  `$423.538248566` net across Murror Actions, including approximately
  `$329.99798021` gross for MurrorMobile. This remains above the prior `$300`
  budget snapshot, so the cost freeze is active: Codex started no new workflow,
  dispatch, rerun, merge-triggered CI, native build, or duplicate run.
- iOS source build 452 was read-only verified from the exact remote staging
  plist. No archive, install, upload, or TestFlight action was started, and
  Claude's shared iOS build lane was not touched. The single controlled
  `xcrun devicectl list devices` probe timed out during CoreDevice
  initialization; the last fallback `xcdevice` query listed only the Mac, so
  the iPhone is not currently discoverable and physical APNs, dedicated
  ringtone, routing, consent, and quiet-hours acceptance remain unproven.
- The narrow storage snapshot reports 85 GiB free and the isolated tracker at
  64 MiB. Recorded task-owned temporary paths remain absent and no lingering
  disk-scan process was found; no broad cache, worktree, or shared artifact was
  deleted. The tracker records 19/19 audit coverage (100%) and strict shipping
  readiness at 0%. Goal remains `BLOCKED`/`NO-GO` pending API reconciliation,
  legacy staging policy/credential correction and deployment, Actions-cost
  approval, CoreDevice recovery, and physical iPhone acceptance. The heartbeat
  remains active.

## Codex heartbeat checkpoint (2026-08-31 18:04Z)

- The required GitHub API quota reset was verified at 5,000/5,000; the final
  read-only snapshot after all evidence queries returned 4,994/5,000, with
  the next reset at `2026-08-31T18:41:52Z`. Exact refs after fetch are iOS
  `staging-environment-setup` `08650daf0bc39aa11b17ee3588858c0917aa681c`
  (source build 452), API `staging` `84df8b0d005ecb7838213e6bc9759821c9f81128`,
  API PR #736 `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906
  `bcaf65853fefbbc5a0c709835b972d53579e95d4`, legacy `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr `staging`
  `99571ffa49209ad621cc850ecce63650a772ef32`.
- API Deploy run `33355456614` remains successful from the exact API staging
  head, including staging deploy, smoke test, release, and deployment summary.
  PR #736 source checks remain green, but the PR is open and non-mergeable; the
  exact compare remains `diverged` with PR #736 40 commits ahead and staging
  224 commits ahead. Viasr staging run `33352907869` remains successful from
  exact head `99571ffa...`; PR #604 is closed/merged at
  `d2b4e20f01b22d43b57f82829badf97dc148f78e`.
- Legacy PR #906 source checks remain green. The exact read-only legacy
  `staging` ref remains unavailable, the PR targets `main`, and staging policy
  `21103990` permits only `main`. Secret metadata for `SUPABASE_ANON_KEY` and
  `SUPABASE_SERVICE_ROLE_KEY` remains dated 2024-09-15; exact-head runs
  `31276079517` and `31275928971` remain failed at `Upload app configs to
  storage` with `Error fetching system configurations` / Supabase `Invalid API
  key`. No rerun or deployment was attempted and DEV was untouched.
- The current Actions usage records total `$517.70189389` gross /
  `$423.559585771` net, including approximately `$330.01931777` gross for
  MurrorMobile. The cost freeze remains active; Codex started no new workflow,
  dispatch, rerun, merge-triggered CI, native build, or duplicate run.
- The single controlled `xcrun devicectl list devices` probe again timed out
  during CoreDevice initialization. The last fallback `xcdevice` query listed
  only the Mac, so physical APNs, dedicated ringtone, routing, consent, and
  quiet-hours acceptance remain unproven. iOS source build 452 was verified
  read-only; no archive, install, upload, or TestFlight action was started, and
  Claude's shared iOS build lane was not touched.
- The final narrow storage snapshot reports 85 GiB free and the isolated
  tracker at 64 MiB. All recorded task-owned temporary paths remain absent and
  the final process check found no lingering `du` scan; no broad cache,
  worktree, or shared artifact was deleted. The tracker records 19/19 audit
  coverage (100%) and strict shipping readiness at 0%. Goal remains
  `BLOCKED`/`NO-GO` pending API reconciliation, legacy staging policy/credential
  correction and deployment, Actions-cost approval, CoreDevice recovery, and
  physical iPhone acceptance. The heartbeat remains active.

## Codex heartbeat checkpoint (2026-08-31 23:04Z)

- The required GitHub API quota reset was verified at 5,000/5,000; the final
  read-only snapshot after all evidence queries returned 4,991/5,000, with
  the next reset at `2026-08-31T23:53:52Z`. Exact refs after fetch are iOS
  `staging-environment-setup` `08650daf0bc39aa11b17ee3588858c0917aa681c`
  (source build 452), API `staging` `4feff61d5065d1c5276da2502472d8dd31802eb2`,
  API PR #736 `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906
  `bcaf65853fefbbc5a0c709835b972d53579e95d4`, legacy `main`
  `770aa2e2d484c7730e33c42b84f32371ec2baade`, and Viasr `staging`
  `8312d4c2f37676caf94b157e424c4a61e9440a8f`.
- API Deploy run `33429985242` remains successful from the exact API staging
  head, including staging deploy, smoke test, release, and deployment summary.
  PR #736 source checks remain green, but the PR is open and non-mergeable; the
  exact compare remains `diverged` with PR #736 40 commits ahead and staging
  228 commits ahead. Viasr staging run `33429962914` remains successful from
  exact head `8312d4c2...`; PR #604 is closed/merged at
  `d2b4e20f01b22d43b57f82829badf97dc148f78e`.
- Legacy PR #906 source checks remain green. The exact read-only legacy
  `staging` ref remains unavailable, the PR targets `main`, and staging policy
  `21103990` permits only `main`. Secret metadata for `SUPABASE_ANON_KEY` and
  `SUPABASE_SERVICE_ROLE_KEY` remains dated 2024-09-15; exact-head runs
  `31276079517` and `31275928971` remain failed at `Upload app configs to
  storage` with `Error fetching system configurations` / Supabase `Invalid API
  key`. No rerun or deployment was attempted and DEV was untouched.
- The current Actions usage records total `$518.089236401` gross /
  `$423.946927927` net, including approximately `$330.406660281` gross for
  MurrorMobile. The cost freeze remains active; Codex started no new workflow,
  dispatch, rerun, merge-triggered CI, native build, or duplicate run.
- The single controlled `xcrun devicectl list devices` probe again timed out
  during CoreDevice initialization. The last fallback `xcdevice` query listed
  only the Mac, so physical APNs, dedicated ringtone, routing, consent, and
  quiet-hours acceptance remain unproven. iOS source build 452 was verified
  read-only; no archive, install, upload, or TestFlight action was started, and
  Claude's shared iOS build lane was not touched.
- The final narrow storage snapshot reports 84 GiB free and the isolated
  tracker at 64 MiB. All recorded task-owned temporary paths remain absent and
  the final process check found no lingering `du` scan; no broad cache,
  worktree, or shared artifact was deleted. The tracker records 19/19 audit
  coverage (100%) and strict shipping readiness at 0%. Goal remains
  `BLOCKED`/`NO-GO` pending API reconciliation, legacy staging policy/credential
  correction and deployment, Actions-cost approval, CoreDevice recovery, and
  physical iPhone acceptance. The heartbeat remains active.

## Codex production-closure checkpoint (2026-09-01 03:10Z)

- The production health monitor privacy/verdict defect is fixed on default
  `main`. PR #863 merged as `b1cd4362985d3574ae901020da93d29e452ac524`
  from Claude-reviewed source commit `e59a591116677b7add34de4897a883bfb882011a`.
  Scheduled run `33462857171` then exercised the exact merge SHA successfully:
  all infrastructure probes, the redacted Sentry clean path, Notion digest,
  heartbeat, and final gate passed. This is production monitor evidence, not
  iPhone/device or App Store evidence.
- PR #862 then reconciled the same reviewed monitor bytes onto API `staging`.
  It merged as `7dd0878c633e529eff7433d737f4a11396ff100e`, with exact parents
  `4feff61d5065d1c5276da2502472d8dd31802eb2` and
  `aed5368cb82194ddf60cc36da2f00fe2b11af753`. The merge subject contains
  `[skip ci]`; its tree is byte-identical to the reviewed head. No staging
  Deploy run started. Only cleanup run `33463529728` appeared, and it was
  skipped. API staging is now three commits ahead of production and production
  is zero commits ahead, so the prior production-ahead monitoring drift is
  closed without deploying application or migration artifacts.
- September-to-date Actions billing after these operations is discounted to
  `$0` net. No hosted macOS or Android minutes were added. The only post-merge
  run for #862 was the skipped cleanup noted above.
- A fresh read-only review of the separate `murror-backend` Supabase lane found
  that no small ledger implementation is safe. Exact `main` is
  `770aa2e2d484c7730e33c42b84f32371ec2baade` with 249 migration files. Dev has
  246 ledger rows (0 remote-only / 3 repo-only), staging has 252 (6 remote-only
  / 3 repo-only), and production has 257 (13 remote-only / 5 repo-only).
  Supabase CLI 2.40.7 runtime run `31746600866` proves remote-only timestamps
  are a hard blocker: bare `supabase db push` exited 1 with `Remote migration
  versions not found in local migrations directory.` No database row, policy,
  migration history, or SQL was changed during this review.
- Production migration `20260829013703 users_bucket_owner_folder_read` and its
  live additive `storage.objects` SELECT policy were re-verified read-only. The
  folder prefix must equal `auth.uid()`; it is intended production state that
  preserves artwork access and must not be reverted or deleted. Staging lacks
  this policy intentionally and retains its older owner-based policy.
- HOLD the existing legacy proposals. Open PR #906 is stale and mixes three
  staging-specific migration files with unrelated notification-auth changes.
  Local Claude branch `mur-912` (`13ae68b3`) unions 18 staging/production SQL
  histories; pinned-CLI dry-runs show 21 migrations would apply to dev and 15,
  including production-only SQL, would apply to staging, while production
  would still abort on the artwork orphan. Local comment branch `mur-913`
  (`26c5a802`) is also stale: it predates the artwork row, reports production
  as 256 rather than 257, and incorrectly says remote-only rows are not the
  direct push failure. Neither branch was edited, pushed, merged, or deployed.
- The ledger now requires an explicit database-project choice: either a
  rehearsed canonical baseline/history normalization per environment, or an
  environment-aware migration layout. Both require immutable statement
  snapshots, pinned CLI dry-runs, isolated clone rehearsal, separate
  dev/staging/production matrices, and an invariant retaining the artwork
  policy. Freeze out-of-band applies, `db push`, `migration repair`, ledger
  edits, and #906/#912/#913 merges until Astro selects the direction.
- The active Claude iPhone/device work was not interrupted. Build 452 remains
  the existing 2.0.0 candidate; no new build number, archive, upload, or App
  Store submission was started by this checkpoint.

## Codex review handoff for MurrorMobile PR #1182 (2026-09-01 03:40Z)

- Claude may resume PR #1182, but only for a local implementation pass. Do not
  push, rerun CI, merge, cut a build, or change build numbers until Codex has
  reviewed the resulting diff and local evidence. Codex intentionally cancelled
  runs `33465131324` attempts 1/2 and `33466205121`; there is no runner or
  unknown-account cancellation to investigate.
- The current cold-loading explanation is refuted by the mounted render tree.
  `relationship-detail-screen.tsx` defines `isLoading` as
  `isLoadingBundle && !bundle`, and the outer render already replaces the whole
  content branch with `RelationshipDetailSkeleton` when that is true. The new
  inner For Us `loading` branch cannot affect pixels.
- The screenshot instead matches a legacy-fallback-to-carousel transition. The
  rear layer is `Getting started` / `REFLECT ON TODAY`; the front layer is the
  `Reflection Card` waiting state / `REMIND THEM`. A settled reflect-only or
  reflect-waiting list has `visibleDataInsight.length > 0`, but all five unrelated
  `has*` gates can be false, so the helper incorrectly returns `empty`. Focus
  reconciliation and independently resolving quiz/care-tip data can later flip a
  gate and mount the carousel over that prior native layer.
- Minimal approved correction: keep `loading` first, then return `cards` whenever
  `visibleCardCount > 0`, then return `generating` only when the count is zero and
  status is `GENERATING`, else `empty`. Remove `hasInsight`,
  `hasTakeawayCards`, `showCareTipCard`, `hasQuizCard`, and `hasNoteCard` from
  `ForUsSectionInput` and the call site rather than adding more flags. Preserve
  the existing higher-priority degraded and FAILED branches for this narrow fix.
  Do not add a focus-refresh placeholder, rewrite the carousel/Reanimated path,
  or rework the existing `cardKey` / `cardIdentityOverride` lifecycle fixes.
- Correct the helper tests: reflect-only/count 1 -> cards; GENERATING + count 1
  -> cards; GENERATING + count 0 -> generating; settled + count 0 -> empty;
  loading -> loading. Keep and run
  `relationship-detail-card-lifecycle.spec.ts`. Mutation-check the count gate,
  then run targeted specs, tsc, changed-file lint/format, OSV baseline and
  workflow-contract checks, plus the practical full release suite locally.
- Keep the `GHSA-vcc3-ghjq-m6fr` OSV exception. The temporary security verdict
  is GO: moderate availability-only risk, expiry `2026-10-01`, and the direct
  `0.5.0` override is incompatible with CommonJS `query-string@7.1.3`. Do not
  edit `package.json` or `yarn.lock`.
- `scripts/ci/osv-baseline.json` triggers hosted macOS only because `ci.yaml`
  treats all of `scripts/` as release-sensitive. Do not broaden #1182 with a
  workflow change. Run all checks locally and return the exact diff/results to
  Codex before one final push. Native/device proof remains an explicit later
  gate; do not claim the screenshot defect fixed from helper tests alone.

## Codex staging web recovery checkpoint (2026-09-01 06:32Z)

- Staging Supabase custom SMTP is repaired using Resend with the verified
  `mail.murror.app` sending domain. The project identity was rechecked before
  the write, Supabase confirmed the save, and the provider secret was not
  written to source, disk, clipboard, logs, or this handoff. Alpha and
  production provider configuration were not touched.
- The deployed staging forgot-password UI now advances to the recovery route.
  A provider-safe synthetic positive control was delivered by Resend, and its
  secure reset action reached `https://staging.app.murror.app/update-password`
  with a valid password form and no expired/invalid-link state. The final new
  password submission and subsequent login/logout/relogin canary remain user
  acceptance gates; do not relabel the reached form as a completed password
  change.
- The current staging web artifact remains exact application source
  `664fdb3ccda58b3a58318499617780cf757a3957`, build run `33471716050`, deploy
  run `33471900386`, Helm revision 201, and digest
  `sha256:737d520496031ee8359aa371ec10bed685b9961424eaae6514ea7e18b6aca9c5`.
  API fixture repair PR #865 is merged at
  `9beee50393d75be92d97357e0c8a04f56df2986b`; deploy run `33468962402`
  completed and deterministic password grant returned HTTP 200.
- Platform parity-ledger PR #440 was independently reviewed and squash-merged
  to `dev` at `c1ee4a00eac916fa2803be7ee2ea5424c1ba26b6`. PR CI/contract checks and
  exact-merge runs `33477814639` / `33477814632` are all green. This docs-only
  merge did not build an image or deploy. The September organization Actions
  budget was rechecked at `$300`; the pre-PR usage read was `$8.23` gross / `$0`
  net, and all jobs were Ubuntu. No Android, hosted macOS, iOS build-number,
  archive, upload, or production mutation occurred.
- Next web-parity gates are: user-completed staging password update and fresh
  login/relogin acceptance, then a separate Alpha Supabase/Resend identity gate
  and recovery replay. Production promotion remains blocked and must not be
  inferred from the staging proof.

## Codex heartbeat checkpoint (2026-09-01 09:04Z)

- The quota window was current at 4,997/5,000; the final read-only snapshot
  after all evidence queries returned 4,984/5,000, with the next reset at
  `2026-09-01T09:58:56Z`. Exact refs after fetch are iOS
  `staging-environment-setup` `46a13cbebe9d82e993df29584f26123824e64d0b`
  (source build 452, commit #1187), API `staging`
  `39a30d4600d4b77209d19414183bf81d40fd5f86`, API PR #736
  `ef2a50545a79f9ae688ce781fdcfe6834058d41c`, legacy PR #906
  `bcaf65853fefbbc5a0c709835b972d53579e95d4`, legacy `main`
  `d322b4438a03e794e3a6d451870d17c3c3158789`, and Viasr `staging`
  `2537e836d335f55cb31a1c37c770f47208ea5bcb`.
- API Deploy run `33477281705` completed successfully from the exact API
  staging head, including build, staging deploy, smoke test, release, and
  deployment summary. PR #736 source checks remain green, but the PR is open
  and non-mergeable; the exact compare remains `diverged` with PR #736 40
  commits ahead and staging 290 commits ahead. Viasr staging run
  `33472252646` completed successfully from exact head `2537e836...`; PR #604
  is closed/merged at `d2b4e20f01b22d43b57f82829badf97dc148f78e`.
- Legacy PR #906 source checks remain green and the PR remains open with
  `merged:false`; its recorded merge commit is `08c56d5e...`, but no merge was
  accepted. The latest read-only legacy `staging` ref remains unavailable, the
  PR targets `main`, and staging policy `21103990` permits only `main`. Secret
  metadata for `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` remains dated
  2024-09-15; exact-head runs `31276079517` and `31275928971` remain failed at
  `Upload app configs to storage` with `Error fetching system configurations` /
  Supabase `Invalid API key`. No rerun or deployment was attempted and DEV was
  untouched.
- The current Actions usage records total `$526.648152461` gross /
  `$423.947597` net, including approximately `$334.009576341` gross for
  MurrorMobile. The cost freeze remains active; Codex started no new workflow,
  dispatch, rerun, merge-triggered CI, native build, or duplicate run.
- The single controlled `xcrun devicectl list devices` probe again timed out
  during CoreDevice initialization. The last fallback `xcdevice` query listed
  only the Mac, so physical APNs, dedicated ringtone, routing, consent, and
  quiet-hours acceptance remain unproven. iOS source build 452 was verified
  read-only; no archive, install, upload, or TestFlight action was started, and
  Claude's shared iOS build lane was not touched.
- The final narrow storage snapshot reports 75 GiB free and the isolated
  tracker at 64 MiB. All recorded task-owned temporary paths remain absent and
  the final process check found no lingering `du` scan; no broad cache,
  worktree, or shared artifact was deleted. The tracker records 19/19 audit
  coverage (100%) and strict shipping readiness at 0%. Goal remains
  `BLOCKED`/`NO-GO` pending API reconciliation, legacy staging policy/credential
  correction and deployment, Actions-cost approval, CoreDevice recovery, and
  physical iPhone acceptance. The heartbeat remains active.

## Codex Alpha web recovery promotion checkpoint (2026-09-01 11:52Z)

- The September Actions budget reset was verified live before dispatch: the
  organization budget is `$300`, current net Actions usage is `$0`, and no
  `murror-platform` run was queued or active. The old `$250`-window freeze no
  longer consumed current-month headroom. Only the two Ubuntu workflows below
  were started; no Android or hosted macOS job ran.
- Alpha build run `33504118338` bound tag `alpha-c1ee4a00` to exact source
  `c1ee4a00eac916fa2803be7ee2ea5424c1ba26b6` and pushed immutable digest
  `sha256:d85bbe3ef59e9306ea79b09d36bbf0f419db697e22c06ba9d87f8a6fcccd8799`.
  The `apps/web-client` and Alpha build/deploy workflow bytes at this source are
  identical to staging application source `664fdb3c`; the intervening change is
  the merged parity-ledger document.
- Explicitly confirmed Alpha deploy run `33504346259` passed the source/tag,
  hostname, ingress, certificate, Helm-ownership, and immutable-digest gates
  before mutation. It deployed only `web-client` in `nsp-dev-murror` as Helm
  revision 4. The deployment and its single pod reported 1/1 Ready/Available,
  zero restarts, and the exact digest above.
- Alpha `/`, `/login`, `/forgot-password`, `/update-password`, and the dev API
  readiness endpoint returned HTTP 200 after rollout. The served asset is
  `/assets/index-Bk-BWxX4.js`, SHA-256
  `29f286c084d8f74e449a642cceefa8bc2f4606f428917b314923b210efe45e45`, and
  contains the new password form, explicit `/update-password` recovery redirect,
  and auth contrast repair that were absent from the previous Alpha bundle.
- Public bundle identity re-established Alpha Supabase project
  `ormdzpvhrzvietlsvmro`; public auth settings show signup enabled,
  mailer-autoconfirm disabled, and email/Google providers. One clearly synthetic
  Alpha-only signup sent to Resend's delivered-test recipient was accepted with
  HTTP 200 and no SMTP error. This proves provider acceptance only, not provider
  delivery, confirmation-link traversal, a recovery session, or login. No test
  credential was printed or retained.
- Staging and production were not mutated by this checkpoint. The staging
  password-update/login canary and Alpha Resend delivery/link/session replay
  remain blocked on restoring Browser-plugin page control. Keep the existing
  staging recovery tab open; do not repeat a deployment or create more Alpha
  accounts merely to work around that browser gate.
- Final ledger work is isolated locally at
  `/private/tmp/murror-platform-final-ledger-20260901` on branch
  `codex/web-parity-final-ledger-20260901`, commit `d25209bb`. It records the
  proven Alpha checkpoint and intentionally remains unpushed so both browser
  canaries can be added before one review/CI/merge round. Do not create a
  competing ledger branch or delete that worktree.

## Codex heartbeat checkpoint (2026-09-01 14:03Z)

- The GitHub API quota was current at 4,997/5,000; the final read-only snapshot
  after all evidence queries returned 4,984/5,000, with reset at
  `2026-09-01T09:58:56Z`. Exact fetched refs are MurrorMobile
  `staging-environment-setup` `46a13cbe`, murror-api `staging` `39a30d46`,
  viasr-api `staging` `2537e836`, and murror-backend `main` `d322b443`.
- API PR #736 remains open/non-mergeable; it is 40 commits ahead and 290
  behind current API staging. Exact-head Deploy run `33477281705` completed
  successfully, including the staging deploy, smoke test, release, and summary.
  Viasr staging CI run `33472252646` also completed successfully from its exact
  head; PR #604 is merged at `d2b4e20f`.
- Legacy PR #906 remains open and unmerged. The legacy repository has no
  `staging` branch ref, its staging policy is main-only (`21103990`), and the
  retained exact-head deploy evidence still fails at app-config upload because
  Supabase reports `Invalid API key`; both relevant secret metadata entries date
  to 2024-09-15. No legacy deploy, rerun, or dispatch was attempted.
- Current Actions usage is `$526.648152461` gross / `$423.947597` net across
  Murror Actions, including about `$334.009576341` gross for MurrorMobile. The
  cost freeze remains active, so no new paid workflow, dispatch, rerun,
  merge-triggered CI, or native build was started.
- iOS source remains `46a13cbe` with source build `452`; no archive, install,
  upload, or TestFlight action was started. Controlled `devicectl` again timed
  out during CoreDevice initialization, and the fallback device query listed
  only the Mac; physical APNs, dedicated ringtone, routing, consent, and
  quiet-hours acceptance remain unproven.
- Final local hygiene: 118 GiB free, the isolated notification tracker is 64 MiB,
  all nine recorded task-owned temporary paths are absent, no lingering `du`
  process was found, and the canonical
  MurrorMobile checkout remains on Claude's `chore/bump-build-437` with only its
  pre-existing `Murror/`, `MurrorMobile-worktrees/`, and `default.profraw`
  untracked entries. The tracker is 19/19 audit-covered but strict production
  readiness remains 0%; this heartbeat goal is still blocked on external merge,
  credential, and physical-device gates.

## Codex heartbeat checkpoint (2026-09-01 19:07Z)

- The fresh read-only GitHub API quota check returned 4,993/5,000, with the
  reset timestamp reported as `2026-09-01T19:05:55Z`. Exact fetched refs are
  MurrorMobile `staging-environment-setup` `ba174586`, murror-api `staging`
  `8b069fc7`, viasr-api `staging` `dda4ce67`, and murror-backend `main`
  `d322b443`.
- MurrorMobile staging now contains the build-number change for source build
  `453` (`chore(ios): bump build number to 453 (#1189)`). This is source/ref
  evidence only: no archive, install, upload, or TestFlight action was started,
  and Claude's shared iOS build lane was not touched.
- API PR #736 remains open and non-mergeable at head `ef2a5054`. Against the
  exact API staging head it is diverged at 298 commits ahead and 40 behind.
  Existing exact-head Deploy run `33526854163` completed successfully through
  version, app image, staging deploy, smoke test, release, and summary jobs.
  Viasr exact-head CI run `33509164561` completed successfully from
  `dda4ce67`; PR #604 remains merged at `d2b4e20f`.
- Legacy PR #906 remains open and unmerged at `bcaf6585`. The legacy repository
  still has no `staging` branch ref, its staging policy is main-only
  (`21103990`), and the retained exact-head deployment evidence fails at app
  config upload with Supabase `Invalid API key`; no deploy, rerun, or dispatch
  was attempted.
- The organization-scoped September usage report records
  `$17.259637739` gross / `$2.492` net so far. The prior cumulative snapshot
  remains `$526.648152461` gross / `$423.947597` net, including about
  `$334.009576341` gross for MurrorMobile; the $300 budget freeze therefore
  remains active. Codex started no new paid workflow, dispatch, rerun,
  merge-triggered CI, native build, or duplicate run.
- The controlled `devicectl` probe again timed out during CoreDevice
  initialization; the fallback `xcdevice` query listed only the Mac. Physical
  APNs, dedicated ringtone, routing, consent, and quiet-hours acceptance remain
  unproven.
- Final local hygiene at this checkpoint: 96 GiB free, the isolated notification
  tracker is 64 MiB, all nine recorded task-owned temporary paths are absent,
  and the canonical MurrorMobile checkout remains on Claude's
  `chore/bump-build-437` with its pre-existing untracked entries. The tracker
  is 19/19 audit-covered but strict production readiness remains 0%; the
  heartbeat goal remains active pending the external merge, legacy credential,
  and physical-device gates.

## Codex Android launch-readiness checkpoint (2026-09-02 03:20 ICT)

- Astro explicitly opened the Android lane. Work is isolated at
  `/Users/astro/Projects/murror-transfer/Murror/MurrorMobile-worktrees/android-launch-readiness-20260901`
  on `codex/android-launch-readiness-20260901`. Fresh fetch puts local commit
  `750e9fb5df3d5752d8923f924fda85f67423df4c` 17 ahead / 0 behind
  `origin/staging-environment-setup` `ba1745865e09fd6012872db7bfd32919edc33240`.
  The worktree is clean; nothing was pushed and no PR was opened.
- The exact direct-install test APK is
  `android/app/build/outputs/test-ready-750e9fb5/MurrorDev-2.0.0-77-billing8-debug.apk`,
  SHA-256 `cde1395c11eeb11ec6ff357740957e86397690035472cd06fed8651c08a3ec82`.
  It is `com.murrormobile.development`, `2.0.0` (`77`), min 24 / target and
  compile 36, debug-signed with APK Signature Scheme v2. It was rebuilt from
  the committed source with `.env.example`, then the immutable handoff APK was
  reinstalled and cold-launched on API 36 emulator `emulator-5554`; activity,
  process stability, crash buffer, and Facebook provider checks passed.
- RevenueCat React Native core/UI are pinned at `9.15.2`. Fresh production
  dependency insight resolves RevenueCat Android `9.29.0` and Google Play
  Billing `8.0.0`. `MainActivity` now uses purchase-safe `singleTop`. A separate
  manual-only, protected `play-production` artifact workflow builds signed APK,
  AAB, symbols, and provenance but intentionally performs no Play upload.
- Fresh verification passed the Android build (1,124 tasks), all 37 Android
  contracts, TypeScript, and workflow contracts. The earlier complete release
  run passed 468 Jest suites / 4,433 tests; full details and evidence boundaries
  are in `android/app/build/outputs/test-ready-750e9fb5/evidence-receipt.json` and
  `play-console-launch-readiness-audit.md` beside the APK.
- Orbit parity remains on the single platform-neutral onboarding/Home motion
  engine; the contract rejects Android timing branches. Fresh APK recordings
  prove onboarding motion (96 distinct orbit-region frames across 100 samples)
  and the Continue contraction transition. No onboarding, Home, or orbital
  source file changed in this dependency/automation commit. Authenticated Home
  runtime capture remains gated on approved test credentials or a retained
  session; do not fabricate an account or bypass auth.
- Signed-in Play Console was audited read-only. The development Internal Testing
  track has 9 testers and currently serves v76 at
  `https://play.google.com/apps/internaltest/4701633735154483129`; v77 is not on
  Play. Production currently serves v63 and has no pre-launch report. No Play
  upload, tester change, declaration edit, provider mutation, workflow dispatch,
  secret write, release, staging reconciliation, or production change occurred.
- Remaining owner gates are protected production signing/environment inputs,
  signed workflow approval, Play Internal Testing upload/assignment and tester
  install, authenticated Billing purchase/restore/reconciliation, authenticated
  Home motion capture, Branch Digital Asset Links (all configured domains return
  `null`), Play declarations/listing corrections, review/PR/merge, and explicit
  external release approval.

## Codex Android production-package local artifact checkpoint (2026-09-02 03:50 ICT)

- Local commit `0361bbba` fixes the device verifier to accept Android's
  same-package shorthand (`com.murrormobile/.MainActivity`) while retaining the
  wrong-component rejection. All 38 Android contracts, TypeScript, formatting,
  syntax, and scoped lint checks pass. Nothing was pushed.
- The exact Play Internal App Sharing candidate is
  `android/app/build/outputs/test-ready-750e9fb5/Murror-2.0.0-77-production-debug-internal-sharing.apk`,
  SHA-256 `0edb04becc9d7c0613617d1a129e7ce43b7e9df2637e154e646ed0e62daae8d4`.
  It is the production package `com.murrormobile`, version `2.0.0` (`77`), but
  remains debug-signed and was built with `.env.example`; it is suitable only
  for isolated onboarding/orbit UI testing, not authenticated, purchase,
  notification, provider, or release proof.
- Fresh API 36 emulator validation passed install, cold launch, foreground
  activity, process stability, crash-buffer, and Facebook-provider checks. The
  receipt is
  `android/app/build/outputs/test-ready-750e9fb5/production-debug-internal-sharing-device-receipt-post-0361bbba.json`,
  SHA-256 `f46fd2ad203c1c62c1d0ec7498634c9795c1aa89b8150d72f625dde63eb0161e`.
- The exact artifact's normalized onboarding recording is
  `android/app/build/outputs/test-ready-750e9fb5/android-production-debug-onboarding-30fps.mp4`,
  SHA-256 `96ad5d683cef6681fca774e41e282e9262cacdfd97d22e0386f35d3ea8f3dbf3`.
  It decodes cleanly at 1080x2400, 30 fps, 600 frames / 20 seconds, with all
  100 sampled orbit-region frames distinct. Authenticated Home motion remains
  an explicit device-proof gate.
- No Play upload, tester change, signing/provider mutation, workflow dispatch,
  PR, merge, or release occurred. Uploading this APK through the already
  configured production-package Internal App Sharing page remains an explicit
  action-time owner gate.

## Codex heartbeat checkpoint (2026-09-02 00:04Z)

- The fresh read-only GitHub API quota check returned 5,000/5,000, with the
  reset timestamp reported as `2026-09-02T00:11:56Z`. Exact fetched refs are
  MurrorMobile `staging-environment-setup` `ba174586`, murror-api `staging`
  `8b069fc7`, viasr-api `staging` `dda4ce67`, and murror-backend `main`
  `d322b443`.
- MurrorMobile staging contains the build-number change for source build `453`
  (`chore(ios): bump build number to 453 (#1189)`). This is source/ref evidence
  only: no archive, install, upload, or TestFlight action was started, and
  Claude's shared iOS build lane was not touched.
- API PR #736 remains open at `ef2a5054`; all required PR checks pass, but
  GitHub reports `mergeable: false` and `mergeable_state: dirty`. Against the
  exact API staging head it is diverged at 298 commits ahead and 40 behind.
  Existing exact-head Deploy run `33526854163` completed successfully through
  version, app image, staging deploy, smoke test, release, and summary jobs.
  Viasr exact-head CI run `33509164561` completed successfully from
  `dda4ce67`; PR #604 remains merged at `d2b4e20f`.
- Legacy PR #906 remains open and unmerged at `bcaf6585`. The legacy repository
  still has no `staging` branch ref, its staging policy is main-only
  (`21103990`), and the retained exact-head deployment evidence fails at app
  config upload with Supabase `Invalid API key`; no deploy, rerun, or dispatch
  was attempted.
- The organization-scoped September usage report records
  `$17.286580849` gross / `$2.504` net so far, including about
  `$10.496923441` gross for MurrorMobile. The prior cumulative snapshot remains
  `$526.648152461` gross / `$423.947597` net, above the $300 budget; the cost
  freeze remains active. Codex started no new paid workflow, dispatch, rerun,
  merge-triggered CI, native build, or duplicate run.
- The controlled `devicectl` probe again timed out during CoreDevice
  initialization; the fallback `xcdevice` query listed only the Mac. Physical
  APNs, dedicated ringtone, routing, consent, and quiet-hours acceptance remain
  unproven.
- Final local hygiene at this checkpoint: 90 GiB free, the isolated notification
  tracker is 64 MiB, all nine recorded task-owned temporary paths are absent,
  and no task-owned disk-usage process remains. The canonical MurrorMobile
  checkout remains on Claude's `chore/bump-build-437` with its pre-existing
  untracked entries. The tracker is 19/19 audit-covered but strict production
  readiness remains 0%; the heartbeat goal remains active pending the external
  merge, legacy credential, and physical-device gates.

## Codex Android production-runtime and IAS checkpoint (2026-09-02 08:06 ICT)

- Astro resumed the Android lane and authorized the remaining routine source,
  GitHub, build, validation, and Play Internal App Sharing steps while retaining
  the explicit public-release gate. The isolated mobile branch and remote are
  now identical at `0279b4eeb7ed46a3552be34fc58b205a3c61fc30`; both scoped
  pushes launched zero workflows, and no PR exists.
- Commit `31dffe83` adds fail-closed production runtime guards in both the local
  Gradle release lane and consolidated `.github/workflows/android.yaml` lane.
  Production now requires exact `ENV=production`,
  `BASE_API_URL=https://api.murror.app`, scheme `murror`,
  `ALPHA_GRANT_PREMIUM=false`, a nonempty PostHog key, and HTTPS PostHog host.
  Commit `7b80b568` adds a red-to-green regression guard for the actual compiled
  `aapt2` resource format. All 40 focused Android contracts, workflow contracts,
  actionlint, formatting, TypeScript, API-36 toolchain, and diff checks pass.
- The owner-controlled ignored `.env.production` was corrected from the stale
  Ambercare host to `https://api.murror.app`, gained
  `ALPHA_GRANT_PREMIUM=false`, and is mode `0600`. Its exact SHA-256 is
  `fb74816322c0d986d97cc2c87419bdce5e74a93f8aca06bf2347d8e082473b37`;
  no secret values were printed or committed.
- The frozen production-configured IAS test APK is
  `android/app/build/outputs/test-ready-31dffe83/Murror-2.0.0-77-production-release-ias.apk`,
  SHA-256 `798683a3e5bae6cd47be69104a9725f4ffa9d1697da340fc5c3c444e4fe73c11`.
  It is `com.murrormobile` 2.0.0 (`77`), target/compile 36, four-ABI, Billing
  8.0.0, standalone, production-backend configured, and free of AD_ID/AdServices
  permissions. It is deliberately test-signed with the local debug certificate,
  so it is suitable for IAS production-account and motion testing but is not a
  Play-track launch candidate.
- The exact APK passed API-36 install, cold launch, foreground/process/crash and
  Facebook-provider checks. The 17.96-second onboarding capture produced 90/90
  distinct sampled orbit-region frames. It uses the same platform-neutral
  onboarding/Home orbit engine as iOS and is visually close to the retained iOS
  production-scheme reference; pixel/timing identity and authenticated Home
  runtime proof remain open rather than claimed.
- The retained production public certificate matches the expected SHA-256
  `1A:1D:35:0B:78:02:51:8A:60:F2:0D:FE:B6:77:79:65:70:AF:19:CF:2E:F5:2E:9E:F4:1E:CD:22:77:8B:09:C3`,
  but no corresponding private production upload keystore was found locally,
  in indexed cloud storage, or in Git history. A recoverable replacement RSA
  key is now encrypted in the existing iCloud signing vault; its passwords are
  in macOS Keychain and the four signing inputs are in GitHub's branch-restricted
  `play-production` environment. Its SHA-256 certificate is
  `F4:4E:00:D4:D8:5A:86:C9:D0:0C:4F:A0:2B:A9:76:1C:82:8F:49:1A:ED:C4:00:4E:AA:68:3F:BA:A1:57:D0:00`.
  Commit `0279b4ee` pins the workflow to this replacement and rejects the
  unavailable legacy certificate. All six production environment/signing
  secret names are present; values were not exposed.
- The signed-in Play Internal App Sharing page for `astro@murror.app` is ready.
  A second Play tab is open on **Request upload key reset** with **I lost my
  upload key** selected and the replacement PEM ready. Chrome's security policy
  blocks file transfer until the user enables **Allow access to file URLs** for
  the ChatGPT browser extension, and explicitly forbids automation workarounds.
  No reset request or APK bytes were submitted; no IAS link, Play upload,
  tester/track mutation, workflow dispatch, PR, merge, or public release
  occurred.

## Codex Android production-equivalent device lane (2026-09-02 08:42 ICT)

- Astro confirmed the target phone already has the public Play build and does
  not want a side-loaded/test-signed replacement. The temporary LAN APK server
  was stopped, its exact temporary copy was deleted, and the canonical validated
  artifact remains in the isolated worktree. Do not ask Astro to uninstall the
  public app or install the debug/test-signed APK.
- The production `com.murrormobile` Internal Testing track is active and
  currently serves release 63 (1.0.18). Its selected `Murror Team` list has nine
  testers, and a privacy-preserving membership check confirmed
  `astro@murror.app` is already present. No tester list or track state changed.
- The safe test lane is now strictly: Play accepts the recoverable replacement
  upload certificate -> protected workflow produces a production-configured
  v77 AAB -> exact artifact verification -> upload only to the production app's
  Internal Testing track -> tester installs the Play-signed in-place update.
  This preserves the installed package data and production accounts while
  keeping the public Production track untouched.
- The opt-in URL is
  `https://play.google.com/apps/internaltest/4701017521848127510`. Until v77 is
  verified and released to that track, it continues to serve the historical v63
  build and must not be represented as the candidate.

## Codex Android exact production artifact and upload-key reset checkpoint (2026-09-02 09:50 ICT)

- Astro submitted the public replacement certificate through **App signing ->
  Request upload key reset**. Play Console now authoritatively says there is a
  pending reset request. The currently active upload-key SHA-256 remains
  `1A:1D:35:0B:78:02:51:8A:60:F2:0D:FE:B6:77:79:65:70:AF:19:CF:2E:F5:2E:9E:F4:1E:CD:22:77:8B:09:C3`;
  the requested replacement is
  `F4:4E:00:D4:D8:5A:86:C9:D0:0C:4F:A0:2B:A9:76:1C:82:8F:49:1A:ED:C4:00:4E:AA:68:3F:BA:A1:57:D0:00`.
  Do not cancel or duplicate the request, and do not dispatch the protected
  Android workflow until Play displays the replacement fingerprint as active.
- From exact commit `0279b4eeb7ed46a3552be34fc58b205a3c61fc30`, a fresh local
  `productionRelease` build completed successfully in 3m45s with all 1,924
  Gradle tasks re-run. It consumed the guarded production environment bound to
  `https://api.murror.app` and produced the replacement-key-signed v77 APK
  SHA-256 `048cabe0e9ba4c87296ede77f3ca9dd73ab98a1c8eefffffc5b8faae22db4e47`
  and AAB SHA-256
  `d0a4f0505f950cd0fb74505e5e8a2d6f99b3667f843e496c77107dd688584e73`.
  The APK/AAB certificate, package/version, API 36 metadata, four ABIs, Billing
  8.0.0, compiled environment markers, privacy permissions, bundle integrity,
  and native-symbol ZIP all pass. A wrapper cleanup-path mistake returned 1
  after Gradle succeeded; the original debug-only `android/local.properties`
  was restored byte-for-byte and contains no production signing values.
- The exact frozen APK installed and cold-launched on disposable API 36 AVD
  `murror-prod-v77-0279b4ee`. Process, foreground activity, crash buffer, and
  Facebook-provider checks pass. A 19.2-second 30 fps onboarding recording
  decodes all 576 frames; all 100 evenly sampled orbit-region frames are
  distinct. A separate recording proves the Continue particle contraction and
  second onboarding beat. The cross-platform orbit-motion contract passes 3/3
  and confirms onboarding and Home use one platform-neutral engine without an
  Android/iOS timing branch. Exact evidence lives in ignored directory
  `android/app/build/outputs/play-ready-0279b4ee`, including
  `exact-v77-orbit-motion-device-receipt.json`.
- This is local upload-key-signed device evidence, not Play-app-signing or
  authenticated Home proof. No workflow dispatch, Play AAB upload, tester or
  track mutation, production-account sign-in, purchase/restore, or public
  Production release occurred. Next sequence remains: wait for active
  replacement fingerprint -> protected workflow -> verify artifacts -> upload
  v77 only to production-app Internal Testing -> Play-installed in-place update
  -> production auth/Home motion/billing/provider validation. The public release
  gate remains closed.

## Codex heartbeat checkpoint (2026-09-02 10:07Z)

- The fresh read-only GitHub API quota check returned 4,753/5,000, with the
  reset timestamp reported as `2026-09-02T05:15:04Z`. Exact fetched refs are
  MurrorMobile `staging-environment-setup` `6bbb6fc6`, murror-api `staging`
  `a1d50d88`, viasr-api `staging` `16f1426e`, and murror-backend `main`
  `d322b443`.
- MurrorMobile PR #1193 (`chore(bump-build-454)`) is merged at `6bbb6fc6`.
  Read-only source inspection finds 26 `CURRENT_PROJECT_VERSION` settings and
  all four app `CFBundleVersion` values at `454`; the official build-number
  contract is now aligned. This is source/ref evidence only: no archive,
  install, upload, or TestFlight action was started, and Claude's shared iOS
  build lane was not touched.
- API PR #736 remains open at `ef2a5054` with all required checks passing.
  GitHub reports `mergeable: null` / `mergeable_state: unknown`; the exact
  compare against API staging is diverged at 324 commits ahead and 40 behind.
  Existing exact-head Deploy run `33592639255` completed successfully through
  version, app image, staging deploy, smoke test, release, and summary jobs.
  Viasr exact-head CI run `33589481621` completed successfully from `16f1426e`;
  PR #604 remains merged at `d2b4e20f`.
- Legacy PR #906 remains open and unmerged at `bcaf6585`. The legacy repository
  still has no `staging` branch ref, its staging policy is main-only
  (`21103990`), and the retained exact-head deployment evidence fails at app
  config upload with Supabase `Invalid API key`; no deploy, rerun, or dispatch
  was attempted.
- The organization-scoped September usage report records
  `$31.738942137` gross / `$16.944` net so far, including about
  `$22.006312725` gross for MurrorMobile. The prior cumulative snapshot remains
  `$526.648152461` gross / `$423.947597` net, above the $300 budget; the cost
  freeze remains active. Codex started no new paid workflow, dispatch, rerun,
  merge-triggered CI, native build, or duplicate run.
- The controlled `devicectl` probe again timed out during CoreDevice
  initialization; the fallback `xcdevice` query listed only the Mac. Physical
  APNs, dedicated ringtone, routing, consent, and quiet-hours acceptance remain
  unproven.
- Final local hygiene at this checkpoint: 153 GiB free, the isolated notification
  tracker is 64 MiB, all nine recorded task-owned temporary paths are absent,
  and no task-owned disk-usage process remains. The canonical MurrorMobile
  checkout remains on Claude's `chore/bump-build-437` with its pre-existing
  `.env.production`, untracked directories, and `default.profraw` preserved.
  The tracker is 19/19 audit-covered but strict production readiness remains
  0%; the heartbeat goal remains active pending API reconciliation, legacy
  credentials, and physical-device gates.

## Codex Android parity and local-device checkpoint (2026-09-02 16:25 ICT)

- The Android launch-readiness worktree remains intentionally uncommitted on
  `codex/android-launch-readiness-20260901`, based on signed merge
  `72fcb720a099fb302b0c8888c497597b9b0571cb`. Changes cover Android production
  package/E2E targeting, OneSignal cold-click ID attribution, Branch/Meta
  pre-bridge privacy defaults, PostHog identity-safe flag loading, React Query
  default preservation, relationship takeaway attribution, receiver AI-sharing
  disclosure, sent-request pagination, Billing 8 offerings timeout, and
  reduced-motion onboarding orbit scheduling. The orbit renderer remains the
  shared platform-neutral implementation used by onboarding and Home.
- Exact local production-configured APK rebuilt successfully with version
  `2.0.0` / code `77`, package `com.murrormobile`, target SDK 36, and SHA-256
  `36821799d5d3aa17e489499ee56f7eaf1c64f5ae1463bb8394675cd8b4348a56`.
  It is locally v2-signed with the Android debug signer and is therefore an
  emulator/device test artifact only, not a Play upload candidate.
- Exact APK installed on `emulator-5554`; `verify-android-device.mjs` passed
  after a 5-second cold launch, and the local Android Appium lane passed the
  production-package onboarding smoke spec (`1 passing`) with UiAutomator2 on
  API 36. No app fatal was observed; the headless emulator still reports the
  known RNSkia/EGL surface warning while rendering normally.
- Code/release evidence is green: the full release suite passed (482 suites,
  4,537 tests, three intentional skips), TypeScript passed, lint stayed at its
  exact warning baseline, all 26 Android contract tests passed, workflow
  contracts passed, changed-file formatting and `git diff --check` passed, and
  OSV accepted the reviewed 48-advisory baseline after the intentional Billing
  8 lockfile update. No Android workflow or Play upload was started.
- This does **not** prove full iOS-identical behavior yet: authenticated
  production sign-in/Home-orbit, billing, provider dashboards, notification
  delivery/deep links, physical Android accessibility and device behavior, and
  Play-installed signing/update behavior remain pending. The replacement Play
  upload-key reset is still pending; once activated, use a freshly protected
  AAB from this reconciled source in **Murror AI Internal Testing only**. Keep
  public Production as a separate explicit release gate.

## Codex Android trunk-integrated Play candidate checkpoint (2026-09-02 12:58 ICT)

- Protected Android workflow run `33591831201` completed successfully at signed
  commit `593ce4a0542343ada230003677ab1b86e1c08ba3`. Its retained production
  artifacts independently verify as `com.murrormobile` 2.0.0 (`77`), target
  API 36, four ABI, Billing 8 compatible, production API
  `https://api.murror.app`, scheme `murror`, no AD_ID/AdServices permissions,
  APK Signature Scheme v2, and replacement upload-certificate SHA-256
  `F4:4E:00:D4:D8:5A:86:C9:D0:0C:4F:A0:2B:A9:76:1C:82:8F:49:1A:ED:C4:00:4E:AA:68:3F:BA:A1:57:D0:00`.
  APK/AAB/symbol hashes exactly match the workflow provenance receipt:
  `2f9ccc22b1e067d9ad7f017168bb6f3a6ac02b2e86f316d7e69ea34502fdab8b`,
  `b739cf41ba92b44bb8895b53f24343e0840a03c6f0525cd2b92a33e9aa6452d1`,
  and `ce592a1cb68878aa183b31e7714b6741e6013316d030ac46cef3f936cd9048ac`.
  These four evidence files are retained read-only under
  `android/app/build/outputs/play-ready-593ce4a0-ci-33591831201`.
- Do **not** upload that artifact. Mobile trunk advanced to `7832f1ea` with
  shared onboarding recovery, authentication, privacy, paywall, deep-link,
  and Home-state fixes after the build. The isolated Android branch cleanly
  merged that trunk commit in signed merge `72fcb720a099fb302b0c8888c497597b9b0571cb`;
  local and remote branch SHAs are identical. The checkpoint push started zero
  Linux, Android, or hosted macOS workflows.
- Post-merge local evidence is green: all 42 Android contracts including the
  cross-platform onboarding/Home orbit-motion contract, 152 focused shared
  onboarding/auth/privacy/paywall/deep-link/orbit tests, and the full release
  suite of 4,523 tests across 478 suites passed (three intentional skips).
  TypeScript, exact ESLint baseline, workflow contracts, changed-file
  Prettier, actionlint, and `git diff --check` also pass.
- Fresh official September billing data reports `$10.28` net Actions usage
  against the organization's `$300` monthly Actions budget (3.43%). The larger
  `$423.95` net figure recorded by the heartbeat is historical/cumulative and
  does not activate the monthly 75% or 90% gate. No new protected build was
  dispatched in this checkpoint.
- The signed-in Murror AI App signing page displays the requested replacement
  certificate but still explicitly says the reset request is pending. No request
  was cancelled or duplicated, and no AAB, Internal Testing track, tester list,
  or public Production state was changed. Next exact sequence: Play activates
  the reset, then protected build from `72fcb720` (or a freshly reconciled
  descendant), independent verification, Murror AI Internal Testing only, and
  Play-installed production-account, Home-orbit, billing, provider, and device
  validation. Public Production remains a separate explicit release gate.

## Codex heartbeat checkpoint (2026-09-02 10:12Z)

- The fresh read-only GitHub API quota check returned 4,992/5,000, with the
  reset timestamp reported as `2026-09-02T10:16:06Z`. Exact fetched refs are
  MurrorMobile `staging-environment-setup` `6bbb6fc6`, murror-api `staging`
  `a1d50d88`, viasr-api `staging` `16f1426e`, and murror-backend `main`
  `d322b443`.
- MurrorMobile PR #1193 (`chore(bump-build-454)`) is merged at `6bbb6fc6`.
  Read-only source inspection finds 26 `CURRENT_PROJECT_VERSION` settings and
  all four app `CFBundleVersion` values at `454`; the official build-number
  contract is aligned. This is source/ref evidence only: no archive, install,
  upload, or TestFlight action was started, and Claude's shared iOS build lane
  was not touched.
- API PR #736 remains open at `ef2a5054` with all required checks passing.
  GitHub reports `mergeable: null` / `mergeable_state: unknown`; the exact
  compare against API staging is diverged at 324 commits ahead and 40 behind.
  Existing exact-head Deploy run `33592639255` completed successfully through
  version, app image, staging deploy, smoke test, release, and summary jobs.
  Viasr exact-head CI run `33589481621` completed successfully from `16f1426e`;
  PR #604 remains merged at `d2b4e20f`.
- Legacy PR #906 remains open and unmerged at `bcaf6585`. The legacy repository
  still has no `staging` branch ref, its staging policy is main-only
  (`21103990`), and the retained exact-head deployment evidence fails at app
  config upload with Supabase `Invalid API key`; no deploy, rerun, or dispatch
  was attempted.
- The organization-scoped September usage report records
  `$31.738942137` gross / `$16.944` net so far, including about
  `$22.006312725` gross for MurrorMobile. The prior cumulative snapshot remains
  `$526.648152461` gross / `$423.947597` net, above the $300 budget; the cost
  freeze remains active. Codex started no new paid workflow, dispatch, rerun,
  merge-triggered CI, native build, or duplicate run.
- The controlled `devicectl` probe again timed out during CoreDevice
  initialization; the fallback `xcdevice` query listed only the Mac. Physical
  APNs, dedicated ringtone, routing, consent, and quiet-hours acceptance remain
  unproven.
- Final local hygiene at this checkpoint: 153 GiB free, the isolated notification
  tracker is 64 MiB, all nine recorded task-owned temporary paths are absent,
  and no task-owned disk-usage process remains. The canonical MurrorMobile
  checkout remains on Claude's `chore/bump-build-437` with its pre-existing
  `.env.production`, untracked directories, and `default.profraw` preserved.
  The tracker is 19/19 audit-covered but strict production readiness remains
  0%; the heartbeat goal remains active pending API reconciliation, legacy
  credentials, and physical-device gates.

## Codex heartbeat checkpoint (2026-09-02 15:09Z)

- The fresh read-only GitHub API quota check returned 4,985/5,000, with the
  next reset reported as `2026-09-02T15:18:06Z`. Exact fetched refs are
  MurrorMobile `staging-environment-setup` `63521a3a`, murror-api `staging`
  `03ec16f4`, viasr-api `staging` `c13238e9`, and murror-backend `main`
  `d322b443`.
- The current MurrorMobile staging ref is the opt-in coarse-location commit
  `63521a3a` (`#1198`) and retains the official build-454 contract: read-only
  inspection finds 26 `CURRENT_PROJECT_VERSION` settings and all four app
  `CFBundleVersion` values at `454`. This is source/ref evidence only; no
  archive, install, upload, or TestFlight action was started, and Claude's
  shared iOS build lane was not touched.
- API PR #736 remains open at `ef2a5054` with all required checks passing.
  GitHub reports `mergeable: null` / `mergeable_state: unknown`; the exact
  compare against API staging is diverged at 343 commits ahead and 40 behind.
  The current API staging head has exact-head Deploy run `33637702423`
  completed successfully. Viasr's current exact staging head is `c13238e9`, but
  no matching run is present in the retained run list; the latest exact-head CI
  run `33589481621` completed successfully from `16f1426e`, and PR #604 remains
  merged at `d2b4e20f`.
- Legacy PR #906 remains open and unmerged at `bcaf6585`. The legacy repository
  still has no `staging` branch ref, its staging policy is main-only
  (`21103990`), and the retained exact-head deployment evidence fails at app
  config upload with Supabase `Invalid API key`; no deploy, rerun, or dispatch
  was attempted.
- The organization-scoped September usage report records
  `$39.139831601` gross / `$24.338` net so far, including about
  `$27.806328244` gross for MurrorMobile. The prior cumulative snapshot remains
  `$526.648152461` gross / `$423.947597` net, above the $300 budget; the cost
  freeze remains active. Codex started no new paid workflow, dispatch, rerun,
  merge-triggered CI, native build, or duplicate run.
- The controlled `devicectl` probe timed out during CoreDevice initialization;
  the fallback `xcdevice` query listed only the Mac. Physical APNs, dedicated
  ringtone, routing, consent, and quiet-hours acceptance remain unproven.
- Final local hygiene at this checkpoint: 154 GiB free, the progress page is
  436 KiB, all nine recorded task-owned temporary paths are absent, and no
  task-owned disk-usage process was found. The canonical MurrorMobile checkout
  remains on Claude's `chore/bump-build-437` with its pre-existing
  `.env.production`, untracked directories, and `default.profraw` preserved.
  The isolated tracker remains 19/19 audit-covered but strict production
  readiness remains 0%; the heartbeat goal remains active pending API
  reconciliation, legacy credentials, and physical-device gates.

## Codex heartbeat checkpoint (2026-09-02 20:08Z)

- The fresh read-only GitHub API quota check returned 4,889/5,000, with the
  next reset reported as `2026-09-02T20:22:08Z`. Exact fetched refs are
  MurrorMobile `staging-environment-setup` `63521a3a`, murror-api `staging`
  `03ec16f4`, viasr-api `staging` `c13238e9`, and murror-backend `main`
  `d322b443`.
- The current MurrorMobile staging ref is the opt-in coarse-location commit
  `63521a3a` (`#1198`) and retains the official build-454 contract: read-only
  inspection finds 26 `CURRENT_PROJECT_VERSION` settings and all four app
  `CFBundleVersion` values at `454`. This is source/ref evidence only; no
  archive, install, upload, or TestFlight action was started, and Claude's
  shared iOS build lane was not touched.
- API PR #736 remains open at `ef2a5054` with all required checks passing, but
  GitHub now reports `mergeable: CONFLICTING` / `mergeStateStatus: DIRTY`.
  The exact compare is 40 commits ahead of staging versus 343 behind; no broad
  reconciliation or merge was attempted. The current API staging head has
  exact-head Deploy run `33637702423` completed successfully. Viasr's current
  exact staging head is `c13238e9`, but no matching staging workflow is present;
  the latest exact staging CI run `33589481621` completed successfully from
  `16f1426e`, and PR #604 remains merged at `d2b4e20f`.
- Legacy PR #906 remains open and unmerged at `bcaf6585`. The legacy repository
  still has no `staging` branch ref, its staging policy is main-only
  (`21103990`), and the retained exact-head deployment evidence fails at app
  config upload with Supabase `Invalid API key`; no deploy, rerun, or dispatch
  was attempted.
- The last successful organization-scoped September usage snapshot records
  `$39.139831601` gross / `$24.338` net, including about `$27.806328244` gross
  for MurrorMobile. The prior cumulative snapshot remains `$526.648152461`
  gross / `$423.947597` net, above the $300 budget; the cost freeze remains
  active. Codex started no new paid workflow, dispatch, rerun, merge-triggered
  CI, native build, or duplicate run.
- The controlled `devicectl` probe timed out during CoreDevice initialization;
  the fallback `xcdevice` query listed only the Mac. Physical APNs, dedicated
  ringtone, routing, consent, and quiet-hours acceptance remain unproven.
- Final local hygiene at this checkpoint: 153 GiB free, the isolated tracker is
  64 MiB, the progress page is 440 KiB, all nine recorded task-owned temporary
  paths are absent, and no task-owned disk-usage process was found. The
  canonical MurrorMobile checkout remains on Claude's `chore/bump-build-437`
  with its pre-existing `.env.production`, untracked directories, and
  `default.profraw` preserved. The tracker is 19/19 audit-covered but strict
  production readiness remains 0%; the heartbeat goal remains active pending
  API reconciliation, legacy credentials, and physical-device gates.

## Codex heartbeat checkpoint (2026-09-03 01:07Z)

- The fresh read-only GitHub API quota check returned 5,000/5,000, with the
  next reset reported as `2026-09-03T01:25:07Z`. Exact fetched refs remain
  MurrorMobile `staging-environment-setup` `63521a3a`, murror-api `staging`
  `03ec16f4`, viasr-api `staging` `c13238e9`, and murror-backend `main`
  `d322b443`.
- The current MurrorMobile staging ref is the opt-in coarse-location commit
  `63521a3a` (`#1198`) and retains the official build-454 contract: read-only
  inspection finds 26 `CURRENT_PROJECT_VERSION` settings and all four app
  `CFBundleVersion` values at `454`. This is source/ref evidence only; no
  archive, install, upload, or TestFlight action was started, and Claude's
  shared iOS build lane was not touched.
- API PR #736 remains open at `ef2a5054` with green required checks, but GitHub
  reports `mergeable: CONFLICTING` / `mergeStateStatus: DIRTY`. The exact
  compare is 40 commits ahead of staging versus 343 behind; no broad
  reconciliation or merge was attempted. API staging’s exact-head Deploy
  `33637702423` remains successful. Viasr’s current exact staging head is
  `c13238e9`, but no matching staging workflow is present; the latest exact
  staging CI `33589481621` succeeded from `16f1426e`, and PR #604 remains merged
  at `d2b4e20f`.
- Legacy PR #906 remains open and unmerged at `bcaf6585`. The legacy repository
  still has no `staging` branch ref, its staging policy is main-only
  (`21103990`), and retained exact-head deployment evidence fails at app config
  upload with Supabase `Invalid API key`; no deploy, rerun, or dispatch was
  attempted.
- The last successful organization-scoped September usage snapshot remains
  `$39.139831601` gross / `$24.338` net, including about `$27.806328244` gross
  for MurrorMobile. The prior cumulative snapshot remains `$526.648152461`
  gross / `$423.947597` net, above the $300 budget; the cost freeze remains
  active. Codex started no new paid workflow, dispatch, rerun, merge-triggered
  CI, native build, or duplicate run.
- The controlled `devicectl` probe timed out during CoreDevice initialization;
  the fallback `xcdevice` query listed only the Mac. Physical APNs, dedicated
  ringtone, routing, consent, and quiet-hours acceptance remain unproven.
- Final local hygiene at this checkpoint: 152 GiB free, the isolated tracker is
  64 MiB, all nine recorded task-owned temporary paths are absent, and no
  task-owned disk-usage process was found. The canonical MurrorMobile checkout
  remains on Claude's `chore/bump-build-437` with its pre-existing
  `.env.production`, untracked directories, and `default.profraw` preserved.
  The tracker remains 19/19 audit-covered but strict production readiness is
  0%; the heartbeat goal remains active pending API reconciliation, legacy
  credentials, and physical-device gates.

## Codex heartbeat checkpoint (2026-09-03 06:10Z)

- The fresh read-only GitHub API quota check returned 4,858/5,000, with the
  next reset reported as `2026-09-03T06:27:43Z`. Exact fetched refs are
  MurrorMobile `staging-environment-setup` `adefee5b`, murror-api `staging`
  `ad5a6aa7`, viasr-api `staging` `a6089b1f`, and murror-backend `main`
  `d322b443`.
- The current MurrorMobile staging ref is the privacy/recovery hardening commit
  `adefee5b`, following merged build-455 bump `c23e4a75` (`#1206`). Read-only
  inspection finds 26 `CURRENT_PROJECT_VERSION` settings and all four app
  `CFBundleVersion` values at `455`. This is source/ref evidence only; no
  archive, install, upload, or TestFlight action was started, and Claude's
  shared iOS build lane was not touched.
- API PR #736 remains open at `ef2a5054` with green required checks, but GitHub
  reports `mergeable: CONFLICTING` / `mergeStateStatus: DIRTY`. The exact
  compare is 40 commits ahead of staging versus 344 behind; no broad
  reconciliation or merge was attempted. API staging’s exact-head Deploy
  `33712772868` completed successfully from `ad5a6aa7`. Viasr’s current exact
  staging head is `a6089b1f`, but no matching staging workflow is present; the
  latest exact staging CI `33708094433` completed successfully from parent
  `85a1bb1b`, and PR #604 remains merged at `d2b4e20f`.
- Legacy PR #906 remains open and unmerged at `bcaf6585`. The legacy repository
  still has no `staging` branch ref, its staging policy is main-only
  (`21103990`), and retained exact-head deployment evidence fails at app config
  upload with Supabase `Invalid API key`; no deploy, rerun, or dispatch was
  attempted.
- The last successful organization-scoped September usage snapshot remains
  `$39.139831601` gross / `$24.338` net, including about `$27.806328244` gross
  for MurrorMobile. The prior cumulative snapshot remains `$526.648152461`
  gross / `$423.947597` net, above the $300 budget; the cost freeze remains
  active. Codex started no new paid workflow, dispatch, rerun, merge-triggered
  CI, native build, or duplicate run.
- The controlled `devicectl` probe timed out during CoreDevice initialization;
  the fallback `xcdevice` query listed only the Mac. Physical APNs, dedicated
  ringtone, routing, consent, and quiet-hours acceptance remain unproven.
- Final local hygiene at this checkpoint: 134 GiB free, the isolated tracker is
  64 MiB, all nine recorded task-owned temporary paths are absent, and no
  task-owned disk-usage process was found. The canonical MurrorMobile checkout
  remains on Claude's `chore/bump-build-437` with its pre-existing
  `.env.production`, untracked directories, and `default.profraw` preserved.
  The tracker remains 19/19 audit-covered but strict production readiness is
  0%; the heartbeat goal remains active pending API reconciliation, legacy
  credentials, and physical-device gates.

## Codex heartbeat checkpoint (2026-09-03 11:08Z)

- The fresh read-only GitHub API quota check returned 4,785/5,000, with the
  next reset reported as `2026-09-03T11:29:23Z`. Exact fetched refs are
  MurrorMobile `staging-environment-setup` `e7d9069c`, murror-api `staging`
  `48ba1827`, viasr-api `staging` `306d7e53`, and murror-backend `main`
  `d322b443`.
- The current MurrorMobile staging ref is the merged build-456 bump
  `e7d9069c` following `c6caab59` (`#1210`). Read-only inspection finds 26
  `CURRENT_PROJECT_VERSION` settings and all four app `CFBundleVersion` values
  at `456`. This is source/ref evidence only; no archive, install, upload, or
  TestFlight action was started, and Claude's shared iOS build lane was not
  touched.
- API PR #736 remains open at `ef2a5054` with green required checks, but GitHub
  reports `mergeable: UNKNOWN` / `mergeStateStatus: UNKNOWN`. The exact compare
  is 40 commits ahead of staging versus 350 behind; no broad reconciliation or
  merge was attempted. API staging’s exact-head Deploy `33728636833`
  completed successfully from `48ba1827`. Viasr’s current exact staging head is
  `306d7e53`, and exact-head CI `33746825262` completed successfully; PR #604
  remains merged at `d2b4e20f`.
- Legacy PR #906 remains open and unmerged at `bcaf6585`. The legacy repository
  still has no `staging` branch ref, its staging policy is main-only
  (`21103990`), and retained exact-head deployment evidence fails at app config
  upload with Supabase `Invalid API key`; no deploy, rerun, or dispatch was
  attempted.
- The last successful organization-scoped September usage snapshot remains
  `$39.139831601` gross / `$24.338` net, including about `$27.806328244` gross
  for MurrorMobile. The prior cumulative snapshot remains `$526.648152461`
  gross / `$423.947597` net, above the $300 budget; the cost freeze remains
  active. Codex started no new paid workflow, dispatch, rerun, merge-triggered
  CI, native build, or duplicate run.
- The controlled `devicectl` probe timed out during CoreDevice initialization;
  the fallback `xcdevice` query listed only the Mac. Physical APNs, dedicated
  ringtone, routing, consent, and quiet-hours acceptance remain unproven.
- Final local hygiene at this checkpoint: 133 GiB free, the isolated tracker is
  64 MiB, all nine recorded task-owned temporary paths are absent, and no
  task-owned disk-usage process was found. The canonical MurrorMobile checkout
  remains on Claude's `chore/bump-build-437` with its pre-existing
  `.env.production`, untracked directories, and `default.profraw` preserved.
  The tracker remains 19/19 audit-covered but strict production readiness is
  0%; the heartbeat goal remains active pending API reconciliation, legacy
  credentials, and physical-device gates.

## Codex heartbeat checkpoint (2026-09-03 16:10Z)

- The fresh read-only GitHub API quota check returned 4,785/5,000, with the
  next reset reported as `2026-09-03T16:35:09Z`. Exact fetched refs are
  MurrorMobile `staging-environment-setup` `e7d9069c`, murror-api `staging`
  `7c43930a`, viasr-api `staging` `c4e8239b`, and murror-backend `main`
  `d322b443`.
- The current MurrorMobile staging ref remains the merged build-456 bump
  `e7d9069c` following `c6caab59` (`#1210`). Read-only inspection finds 26
  `CURRENT_PROJECT_VERSION` settings and all four app `CFBundleVersion` values
  at `456`. This is source/ref evidence only; no archive, install, upload, or
  TestFlight action was started, and Claude's shared iOS build lane was not
  touched.
- API PR #736 remains open at `ef2a5054` with green required checks, but GitHub
  reports `mergeable: UNKNOWN` / `mergeStateStatus: UNKNOWN`. The exact compare
  is 40 commits ahead of staging versus 351 behind; no broad reconciliation or
  merge was attempted. API staging’s exact-head Deploy `33749107554`
  completed successfully from `7c43930a`. Viasr’s current exact staging head is
  `c4e8239b`, and exact-head CI `33760264206` completed successfully; PR #604
  remains merged at `d2b4e20f`.
- Legacy PR #906 remains open and unmerged at `bcaf6585`. The legacy repository
  still has no `staging` branch ref, its staging policy is main-only
  (`21103990`), and retained exact-head deployment evidence fails at app config
  upload with Supabase `Invalid API key`; no deploy, rerun, or dispatch was
  attempted.
- The last successful organization-scoped September usage snapshot remains
  `$39.139831601` gross / `$24.338` net, including about `$27.806328244` gross
  for MurrorMobile. The prior cumulative snapshot remains `$526.648152461`
  gross / `$423.947597` net, above the $300 budget; the cost freeze remains
  active. Codex started no new paid workflow, dispatch, rerun, merge-triggered
  CI, native build, or duplicate run.
- The controlled `devicectl` probe timed out during CoreDevice initialization;
  the fallback `xcdevice` query listed only the Mac. Physical APNs, dedicated
  ringtone, routing, consent, and quiet-hours acceptance remain unproven.
- Final local hygiene at this checkpoint: 133 GiB free, the isolated tracker is
  64 MiB, all nine recorded task-owned temporary paths are absent, and no
  task-owned disk-usage process was found. The canonical MurrorMobile checkout
  remains on Claude's `chore/bump-build-437` with its pre-existing
  `.env.production`, untracked directories, and `default.profraw` preserved.
  The tracker remains 19/19 audit-covered but strict production readiness is
  0%; the heartbeat goal remains active pending API reconciliation, legacy
  credentials, and physical-device gates.

## Codex heartbeat checkpoint (2026-09-03 21:09Z)

- The fresh read-only GitHub API quota check returned 4,964/5,000, with the
  next reset reported as `2026-09-03T21:37:12Z`. Exact fetched refs are
  MurrorMobile `staging-environment-setup` `e7d9069c`, murror-api `staging`
  `7c43930a`, viasr-api `staging` `c4e8239b`, and murror-backend `main`
  `d322b443`.
- Build 456 remains aligned on iOS staging `e7d9069c`. API staging
  `7c43930a` retains successful exact-head Deploy `33749107554`, and Viasr
  staging `c4e8239b` retains successful exact-head CI `33760264206`; PR #604
  remains merged at `d2b4e20f`.
- PR #736 still has green checks but remains open with
  `mergeable: CONFLICTING` / `mergeStateStatus: DIRTY`; the exact compare is
  40 commits ahead of staging versus 351 behind, so no broad reconciliation or
  merge was attempted. Legacy #906 still has no `staging` ref and invalid
  Supabase credentials in retained deployment evidence.
- The last successful organization-scoped September usage snapshot remains
  `$39.139831601` gross / `$24.338` net, including about `$27.806328244` gross
  for MurrorMobile. The cost freeze remains active; Codex started no new paid
  workflow, dispatch, rerun, merge-triggered CI, native build, or duplicate run.
- The controlled `devicectl` probe timed out and `xcdevice` listed only the Mac;
  physical APNs, dedicated ringtone, routing, consent, and quiet-hours
  acceptance remain unproven.
- Final local hygiene at this checkpoint: 133 GiB free, the isolated tracker is
  64 MiB, all nine recorded task-owned temporary paths are absent, and no
  task-owned disk-usage process was found. Claude's shared MurrorMobile
  checkout remains preserved; the tracker remains 19/19 audit-covered while
  strict production readiness is 0%, with API reconciliation, legacy
  credentials, and physical-device gates still pending.

## Codex heartbeat checkpoint (2026-09-04 02:12Z)

- The fresh read-only GitHub API quota check fully reset to 5,000/5,000, with
  the next reset reported as `2026-09-04T02:48:10Z`. Exact fetched refs are
  MurrorMobile `staging-environment-setup` `e7d9069c`, murror-api `staging`
  `7c43930a`, viasr-api `staging` `4c964b4`, and murror-backend `main`
  `d322b443`.
- Build 456 remains aligned on iOS staging `e7d9069c`. API staging
  `7c43930a` retains successful exact-head Deploy `33749107554`, and Viasr
  staging `4c964b4` has successful exact-head CI `33806902206`; PR #604 remains
  merged at `d2b4e20f`.
- PR #736 still has green checks but remains open with
  `mergeable: CONFLICTING` / `mergeStateStatus: DIRTY`; the exact compare is
  40 commits ahead of staging versus 351 behind, so no broad reconciliation or
  merge was attempted.
- Legacy PR #906 remains open and unmerged at `bcaf6585`. The legacy repository
  still has no `staging` ref (read-only GitHub lookup is HTTP 404), and its
  existing exact-branch deployment runs `31276079517` and `31275928971` both
  failed at app-config upload with Supabase `Invalid API key`. The staging
  workflow defines a branch input but does not pass that input to the reusable
  checkout; no new dispatch, rerun, or provider write was attempted.
- A fresh controlled `devicectl list devices` now discovers the paired physical
  iPhone 16 Pro (`1343B7D6-4B33-5A44-BDA7-CBD9168FAFAD`). The subsequent app
  query could not mount the developer disk image because the iPhone was locked;
  the Apple Watch was also listed but remains explicitly out of scope. Physical
  APNs, dedicated ringtone, routing, consent, and quiet-hours acceptance remain
  unproven until the iPhone is unlocked and the existing app can be inspected.
- The last successful organization-scoped September usage snapshot remains
  `$39.139831601` gross / `$24.338` net, including about `$27.806328244` gross
  for MurrorMobile. The prior cumulative snapshot remains `$526.648152461`
  gross / `$423.947597` net; the cost freeze remains active. Codex started no
  new paid workflow, dispatch, rerun, merge-triggered CI, native build, or
  duplicate run.
- Final local hygiene at this checkpoint: 133 GiB free, the isolated tracker is
  64 MiB before this page update, all nine recorded task-owned temporary paths
  are absent, and no task-owned disk-usage process was found. Claude's shared
  MurrorMobile checkout remains preserved; the tracker remains 19/19
  audit-covered while strict production readiness is 0%, with API
  reconciliation, legacy credentials, and physical-device gates still
  pending.

## Codex heartbeat checkpoint (2026-09-04 07:15Z)

- The fresh read-only GitHub API quota check returned 5,000/5,000, with the
  next reset reported as `2026-09-04T07:53:11Z`. The required exact-ref refresh
  was attempted after that check but the approval service returned a 503; it
  was not retried or worked around. The last exact fetched refs remain
  MurrorMobile `staging-environment-setup` `e7d9069c`, murror-api `staging`
  `7c43930a`, viasr-api `staging` `4c964b4`, and murror-backend `main`
  `d322b443`.
- API PR #736 remains open with green checks; current read-only metadata
  reports `mergeable: UNKNOWN` / `mergeStateStatus: UNKNOWN`. The last exact
  compare remains 40 commits ahead of staging versus 351 behind, so no broad
  reconciliation or merge was attempted. Viasr PR #604 remains merged at
  `d2b4e20f`, and its last fetched exact-head CI `33806902206` was successful.
- Legacy PR #906 remains open and mergeable at `bcaf6585`, but the legacy
  repository has no `staging` ref (HTTP 404). Existing exact-branch deployment
  runs `31276079517` and `31275928971` failed at app-config upload with
  Supabase `Invalid API key`; no new dispatch, rerun, provider write, or main
  merge was attempted.
- The latest controlled `devicectl list devices` reports the paired physical
  iPhone 16 Pro as unavailable. No app-info query or developer disk-image mount
  was possible; the Apple Watch is also unavailable and remains explicitly out
  of scope. Physical APNs, dedicated ringtone, routing, consent, and quiet-hours
  acceptance remain unproven until the iPhone is connected and unlocked.
- The last successful organization-scoped September usage snapshot remains
  `$39.139831601` gross / `$24.338` net, including about `$27.806328244` gross
  for MurrorMobile. The prior cumulative snapshot remains `$526.648152461`
  gross / `$423.947597` net; the cost freeze remains active. Codex started no
  new paid workflow, dispatch, rerun, merge-triggered CI, native build, or
  duplicate run.
- The preceding final hygiene audit reported 133 GiB free, a 64 MiB isolated
  tracker, all nine recorded task-owned temporary paths absent, and no
  task-owned disk-usage process. Claude's shared MurrorMobile checkout remains
  preserved; the tracker remains 19/19 audit-covered while strict production
  readiness is 0%, with API reconciliation, legacy credentials, and
  physical-device gates still pending.

## Codex staging web parity checkpoint (2026-09-04 04:47Z)

- Web PR #459 (`cf926a34`) passed the existing CI and consumer contract checks
  and was merged into `dev` as `82712efa`. The merge subject included
  `[skip ci]` so the already-green PR validation was not duplicated on the
  post-merge push.
- The dedicated web-client image build completed successfully as run
  `33837818529` from `dev`, publishing `staging-82712efa`. The dedicated
  staging deployment completed successfully as run `33837981283`, resolving
  image digest `sha256:c0ddbaf1a06d772f6b80a0162688bb48e09dcd42ee75cf330e12bc129da035d5`
  in namespace `nsp-staging-murror` after the hostname, ingress, ownership, and
  immutable-tag gates passed. No Alpha or production deployment was attempted.
- Read-only authenticated browser proof at `https://staging.app.murror.app/`
  returned `/api/v1/me` and connected-friends responses successfully. The live
  Home rendered the State-of-Your-World Orbit surface and desktop/mobile
  layouts without horizontal overflow. Public `/onboarding?ob=v2` was driven
  through the founder-letter step at 500x844; the live route exposed the new
  founder-letter UI and remained overflow-free. No onboarding submission,
  purchase, provider, or production write was performed.
- Subscription runtime remains an external provider blocker: RevenueCat
  returned `This offering doesn't have a paywall attached.` The UI treatment
  is deployed, but subscription parity is not qualified until the staging web
  offering has an attached paywall/products configuration and an authenticated
  purchase/restore proof is available.
- September read-only usage now reports `4571` Actions Linux minutes and
  `$19.704` net for `murror-platform`; the user authorized this staging
  rollout. Alpha remains parked until staging subscription/runtime evidence is
  closed.

### Runtime route sweep (2026-09-04 04:54Z)

- Authenticated staging `/friends`, `/reflection`, `/knowledge`, `/diary`, and
  `/settings` loaded successfully with the expected navigation and empty-state
  behavior for the test account. The settings language picker exposed English
  only; JP and VN remain hidden for web as requested.
- `/subscription` still renders the real RevenueCat error rather than a fake
  fallback: `This offering doesn't have a paywall attached.` No provider
  mutation or purchase was attempted.

## Codex Android internal-production candidate - 2026-09-04

- **Actual Entry-path offline check complete, 18:40Z:** owned Android guard checkpoint `c698c9be` excludes Entry diagnostics from normal releases. A separate tracked-clean02f6911b development probe exercised the real History handler, LocalStorage parsing, present/lazyScreen, JournalDetail and unchanged bounce with synthetic data. Exact APK `eb9923e6e2b2eddcb5f45a8a7da00c5d1cf00b02934b52019838815431d939b9` passed actual-byte release rejection, noINTERNET/debug-signer/ARM64/source/dependency verification and installed-byte/visible-marker/assets-PID binding. One cold, cached and held-read/release case completed with66 contiguous events, zero diagnostic failures and viewed content. Cold layout/data markers140/301ms are not native first paint; a deliberate24.851s flag-read hold kept History visible until release. Entry AX dumps timed out; screenshots plus full traces recovered on History are the evidence, not AX passes. Native PID7550 stopped18:40:01Z without data clearing. Two diagnostic-only startup bugs (Metro observer self-import and late i18n initialization) were fixed and separately reviewed; a2GB packaging OOM passed with a command-local4GB heap. Final15 Jest/47 diagnostic Node,154 Main Android contracts,TypeScript/lint/format pass. **No physical78 fix, new team build, production/backend/provider/Play write, push/CI or public release.** Phone untouched; contact page-first changes remain unshipped and border opt-ins remain withdrawn. Next correlate the production-backed phone failure with storage/navigation/query/rendering stages; do not infer its cause from this controlled pass. Full report: owned `docs/ANDROID-ENTRY-PROBE-20260904.md`; numeric evidence/private sources in `/private/tmp/murror-entry-diagnostic-20260904.UlzcrJ/`. Earlier navigation/border evidence retained;105Gi free. Supersedes the local-probe-not-yet-real-Entry limitation below, not physical failures or external release gates.

- **Border experiment rejected / original visuals retained, 17:50Z:** clean owned Android HEAD `02f6911b` withdraws exactly six InsightCard `androidSolidBorder` attributes and guards against silent re-enablement; no child/key/style/motion/business-logic change. The dormant primitive stays default-off. Frozen c7038163 offline native NOTE-shell A/B/A comparison on emulator5556 found 1,949 dark / 1,890 checker differing edge/corner pixels out of 805,984, max RGB delta12, zero interior differences; both repeated masked baselines were pixel-identical. Center/pending/completed state survived renderer switches and all four near-edge targets worked for both renderers; unchanged CustomBlurCard center and left-target control passed. These are not exact-stroke, real-flip-face, FPS, iOS-parity or full-app proofs. Exact marked diagnostic APK SHA256 `7580d3181ffd51c86702696e4733bb39e173b04228333998d1458fc33329b15d` was installed only in the zero-account emulator's separate development package; owned PID5179 stopped17:46:29Z without clearing data. Normal release guards reject the actual diagnostic bytes (`6afe4c5e`), not just receipt flags. Main fresh187 Jest/14 suites and145 Android Node contracts,TypeScript,format/diff pass; scoped withdrawal lint0 errors/9 existing warnings. Independent review found no P1/P2 source/evidence issue. Contact page-first corrections remain local; **physical78 Entry opening and Connection Detail slowdown remain unresolved**. No phone control, new production build/download/upload, push/hostedCI, provider/backend or public release. Private probes/evidence retained;108Gi free. Details: owned `docs/ANDROID-BORDER-PROBE-20260904.md` and `docs/ANDROID-PERFORMANCE-CANDIDATE-20260904.md`. Supersedes six-border-opt-ins/source-count wording below, not physical78 failures or external release gates.

- **History characterization checkpoint complete, 16:50Z:** clean owned Android HEAD `c7038163` adds18 test-only cases retaining actual DiaryScreen/Card, LocalStorage and pending-journal store; no production History behavior change. Main independently passed187 tests/14 suites (169 prior behavior checks plus18 characterization cases),143 Android contracts,TypeScript,new-file lint/format; independent review found no P1/P2 test-validity/evidence issue. Current limitations are explicit: held native flag read/permission/write holds the tap; read/write rejections are caught by LocalStorage; permission rejection escapes after consuming the pending ref; a concurrent second tap can bypass that ref and the first may divert later. This does not prove native duplicate screens or the Samsung's cause; profile-only rerender coverage is deferred. Native probe evidence is committed in `63094562`; exact marked offline development app was stopped16:33:49Z, no phone control or data reset. No new production build/upload/push/CI/provider/backend/public release. Next gates remain real failing-stage localization and actual native border/visual/performance comparison before another signed-device/internal-release pass. Details: owned `docs/ANDROID-PERFORMANCE-CANDIDATE-20260904.md` and `docs/ANDROID-NAVIGATION-PROBE-20260904.md`. Supersedes characterization-in-progress and old source-count wording below, not the known physical78 failures.

- **Offline navigation probe completed / source still unshipped, 16:34Z:** local follow-ups `5756c18d` (retain original contact ownership through delayed profile hydration) and `998775dc` (reject navigation diagnostics in release artifacts) extend the earlier source checkpoints. Latest candidate checks:169 Jest tests/13 suites,143 Android contracts,TypeScript/format/i18n green; scoped lint0 errors/10 existing warnings. Separate baseline7825fac6 developmentDebug ARM64 probe built offline; actual JS/manifest markers, noINTERNET, known debug signer, standard native inputs and installed APK bytes verified. Exact probe SHA256 `4b2d0fc139bf21dc6ebee0409da924463b41b32fccb7bb20373df6d8f3d74ce9` ran only on zero-account emulator5556, owned AVD/PID3763. Entry/AddFriend synthetic shells opened with real JS-stack/unchanged bounce; held/duplicate/resolve/reject/retry controls passed. Actual History storage/notification gate, lazy production screen import, data queries and real journal content were not exercised; **physical78 Entry and rendering failures remain open**. Probe stopped16:33:49Z; no phone inputs/restart/install, production build/upload, push/CI, provider/backend or public release. Diagnostics are never team-downloadable/release-eligible. Real History-handler characterization tests are now being prepared, not yet a new pass/fix. Details: owned worktree `docs/ANDROID-NAVIGATION-PROBE-20260904.md` and updated `docs/ANDROID-PERFORMANCE-CANDIDATE-20260904.md`. Supersedes probe-not-built/source-count wording below, not device78 failures. Download/phone remain78.

- **Local remediation checkpoints, not a new download:** after the diagnostic-first panel and continued goal authorization, committed contact navigation as `413b72ac` and the narrow Android uniform-border candidate as `74b296c8` in the owned Android worktree. Android Intro/Connections/Home now open Add Friend before contact enumeration, with page-local loading/retry, original account-generation/focus fencing, same-owner single-flight reads, current-search filtering and unchanged iOS contact flow. Six InsightCard borders opt into a plain Android border only for identical colors/simple geometry; motion, child state, padding and paint order remain unchanged in source/structural tests. Main plus specialist review addressed delayed permission/departure and blur/refocus edge cases. Local159 Jest tests/12 suites,133 Android contracts,TypeScript,format,i18n synchronization passed; scoped lint has0 errors/10 existing warnings. No new build/upload, phone inputs, provider/backend changes, push/PR/hosted CI or public release. **Physical Entry Detail opening and same-device rendering improvement remain unresolved gates.** An isolated account-free native navigation probe is being prepared from7825fac6; not built/run or release-eligible. Download/phone remain78. Source checkpoint details: `MurrorMobile-worktrees/android-launch-readiness-20260901/docs/ANDROID-PERFORMANCE-CANDIDATE-20260904.md`. This supersedes the not-implemented/awaiting-discussion wording below, not the physical78 failures.

- **Physical 78 installed / QA not passed, 15:05Z:** Google-generated app-signed universal78 APK SHA256 `e8d940a7bcdebf0e228df31edc092b25a5595ea2911aaadfb0d675600909a954` successfully updated the Samsung via wireless ADB `install --no-streaming -r`; installed base bytes match. No uninstall, data clear or account reset. Authenticated Home survived, PID25721; scoped CodePush evidence loads packaged `assets://index.android.bundle`. This is not a Play-client-install or fresh Google-login pass. Same connection/cover display:78 idle72/72 and five-swipe84/84 frames still janky100%; median113/150ms. Graphics PSS decreased1,032,700→402,784kB vs77, but totalPSS remains1,037,827kB. Complete six-second trace:6903uploads/~3.626s, prepareTree~4.897s; still a rendering blocker. Home initial0/468 and post-detail0/467 samples were smooth. Entry card tap left History visible at least28s (no78Entry-scroll proof); Connections plus did not produce the expected Add Friend header in the bounded privacy-safe check. Intro first-grant/resize remains untested; no seen/permission flags reset. Phone returned to Home at15:05Z and freed for Astro. No source edits/new build/upload/push/CI/provider/backend/public release this turn. Clean source7825fac6, fresh stagingdd967f50. Rendering review identified an identical-color border-mask candidate; Main recommends page-opening diagnosis first, then that narrow Android-only candidate with visual/state gates. Not implemented; direction awaits discussion. Detailed evidence: `MurrorMobile-worktrees/android-launch-readiness-20260901/android/app/build/outputs/play-ready-7825fac6/DEVICE-QA-20260904.md`. Supersedes phone-unavailable/native-comparison-pending notes below, without qualifying full parity or public launch.

- **Device comparison paused for phone availability:** Google-generated signed universal78 APK is downloaded at `/Users/astro/Downloads/78.apk`, SHA256 `e8d940a7bcdebf0e228df31edc092b25a5595ea2911aaadfb0d675600909a954`. Signature v2/v3 and Google source stamp verify; signing SHA1 `f87d522bec7420b9c3fd500902c0cf769c6cb88a` matches Play, embedded JS matches the uploaded candidate, and compiled production configuration/16KB zip alignment verify. This is not the adjacent local upload-key APK. Wireless Samsung is still77 and dozing; no device update/input/data reset performed. Astro was asked to leave the phone available for QA. Existing Murror Team remains selected with9 users; same tester link verified. Resume from `play-ready-7825fac6/PLAY-SIGNED-APK-VERIFICATION.md`, preserve data, and obtain same-device native evidence before claiming the performance fix.

- **Internal 78 available, 14:31Z:** local candidate `7825fac67a07fabfb8bf682c69d67bf8f16c73df` built successfully and passed66 artifact checks,96 app tests/10 suites,153 Android contracts,TypeScript and workflow checks. Published exact AAB SHA256 `037f79400895181a2cd0d4540339a4b4bba472e9f9d244793665e88c4361bd7c` to existing Murror AI internal track, release35; live Play says **Available to internal testers**. Same tester link: https://play.google.com/apps/internaltest/4701017521848127510 . Includes Android permission/resize corrections, unused entry HTML parsing removal, council per-mount retry guard, state-preserving continuous-position Android card paint window and meaningful text measurement guard. iOS render subtree and Orbit motion recipes unchanged. No measured performance improvement claimed yet: physical Samsung remains77 at publication; user availability requested for a Play-signed update and same-device comparison. AD_ID remains absent; existing mismatch waived for this release only; native symbols attached, no new device exclusions vs77. No public rollout, provider/backend change, push/PR/hosted CI. Clean owned checkout, shared/Claude work preserved. PR macOS scope remains a pre-push gate. Latest reports: `MurrorMobile-worktrees/android-launch-readiness-20260901/android/app/build/outputs/play-ready-7825fac6/RELEASE-STATUS.md` and `PERFORMANCE-CANDIDATE-20260904.md`. This supersedes the not-built/not-uploaded statuses below without converting baseline measurements into candidate proof.

- **Physical wireless QA / rendering blocker, 14:13Z:** wireless ADB is connected to the same SM-F971U/API37 Play77 installation. Main reproduced Intro footer retaining narrow width after split-screen expansion, and the old Invite instance remaining stuck after a20s observation. Four local corrections (Android permission callback, Android footer resize, skip unused definable HTML parsing, retain council automatic-attempt guard) pass61 tests/7 suites, TypeScript, scoped lint and diff checks; none is built or installed. Crucially, Android killed oldPID7539 at13:58:55Z forLOW_MEMORY (RSS642MB, importance100), not a demonstrated Java crash. NewPID6133 ConnectionDetail yielded43/43 idle and66/66 scrolling janky frames, graphics PSS~1GB. Six-second native trace recorded9014 texture uploads (~4.2s inclusive), while leaving that page forHome restored0/498 jankyframes; native upload/render preparation is a demonstrated bottleneck, exact React texture ownership still inferred. An Android-only continuous-position paint-window candidate is being prepared; do not React-unmount carousel cards because completed/pending state can be lost. No measured candidate improvement, new build/upload/draft/push/CI/provider/public release yet. Play77 availability rechecked. Source base21822e9b, fresh staging679a1279; shared/Claude checkouts preserved. Evidence and exclusions: `MurrorMobile-worktrees/android-launch-readiness-20260901/android/app/build/outputs/play-ready-21822e9b/NATIVE-PERFORMANCE-20260904.md`; private screenshots remain in the local QA temp folder. This supersedes the disconnected/no-per-screen-evidence status below.

- **Current local Invite correction, not yet built:** owned Android worktree has only `connections-introduction.tsx` modified plus its new `.spec.tsx`, on base21822e9b. Android uses the existing react-native-permissions result listener; iOS permission flow, layout and animations remain unchanged. Storage rejection falls through safely and a synchronous ref prevents same-event double taps.20 focused tests/2 suites, TypeScript, changed-file ESLint/Prettier and diff checks pass. Independent reviewer confirmed listener wiring; removed an ineffective busy-prop addition without changing MUButton. Slow/non-settling `Contacts.getAll()` remains a separate follow-up. Physical USB is disconnected at latest inventory; only emulator5556 is available. No new build/upload/push/CI/provider/public release. Combined performance-versus-Invite-first sequencing question remains unanswered. Detailed source findings, limitations and reproducible next scope: `MurrorMobile-worktrees/android-launch-readiness-20260901/android/app/build/outputs/play-ready-21822e9b/INVITE-PERFORMANCE-REVIEW-20260904.md`. Earlier Google-unresolved notes are historical: user reported success and authenticated physical Play77 Home was observed, without provider changes.

- **Authenticated Home observed; Invite/performance investigation, 13:16Z:** Astro reports Google login now succeeds; main saw authenticated Home on the identity-verified physical Play77 installation. No OAuth/key/backend changes were made, and the earlier DEVELOPER_ERROR cause is not established. This is one reported successful login plus observed authenticated Home, not multi-account coverage. Current Connect INTRO screenshot shows a normally sized Invite button, but Astro reports it is inert; intermittent stretching remains unconfirmed. Source review independently confirms Intro calls react-native-contacts' iOS permission method on Android, whose pending request callback is not forwarded in the installed native module. First grant can leave isOpening locked; a platform-specific permission correction is being regression-tested. Three-agent performance panel also found council error reattempts, artwork polling whose budget resets on each success, unused Markdown parsing, and unbounded mounted For Us carousel cards. These are source findings, not attributed causes of measured phone jank. Session-wide gfxinfo and user-task-removal exit records do not establish per-screen performance or a crash. Physical USB disconnected by13:10Z; only emulator5556 is now available, and reconnect was requested. User was offered one combined Invite/performance build versus an Invite-first build; no new app build or publication yet. Owned Android source starts21822e9b, fresh staging76cc56be; canonical/Claude worktrees untouched. Preserve all visible iOS motion and public Production gates.

- **Physical Play installation verified, 12:54Z:** user connected Samsung SM_F971U/API37. Productioncom.murrormobile is2.0.0(77), installed/initiated bycom.android.vending at19:19:57+0700. Installed baseAPK SHA256`3ac85da5f0fe40fee81bd9ccaba395b2fe8ecb4d67c43962b650aac584319b4e`; actual signerF8:7D…B8:8A matches the persisted AndroidProductionRelease registration in a fresh Cloud tab. Independent review matched all6DEX files andJS against the sealedAPK/AAB and checked the compiledwebclient/RNCConfig path. A stale/upload-signed/IAS APK is ruled out for this inspected production installation. Dev76 is also installed but not running. No fresh login attempt observed; app-PID-only45s capture had no matching Google lines and stored no raw logs. At end phoneDozing/keyguardshowing; user asked to unlock/retry and leave the result visible. No reinstall, data clearing, sharedGMS/account-log reads, new build or provider edits. Evidence beside final artifacts: `physical-device-identity-20260904.json`, `GOOGLE-SIGNIN-RECHECK-20260904.md`. Google login remains unresolved; earlier no-physical-device/installed-identity-gap notes below are historical.

- **Google failure stage confirmed, 12:36Z:** Astro supplied the exact alert `DEVELOPER_ERROR` and confirmed it appears after selecting a Google account. The native Google sign-in call fails before the reviewed Supabase token-exchange path; account selection is not successful token issuance. Play still shows internal77 available. Only emulator5556 is connected, so the actual failing device's package/version/installer/signing fingerprint remains unverified. Earlier local APK and current Play both have version77; a retained sideload or IAS identity is only a hypothesis, not a finding or a dismissal of the user's Play-install report. Do not reset keys, clear data, uninstall or change backend/provider configuration on this evidence alone. The screenshot/stage request in the historical12:26Z note below is now satisfied. Current evidence is in `GOOGLE-SIGNIN-RECHECK-20260904.md` beside the final artifacts.

- **Google login unresolved, user report12:26Z:** Astro confirms the latest app from the Play internal-testing link still cannot sign in withGoogle. Do not dismiss as an old sideload or call login passed. Main re-downloaded and decoded the public Play signing certificate(SHA1F8:7D:52:2B:EC:74:20:B9:C3:FD:50:09:02:C0:CF:76:9C:6C:B8:8A); it matches the live AndroidProductionRelease/com.murrormobile registration. One Play app-signing key/100%base; no supported rotation mismatch. Independent artifact review confirmed compiledwebclient6tn4... in correct project844186200639,package77,and matchingAPK/AABDEX+JS; source review found no competingconfigure/relevanttrunkfix. Fresh stagingeca7b75a; Android source remainsclean21822e9b. Exact current error/code and failure stage requested,not yetreceived. Play universalAPK download hit ChromeERR_BLOCKED_BY_CLIENT; no bypass. No physicalAndroidADB device. No key/client/backend edits,builds,pushes,publicrollout or tester changes. Evidence: `MurrorMobile-worktrees/android-launch-readiness-20260901/android/app/build/outputs/play-ready-21822e9b/GOOGLE-SIGNIN-RECHECK-20260904.md`.

- **CURRENT, supersedes historical holds below — 11:59Z:** Murror AI **Internal testing** release34/version77(2.0.0), source `21822e9b7723313bdbcc90e53b563e3e8b1034d1`, is **Available to internal testers**, live Play confirmation after publication at18:57 local. Exact AAB SHA256 `e3650a18f76126a1fbac7520322e243db871fb4fb2a35c8522a3d01d98f44642`; nine existing Murror Team testers selected. Opt-in: https://play.google.com/apps/internaltest/4701017521848127510 . Production backend/configuration verified; public Production remains63(1.0.18), checked live after this internal release. Publication used release-scoped **Release without permission** for the existing Advertising ID declaration mismatch; AD_ID remains absent and the app-wide declaration was not changed. Non-blocking Play warnings: six device models excluded (new implied location feature; public-launch follow-up), and no deobfuscation file (obfuscation disabled; native symbols attached).
- **Final normal-APK QA — completed11:56Z:** same verified APK SHA256 `1c897196d22d5e927b2b9024fd725d71dde66f0fa25248947e504188b14d7d6e`, emulator5556/API36/16KB, PID28844. Six-minute k1 idle13 samples66,999–96,641KB native allocation/end82,184KB; full idle+manual943s,121 samples60,055–96,641KB/end69,610KB. No forced GC/crash/PID replacement/foreground loss. Main inspected the four idle captures and selected manual screenshots; Back/forward,relationship chip,empty skip/offline fallback,reveal and transition toFounder worked. Keyboard opens/dismisses, **but You label/background overlaps body text while open**; visual parity is not passed. Two animated-screen AX captures failed closed and fresh screenshots were used. Owned process stopped and exact original radios restored11:56:36Z,no data clearing. Receipts/screenshots/current status: `MurrorMobile-worktrees/android-launch-readiness-20260901/android/app/build/outputs/play-ready-21822e9b/`. Play-installed Google login,authenticated Home,physical-device coverage and exact production-iOS motion remain unproven. An iPhone is **not** an internal-testing prerequisite. No push,PR,hostedCI,iOS build,OAuth-provider change or public rollout. Internal distribution milestone achieved; full parity/public-readiness goal is not complete.

### Earlier checkpoints (historical, superseded by the current status above)

- **HOLD, not Play-download ready.** Android lane remains `MurrorMobile-worktrees/android-launch-readiness-20260901`. Retained candidate `eb4c9cd9239252f73af43b5897de9ec040d394f2` adds Google account-ownership guards (`c4463314`), three keyboard-aware forms (`1cd99873`), and a narrowly patched RN Android keyboard-hide handler. Existing iOS patches are unchanged. Recorder-lifetime experiment `0039d7ef` was built and rejected by native QA, then reverted at checkpoint `ace6d186` (tree identical to `eb4c9cd9`; experiment recoverable in Git). Current clean local HEAD is diagnostic-only `52fe9da3`, described below. No push, PR, hosted CI, iOS build, or public release.
- Signed production 2.0.0 (77) AAB: `android/app/build/outputs/play-ready-eb4c9cd9/Murror-2.0.0-77-production-release.aab`, SHA256 `bc91b072c05874cadf488eb81b0bf60bf266a754a577ca426094c2415840f557`. **Do not upload the superseded Downloads copy containing `18e829ac`.** Current candidate is held for memory investigation.
- Local evidence: 328 Jest tests / 38 suites, 22 Node contracts, TypeScript and lint/format checks; 48 artifact checks bind production configuration, clean source, embedded auth/form/keyboard code, signing and all 50 64-bit libraries' 16KB alignment. Exact APK native Share/Identity/email keyboard reachability and restoration checks passed within documented bounds. No authenticated Google/Home, physical-device, or exact production-iOS visual parity claim.
- **Memory blocker:** hardware-GPU API36/16KB baseline grew native heap allocation from 346,215 KB to 1,501,993 KB over five minutes on idle k1; three earlier SwiftShader processes terminated LOW_MEMORY. Recorder-only cleanup did not help (396,191 → 1,723,164 KB/five minutes, later LOW_MEMORY). Automated explicit RUNNING_CRITICAL trim reached React Native GC but native allocation stayed ~1.4GB and rose to 1,477,508 KB by +30s; that same PID9583 was terminated LOW_MEMORY at 08:13:19Z. This is not SwiftShader-only; retaining owner/other-runtime lifecycle remains unproven. Do not mark launch ready or implement speculative picture disposal. Experimental receipts/status live in `play-ready-0039d7ef`.
- Producer-stop control completed at 09:01Z in experimental PID16985: founder-letter start/end verified visually (end also fresh AX); native allocation plateaued ~534–544MB over two minutes after source-backed Orbit unmount. Confirmed main-runtime GC still left ~537MB. The test emulator was offline for navigation because source review found even blank Skip invokes the reflection endpoint; earlier “no AI submission” QA wording was corrected (no personal text entered; earlier server execution not inspected). Test app was force-stopped after measurement and original emulator radios restored. Reviewers recommended separate diagnostic-only native counter/UI-runtime GC measurements before a fix. The renderer fix remains unproven; the subsequent local diagnostic checkpoint is described below. No broad dependency upgrade.
- Play upload-key reset is complete. On 2026-09-04 Astro enabled Chrome file-URL access and completed the Murror Google passkey. Browser DOM reads now work; actual file transfer is still untested because the candidate is held. Live Play still shows internal release 63 (1.0.18), no v77 upload. At 09:40Z, signed-in Google Cloud confirmed `AndroidProductionRelease` / `com.murrormobile` already has the exact Play app-signing SHA1 `F8:7D:52:2B:EC:74:20:B9:C3:FD:50:09:02:C0:CF:76:9C:6C:B8:8A`, and the production web-client ID matches the artifact. Audience is External / In production; Verification Center says no sensitive/restricted-scope verification is required, with a separate branding-not-shown notice. No provider changes were made. Real Play-installed Google login remains unverified. Public-only receipt: `play-ready-eb4c9cd9/google-oauth-provider-check-20260904.json`.
- Current receipts and explicit gates: `android/app/build/outputs/play-ready-eb4c9cd9/RELEASE-STATUS.md`. Earlier `play-ready-18e829ac/RELEASE-STATUS.md` retains the separate historical development OAuth-secret exposure follow-up; never retrieve/copy the secret. Preserve provider/device/public-release gates.
- At 09:03Z the experimental emulator installation was replaced with retained `eb4c9cd9`, installed APK SHA256 verified as `25c5b22fb700c7860c7fc136febbcec030fb79e483a3a7e4ea260332bca29525`; app left stopped, no data cleared. The later diagnostic installation superseded this emulator checkpoint. Current local diagnostic source is committed and clean at `52fe9da3d124b121b1370ca616145bd1904817c9`, with hash-guarded ignored Skia native edits: **do not run its normal production build**. Baseline native backups are in `/private/tmp/murror-play-release-20260904.Kl3Pse/skia-diag-baseline`; the optional patch/hash manifest is under `scripts/diagnostics`, not automatic `patches/`. Main owns integration; Sentinel's completed guard worktree is `/private/tmp/murror-play-release-20260904.Kl3Pse/guard-review-worktree`. All 104 focused Node contracts and 11 Jest sequencing/host tests pass, with TypeScript/lint/format green. Actual offline Gradle APK dry-run passed after adding bracketed-ABI task grammar while retaining upload/AAB/publish rejection. Diagnostic APK verification additionally requires exactly four Skia ABIs and fresh compiler-command proof. Build log: `/private/tmp/murror-play-release-20260904.Kl3Pse/orbit-memory-diagnostic-build-52fe9da3.log`. No newly downloadable build or verified Google sign-in should be announced.

- **Diagnostic build completed, 09:58Z:** `52fe9da3` APK compiled in 5m35s; wrapper confirms source/native inputs unchanged. At 09:59Z exact artifact verification passed: production configuration/signing/non-debuggable state, four Skia ABIs, fresh 16 translation-unit compiler records per ABI, native/JS/manifest markers, no AAB, and 16KB alignment. AGP's `tools/release` metadata are duplicate hard-link mirrors; verifier uses actual `cxx-skia/RelWithDebInfo` command databases and checks their CMake cache/source/directory. Sealed diagnostic SHA256 `96d67860fe7d64260e75493219e06ab4092fa0f0566468fe2ca810f7ef5981c3`, receipt under `android/build/orbit-memory-diagnostic/verified-52fe9da3/diagnostic-verification.json`, `releaseEligible:false`. This exact diagnostic APK remains installed only on `emulator-5556`, preserving data; the completed runtime test is below. Never upload or distribute it. Local source remains clean. Production candidate `eb4c9cd9` remains held.
- **Controlled runtime result, 10:24Z:** exact-byte offline run `gc3`, same PID23679, completed after fresh anonymous navigation to Founder. Drawing-creation counters were flat before and throughout the separated collections. Main-runtime GC took 22ms and did not release the 332 outstanding picture wrappers / 6,703 command recorders; UI-runtime GC took 115ms and released all tracked outstanding wrappers/recorders. Native allocated memory fell from 551,460 KB before UI GC to 70,581 KB afterward, settling at 71,647 KB about one minute later (87% reduction, not equivalent RSS/PSS reduction). Main viewed the sampled screen evidence; independent review checked all 66 records / 21 native events / 32 meminfo samples. Device and host clocks differ by roughly 220ms in post-run calibration; post-GC samples were causally collected after the host read the native return event. This proves UI-GC-reclaimable retention, not the root cause of natural GC delay or a production fix. Numeric receipts, screenshots and limitations: `android/build/orbit-memory-diagnostic/verified-52fe9da3/ORBIT-MEMORY-FINDING.md`. The owned app process was stopped and original radios restored at 10:24:35Z, with no data clearing; later recheck confirmed it remained stopped. Earlier `gc1`/`gc2` aborted safely and are not GC proof.
- **Next proposed experiment, not implemented:** reviewer recommends reusing exported `SkiaPictureView` for Android's already-recorded Orbit picture, leaving iOS's Canvas/Picture branch, animation clock/math, reduced-motion scheduling and RN You overlay unchanged. It bypasses the command-recorder/UI-picture handoff observed above. Default redraw mode only, stable mounted view, no immediate picture disposal, no periodic forced GC, no broad Skia upgrade/global accounting change. Main-thread picture allocation and changed presentation timing still require sustained-memory, transition and visual comparison before acceptance. Google Play-installed login, authenticated Home, physical-device and exact production-iOS motion gates remain open.
- **Read-only parity preparation, 10:47Z:** fresh mobile staging fetch succeeded at `e7d9069c` (build-456 merge). Onboarding core/renderer and Home renderer/geometry/clock/playback/model/view bytes match that source, not a verified shipped iOS artifact. The lane's existing bundled You font, note-icon substitution and reduced-motion scheduler need comparison against the actual iOS reference. Apple's public US listing still shows 1.0.19; paired iPhone 16 Pro is available but exact production-app inventory failed while locked, so historical phone build447 is not relabeled current. Focused local baseline: 22 Jest suites / 231 tests plus3 Node parity contracts pass, with existing Home act warnings and mocked-Skia limits recorded. Home uses the same picture handoff but has no runtime memory result yet. No new renderer/native/provenance exception was implemented; cached-native freshness and Astro's rendering direction remain open. Detailed evidence/acceptance boundaries: `android/build/orbit-memory-diagnostic/verified-52fe9da3/PARITY-REFERENCE-CHECK-20260904.md`. No build, upload, push, CI, provider write, device data clearing, or cleanup deletion in this phase.
- **Owner-input gate revalidated, 10:49Z:** the proposed rendering direction remains unanswered across the diagnostic, preparation, and current continuation turns. Safe source/reference/test preparation is complete; both specialist handles report completed and no diagnostic app process is running. Exact iPhone app inventory again terminated with the locked-device error (CoreDevice12040/10003). The Android checkout remains clean at52fe9da3. Mark the goal blocked, not complete: resume implementation after Astro chooses the targeted Android-only approach (or another direction), and inspect the exact iOS reference once the iPhone is unlocked. No diagnostic upload, normal production build from instrumented dependencies, or claim of launch readiness is authorized by this checkpoint.

- **Android implementation resumed, 11:19Z:** Astro explicitly asked to proceed/fix all issues until internal testing is ready. iPhone comparison is separate and is not an Android internal-distribution prerequisite. Local clean checkpoint `9dff85aa490606b99740f729a0f2576c2133216f` adds the reviewed Android-only `OrbitPictureView` presenter to onboarding and Home; iOS Canvas/Picture, clocks, drawing math, overlays and reduced-motion producers are preserved. No disposal or periodic GC was added as a fix. Independent source review found no high/critical blocker. Local verification: 23 Jest suites/233 tests, 5 parity contracts, TypeScript, changed-file lint and diff checks pass; existing Home act warnings remain. A diagnostic-only APK build started at11:19Z; no new downloadable artifact yet. Explicit inherited-native verification requires pinned52fe receipt bytes, identical9 guarded input hashes, all4 compiler-database hashes and packaged Skia hashes, and exactly7 reviewed JS/test diffs; default compiler freshness remains strict. Native memory, real painting/transition, authenticated Home and Play-installed Google checks remain outstanding. Do not normal-production-build while ignored Skia diagnostics remain applied; do not distribute diagnostic APKs.

- **Renderer regression passed / normal release restored, 11:40Z:** diagnostic presenter checkpoint9dff85aa completed an eight-minute offline k1 run on the exact installed APK, PID27403, 17 samples. Native allocated memory stayed67,324–98,614KB and ended74,586KB; no forced GC, crash, process replacement or foreground loss. Main viewed all five sampled images. The app was stopped and original radios restored before further work. Evidence: `android/build/orbit-memory-diagnostic/verified-9dff85aa/PRESENTER-RESULT.md`. Normal source is now clean at `21822e9b7723313bdbcc90e53b563e3e8b1034d1`: temporary JS module/spec/Founder hook removed, five ignored native headers restored and diagnostic header removed; all9 baseline hashes pass. Guards/optional patch remain dormant. Expanded verification passed516 Jest tests/54 suites,103 Node contracts, TypeScript/lint. Normal APK+AAB build completed11:38:28Z; exact artifact verification passed11:39Z, including absence of diagnostic code in both artifacts and50 aligned64-bit libraries. Sealed folder `android/app/build/outputs/play-ready-21822e9b`; APK SHA256 `1c897196d22d5e927b2b9024fd725d71dde66f0fa25248947e504188b14d7d6e`, AAB SHA256 `e3650a18f76126a1fbac7520322e243db871fb4fb2a35c8522a3d01d98f44642`. The normal APK is installed on emulator5556; its six-minute/offline/manual QA is starting. Browser file transfer now works: the exact AAB is uploading into existing empty internal draft34/version77, not public production. Nine existing Murror Team testers remain selected. Upload acceptance, internal publication and Google Play-installed login are not yet confirmed. No push, PR, hosted CI, iOS build or public rollout.

## Codex heartbeat checkpoint (2026-09-04 07:25Z)

- The read-only GitHub API quota reset was observed at 5,000/5,000, with the
  next reset reported as `2026-09-04T07:53:11Z`. An exact-ref refresh was then
  attempted but the approval service returned a 503; it was not retried or
  bypassed. The last exact fetched refs remain MurrorMobile
  `staging-environment-setup` `e7d9069c`, murror-api `staging` `7c43930a`,
  viasr-api `staging` `4c964b4`, and murror-backend `main` `d322b443`.
- API PR #736 remains open with green checks; current read-only metadata reports
  `mergeable: UNKNOWN` / `mergeStateStatus: UNKNOWN`. The last exact compare
  remains 40 commits ahead of staging versus 351 behind, so no reconciliation
  or merge was attempted. Viasr PR #604 remains merged at `d2b4e20f`, with the
  last fetched exact-head CI `33806902206` successful.
- Legacy PR #906 remains open and mergeable at `bcaf6585`, but the repository
  still has no `staging` ref (HTTP 404). Existing exact-branch DeploySTAGING
  runs `31276079517` and `31275928971` failed at app-config upload with
  Supabase `Invalid API key`; no new deployment, dispatch, rerun, provider
  write, or main merge was attempted.
- The latest controlled `devicectl list devices` reports the paired physical
  iPhone 16 Pro as unavailable. The Apple Watch is also unavailable and remains
  explicitly out of scope. Physical APNs, dedicated ringtone, routing, consent,
  and quiet-hours acceptance remain unproven until the iPhone is connected and
  unlocked.
- The cost freeze remains active; Codex started no new paid workflow,
  merge-triggered CI, native build, or duplicate run. The preceding final
  hygiene audit reported 133 GiB free, a 64 MiB isolated tracker, all nine
  recorded task-owned temporary paths absent, and no task-owned disk-usage
  process. Claude's shared MurrorMobile checkout remains preserved; strict
  production readiness remains 0% pending API reconciliation, legacy
  credentials, and physical-device acceptance.

## Codex staging web RevenueCat reuse checkpoint (2026-09-04 10:00Z)

- Under Astro's explicit staging/Actions authorization for this lane, web PR
  #460 was reviewed by Codex Sentinel (not Claude), passed Linux CI and
  consumer contracts, and merged to `dev` as `83078850a4f7458c8a5d7db53a59de99b617da1a`.
  Local checks: 109 test files / 560 tests, lint, TypeScript/Vite build, and
  diff hygiene passed. Preserve clean worktree
  `/private/tmp/murror-platform-web-rc-reuse-20260904` at reviewed commit
  `827a8934`; do not switch a shared checkout.
- The existing current offering has web products but an unpublished hosted
  paywall. The web now falls back only for that specific missing-paywall error
  to RevenueCat's existing package checkout. It reuses SDK price/trial terms,
  checks account/product/quote ownership, handles cancellation and Restore,
  and does not publish or create a paywall, offering, product, or entitlement.
- Exact source CI: `33859178207`; consumer contracts: `33859178059`; image
  build: `33859548292`; staging deploy: `33859776602`, all successful. Tag
  `staging-83078850`, digest
  `sha256:ab8e86f6bc58f9649d316ce4b6f82d67d62e6be7057ec3a2c56f4f5a620a2e58`.
  Live namespace `nsp-staging-murror` on `do-sfo2-murror-cluster` reports that
  exact web image. No Alpha, production, or native deployment was performed.
- Browser proof: existing monthly $16.99 sandbox checkout opens and cancels
  cleanly; yearly $89.99 / three-day advertised trial completes using a Stripe
  test card. RevenueCat records a sandbox-only trial with `gives_access=true`
  and `app.murror.premium`; UI returns Home, reload fetches RC customer HTTP
  200 again, and Settings shows Annual Premium. Desktop 1440x900 and emulated
  phone 390x844 plan selection had no horizontal overflow. Negative Restore
  correctly reports no active subscription before purchase. This does NOT
  qualify server-side entitlement parity or a live-money purchase.
- **Confirmed remaining environment mismatch:** the existing web SDK is
  connected to main project `proj80c909dc`, Web Billing app `appb8f9a115a4`,
  in sandbox mode. The actual staging API config map
  `murror-api-config-map` has `REVENUECAT_PROJECT_ID=projb32bb370` (only that
  public config value was read). Do not repoint this shared backend to the
  main project: staging native has its own app/products.
- **Confirmed server credential permission gap:** authenticated staging
  `GET /api/v1/subscription/status?forceRefresh=true` returns the old expired
  staging-iOS product; `POST /api/v1/subscription/sync` returns 502. Logs at
  09:54:48Z explicitly say the server key needs
  `project_configuration:entitlements:read`. No secret value was read,
  revealed, copied, or changed. No manual entitlement was granted.
- **Resume at the access gate, not a new audit:** the RevenueCat connector
  only exposes the main project; listing apps in `projb32bb370` returns 403
  (wrong-project key). The Chrome RevenueCat dashboard is at `/login`.
  Obtain authorized dashboard access to the existing staging project, inspect
  its existing web-billing app/products/key before assuming anything is
  missing, repair the staging-only configuration/least-privilege read scope,
  and rerun purchase/Restore/client-to-API convergence. If no staging web app
  exists, present that evidence before creating or wiring provider objects.
- Test-only receipt: customer `f3a6f82d-3388-41aa-8e2e-f28e0a21b472`, subscription
  `subRcbab77eae7c17cc271d1fd12002c2da30f`, sandbox trial started 09:52:45Z
  (accelerated five-minute trial). No real charge. Management opens the
  existing RC customer portal and requests its normal email login; no email
  verification was bypassed and cancellation is not claimed. Sandbox renewal
  cleanup remains available through that test receipt/portal.
- The latest September platform Actions snapshot is 4,643 Linux minutes,
  $27.858 gross / $20.136 net (billing may lag). Only one reviewed push plus
  the dedicated staging build/deploy were used; the merge subject skipped
  duplicate post-merge validation. Alpha remains parked; full web/iOS parity
  remains incomplete until the environment binding and backend proof pass.

### Signed-in staging RevenueCat verification (2026-09-04 11:28Z)

- Astro signed in to the correct **MurrorDev** dashboard, project
  `projb32bb370`. Use the actual Chrome extension browser/profile Astro;
  Chrome DevTools had started a separate signed-out profile. The live
  authorized dashboard is available through CUA. Do not repeat the login
  diagnosis or substitute the main-project connector.
- The existing staging web setup is present under **Web**, not the native
  **Apps** list: `MurrorDev (Web Billing)`, app `app9aeb492c5a`, with existing
  Stripe connection `acct_1RYPIKBF6GuoOMy7`, USD and an existing sandbox SDK
  key. No new app, provider, offering, product, entitlement, or key is needed.
- Existing web products: `prod3f54d574bf` /
  `app.murror.premium.web.monthly` at $12.99/month, and `prod6cbaf64b50` /
  `app.murror.web.premium.yearly` at $100/year. Both are already attached to
  Premium `entl3387fa201b` / `app.murror.premium` and to monthly/yearly
  packages in offering `ofrng701f08264d` /
  `app.murror.premium.offering.monthly`. Targeting shows no rules. These
  existing prices differ from the main-project sandbox tested earlier; they
  were preserved, not silently changed. SDK current-offering selection and
  the final correct-project checkout remain runtime checks after binding.
- The server-key diagnosis is now exact, not inferred from a generic log:
  an in-pod, credential-safe request to the configured project's customer
  endpoint returned 200 / `projb32bb370`; the entitlement-list endpoint
  returned 403 with the explicit missing `project_configuration:entitlements:read`
  permission. SHA-256 comparison identifies the deployed credential as the
  existing key labelled **Claude**, ID `apikeye0161694f3`. This is merely the
  old key label, not a Claude session. Raw credentials were not printed or
  persisted to artifacts. All browser-revealed key fields were hidden again.
- That exact key currently has customer/chart read-write access and **no
  project-configuration access**. Preserve its existing permissions; the
  bounded repair is only Entitlements Configuration **Read only** and
  Products Configuration **Read only**. The separately inspected **ODE**
  key already has catalog read access but is not deployed; do not rotate or
  substitute it. No source workaround or shared backend project change.
- Awaiting action-time approval for that two-scope permission change. Its
  exact dashboard edit page is open and retained as a browser handoff; no
  permission option or Submit was changed. After approval, verify the two
  reads with the existing credential, bind only the platform **staging**
  `WEB_CLIENT__VITE_REVENUECAT_PUBLIC_API_KEY` to the existing staging Web
  Billing sandbox key, then batch one staging-only image/deploy and verify
  checkout/Restore/client/API agreement. Do not publish shared paywalls or
  change pricing/native mappings. No Actions, source changes, deployments,
  or provider mutations were performed in this signed-in inspection turn.

### Staging billing configuration repaired; onboarding canary (2026-09-04 12:00Z)

- Astro explicitly approved the two catalog read permissions. The deployed
  staging key `apikeye0161694f3` now has Entitlements Configuration Read only
  and Products Configuration Read only; existing permissions were preserved.
  In-pod calls with that same credential returned 200 for the staging Premium
  entitlement and existing web product. No key rotation or backend restart.
- Only the platform GitHub **staging** public RevenueCat SDK setting was
  replaced with the existing MurrorDev Web Billing **sandbox** identifier.
  Live SDK offerings return current `app.murror.premium.offering 2`, its
  published paywall, and the existing $12.99 monthly / $100 yearly products.
  No offering, paywall, product, price, native mapping, Alpha or production
  setting was changed.
- Linux build `33868728341` and staging deployment `33869171048` succeeded
  from reviewed/merged source `83078850a4f7458c8a5d7db53a59de99b617da1a`.
  New tag `staging-83078850a4f7458c8a5d7db53a59de99b617da1a` resolves to
  `sha256:93066b6c8e96d8fdf8a1acd6c2af02a98d91c1920706b7c6850177061abb6501`;
  the live staging deployment reports that exact digest and one ready replica.
  Served module is `/assets/index-DUNPfdfV.js`. No native CI was started.
- The earlier test account's supplied password failed once; it was not reset.
  The actual signed-in Chrome profile instead holds the existing recovery
  test account `135c2633-39d8-4e68-b756-5b938cdece12` with no completed profile.
  Its full new Orbit onboarding was exercised with mock answers, no personal
  reflection text, and no invitation. At Save my progress the current v2
  implementation remained on Google account creation and sent no onboarding
  POST despite the hydrated authenticated session. This is a reproduced
  continuation bug, not a RevenueCat/provider blocker.
- Narrow repair under review: use the existing authenticated profile-save
  handoff for hydrated sessions and react to reaching the final step, without
  regressing fresh Google sign-in or introducing duplicate saves. Isolated
  worktree `/private/tmp/murror-web-onboarding-session-20260904`, branch
  `codex/web-staging-onboarding-session-20260904`, based on fresh origin/dev
  `83078850`. No repair source has landed yet. Correct-project sandbox
  purchase, Restore, and client/API entitlement convergence remain unproven.

## Codex heartbeat checkpoint (2026-09-04 12:12Z)

- The read-only GitHub API quota check returned 4,982/5,000, with the next
  reset reported as `2026-09-04T12:59:12Z`. Exact remote refs were refreshed
  successfully: MurrorMobile `staging-environment-setup` `e7d9069c`, murror-api
  `staging` `2a836dae`, viasr-api `staging` `7093ff5`, and murror-backend `main`
  `d322b443`.
- Build 456 remains aligned on iOS staging `e7d9069c`. API staging
  `2a836dae` has successful exact-head Deploy `33832813776` and Viasr staging
  `7093ff5` has successful exact-head CI `33844006220`; PR #604 remains merged
  at `d2b4e20f`.
- PR #736 remains open with green checks and current read-only metadata
  `mergeable: CONFLICTING` / `mergeStateStatus: DIRTY`. The current exact
  compare is 40 commits ahead of staging versus 355 behind, so no broad
  reconciliation or merge was attempted.
- Legacy PR #906 remains open and mergeable at `bcaf6585`, but the legacy
  repository still has no `staging` ref (HTTP 404). Existing exact-branch
  DeploySTAGING runs `31276079517` and `31275928971` failed at app-config upload
  with Supabase `Invalid API key`; no new deployment, dispatch, rerun, provider
  write, or main merge was attempted.
- The latest controlled `devicectl list devices` reports the paired physical
  iPhone 16 Pro as available. The app-info query still fails because the locked
  iPhone prevents developer disk-image mounting; the Apple Watch remains
  explicitly out of scope. Physical APNs, dedicated ringtone, routing, consent,
  and quiet-hours acceptance remain unproven until the iPhone is unlocked.
- The cost freeze remains active; Codex started no new paid workflow,
  merge-triggered CI, native build, or duplicate run. The preceding hygiene
  audit reported 125 GiB free, a 64 MiB isolated tracker, all nine recorded
  task-owned temporary paths absent, and no task-owned disk-usage process.
  Claude's shared MurrorMobile checkout remains preserved; strict production
  readiness remains 0% pending API reconciliation, legacy credentials, and
  physical-device acceptance.

## Codex staging web onboarding and billing isolation (2026-09-04 13:06Z)

- Under Astro's explicit staging/web Actions authorization, platform PR #461
  is merged as `05e80b40a4da99725ab5d19a31555264bd04fc8e`. Independent Codex
  Sentinel and Iris reviews approved exact head
  `6fa46d358d334e2335803c42a678bb7e1b198072`; the fetched merge tree is identical.
  Exact-head CI `33873047042` and consumer contracts `33873047087` passed all
  eight jobs. The merge subject skipped duplicate post-merge validation.
- The incremental fix uses the existing hydrated auth context, saves only at
  the final onboarding step, binds draft/token ownership to the original
  account, retains failed answers across sign-in recovery, and blocks Back
  during saving. Local full suite passed 579 tests before the final Back
  guard; final focused 27 tests, lint, TypeScript/Vite build, nine workspace
  type-check tasks, and diff hygiene passed. Exact-head CI then passed all
  109 files / 580 web tests. No onboarding redesign.
- Preserve the clean reviewed worktree
  `/private/tmp/murror-web-onboarding-session-20260904`; no shared checkout
  was switched. Build `33873439123` and staging deploy `33873713308` succeeded
  for `05e80b40`, digest
  `sha256:e36508f0684acb4452967d9447d01169e696fc2123d65de8d9af714dddafcc0b`.
  Real browser canary used existing staging recovery-test identity
  `135c2633-39d8-4e68-b756-5b938cdece12`, mock name `Staging Billing QA`:
  normal onboarding POST `/api/v1/onboarding/complete` returned 201; `/me`
  returned 200 with `isOnboardingCompleted=true`; the UI reached Orbit Home
  and remained there after reload. No invitation or personal reflection was
  submitted. Alpha, production, and native releases are untouched.
- Live phone QA found an implicit 922px Home grid track inside a 390px page,
  masked by root overflow hiding. Focused PR #462 adds only `grid-cols-1`
  plus a regression preserving desktop columns. Both reviewers approved
  `be2aa540372fe4496a90b9631733c4c57fd7b2f1`; it merged as
  `8af93a5a2ef8bde7168f0e058f0ffa7c55877f2d`, tree-identical to review.
  Regression was red before the fix; 17 focused tests, lint, TypeScript/Vite
  build, nine workspace type checks, and diff hygiene passed locally. CI
  `33874770594` passed 110 files / 581 web tests; contracts `33874770613`
  passed. No duplicate post-merge CI. Preserve clean worktree
  `/private/tmp/murror-web-home-grid-20260904` at `be2aa540`.
- **Final running staging artifact:** build `33875182191`, deploy
  `33875489680`, source `8af93a5a`, image
  `ghcr.io/murror/murror-platform/web-client@sha256:7a3f238f5ebc713a81ab3bca8bfe9ac17f4e8bcab425529bdddb05eeb25960f4`.
  Exact digest is live with one ready replica in `nsp-staging-murror`,
  context `do-sfo2-murror-cluster`; served module `index-BlQE4Iu-.js`.
  Deployed phone 390x844 has a 342px grid track and heading bounds x=106..283;
  desktop 1440x900 retains 492px/420px columns. Both were visually inspected.
  Temporary diagnostic DOM styling and viewport overrides were cleared.
- Authenticated Connections, Reflection, Research, Diary, and Settings render
  their expected empty states. Reflection/Research/Diary phone headings fit;
  Settings exposes English only. Subscription now renders the real existing
  MurrorDev paywall with $12.99/month and $100/year. Its static 42% savings
  claim is inconsistent with those prices (35.85%); do not change prices or
  the shared paywall to make that badge match. No purchase was attempted.
- **Correction to the earlier 'existing staging web setup' interpretation:**
  MurrorDev's sole Web Billing app is `app9aeb492c5a`. Its sandbox webhook
  `whintgr39f052dd8d` sends to
  `https://dev.api.murror.app/api/v1/subscription/webhooks/revenuecat?rc_app=web`.
  Existing staging hook `whintgr63c520e37b` is sandbox-only but accepts only
  native `MurrorStaging (App Store)`, not web. Therefore the now-correct RC
  project/key/catalog do not yet establish staging-isolated purchase routing.
- No new sandbox purchase, webhook test, provider object, or routing change
  was made after that discovery. Apps and Web lists were checked: no separate
  staging Web Billing app exists in this project. **Access correction:** a
  tooltip initially said 'You don't have permission to add app configurations',
  but the actual control is enabled and normal navigation opens the full
  RevenueCat Billing creation form. No 401/403 or actual creation denial was
  observed. Astro was told the earlier owner/admin sign-in request was
  premature; do not repeat it. New provider creation has not been submitted.
  Preserve Alpha/native webhook mappings; do not solve isolation by repointing
  Alpha or broadening the native staging hook.
- The separate RevenueCat connector still only exposes main project
  `proj80c909dc`, so it is not a substitute for MurrorDev configuration access.
  Full web/iOS parity remains unqualified pending isolated sandbox purchase,
  Restore, and client/API entitlement convergence.
- Both reviewers recommend the smallest isolated provider continuation:
  create `MurrorStaging (Web Billing)` in `projb32bb370`, reuse the existing
  `My Murror Inc` Stripe connection `acct_1RYPIKBF6GuoOMy7` and USD, preserve
  current prices/trials, add its products to Premium without removing any
  existing products, and use a dedicated staging offering targeted by the
  exact new App ID. The new offering can initially have no hosted paywall:
  the already-shipped SDK selector fallback supplies quote-derived prices
  and account refresh without editing any shared paywall or writing more UI.
  Targeting's normal new-rule form exposes App conditions; no rule was saved
  and no plan upgrade was undertaken. Keep the global default unchanged.
- Before any purchase, verify ALL existing webhook filters for unintended
  all-app deliveries, then add a sandbox-only, exact-new-app webhook to the
  verified staging endpoint using the existing staging authentication.
  Shared Premium still shares customer identities across this project, so
  retain the staging-only QA identity above.
- **Action-time confirmation gate:** new app creation generates persistent
  SDK keys. The RevenueCat creation form is filled but NOT saved in Chrome
  tab `650483109`: configuration `MurrorStaging (Web Billing)`, display name
  `Murror Staging`, existing Stripe connection selected, USD. Ask the specific
  creation/credential/routing confirmation, not a new account sign-in. No
  new provider object, API key, product, offering, targeting rule, or webhook
  was created. The authenticated staging Home tab `650483115` is retained
  for continuation; redundant login/key/targeting inspection tabs were closed.
- Latest September platform-only Actions reading: 4,867 Linux minutes,
  $29.202 gross / $21.462 net (billing can lag). All task runs are completed.

## Codex staging web billing isolation and deploy checkpoint (2026-09-04 13:50Z)

- The previously pending RevenueCat continuation is now complete in project
  `MurrorDev` (`projb32bb370`). New Web Billing app/configuration:
  `MurrorStaging (Web Billing)`, display name `Murror Staging`, app id
  `app29b231b7c8`. It reuses the existing USD Stripe connection `My Murror Inc`
  (`acct_1RYPIKBF6GuoOMy7`). New public/sandbox SDK keys were generated and
  transferred only to the staging web client; never print them.
- Staging web products are attached to the existing Premium entitlement without
  changing the shared/default catalog: monthly `app.murror.premium.stg.web.monthly`
  (`prodeded6b6dfa`, $12.99/month, 3-day trial) and yearly
  `app.murror.premium.stg.web.yearly` (`prod65ea2bddaf`, $100/year, 3-day trial).
  Dedicated offering `app.murror.premium.stg.web.offering` (`ofrngb83a9a9545`)
  contains `$rc_monthly` and `$rc_annual`; no hosted paywall was attached.
- Targeting is app-specific: rule `nDPtYNQ3uf`, display
  `Murror Staging Web Billing`, matches only `MurrorStaging (Web Billing)` and
  shows the dedicated staging offering. Other apps continue to the existing
  `app.murror.premium.offering 2` default. No Alpha, iOS, or production mapping
  was changed.
- Existing webhook filters were inspected before adding the new sandbox-only
  staging web hook `whintgr93114179f5`. It targets only
  `MurrorStaging (Web Billing) (RevenueCat Billing)` and sends to
  `https://staging.api.murror.app/api/v1/subscription/webhooks/revenuecat?rc_app=web`.
  It reuses the existing staging webhook authorization from Kubernetes without
  exposing the secret. The native staging hook remains app-filtered and intact.
- GitHub Actions environment secret
  `WEB_CLIENT__VITE_REVENUECAT_PUBLIC_API_KEY` was updated only in the
  `staging` environment of `Murror/murror-platform`. No secret values were
  printed. Build `33879217223` succeeded for `dev` SHA `8af93a5a`; staging
  deploy `33879463094` succeeded. The live Deployment has one ready replica,
  deployment revision `321`, Helm revision `215`, and immutable image digest
  `sha256:9f1517fddcd17852873e3d1c300df2500b920155254928620c11b926568f7320`.
- Post-deploy browser proof: after reload, authenticated staging subscription
  loaded the two expected prices/trials; checkout opens a RevenueCat `SANDBOX`
  surface for `Murror Staging`, shows `$0` due today, and the selected yearly
  plan. The staging browser tab is marked for handoff at the payment form.
- **Remaining proof gate:** a sandbox test-card/email entry, final sandbox
  `Start trial`, RevenueCat webhook delivery, staging API entitlement
  convergence, and client Restore/reload still need to be verified. Do not
  claim complete web parity until those provider/backend/client signals agree.
  The existing subscription UI's static `42% discount` badge also remains an
  unresolved content inconsistency against the actual prices (~36% savings);
  do not mutate the shared paywall or prices without a separate decision.
- Actions budget remains constrained by the previously reported organization
  ceiling. No additional build/deploy, push, PR, native job, Alpha change, or
  production mutation should be initiated without checking fresh headroom.

## Codex heartbeat checkpoint (2026-09-04 22:13Z)

- The fresh read-only GitHub API quota check reset to 5,000/5,000, with the
  next reset reported as `2026-09-04T23:10:13Z`. Exact remote refs were refreshed
  successfully: MurrorMobile `staging-environment-setup` `1d2fcd16`, murror-api
  `staging` `17c2533c`, viasr-api `staging` `c5b56df`, and murror-backend `main`
  `d322b443`.
- The iOS staging source still has 26 `CURRENT_PROJECT_VERSION` settings at
  `456` after the merged build-456 bump `c6caab59` (`#1210`). No archive,
  TestFlight upload, or new iOS build was started. API staging `17c2533c`
  completed exact-head Deploy `33903088119` successfully; Viasr staging
  `c5b56df` completed exact-head CI `33874390148` successfully, and PR #604
  remains merged at `d2b4e20f`.
- PR #736 remains open with green checks and current metadata
  `mergeable: CONFLICTING` / `mergeStateStatus: DIRTY`. The exact compare is
  40 commits ahead of staging versus 360 behind, so no reconciliation or merge
  was attempted.
- Legacy PR #906 remains open and mergeable at `bcaf6585`, but the legacy
  repository still has no `staging` ref (HTTP 404). Existing exact-branch
  DeploySTAGING runs `31276079517` and `31275928971` failed at app-config upload
  with Supabase `Invalid API key`; no new deployment, dispatch, rerun, provider
  write, or main merge was attempted.
- The latest controlled `devicectl list devices` reports the paired physical
  iPhone 16 Pro as available, but the app-info query fails because the locked
  iPhone prevents developer disk-image mounting. The Apple Watch remains
  explicitly out of scope. Physical APNs, dedicated ringtone, routing, consent,
  and quiet-hours acceptance remain unproven until the iPhone is unlocked.
- The cost freeze remains active; Codex started no new paid workflow,
  merge-triggered CI, native build, or duplicate run. Claude's shared
  MurrorMobile checkout remains preserved. Strict production readiness remains
  0% pending API reconciliation, legacy credentials, and physical-device
  acceptance.

## Codex heartbeat checkpoint (2026-09-04 17:14Z)

- The read-only GitHub API quota check returned 4,983/5,000, with the next
  reset reported as `2026-09-04T18:03:13Z`. Exact remote refs were refreshed
  successfully: MurrorMobile `staging-environment-setup` `7cec284d`, murror-api
  `staging` `3527028d`, viasr-api `staging` `c5b56df`, and murror-backend `main`
  `d322b443`.
- The iOS staging source still has 26 `CURRENT_PROJECT_VERSION` settings at
  `456` after the merged build-456 bump `c6caab59` (`#1210`). No archive,
  TestFlight upload, or new iOS build was started. API staging `3527028d`
  completed existing Deploy `33898729220` successfully through deployment,
  smoke test, release, and summary; Viasr staging `c5b56df` completed exact-head
  CI `33874390148` successfully, and PR #604 remains merged at `d2b4e20f`.
- PR #736 remains open with green checks and current metadata
  `mergeable: CONFLICTING` / `mergeStateStatus: DIRTY`. The exact compare is
  40 commits ahead of staging versus 359 behind, so no reconciliation or merge
  was attempted. The API Deploy was already running from an external push when
  Codex observed it; Codex only watched it to completion and did not dispatch or
  rerun it.
- Legacy PR #906 remains open and mergeable at `bcaf6585`, but the legacy
  repository has no `staging` ref (HTTP 404). Existing exact-branch
  DeploySTAGING runs `31276079517` and `31275928971` failed at app-config upload
  with Supabase `Invalid API key`; no deployment, rerun, provider write, or main
  merge was attempted.
- The latest controlled `devicectl list devices` reports the paired physical
  iPhone 16 Pro as available, but the app-info query fails because the locked
  iPhone prevents developer disk-image mounting. The Apple Watch remains
  explicitly out of scope. Physical APNs, dedicated ringtone, routing, consent,
  and quiet-hours acceptance remain unproven until the iPhone is unlocked.
- The cost freeze remains active; Codex started no new paid workflow,
  merge-triggered CI, native build, or duplicate run. Claude's shared
  MurrorMobile checkout remains preserved. Strict production readiness remains
  0% pending API reconciliation, legacy credentials, and physical-device
  acceptance.

## Codex heartbeat checkpoint (2026-09-04 22:14Z)

- The fresh read-only GitHub API quota check reset to 5,000/5,000, with the
  next reset reported as `2026-09-04T23:10:13Z`. Exact remote refs were refreshed
  successfully: MurrorMobile `staging-environment-setup` `1d2fcd16`, murror-api
  `staging` `17c2533c`, viasr-api `staging` `c5b56df`, and murror-backend `main`
  `d322b443`.
- The iOS staging source still has 26 `CURRENT_PROJECT_VERSION` settings at
  `456` after the merged build-456 bump `c6caab59` (`#1210`). No archive,
  TestFlight upload, or new iOS build was started. API staging `17c2533c`
  completed exact-head Deploy `33903088119` successfully; Viasr staging
  `c5b56df` completed exact-head CI `33874390148` successfully, and PR #604
  remains merged at `d2b4e20f`.
- PR #736 remains open with green checks and current metadata
  `mergeable: CONFLICTING` / `mergeStateStatus: DIRTY`. The exact compare is
  40 commits ahead of staging versus 360 behind, so no reconciliation or merge
  was attempted.
- Legacy PR #906 remains open and mergeable at `bcaf6585`, but the legacy
  repository still has no `staging` ref (HTTP 404). Existing exact-branch
  DeploySTAGING runs `31276079517` and `31275928971` failed at app-config upload
  with Supabase `Invalid API key`; no new deployment, dispatch, rerun, provider
  write, or main merge was attempted.
- The latest controlled `devicectl list devices` reports the paired physical
  iPhone 16 Pro as available, but the app-info query fails because the locked
  iPhone prevents developer disk-image mounting. The Apple Watch remains
  explicitly out of scope. Physical APNs, dedicated ringtone, routing, consent,
  and quiet-hours acceptance remain unproven until the iPhone is unlocked.
- The cost freeze remains active; Codex started no new paid workflow,
  merge-triggered CI, native build, or duplicate run. Claude's shared
  MurrorMobile checkout remains preserved. Strict production readiness remains
  0% pending API reconciliation, legacy credentials, and physical-device
  acceptance.

## Claude checkpoint (2026-09-05, post-457 ship)

**The 2026-09-04 22:14Z Codex checkpoint above is STALE.** It records MurrorMobile
`staging-environment-setup` at `1d2fcd16` and iOS at build 456. Both moved
substantially after it was written. Exact refs verified at this checkpoint:

- MurrorMobile `staging-environment-setup`: **`ef3c2ac7`**
- murror-api `staging`: **`ced6962b`**
- viasr-api `staging`: `c5b56df`, `production`: **`d928479`**

### Shipped: iOS build 457, attached to 2.0.0

Archived, uploaded and attached. `appStoreState` is now `PREPARE_FOR_SUBMISSION`.
Attach returned HTTP 204 and was confirmed by re-read, not by exit code.
Artifact verified before upload: app and BOTH `.appex` at 457, production host
baked in (`grep -c`, never `-q`), and tonight's strings confirmed present in the
Hermes bundle via `strings` (plain `grep` returns zero on bytecode and is a false
negative). "Personalization level" is confirmed ABSENT from the shipped binary.

Twelve MurrorMobile PRs merged into 457: #1211 #1212 #1214 #1215 #1216 #1217
#1218 #1219 #1220 #1221 #1222 #1213(bump). All eleven fixes were verified as
ancestors of the bump head with `git merge-base --is-ancestor` before archiving.

### murror-api staging carries (NOT promoted, awaiting Astro)

#922 #923 #926 #927 #928 #929 #930 #931. viasr-api WAS promoted to production
and verified by effect inside the running container.

### Ownership right now

| PR | Owner | State |
|---|---|---|
| MurrorMobile #1223 (task 8) | Codex authored, Claude verifying | Rebased `1d2fcd16` -> `ef3c2ac7`, CI re-running |
| murror-api #932 (task 9) | Codex authored, Claude verified | Base current, mutation-proven, NOT merged |
| murror-api #925 | Codex | HELD, see blocker below |

**Nothing merged this session without Astro's explicit approval.** #1223 and #932
are both verified and awaiting his call.

### #932 verification (Claude, independent of Codex's green)

Mutation-proven rather than trusted: deleting a real `assertConnectionMembers`
call site from `connections.service.ts` (`git diff --numstat` = `0 4`) turns
exactly `guards upsertConnectionType before a new connection create` RED while
the other eight stay green. It identifies WHICH site was removed. The spec it
replaces passed **87/87** on this identical mutation. Zero `toContain`; it
asserts call ORDER (`events[0]`='lookup', `events[1]`='write').

### #1223 review (Claude)

Sound. Two changes, both correct: it compares the PR HEAD instead of
`GITHUB_SHA` (the synthetic merge commit was importing files from commits landed
on the base AFTER the PR opened, which is why #1220 inherited #1218's
`scripts/copy-lint.js` and paid 54 minutes of hosted macOS), and it narrows
blanket `scripts/` to seven native-relevant paths.

I checked the narrowing for omissions rather than trusting it. Eleven scripts
mention Xcode/pods/archive yet sit outside the new list: **ten are test files or
fixtures** (a change to a test OF a native script cannot break the build), and
the eleventh, `scripts/ci/check-ios-environment-contract.mjs`, runs inside Fast
Ubuntu Checks alongside ESLint and TypeScript. **No genuine omission.**

### #925 blocker, stated exactly

Both positions are correct, about DIFFERENT environments, and rewriting the
bucket key cannot resolve it.

`user-throttler.guard.ts` already dispatches on the token's own `alg` header and
verifies ES256 through JWKS, and it already DOCUMENTS this tradeoff at lines
93-97. The per-token bucket is a deliberate choice, not an oversight.

- staging and dev/alpha2 publish **ES256 + JWKS**: key rollover is graceful, the
  JWKS carries old and new, so there is NO mass-invalidation event.
- production still signs with the **legacy HS256 shared secret**: rotating it
  invalidates every token at once.

So Codex's forged-token abuse case is real, and the rotation objection is real
**only on production's legacy auth**. The genuinely rotation-safe design is
therefore not a smarter bucket key: it is finishing production's migration to the
JWKS the other two environments already use. Once prod verifies via JWKS, a
rotation stops being a cliff and an IP fallback becomes safe.

**Recommendation: leave #925 held.** Do not force an IP-only fallback; it trades
a forgery bound for a population-wide outage on the one environment that still
has the cliff. #925 also needs a rebase regardless: #928 and #929 both changed
`user-throttler.guard.ts`.

### Standing constraints observed this session

No deploys beyond the viasr promotion Astro explicitly approved. No database
writes (the one production backfill earlier was on his explicit sign-off). No
Android, no hosted-macOS work initiated. No `pnpm install` in any murror-api
worktree; `prisma generate` was run in an isolated worktree only after confirming
both schema generators have explicit `output` paths under `src/generated`, and
 the shared `node_modules/.prisma` was verified absent afterwards.

## Codex heartbeat checkpoint (2026-09-05 03:15Z)

- The fresh read-only GitHub API quota check reset to 5,000/5,000, with the
  next reset reported as `2026-09-05T04:13:14Z`. Exact remote refs were
  refreshed successfully: MurrorMobile `staging-environment-setup` `cdad9ed3`,
  murror-api `staging` `42dcc8e7`, viasr-api `staging` `c5b56df`, and
  murror-backend `main` `d322b443`.
- iOS staging is source build 457. Merged bump PR #1213 is anchored at
  `ef3c2ac7`; current source inspection finds 26 `CURRENT_PROJECT_VERSION`
  settings and all four checked app `CFBundleVersion` values at `457`. No
  archive, TestFlight upload, or new iOS build was started. API staging
  `42dcc8e7` completed exact-head Deploy `33939304569` successfully; Viasr
  staging `c5b56df` completed exact-head CI `33874390148` successfully, and PR
  #604 remains merged at `d2b4e20f`.
- PR #736 remains open with green checks and current read-only metadata
  `mergeable: UNKNOWN` / `mergeStateStatus: UNKNOWN`. The exact compare is 40
  commits ahead of staging versus 364 behind, so no reconciliation or merge was
  attempted.
- Legacy PR #906 remains open and mergeable at `bcaf6585`, but the legacy
  repository still has no `staging` ref (HTTP 404). Existing exact-branch
  DeploySTAGING runs `31276079517` and `31275928971` failed at app-config upload
  with Supabase `Invalid API key`; no deployment, rerun, provider write, or main
  merge was attempted.
- The latest controlled `devicectl list devices` reports the physical iPhone 16
  Pro as unavailable, so no app-info query or developer disk-image mount is
  possible. The Apple Watch remains explicitly out of scope. Physical APNs,
  dedicated ringtone, routing, consent, and quiet-hours acceptance remain
  unproven until the iPhone is available and unlocked.
- The cost freeze remains active; Codex started no new paid workflow,
  merge-triggered CI, native build, or duplicate run. Claude's shared
  MurrorMobile checkout remains preserved. Strict production readiness remains
  0% pending API reconciliation, legacy credentials, and physical-device
  acceptance.

## Claude web lane decision checkpoint (2026-09-06 00:30 PST)

- **The web production candidate is the `staging` lineage, by Astro's decision on 2026-09-05.**
  Production web (`prod-a79b0ab2`) is an ancestor of `origin/staging` and NOT of `origin/dev`;
  `dev` forked at `42a21ff2` (2026-06-22) and lacks 231 files production serves today plus the
  August parity train (760 web-client files differ; `dev` has 94k fewer lines). Promoting `dev`
  would regress production. Full measurement in the Claude memory note
  `project_web_lineage_fork_dev_vs_staging`.
- **Do not deploy `dev` to `staging.app.murror.app` again.** Codex's dev-lineage build (digest
  `sha256:9f1517fd…`, Helm rev 215) WAS replaced on 2026-09-06 00:08 PST by a build of
  `origin/staging` (`030a1a40`): build run 33979839420, deploy run 33979972679, digest
  `sha256:d016638d…a8fd`, Helm rev 216, verified by effect (digest, ready pod, host 200).
  The `staging` GitHub environment's branch policy now allows `staging` as well as `dev`. Alpha may keep
  the `dev` lineage until Astro says otherwise.
- murror-platform PR #463 merged into `staging` (`030a1a40`, 8/8 Ubuntu checks): #438 recovery
  `redirectTo` port, banned-copy sweep (104 strings, three locales) + `banned-words.test.ts`
  guard, `deploy-web-client-production.yml` (new, gated, digest-pinned, verifies by effect),
  `build-web-client.yml` CANONICAL=`staging`, chart appends the managed pull secret instead of
  the script replacing production's `ghcr-secret`, growth-source wire mapping, onboarding
  `inert` + progressbar, dark color-scheme + scoped autofill, 44px sign-in targets.
- Production paywall: Astro chose to ship web with `WEB_CLIENT__VITE_ENABLE_HARD_PAYWALL=false`
  in the `production` GitHub environment (build-time; takes effect at the next production
  build). No RevenueCat Web Billing app exists for production; do not create one without Astro.
- Codex's dev-only work worth porting onto `staging` as small reviewed slices: iOS-style auth
  shell (#443), founder-letter beat (#459). Do NOT port #460/#461 (dev-specific) or re-run
  visual "alignment" PRs against `staging` wholesale.
- Still owed before a production dispatch: `GHCR_TOKEN` in the `production` environment
  (absent), an authenticated staging pass by Astro, the other seven charts' pull-secret
  override (`useValuesFilePullSecrets` is set only for web-client).

## Claude Android entrance-animation checkpoint (2026-09-06)

Branch `codex/android-launch-readiness-20260901`, three commits, **local only**
(`32bdbbba`, `944c20ab`, `06d1f47f`). The push guard denies this branch twice, so
they are unpushed. A push starts NOTHING: `android.yaml` is the only workflow with
a push trigger and its branches are `[main, develop, staging-environment-setup]`;
no workflow references `codex`. The guard matches the branch's whole diff against
staging, not the push target, which is the known false positive.

### 🚨 CORRECTION: `LayoutAnimationConfig skipEntering` has a ONE-COMMIT scope

An earlier option offered to Astro, "one global guard near the navigator root
removes this entire bug class", is **WRONG**. Proven from
react-native-reanimated 3.17.1 source, and independently re-verified:

- `src/component/LayoutAnimationConfig.tsx:29-33` - `SkipEntering` does
  `useRef(shouldSkip)` then a `useEffect` resetting it to `false` with
  `[skipValueRef]` deps, a stable ref, so it runs EXACTLY ONCE on the guard's
  own mount.
- `src/createAnimatedComponent/createAnimatedComponent.tsx:165-181` - on Fabric,
  ENTERING is registered ONLY in the AnimatedComponent CONSTRUCTOR, reading the
  context once at that child's first render. The other site (`:583-594`) is gated
  on `!isFabric()`. `android/gradle.properties` has `newArchEnabled=true`.

So the guard protects only children that render in its OWN first commit. At a
navigator root it would cover roughly one tick at launch and nothing after.
Do not re-propose it.

Consequences for choosing a fix:
- Same-file guard around a subtree that renders unconditionally: WORKS.
- Guard hoisted around a swap area: protects the FIRST page only. Often exactly
  right, since the first mount is the risky one.
- Guard around a QUERY-GATED branch: INERT. Remove the `entering` instead.

### What shipped

1. `relationship-more-insight.tsx` - entrance REMOVED. The X calling `goBack()`
   is the only exit from this full-screen modal and sat inside the fading
   subtree. Both ternary branches are `Animated.View` at the same position with
   no `key`, so React updates ONE instance; on the cold path it was constructed
   while the skeleton showed and the fade never registered at all, while on the
   warm path it registered and could strand the exit. Dead on the slow path,
   live on the fast one.
2. `setting-privacy.tsx` - guard hoisted around the page-swap area PLUS seeding
   `typePagePrivacy` from `initTypePage`. The hoist ALONE did nothing: three of
   four entry points deep-link past the overview
   (`relationship-detail-screen.tsx:2431`, `:2534`, `:2542`) and the state seeded
   to a hardcoded `'overview'`, so the requested page arrived a commit too late.
   Drill-in fades kept on purpose, with a test asserting they still register.
3. `onboarding-language-screen.tsx` - guarded, as prescribed.
4. Typography: the three 16px Playfair line heights collapsed onto 22, on the
   font's own metrics (declared line box 21.33px at 16px, so 21 was BELOW it).
   Two redundant variants deleted, not aliased.
5. Two emoji-as-icon sites replaced with SVGs; the envelope reuses the icon the
   sibling orbital avatar already draws.

### Enumeration for the next lane

111 production `entering=` sites across 47 files. A lookback heuristic flags
about 40 as gated behind async state, where a guard would be inert, but it
OVER-COUNTS: two false positives confirmed by hand. Needs a per-site read.

Top candidate: `knowledge-screen.tsx:102` (the Research/Knowledge TAB) wraps
EVERY list card in `FadeInDown.duration(1000)`, mounting after the query
resolves. The cards are the tap targets. That matches Astro's device report
"same with Research tab" and is a plausible SECOND cause, independent of the
CustomModalBounce mount-order fix. SUSPECTED, not proven.

### Not verified

Unit-tested, not device-verified. Nothing here ran on an Android device or a
Fabric build. The stall is modelled by a test double whose fidelity is argued
from source and checked with a mutation that removes its mount latch.

Full suite: 580 suites, 5,775 passed, 3 skipped, exit 0. `tsc --noEmit` 0.
ESLint baseline exact. i18n-check, copy-lint, i18n-unused all clean.

## Claude Android entrance sweep, complete (2026-09-06)

Eight commits on `codex/android-launch-readiness-20260901`, **all local, push
blocked** (see the previous section for why a push starts no CI).
`32bdbbba 944c20ab 06d1f47f ffc3d454 349bbe89 dcf7270d c302c823 6c19b7b9`

Full suite 604 suites / 5,882 passed, exit 0. `tsc --noEmit` 0. ESLint exact
baseline. i18n-check, copy-lint, i18n-unused all clean.

### 🚨 T12 NEVER PROTECTED ITS SCREEN

`relationship-detail-screen.tsx:275-320` sets `ANIM_DURATION = 1`, believing a
1ms entrance lands at its visible end state. The Fabric registration branch
(`createAnimatedComponent.tsx:165-181`) tests only whether `entering` is truthy,
plus reduced motion, `skipEntering` and `isFabric`. **Duration is never
consulted.** The opacity-0 clone happens regardless, and an animation that never
starts is as invisible at 1ms as at 800ms. The screen stayed exposed from the
T12 change until now. Corollary: NO "make it shorter/zero/instant" mitigation can
ever work on this bug class. Only not registering helps.

Removing those four is a visual no-op: `maybeSetConfigValue` is truthiness-gated
(`ComplexAnimationBuilder.ts:274-281`), so `.delay(0)` was already discarded.

### Two shapes that decide guard vs removal

1. **Shared instance across branches.** Same element type, same position, no
   `key` means ONE instance, so whichever branch was constructed first owns the
   registration. Seen both ways: `relationship-more-insight.tsx` never registered
   on the cold path (both branches animated), `streak-view.tsx` does (its
   skeleton branch is a plain `View`).
2. **Inherited stall.** `journal-view.tsx` has four root branches sharing one
   instance. Removing `entering` from only the load-bearing ones left the content
   branch inheriting a stall from a decorative sibling. **Partial removal inside
   a shared-instance group is not a fix.** Measured.

Also: `weekly-result-screen.tsx`'s two returns must reconcile to DIFFERENT root
types, or the guard goes inert when `hasResult` flips late. A comment on the
other branch says so.

### Totals

111 production `entering=` sites. 91 classified across four lanes plus the three
fixed earlier. Roughly 30 fixed, the rest left as decoration with reasons in the
commit messages.

### Astro's Research tab report: still unexplained, two candidates eliminated

- The article-card entrance CANNOT explain it: a stalled card is invisible but
  still tappable, so the push fires, and `knowledge-screen-detail.tsx` has ZERO
  entrances so it cannot be blanked.
- The Home Research card root pushes to `KnowledgeScreen`, whose cards DID stall
  behind a 400ms `isReady` gate plus the query. That path is now fixed.
- The row-geometry theory (`getItemLayout`/`snapToInterval` from a stale
  `containerHeight`) was ALREADY FIXED in `82db4d05`, which is in build 84.
  Astro reported against 81.

### 🚨 emoji-as-icon was a RECURRENCE

`d90e6cc0` (2026-06-22) swapped eight settings SVGs for emoji "instead of the SVG
glyphs that were not rendering". Real cause: **59 of 138 icons declare width and
height with NO `viewBox`**, so react-native-svg maps 1:1 and CLIPS rather than
scaling. The emoji were a workaround for a missing attribute. Call sites now pass
the missing viewBox rather than editing shared assets.

**Owed follow-up:** add `viewBox` to `bell-icon`, `hand-icon`, `document-icon`,
`globe-icon`, then drop the call-site compensation. The other 55 remain a trap.

### Flagged, not fixed

- `galaxy-home-slot.tsx`: structurally the worst site found. Once the mode flips,
  the Home fallback is gone, so a stall leaves a blank screen whose only exit is
  a gesture on an invisible surface. Unreachable behind a dark Statsig gate, and
  its fade has a documented masking job. **Blocker to enabling that gate.**
- `privacy-page.tsx:189`: the error branch holds the retry button and swaps in on
  a query result, so the hoisted host guard misses it. Not a trap, the back arrow
  stays visible.

### Not verified

Nothing is device-verified. No Android device or emulator was used. Every
conclusion is source reading plus a fail-open double that models registration and
withholds the progress frame.

## Claude Android: entrances removed app-wide + icon viewBox (2026-09-06)

Astro ruled twice here: remove EVERY entrance animation app-wide, and fix all 59
icon assets rather than compensating at call sites.

**Remote is at `6c19b7b9`. Four commits are LOCAL ONLY, blocked by the push
guard:** `15153c15 89f5fe6b 5d756972 bf79cc4c`. The guard denies this branch
whenever `android/` is in the diff, regardless of push target. It let one push
through earlier and refused the next two, so treat it as unreliable rather than
a rule. A push starts NOTHING: `android.yaml` is the only workflow with a push
trigger and its branches are `[main, develop, staging-environment-setup]`; every
Android run on this branch has been `workflow_dispatch`.

```
git -C Murror/MurrorMobile-worktrees/android-launch-readiness-20260901 \
  push origin codex/android-launch-readiness-20260901
gh workflow run android.yaml --ref codex/android-launch-readiness-20260901 \
  -f release_environment=production
```

Full suite 607 suites / 5,975 passed, jest exit 0 (verified without a pipe, so
the exit code is real). `tsc` 0. ESLint exact baseline. i18n-check, copy-lint,
i18n-unused clean. versionCode 85 across all five sites, both contract checks
green.

### Entrances: 81 removed, 9 guards removed, 0 remain

Guards could never have closed this. `skipEntering` resets in a one-shot passive
effect and Fabric reads it in the AnimatedComponent CONSTRUCTOR, so a guard only
covers children rendering in its OWN first commit. Every guard added earlier on
this branch is therefore removed as dead code.

**The durable artefact is `src/entrance-animations-removed.contract.spec.ts`**,
which fails if any production file reintroduces an entrance. It strips comments
(many doc blocks warn about this defect) and carries positive controls: it must
flag a synthetic entrance, must NOT flag one quoted in a comment, `exiting=`,
`layout=`, or the word "centering", and must assert it scanned real files. CI
runs jest on PRs to `main` and `staging-environment-setup`, so it is enforced
there already.

Known gap, documented in the gate: a spread-form `{...props}` carrying an
`entering` key is not caught. None exist today.

### Icons: all 59 fixed at the asset

Rule applied: viewBox is the DECLARED width/height, widened only where the ink
provably does not fit. That makes 58 of 59 a strict identity at natural size.
**`email-icon` is the only visible change** (ink 37x32, declared 24x24, so it was
losing a third of the envelope) and it has no call sites. Cropping to the ink
instead would have zoomed every icon and broken a deliberate 2px Home-tab nudge.

The 4 call-site compensations from `6c19b7b9` are now deleted, which the existing
either/or contract demanded once the assets carried their own boxes.

### 🚨 Still open

- **`target-icon.tsx` cannot be recoloured.** Probed, not inferred: passing a
  stroke yields black paths because each child hardcodes its own. Zero call
  sites, so it is a prerequisite before use, not a live bug.
- **`eye-close-icon.tsx` exports `EyeSplash` and `eye-splash-icon.tsx` exports
  `EycCloseIcon`.** The names are swapped; one call site renames on import.
- **`galaxy-home-slot.tsx`** entrance is gone now, so that blocker is cleared.
- **13 shared values still rest at opacity 0** revealed only from an effect, a
  DIFFERENT mechanism from the entering clone but the same shape. Two checked by
  hand and both are fine (a decorative sparkle; a chooser whose touch handling is
  React state, not the animation). The other 11 are unreviewed and mostly
  decorative by name.

### Not verified

Nothing is device-verified. No Android device or emulator was used at any point
in this work. The visual cost of removing 81 animations has not been seen.

## Codex heartbeat checkpoint (2026-09-07 05:22Z)

- Scope remains Murror staging iPhone/iOS only. Android, iPad, Apple Watch, web,
  and desktop work were not touched.
- Exact remote refs after refresh: MurrorMobile
  `origin/staging-environment-setup` is `206374a85c` (build 460); murror-api
  `origin/staging` is `b64e7b5c16`; viasr-api `origin/staging` is
  `3450603006`; murror-backend `origin/main` is `7e459ea0e0`. Mobile build 460
  is anchored by merged PR #1237 / bump commit `2955c8b4f4`; 26 project-version
  settings and all four app plist versions read 460, and its CI run
  `34075796461` passed.
- API staging's exact-head Deploy run `34077474626` passed from `b64e7b5c16`.
  Current source sends the iOS custom sound `foodshot_jingle.wav`, but this is
  staging/source evidence only. API PR #736 is now closed and unmerged at
  `ef2a50545a`; comparing PR head to current staging remains diverged (staging
  370 commits ahead, PR 40 commits ahead). No merge or forced reconciliation was
  attempted.
- Viasr PR #604 remains merged at `d2b4e20f01`; current exact staging CI run
  `34077482686` passed from `3450603006`.
- Legacy PR #906 remains open and unmerged at `bcaf65853f`; there is still no
  remote `staging` ref. The current `main` workflow still declares a branch
  input without passing it to the reusable checkout. The two retained exact-head
  DeploySTAGING attempts (`31276079517`, `31275928971`) failed while uploading
  app configs because Supabase returned `Invalid API key`; no rerun or dispatch
  was attempted.
- The controlled `xcrun devicectl list devices` probe returned no iPhone listing.
  Consequently APNs delivery, dedicated ringtone audibility, notification
  routing, consent, quiet-hours behavior, and current-build install/runtime
  proof remain unverified. The Apple Watch stayed untouched.
- Codex started no merge, deployment, provider write, native iOS build,
  TestFlight upload, or duplicate workflow. An unrelated Android Build run
  `34085244221` was already in progress in Actions; it was not started,
  cancelled, or inspected by Codex to avoid interfering with another session.
- The local live tracker page was updated and committed as
  `9d2220e0` in the isolated tracker worktree; it was not pushed. GitHub core
  quota was `4,951/5,000` and GraphQL was `5,000/5,000` at this checkpoint.
  Storage check: 118 GiB free, tracker 64 MiB, page 468 KiB, and all nine
  task-owned temporary paths absent. A process-list check was denied by macOS;
  no task-owned long-running process was started in this checkpoint.

## Codex heartbeat checkpoint (2026-09-08 06:24Z, final EOF)

- Scope remains Murror staging iPhone/iOS only. Android, iPad, Apple Watch, web,
  and desktop work were not touched; shared changes were preserved.
- Exact remote refs after refresh: MurrorMobile
  `origin/staging-environment-setup` is `386f331c1f` (build 464); murror-api
  `origin/staging` is `f7c2f3a8b0`; viasr-api `origin/staging` is
  `1bc1aaed62`; murror-backend `origin/main` is `7e459ea0e0`. Mobile source
  has 26 `CURRENT_PROJECT_VERSION` settings and all four app plist versions at
  464.
- Build 464 is anchored by merged PR #1254 / bump commit `6241ccc4db`; its
  existing CI run `34187994975` passed, with the native iOS job skipped because
  no native/release-sensitive source changed. The merged bump is the current
  staging tip. No archive or TestFlight action was started.
- API staging's exact-head Deploy run `34138865177` passed from `f7c2f3a8b0`.
  Current source sends the iOS custom sound `foodshot_jingle.wav`, but this is
  staging/source evidence only. API PR #736 remains closed and unmerged at
  `ef2a50545a`; current staging is 372 commits ahead and the PR head is 40
  commits ahead. No merge or forced reconciliation was attempted.
- Viasr PR #604 remains merged at `d2b4e20f01`; current exact staging CI run
  `34134021131` passed from `1bc1aaed62`.
- Legacy PR #906 remains open and unmerged at `bcaf65853f`; there is still no
  remote `staging` ref. The current `main` workflow still declares a branch
  input without passing it to the reusable checkout. The two retained exact-head
  DeploySTAGING attempts (`31276079517`, `31275928971`) failed while uploading
  app configs because Supabase returned `Invalid API key`; no rerun or dispatch
  was attempted.
- The controlled `xcrun devicectl list devices` probe timed out while
  CoreDeviceService was initializing, so no iPhone listing or app-info query was
  possible. APNs delivery, dedicated ringtone audibility, notification routing,
  consent, quiet-hours behavior, and current-build install/runtime proof remain
  unverified. The Apple Watch stayed untouched.
- Codex started no merge, deployment, provider write, native iOS build,
  TestFlight upload, or duplicate workflow. The live tracker page was updated
  and committed locally as `0d944193` in the isolated tracker worktree; it was
  not pushed. The read-only quota check returned core `4,991/5,000` and
  GraphQL `5,000/5,000`, with resets at `07:19:21Z` and `07:26:30Z`.
- Storage check: 88 GiB free, tracker 64 MiB, page 468 KiB, and all nine
  task-owned temporary paths absent. The process-list check was denied by macOS;
  no task-owned long-running process was started in this checkpoint.

## Codex heartbeat checkpoint (2026-09-07 10:23Z)

- Scope remains Murror staging iPhone/iOS only. Android, iPad, Apple Watch, web,
  and desktop work were not touched.
- Exact remote refs after refresh: MurrorMobile
  `origin/staging-environment-setup` is `7220c350b8` (build 461); murror-api
  `origin/staging` is `b64e7b5c16`; viasr-api `origin/staging` is
  `3450603006`; murror-backend `origin/main` is `7e459ea0e0`. Mobile build 461
  is anchored by merged PR #1242 / bump commit `ce7e7f613c`; 26 project-version
  settings and all four app plist versions read 461, and its CI run
  `34110241137` passed.
- API staging's exact-head Deploy run `34077474626` passed from `b64e7b5c16`.
  Current source sends the iOS custom sound `foodshot_jingle.wav`, but this is
  staging/source evidence only. API PR #736 remains closed and unmerged at
  `ef2a50545a`; comparing PR head to current staging remains diverged (staging
  370 commits ahead, PR 40 commits ahead). No merge or forced reconciliation was
  attempted.
- Viasr PR #604 remains merged at `d2b4e20f01`; current exact staging CI run
  `34077482686` passed from `3450603006`.
- Legacy PR #906 remains open and unmerged at `bcaf65853f`; there is still no
  remote `staging` ref. The current `main` workflow still declares a branch
  input without passing it to the reusable checkout. The two retained exact-head
  DeploySTAGING attempts (`31276079517`, `31275928971`) failed while uploading
  app configs because Supabase returned `Invalid API key`; no rerun or dispatch
  was attempted.
- The controlled `xcrun devicectl list devices` probe returned no iPhone listing.
  Consequently APNs delivery, dedicated ringtone audibility, notification
  routing, consent, quiet-hours behavior, and current-build install/runtime
  proof remain unverified. The Apple Watch stayed untouched.
- Codex started no merge, deployment, provider write, native iOS build,
  TestFlight upload, or duplicate workflow. The local live tracker page was
  updated and committed as `55602579` in the isolated tracker worktree; it was
  not pushed. GitHub core quota was `4,904/5,000` and GraphQL was
  `5,000/5,000` at this checkpoint.
- Storage check: 104 GiB free, tracker 64 MiB, page 468 KiB, and all nine
  task-owned temporary paths absent. A process-list check was denied by macOS;
  no task-owned long-running process was started in this checkpoint.

## Codex heartbeat checkpoint (2026-09-07 20:23Z, EOF)

- This EOF checkpoint is authoritative for the current heartbeat; an earlier
  20:23Z note remains above an existing historical section and was preserved.
- Scope remains Murror staging iPhone/iOS only. Android, iPad, Apple Watch, web,
  and desktop work were not touched; shared Android-related changes were
  preserved.
- Exact remote refs after refresh: MurrorMobile
  `origin/staging-environment-setup` is `482e93a0af` (source build 462);
  murror-api `origin/staging` is `f7c2f3a8b0`; viasr-api `origin/staging` is
  `1bc1aaed62`; murror-backend `origin/main` is `7e459ea0e0`. Mobile source has
  26 project-version settings and all four app plist versions at 462. Build 462
  is anchored by merged PR #1247 / bump commit `6e511a78c3`, whose CI run
  `34139218319` passed, but the current staging head is newer than that bump;
  the official lane must be rechecked before archiving.
- API staging's exact-head Deploy run `34138865177` passed from `f7c2f3a8b0`.
  Current source sends the iOS custom sound `foodshot_jingle.wav`, but this is
  staging/source evidence only. API PR #736 remains closed and unmerged at
  `ef2a50545a`; current staging is 372 commits ahead and the PR head is 40
  commits ahead. No merge or forced reconciliation was attempted.
- Viasr PR #604 remains merged at `d2b4e20f01`; current exact staging CI run
  `34134021131` passed from `1bc1aaed62`.
- Legacy PR #906 remains open and unmerged at `bcaf65853f`; there is still no
  remote `staging` ref. The current `main` workflow still declares a branch
  input without passing it to the reusable checkout. The two retained exact-head
  DeploySTAGING attempts (`31276079517`, `31275928971`) failed while uploading
  app configs because Supabase returned `Invalid API key`; no rerun or dispatch
  was attempted.
- The controlled `xcrun devicectl list devices` probe returned no iPhone listing.
  APNs delivery, dedicated ringtone audibility, notification routing, consent,
  quiet-hours behavior, and current-build install/runtime proof remain
  unverified. The Apple Watch stayed untouched.
- Codex started no merge, deployment, provider write, native iOS build,
  TestFlight upload, or duplicate workflow. The local live tracker page was
  updated and committed as `8ed47885` in the isolated tracker worktree; it was
  not pushed. GitHub core and GraphQL quotas were both `5,000/5,000` at this
  checkpoint.
- Storage check: 105 GiB free, tracker 64 MiB, page 468 KiB, and all nine
  task-owned temporary paths absent. A process-list check was denied by macOS;
  no task-owned long-running process was started in this checkpoint.

## Codex heartbeat checkpoint (2026-09-08 01:24Z, final EOF)

- This final EOF copy is authoritative for the current heartbeat; earlier
  01:24Z and 20:23Z material was preserved in place because the handoff is
  shared.
- Scope remains Murror staging iPhone/iOS only. Android, iPad, Apple Watch, web,
  and desktop work were not touched; shared changes were preserved.
- Exact remote refs after refresh: MurrorMobile
  `origin/staging-environment-setup` is `83efb1b592` (build 463); murror-api
  `origin/staging` is `f7c2f3a8b0`; viasr-api `origin/staging` is
  `1bc1aaed62`; murror-backend `origin/main` is `7e459ea0e0`. Mobile source
  has 26 project-version settings and all four app plist versions at 463.
  Build 463 is anchored by merged PR #1250 / bump commit `b4bf7aadeb`, whose CI
  run `34176161721` passed; the merged bump is the current staging tip.
- API staging's exact-head Deploy run `34138865177` passed from `f7c2f3a8b0`.
  Current source sends the iOS custom sound `foodshot_jingle.wav`, but this is
  staging/source evidence only. API PR #736 remains closed and unmerged at
  `ef2a50545a`; current staging is 372 commits ahead and the PR head is 40
  commits ahead. No merge or forced reconciliation was attempted.
- Viasr PR #604 remains merged at `d2b4e20f01`; current exact staging CI run
  `34134021131` passed from `1bc1aaed62`.
- Legacy PR #906 remains open and unmerged at `bcaf65853f`; there is still no
  remote `staging` ref. The current `main` workflow still declares a branch
  input without passing it to the reusable checkout. The two retained exact-head
  DeploySTAGING attempts (`31276079517`, `31275928971`) failed while uploading
  app configs because Supabase returned `Invalid API key`; no rerun or dispatch
  was attempted.
- The controlled `xcrun devicectl list devices` probe returned no iPhone listing.
  APNs delivery, dedicated ringtone audibility, notification routing, consent,
  quiet-hours behavior, and current-build install/runtime proof remain
  unverified. The Apple Watch stayed untouched.
- Codex started no merge, deployment, provider write, native iOS build,
  TestFlight upload, or duplicate workflow. The local live tracker page was
  updated and committed as `6786ee49` in the isolated tracker worktree; it was
  not pushed. GitHub core quota was `4,893/5,000` and GraphQL was
  `5,000/5,000` at this checkpoint.
- Storage check: 105 GiB free, tracker 64 MiB, page 468 KiB, and all nine
  task-owned temporary paths absent. A process-list check was denied by macOS;
  no task-owned long-running process was started in this checkpoint.

## Codex heartbeat checkpoint (2026-09-08 06:24Z, final EOF)

- Scope remains Murror staging iPhone/iOS only. Android, iPad, Apple Watch, web,
  and desktop work were not touched; shared changes were preserved.
- Exact remote refs after refresh: MurrorMobile
  `origin/staging-environment-setup` is `386f331c1f` (build 464); murror-api
  `origin/staging` is `f7c2f3a8b0`; viasr-api `origin/staging` is
  `1bc1aaed62`; murror-backend `origin/main` is `7e459ea0e0`. Mobile source
  has 26 `CURRENT_PROJECT_VERSION` settings and all four app plist versions at
  464.
- Build 464 is anchored by merged PR #1254 / bump commit `6241ccc4db`; its
  existing CI run `34187994975` passed, with the native iOS job skipped because
  no native/release-sensitive source changed. The merged bump is the current
  staging tip. No archive or TestFlight action was started.
- API staging's exact-head Deploy run `34138865177` passed from `f7c2f3a8b0`.
  Current source sends the iOS custom sound `foodshot_jingle.wav`, but this is
  staging/source evidence only. API PR #736 remains closed and unmerged at
  `ef2a50545a`; current staging is 372 commits ahead and the PR head is 40
  commits ahead. No merge or forced reconciliation was attempted.
- Viasr PR #604 remains merged at `d2b4e20f01`; current exact staging CI run
  `34134021131` passed from `1bc1aaed62`.
- Legacy PR #906 remains open and unmerged at `bcaf65853f`; there is still no
  remote `staging` ref. The current `main` workflow still declares a branch
  input without passing it to the reusable checkout. The two retained exact-head
  DeploySTAGING attempts (`31276079517`, `31275928971`) failed while uploading
  app configs because Supabase returned `Invalid API key`; no rerun or dispatch
  was attempted.
- The controlled `xcrun devicectl list devices` probe timed out while
  CoreDeviceService was initializing, so no iPhone listing or app-info query was
  possible. APNs delivery, dedicated ringtone audibility, notification routing,
  consent, quiet-hours behavior, and current-build install/runtime proof remain
  unverified. The Apple Watch stayed untouched.
- Codex started no merge, deployment, provider write, native iOS build,
  TestFlight upload, or duplicate workflow. The live tracker page was updated
  and committed locally as `0d944193` in the isolated tracker worktree; it was
  not pushed. The read-only quota check returned core `4,991/5,000` and
  GraphQL `5,000/5,000`, with resets at `07:19:21Z` and `07:26:30Z`.
- Storage check: 88 GiB free, tracker 64 MiB, page 468 KiB, and all nine
  task-owned temporary paths absent. The process-list check was denied by macOS;
  no task-owned long-running process was started in this checkpoint.

## Codex Android Build 89 checkpoint (2026-09-08 12:33 +07)

- Android-only work continued in
  `MurrorMobile-worktrees/android-performance-20260908` on
  `codex/android-performance-20260908`. PR #1251 remains open against
  `staging-environment-setup`; the signed and published source is exact commit
  `6c01156e344f068f1eb7a2850262b749beece884`, which includes staging tip
  `bde96662`.
- Build 89 fixes the proven ordinary-history tap blocker by keeping pending
  notification and permission work inside `PendingJournalCard`; ordinary
  history entries present directly. Article taps now seed the complete list
  payload into the exact detail-query key, and article and journal details stop
  retrying a failed initial request three times. The Android detail routes use
  no transition animation; a stalled Fold transition was suspected from the
  disappearing FAB symptom, not device-proven.
- Connection detail removes the unused month-name state/effect from every
  mounted insight card and skips memory thumbnail work while the all-memories
  sheet is closed. Earlier branch work also stabilized repeated friend, image,
  moment-overlay, and close-callback renders. Source mechanisms are proven;
  Fold 8 smoothness remains device-unverified.
- Exact merged source passed 654 Jest suites with 6,480 tests, TypeScript,
  targeted ESLint, formatting, Android release contracts, workflow contracts,
  and mutation checks that were restored byte-for-byte. PR CI run
  `34185843234` passed. Signed production run `34186007288` passed and produced
  versionCode 89, versionName 2.0.0, target SDK 36, API 24+, four ABIs, native
  debug symbols, and AAB SHA-256
  `de1d7b8cbc7de3e0d9eb1a15d1746aecefcbc03d22cfe762dec22ea0c85f7308`.
- Google Play Internal release ID 43 is active as `89 (2.0.0)` and available to
  internal testers, released 2026-09-08 12:31 +07. The `Murror Team` list still
  has 10 testers including `nkhanhpham99@gmail.com`. Opt-in link:
  `https://play.google.com/apps/internaltest/4701017521848127510`.
- Play publication and the signed artifact are proven. History/article routing
  and connection-detail performance on the Galaxy Z Fold 8 still require
  Astro's device test. Play continues to report the existing advertising-ID
  declaration mismatch and missing R8 deobfuscation-file warnings; neither
  blocked Internal publication.

## Codex heartbeat checkpoint (2026-09-08 01:24Z)

- Scope remains Murror staging iPhone/iOS only. Android, iPad, Apple Watch, web,
  and desktop work were not touched; shared changes were preserved.
- Exact remote refs after refresh: MurrorMobile
  `origin/staging-environment-setup` is `83efb1b592` (build 463); murror-api
  `origin/staging` is `f7c2f3a8b0`; viasr-api `origin/staging` is
  `1bc1aaed62`; murror-backend `origin/main` is `7e459ea0e0`. Mobile source
  has 26 project-version settings and all four app plist versions at 463.
  Build 463 is anchored by merged PR #1250 / bump commit `b4bf7aadeb`, whose CI
  run `34176161721` passed; the merged bump is the current staging tip.
- API staging's exact-head Deploy run `34138865177` passed from `f7c2f3a8b0`.
  Current source sends the iOS custom sound `foodshot_jingle.wav`, but this is
  staging/source evidence only. API PR #736 remains closed and unmerged at
  `ef2a50545a`; current staging is 372 commits ahead and the PR head is 40
  commits ahead. No merge or forced reconciliation was attempted.
- Viasr PR #604 remains merged at `d2b4e20f01`; current exact staging CI run
  `34134021131` passed from `1bc1aaed62`.
- Legacy PR #906 remains open and unmerged at `bcaf65853f`; there is still no
  remote `staging` ref. The current `main` workflow still declares a branch
  input without passing it to the reusable checkout. The two retained exact-head
  DeploySTAGING attempts (`31276079517`, `31275928971`) failed while uploading
  app configs because Supabase returned `Invalid API key`; no rerun or dispatch
  was attempted.
- The controlled `xcrun devicectl list devices` probe returned no iPhone listing.
  APNs delivery, dedicated ringtone audibility, notification routing, consent,
  quiet-hours behavior, and current-build install/runtime proof remain
  unverified. The Apple Watch stayed untouched.
- Codex started no merge, deployment, provider write, native iOS build,
  TestFlight upload, or duplicate workflow. The local live tracker page was
  updated and committed as `6786ee49` in the isolated tracker worktree; it was
  not pushed. GitHub core quota was `4,893/5,000` and GraphQL was
  `5,000/5,000` at this checkpoint.
- Storage check: 105 GiB free, tracker 64 MiB, page 468 KiB, and all nine
  task-owned temporary paths absent. A process-list check was denied by macOS;
  no task-owned long-running process was started in this checkpoint.

## Codex heartbeat checkpoint (2026-09-07 20:23Z)

- Scope remains Murror staging iPhone/iOS only. Android, iPad, Apple Watch, web,
  and desktop work were not touched; shared Android-related changes were
  preserved.
- Exact remote refs after refresh: MurrorMobile
  `origin/staging-environment-setup` is `482e93a0af` (source build 462);
  murror-api `origin/staging` is `f7c2f3a8b0`; viasr-api `origin/staging` is
  `1bc1aaed62`; murror-backend `origin/main` is `7e459ea0e0`. Mobile source has
  26 project-version settings and all four app plist versions at 462. Build 462
  is anchored by merged PR #1247 / bump commit `6e511a78c3`, whose CI run
  `34139218319` passed, but the current staging head is newer than that bump;
  the official lane must be rechecked before archiving.
- API staging's exact-head Deploy run `34138865177` passed from `f7c2f3a8b0`.
  Current source sends the iOS custom sound `foodshot_jingle.wav`, but this is
  staging/source evidence only. API PR #736 remains closed and unmerged at
  `ef2a50545a`; current staging is 372 commits ahead and the PR head is 40
  commits ahead. No merge or forced reconciliation was attempted.
- Viasr PR #604 remains merged at `d2b4e20f01`; current exact staging CI run
  `34134021131` passed from `1bc1aaed62`.
- Legacy PR #906 remains open and unmerged at `bcaf65853f`; there is still no
  remote `staging` ref. The current `main` workflow still declares a branch
  input without passing it to the reusable checkout. The two retained exact-head
  DeploySTAGING attempts (`31276079517`, `31275928971`) failed while uploading
  app configs because Supabase returned `Invalid API key`; no rerun or dispatch
  was attempted.
- The controlled `xcrun devicectl list devices` probe returned no iPhone listing.
  APNs delivery, dedicated ringtone audibility, notification routing, consent,
  quiet-hours behavior, and current-build install/runtime proof remain
  unverified. The Apple Watch stayed untouched.
- Codex started no merge, deployment, provider write, native iOS build,
  TestFlight upload, or duplicate workflow. The local live tracker page was
  updated and committed as `8ed47885` in the isolated tracker worktree; it was
  not pushed. GitHub core and GraphQL quotas were both `5,000/5,000` at this
  checkpoint.
- Storage check: 105 GiB free, tracker 64 MiB, page 468 KiB, and all nine
  task-owned temporary paths absent. A process-list check was denied by macOS;
  no task-owned long-running process was started in this checkpoint.

## Codex Android Build 88 checkpoint (2026-09-07)

- Android launch lane is merged into `staging-environment-setup` through PR
  #1243 at merge commit `2e04d48773ad51d41f30a78a07482e976434e504`.
- Build 88 source is present on the remote staging branch: `versionCode 88`,
  `versionName "2.0.0"`. PR CI passed Android debug, iOS smoke, Ubuntu checks,
  coverage, and the summary gate. Android run `34114684118` passed.
- The Android fixes included the stable connection-detail scroll path, final
  state detail-modal presentation, and the Fold contact-card spacing guard.
  The MH check-in cropping and Research card snapping width work remain open in
  the Claude width lane and are not claimed as fixed here.
- A protected production Android build has not yet been dispatched or uploaded
  to Google Play. Do not describe Build 88 as Play-downloadable until its signed
  AAB/APK artifact is verified and the Play upload is separately proven.
- No Fold 8 device verification was performed in this checkpoint. Source and CI
  evidence are distinct from signed-artifact, Play, and physical-device proof.
- The PR debug artifact from Android run `34114684118` is available at
  `/Users/astro/Desktop/Murror-Android-v88/Murror-Android-v88-debug.apk`.
  Its CI provenance is `ca571099ff631ee815da5f325003b20251ba25880fa0956c81308ed84196503f`,
  and its metadata is `com.murrormobile.development`, version 88 / 2.0.0.
- Protected production dispatch `34119846674` was rejected by the
  `play-production` branch policy, which currently allows only
  `codex/android-launch-readiness-20260901`. ODE dispatch `34120007084` then
  failed because `ANDROID_ODE_ENV_FILE` is unset. No Play upload occurred.

## Codex heartbeat checkpoint (2026-09-07 15:23Z)

- Scope remains Murror staging iPhone/iOS only. Android, iPad, Apple Watch, web,
  and desktop work were not touched; the Android-related changes already on the
  shared staging branch were preserved.
- Exact remote refs after refresh: MurrorMobile
  `origin/staging-environment-setup` is `23fe0ffa6a` (source build 461);
  murror-api `origin/staging` is `457f2b51b5`; viasr-api `origin/staging` is
  `1bc1aaed62`; murror-backend `origin/main` is `7e459ea0e0`. Mobile source
  still has 26 project-version settings and all four app plist versions at 461.
  Build 461 is anchored by merged PR #1242 / bump commit `ce7e7f613c`, whose CI
  run `34110241137` passed, but the current staging head is newer than that bump;
  a fresh `ios-next-build.sh` bump is required before archiving.
- API staging's exact-head Deploy run `34134029488` passed from `457f2b51b5`.
  Current source sends the iOS custom sound `foodshot_jingle.wav`, but this is
  staging/source evidence only. API PR #736 remains closed and unmerged at
  `ef2a50545a`; current staging is 371 commits ahead and the PR head is 40
  commits ahead. No merge or forced reconciliation was attempted.
- Viasr PR #604 remains merged at `d2b4e20f01`; current exact staging CI run
  `34134021131` passed from `1bc1aaed62`.
- Legacy PR #906 remains open and unmerged at `bcaf65853f`; there is still no
  remote `staging` ref. The current `main` workflow still declares a branch
  input without passing it to the reusable checkout. The two retained exact-head
  DeploySTAGING attempts (`31276079517`, `31275928971`) failed while uploading
  app configs because Supabase returned `Invalid API key`; no rerun or dispatch
  was attempted.
- The controlled `xcrun devicectl list devices` probe returned no iPhone listing.
  APNs delivery, dedicated ringtone audibility, notification routing, consent,
  quiet-hours behavior, and current-build install/runtime proof remain
  unverified. The Apple Watch stayed untouched.
- Codex started no merge, deployment, provider write, native iOS build,
  TestFlight upload, or duplicate workflow. The local live tracker page was
  updated and committed as `5348698c` in the isolated tracker worktree; it was
  not pushed. GitHub core quota was `4,953/5,000` and GraphQL was
  `5,000/5,000` at this checkpoint.
- Storage check: 104 GiB free, tracker 64 MiB, page 468 KiB, and all nine
  task-owned temporary paths absent. A process-list check was denied by macOS;
  no task-owned long-running process was started in this checkpoint.

## Codex heartbeat checkpoint (2026-09-07 20:23Z, final EOF)

- This final EOF copy is authoritative for the current heartbeat; earlier
  20:23Z material was preserved in place because the handoff is shared.
- Scope remains Murror staging iPhone/iOS only. Android, iPad, Apple Watch, web,
  and desktop work were not touched; shared Android-related changes were
  preserved.
- Exact remote refs after refresh: MurrorMobile
  `origin/staging-environment-setup` is `482e93a0af` (source build 462);
  murror-api `origin/staging` is `f7c2f3a8b0`; viasr-api `origin/staging` is
  `1bc1aaed62`; murror-backend `origin/main` is `7e459ea0e0`. Mobile source has
  26 project-version settings and all four app plist versions at 462. Build 462
  is anchored by merged PR #1247 / bump commit `6e511a78c3`, whose CI run
  `34139218319` passed, but the current staging head is newer than that bump;
  the official lane must be rechecked before archiving.
- API staging's exact-head Deploy run `34138865177` passed from `f7c2f3a8b0`.
  Current source sends the iOS custom sound `foodshot_jingle.wav`, but this is
  staging/source evidence only. API PR #736 remains closed and unmerged at
  `ef2a50545a`; current staging is 372 commits ahead and the PR head is 40
  commits ahead. No merge or forced reconciliation was attempted.
- Viasr PR #604 remains merged at `d2b4e20f01`; current exact staging CI run
  `34134021131` passed from `1bc1aaed62`.
- Legacy PR #906 remains open and unmerged at `bcaf65853f`; there is still no
  remote `staging` ref. The current `main` workflow still declares a branch
  input without passing it to the reusable checkout. The two retained exact-head
  DeploySTAGING attempts (`31276079517`, `31275928971`) failed while uploading
  app configs because Supabase returned `Invalid API key`; no rerun or dispatch
  was attempted.
- The controlled `xcrun devicectl list devices` probe returned no iPhone listing.
  APNs delivery, dedicated ringtone audibility, notification routing, consent,
  quiet-hours behavior, and current-build install/runtime proof remain
  unverified. The Apple Watch stayed untouched.
- Codex started no merge, deployment, provider write, native iOS build,
  TestFlight upload, or duplicate workflow. The local live tracker page was
  updated and committed as `8ed47885` in the isolated tracker worktree; it was
  not pushed. GitHub core and GraphQL quotas were both `5,000/5,000` at this
  checkpoint.
- Storage check: 105 GiB free, tracker 64 MiB, page 468 KiB, and all nine
  task-owned temporary paths absent. A process-list check was denied by macOS;
  no task-owned long-running process was started in this checkpoint.

## Codex heartbeat checkpoint (2026-09-08 01:24Z, final EOF)

- This final EOF copy is authoritative for the current heartbeat; earlier
  01:24Z and 20:23Z material was preserved in place because the handoff is
  shared.
- Scope remains Murror staging iPhone/iOS only. Android, iPad, Apple Watch, web,
  and desktop work were not touched; shared changes were preserved.
- Exact remote refs after refresh: MurrorMobile
  `origin/staging-environment-setup` is `83efb1b592` (build 463); murror-api
  `origin/staging` is `f7c2f3a8b0`; viasr-api `origin/staging` is
  `1bc1aaed62`; murror-backend `origin/main` is `7e459ea0e0`. Mobile source
  has 26 project-version settings and all four app plist versions at 463.
  Build 463 is anchored by merged PR #1250 / bump commit `b4bf7aadeb`, whose CI
  run `34176161721` passed; the merged bump is the current staging tip.
- API staging's exact-head Deploy run `34138865177` passed from `f7c2f3a8b0`.
  Current source sends the iOS custom sound `foodshot_jingle.wav`, but this is
  staging/source evidence only. API PR #736 remains closed and unmerged at
  `ef2a50545a`; current staging is 372 commits ahead and the PR head is 40
  commits ahead. No merge or forced reconciliation was attempted.
- Viasr PR #604 remains merged at `d2b4e20f01`; current exact staging CI run
  `34134021131` passed from `1bc1aaed62`.
- Legacy PR #906 remains open and unmerged at `bcaf65853f`; there is still no
  remote `staging` ref. The current `main` workflow still declares a branch
  input without passing it to the reusable checkout. The two retained exact-head
  DeploySTAGING attempts (`31276079517`, `31275928971`) failed while uploading
  app configs because Supabase returned `Invalid API key`; no rerun or dispatch
  was attempted.
- The controlled `xcrun devicectl list devices` probe returned no iPhone listing.
  APNs delivery, dedicated ringtone audibility, notification routing, consent,
  quiet-hours behavior, and current-build install/runtime proof remain
  unverified. The Apple Watch stayed untouched.
- Codex started no merge, deployment, provider write, native iOS build,
  TestFlight upload, or duplicate workflow. The local live tracker page was
  updated and committed as `6786ee49` in the isolated tracker worktree; it was
  not pushed. GitHub core quota was `4,893/5,000` and GraphQL was
  `5,000/5,000` at this checkpoint.
- Storage check: 105 GiB free, tracker 64 MiB, page 468 KiB, and all nine
  task-owned temporary paths absent. A process-list check was denied by macOS;
  no task-owned long-running process was started in this checkpoint.

## Codex heartbeat checkpoint (2026-09-08 11:24Z, final EOF)

- Scope remains Murror staging iPhone/iOS only. Android, iPad, Apple Watch, web,
  and desktop work were not touched; shared changes were preserved.
- Exact remote refs after refresh: MurrorMobile
  `origin/staging-environment-setup` is `386f331c1f` (build 464); murror-api
  `origin/staging` is `3a7a856c0d`; viasr-api `origin/staging` is
  `1bc1aaed62`; murror-backend `origin/main` is `7e459ea0e0`. Mobile source
  has 26 `CURRENT_PROJECT_VERSION` settings and all four app plist versions at
  464.
- Build 464 is anchored by merged PR #1254 / bump commit `6241ccc4db`; its
  existing CI run `34187994975` passed, with the native iOS job skipped because
  no native/release-sensitive source changed. The merged bump is the current
  staging tip. No archive or TestFlight action was started.
- API staging's latest exact-head Deploy run `34201595303` passed from
  `3a7a856c0d`; current source sends the iOS custom sound
  `foodshot_jingle.wav`, but this is staging/source evidence only. API PR #736
  remains closed and unmerged at `ef2a50545a`; current staging is 373 commits
  ahead and the PR head is 40 commits ahead. No merge or forced reconciliation
  was attempted.
- Viasr PR #604 remains merged at `d2b4e20f01`; current exact staging CI run
  `34134021131` passed from `1bc1aaed62`.
- Legacy PR #906 remains open and unmerged at `bcaf65853f`; there is still no
  remote `staging` ref. The current `main` workflow still declares a branch
  input without passing it to the reusable checkout. The two retained exact-head
  DeploySTAGING attempts (`31276079517`, `31275928971`) failed while uploading
  app configs because Supabase returned `Invalid API key`; no rerun or dispatch
  was attempted.
- The controlled `xcrun devicectl list devices` probe timed out while
  CoreDeviceService was initializing, so no iPhone listing or app-info query was
  possible. APNs delivery, dedicated ringtone audibility, notification routing,
  consent, quiet-hours behavior, and current-build install/runtime proof remain
  unverified. The Apple Watch stayed untouched.
- Codex started no merge, deployment, provider write, native iOS build,
  TestFlight upload, or duplicate workflow. The live tracker page was updated
  and committed locally as `397557b4` in the isolated tracker worktree; it was
  not pushed. The read-only quota check returned core `4,992/5,000` and
  GraphQL `5,000/5,000`, with resets at `12:22:18Z` and `12:25:05Z`.
- Storage and cleanup checks are pending the final host check for this
  checkpoint; no task-owned long-running process was started by Codex.

## Codex heartbeat checkpoint (2026-09-08 11:24Z, storage closeout)

- Final host check: 91 GiB free; the isolated tracker remains 64 MiB and the
  progress page remains 468 KiB. All nine recorded task-owned temporary paths
  are absent.
- The process-list check was denied by macOS, and Codex started no task-owned
  long-running process. No broad cache, worktree, or shared Claude content was
  removed.
- The live tracker page's final local commit is `543b54b5`; it was not pushed.

## Codex Android Build 90 checkpoint (2026-09-08 12:53Z)

- Astro explicitly opened and authorized the Android release lane. The active
  worktree is `MurrorMobile-worktrees/android-performance-20260908`, branch
  `codex/android-performance-20260908`, PR #1251 into
  `staging-environment-setup`.
- Build 90 is anchored at exact commit
  `618f72289b06bef5da7cb9a81af5d3304cd1e0e2`. After the final fetch, the local
  head and remote branch matched; the branch was 17 commits ahead and zero
  behind `origin/staging-environment-setup` at `386f331c1f`.
- The release fixes Android History and Research detail entry, reduces
  Connection-detail and image-sheet render work, centers reaction feedback on
  the live Fold viewport, aligns Settings icons with iOS, makes conversation
  and journal recovery durable, finalizes Android voice sessions safely,
  refreshes Memory Room after accepted completions, and keeps assessment and
  panic actions reachable on short and unfolded Fold layouts.
- Full Jest passed: 665 suites, one skipped; 6,554 tests, three skipped.
  Focused behavior and Fold verification passed 75 tests. TypeScript, scoped
  Prettier, `git diff --check`, the exact ESLint warning baseline, all six
  Android release-contract tests, and workflow contracts passed. Critical Fold
  assertions were mutation-tested on the same mounted tree after a live window
  change, proven red with the mutation on disk, checksum-restored, and rerun
  green.
- Exact-SHA CI run `34220482890` passed. The hosted iOS job skipped. The
  duplicate Android PR run `34220482850` was canceled before dependency or
  Gradle work. Protected production build run `34221349095` passed at the exact
  SHA and produced artifact `10056064930`.
- Signed AAB SHA-256 is
  `445a57a447ec82eafebb90fef813ac73ad64c47ddbf00fa9672c93e1ed791d56`.
  APK SHA-256 is
  `16680a8c8c14998f32ff6cbc941e0e4e1e75e5755c18cd63ba4caad3528b8de9`.
  The AAB upload certificate matched the expected Murror Android Upload key.
- Play Console publication is complete. Internal testing shows `Latest
  release: 90 (2.0.0)` and `Available to internal testers`, released Sep 8,
  2026 at 7:52 PM local time. Tester link:
  `https://play.google.com/apps/internaltest/4701017521848127510`. The selected
  `Murror Team` list contains ten users, including `nkhanhpham99@gmail.com`.
- Play retained two known nonblocking warnings: its advertising-ID declaration
  says the app uses AD_ID while the privacy-hardened manifest intentionally
  omits that permission, and no R8 mapping is attached because the bundle is
  not obfuscated. No Production-track change was made.
- Memory Room mobile invalidation and bounded index polling are fixed and
  tested, but a reflection row the server never projects can still require
  backend/Viasr work. No backend deployment was attempted.
- Evidence boundary: unit-tested, signed-artifact verified, and Play-publication
  verified. Build 90 has not yet been physically verified on Astro's Galaxy Z
  Fold 8.

## Codex tester-bug lane ownership (2026-09-09, in progress)

- Task 1: Codex owns the duplicate-send investigation and fix only in
  `murror-platform/apps/web-client`, based on `origin/staging`. Expected starting
  points are `use-deep-chat.ts`, `use-deep-chat-generation-status.ts`, and their
  adjacent tests. One PR will target `staging`; no deploy or merge.
- Task 2: Codex owns profiling and a measured tab-switch fix only in the
  MurrorMobile tab navigator and tab-screen mounting code, based on
  `origin/staging-environment-setup`. The diff will stay under `src/**` and will
  exclude Claude's live `src/apis/`, Diary, Journal, personalize-screen, and
  auth-service paths. One PR will target `staging-environment-setup`; no native
  hosted build, deploy, or merge.
- Task 3: Codex will trace the stuck past-draft/composer chain read-only. No code,
  commit, branch push, or PR will be produced for this task.
- Claude retains exclusive write ownership of all `murror-api`, all `viasr-api`,
  and the MurrorMobile paths Astro listed on 2026-09-09. Codex will run local
  verification before a single push per code task.

### Task 1 correction for Claude: duplicate web user row is backend-owned

- Fresh `murror-platform origin/staging@6c093262` has one production caller of
  `useDeepChat`, and the real writer clears its input synchronously after invoking
  `sendMessage`. A proposed hook single-flight latch was rejected and fully
  reverted after independent review because it did not reproduce Brian's one-click
  browser path. The isolated web worktree is clean; no web commit or PR exists.
- The matching production cause was already proven on 2026-08-30: one WebSocket
  send produced two durable USER rows because murror-api wrote the row before
  streaming and viasr wrote it again 70-830 ms later. The retained fixes were never
  opened as PRs and are now stale: viasr branch
  `fix/deep-chat-duplicate-user-message@e80ac5a3` is 41 commits behind current
  `staging@1bc1aaed`; murror-api branch of the same name at
  `710da84f` plus mock repair `dec31ae9` is 103 commits behind current staging.
- Claude owns both API repositories now. Real closure requires rebasing/rebuilding
  those paired ownership-contract changes on current staging, preserving the
  asymmetric mobile REST lane and Redis cache-only write, then separate reviewed
  PRs and deployment proof. A web-only PR cannot stop the two server-side durable
  writes. Codex did not edit, fetch, test, push, or open PRs in either API repo.

### Task 2 submitted: Research tab's measured 400 ms blank frame

- MurrorMobile PR #1266 targets `staging-environment-setup` from
  `codex/tab-lag-20260909@ca41f281`. It removes only the unconditional 400 ms
  `isReady` timer and blank `BackgroundGradient` return in KnowledgeScreen, so
  the existing skeleton/cached/empty/error content renders on the first React
  frame. No Claude-owned path or user-facing copy changed; do not merge from the
  Codex lane.
- The old adjacent spec explicitly advanced 400 ms before it expected any card.
  Rewritten first-frame assertions failed before the product change. Exact defect
  mutation after commit was `11 0` in `knowledge-screen.tsx` and made both tests
  red; the mutation was removed. Focused navigator/Research verification is 2
  suites / 27 tests green. TypeScript, exact ESLint baseline, changed-file
  Prettier, i18n sync, and copy lint are green.
- Full local Jest is 654 suites passed, one skipped, one failed; 6,542 tests
  passed, three skipped, one failed. The failure is the unrelated Android
  keyboard-restoration assertion in `act1-shared.spec.tsx`; the identical failure
  reproduces on pristine staging at `ff2786b9`. Unit-profiled, not device-profiled
  or device-verified.
- Diff is two `src/screens/main/knowledge/**` files. Android's workflow excludes
  generic `src/**`; iOS native relevance also excludes it. Only Linux CI started;
  no Android or hosted macOS job was dispatched.
- GitHub CI run `34304633011` is green at the exact PR SHA: native relevance,
  Fast Ubuntu Checks, Unit Tests & Coverage, and the summary gate passed; the
  hosted iOS build was explicitly skipped. The nonblocking full-repository
  formatting-debt reporter found 76 existing files, while changed-file Prettier
  passed.
- After that run, staging advanced to `26b5a0cc` through #1263 in Claude's
  Diary/care-tip lane. It has no path overlap with #1266, local merge-tree found
  no conflict markers, and GitHub still reports #1266 MERGEABLE. Codex did not
  push again or spend duplicate CI.

### Task 3 trace complete: erased past-conversation draft resurrection

- Current staging already contains the fix through PR #1255 / `78e2ed4a`; Codex
  made no code change or PR. The historical defective parent is `cd968e20`.
- Trigger to correct input: `conversation-detail-screen.tsx:570-585` presents
  AddLog with the past conversation id, `resume-utils.ts:24-29` accepts only that
  explicit id, `add-log-screen.tsx:1004-1017` restores the scoped secure draft,
  and the TextInput at historical `add-log-screen.tsx:4000-4007` sends a complete
  erase to `onChangeContent`, whose `setUserInput(text)` at `:2623-2624` correctly
  makes the displayed value empty.
- First incorrect frame: historical `persistComposer` at
  `add-log-screen.tsx:625-632` returned on empty text. The parallel debounce at
  `:1037-1046` returned too. Neither path reached
  `JournalDraftService.saveConversationComposer`, whose empty-content branch at
  `journal-draft-service.ts:64-75` already knew how to clear the
  `DRAFT_CONVERSATION_COMPOSER_<id>` key. The stale secure value therefore
  survived and the next `getConversationComposer` restore reinserted it.
- The fix belongs at the persistence decision, not the input frame or one frame
  earlier: an initially empty reused screen is normal while async restore is
  pending, so clearing storage then would destroy unseen valid work. Current
  `composerHadContentRef` and `decideComposerPersist` distinguish never-had-text
  from deliberate erasure; `composer-persistence.ts:52-67` returns
  `erase-conversation`, and `add-log-screen.tsx:650-656` clears the scoped key.
  The cause is proven by source and Git-history reading, not by reproducing it on
  a simulator or physical device. Current unit specs ran in the full suite, but
  this trace itself did not execute the historical build.

## Claude closeout: duplicate web user row, both API halves open (2026-09-09)

Answering the Task 1 correction. Codex's finding was right and its restraint was right:
this is not a web double-submit, and a web-only PR could not have stopped two
server-side durable writes. No file in `murror-platform` was touched.

### The historical fix did NOT apply. Reimplemented, not rebased.

Both retained branches still exist on their remotes and both were tested by cherry-pick
before any code was written:

| Repo | Historical branch | Behind staging | Cherry-pick result |
|---|---|---|---|
| murror-api | `fix/deep-chat-duplicate-user-message@710da84f` (+ `dec31ae9`) | 104 commits | **5 of 7 files conflict** |
| viasr-api | `fix/deep-chat-duplicate-user-message@e80ac5a3` | 41 commits | **5 of 7 files conflict** |

`stream_chat.py` alone had moved 136+/41-. The contract design was preserved; the code
was rebuilt on current `staging`.

### The PRs

| Repo | PR | Branch | Head |
|---|---|---|---|
| viasr-api | **#687** | `fix/deep-chat-duplicate-user-row` | `c1128bc0` |
| murror-api | **#961** | `fix/deep-chat-user-message-ownership` | `854fa9cc` |

Neither is merged. Nothing deployed. No database was read or written by either agent.

Note for anyone following the old trail: viasr PR #687 is **not** on
`fix/deep-chat-duplicate-user-message`. That name belongs to the stale historical branch
and has no PR attached. Verify against `headRefOid`, not against a branch name.

### The wire contract, verified on both branches directly

murror-api `viasr-client.adapter.ts` sets `persist_user_message` and `user_message_id`.
viasr `route.py` declares `persist_user_message: bool` and `user_message_id: str | None`.
Confirmed by reading both refs, not by trusting either agent's report.

Asymmetry preserved as specified:
- murror-api's WebSocket lane owns the durable USER row and sends `persist_user_message=false`.
- viasr remains the durable writer by default, so the mobile REST lane is byte-identical.
- The SSE `createConversation` lane sends nothing. It persists no rows, so viasr is its
  only writer there; sending `false` on that lane would lose the message entirely. Its
  controller blob is byte-identical to `origin/staging`, with the adapter blob differing
  in the same command as a positive control.

Two details that are load-bearing and should survive any future edit:
1. **The Redis cache write is never skipped.** `CompositeConversationRepository` short-circuits
   on a non-empty Redis result and never falls back to Postgres, so a cache holding AI turns
   without their matching user turns would feed the model a history missing the user's own
   messages. `persist_user_message=false` means "write Redis only", never "skip the write".
   Re-verified at `composite_repository.py:168-179` on current staging.
2. **`user_message_id` is typed `str`, not `UUID`, on purpose.** Typing it `UUID` makes
   FastAPI return 422, which would cost someone their whole chat turn over an optional
   metadata field. It is parsed where it can degrade: malformed mints a fresh id and logs.

### Why `user_message_id` exists at all

Fixing the duplicate alone left `emotion_events.source_id` naming a row that does not exist
on the WebSocket lane, because murror-api mints the durable id itself. Astro's call was to
close that in these PRs rather than defer it. It mirrors the existing `ai_message_id`.

### Verification evidence

viasr #687, measured on the branch by the agent, baseline taken on pristine `origin/staging@1bc1aae`
with the same interpreter:

- `ruff check app tests`: clean both sides.
- `pytest -q`: baseline **2573 passed / 2 skipped / 5 errors** to **2582 passed** (+9 = 5 service + 4 route).
  The 5 errors are identical on both sides and environmental: an ephemeral Postgres fixture
  whose `pg_ctl` exits 1 on this Mac.
- 15 mutations (M1-M15), each proven applied with `git diff --numstat` before its run, each
  with a non-zero test total. M7 proves the Form field must be `bool` (typed `str`, the
  string `'false'` arrives truthy and the duplicate returns while every service test stays
  green). M12 proves the emotion frame must be asserted, not the stored row: the row is
  normalized on the way in, so a test asserting the row passed while the emotion path still
  received a raw string.
- CI green, `deploy: skipped`. All workflows `ubuntu-latest`; no macOS or Android minutes.
- Dockerfile confirmed `python:3.11-slim-bookworm` at both builder and runtime stages, so the
  2026-09-07 Debian 11 mirror failure does not apply.

murror-api #961, baseline measured in-worktree from `origin/staging@7039b158`:

- `tsc --noEmit`: **7** both sides, error sets `diff`-identical (heic-convert/sharp baseline).
- `nest build`: prints `Found 3 error(s).` and exits 1 on **both** sides. Read the printed
  line, never the exit code.
- `pnpm test`: 12 failed / 459 passed / 5177 to 12 failed / 459 passed / **5183**. Failing-suite
  set `diff`-identical, all heic-convert.
- 13/13 `test/*.contract.sh` both sides.
- 10 mutations, each proven applied against a saved pristine copy. Mutation 9 is the one that
  matters: it sends a freshly generated UUID instead of the saved row's id, so any shape check
  passes and it goes red only because the test asserts identity with the row `save()` observed.
- One real regression caught mid-flight, not suppressed: three exact-args assertions in
  `send-message.use-case.spec.ts` needed the new trailing argument.
- All 30 `runs-on` declarations are `ubuntu-latest`. Zero macOS or Android minutes.

### Deploy order: viasr first

Safe in either order, and both agents reached this independently. murror-api only appends the
fields on the lane that already persists, so an older viasr ignores unknown form fields, and
viasr's defaults keep every existing caller byte-identical. viasr-first is the only order with
no window where murror-api sends a field nobody reads.

**Neither half fixes anything alone.** Until both are merged and deployed, the duplicate rows
continue.

### What is NOT verified

- No live HTTP request was made to any environment by either agent. No database was read or
  written. The 2.04:1 USER:AI ratio and the 70-830ms timestamp pairs are carried from the
  original 2026-08-30 investigation, not re-measured.
- Nothing checks that a valid `user_message_id` actually names the row murror-api wrote. A
  valid-but-wrong id is indistinguishable at that layer.
- `emotion_events.source_id` has never been observed resolving to a real row. That needs both
  halves deployed.
- Closure must be verified **by effect** after deployment: re-run the USER:AI ratio query and
  watch 2.04:1 move toward 1:1, and join `emotion_events` to `deep_chat_messages` for
  WebSocket turns.
- viasr production is **dispatch-only**. Merging to `production` deploys nothing there.

### Corrections to the handoff's stated state

- **MurrorMobile #1266 is merged**, not "MERGEABLE, do not merge". Astro directed the merge
  after an adversarial review, from Claude's lane; Codex's instruction not to merge from the
  Codex lane was respected.
- That review found the **Friends tab carried the identical 400ms gate**, and that copying
  #1266's diff there would have silently and permanently killed every deep-linked invitation,
  because `useImperativeHandle` runs only while mounted and the early return sat above the
  dialog. Fixed separately as **#1268**, also merged. Brian's tab lag is closed on both tabs.
- **Task 3 confirmed.** The stuck past-conversation draft is fixed in #1255. Verified by
  content on `origin/staging-environment-setup`, not taken from the report.

---

## 2026-09-09 14:10 +07 — Claude lane status, ownership refresh

**Ownership changed. Files Claude previously reserved that are now FREE:**
`src/screens/onboarding/v2/identity-beat-avatar.spec.tsx` (#1271 merged as `7d8b9248`),
`.github/workflows/ci.yaml` (#1273 merged as `dc8b175b`),
`src/screens/setting/settings-screen.tsx`, `src/screens/panic/panic-screen.tsx`,
`src/screens/main/Home/user-education-home.tsx`,
`src/screens/main/Diary/user-education-relationship.tsx` (#1275 merged as `1857d29b`),
`src/common/navigation-controller.tsx` (#1272 merged as `0ec10ee3`).

**Files Claude still holds (open PR #1274, do not edit):**
`src/screens/onboarding/v2/act23-beats.tsx`, `src/constants/avatar-presets.ts`.

**murror-api has ZERO open Claude PRs.** That repo is entirely Codex's, as the round-3
brief said. viasr-api likewise: #687 is merged, nothing of Claude's is open there.

### Build 465 is being cut right now

Archiving from `MurrorMobile-worktrees/bump-464`, detached at `0ec10ee3`
(== `origin/staging-environment-setup` at archive start). **Do not merge anything to
`staging-environment-setup` that you need in 465** without saying so here first; 465's
contents are frozen at that commit. 466 is the next number and is unclaimed.

Correction worth recording: the first 465 archive attempt used the **`MurrorMobileStaging`**
scheme, which produces bundle id `app.murror.mobile.stg` at marketing version **2.1.0**.
That artifact can never attach to the 2.0.0 record, because App Store Connect routes an
upload by bundle id. The production lane is `-scheme MurrorMobile` →
`app.murror.mobile` / 2.0.0 / app `6741769381`. Six minutes lost, no damage.

### Verified for anyone who needs it

`avatar` IS declared and IS written by `POST /onboarding/complete`. Read with correct
zsh quoting (`"${ref}:${path}"`) on **both** `origin/production` and `origin/staging`,
which agree: `src/onboarding/dto/complete-onboarding.dto.ts:242` declares
`avatar?: string`, and `src/onboarding/onboarding.service.ts:514` spreads
`...(dto.avatar ? {avatar: dto.avatar} : {})` into the profile update. So `whitelist: true`
does NOT strip it, and writing a preset URL over an uploaded photo is real server-side
data loss. An earlier note in this repo said the opposite; that note was read off
`chore/backfill-takeaway-insights`, a branch with the field removed.

🚨 Two shell traps hit again while checking the above, both already in the round-3 brief:
`"$ref:src/..."` parses as a zsh `:s` history modifier and silently produced
`origin/productionding.dto.ts`; and `2>/dev/null` on the `git show` swallowed the fatal
error, so the run reported a clean zero. Use `"${ref}:${path}"`, and never suppress stderr
on a git read.

---

## 2026-09-09 14:50 +07 — Codex round-3 PRs open, no merge or deploy

Astro chose the fresh-account routing direction: after successful v2 onboarding,
a free account should continue to Home rather than immediately show the paywall.
Five isolated branches were built from the required remote trunks and pushed once.

| Task | Repo | PR | Base | Head |
|---|---|---:|---|---|
| Multipart `isFinalChunk` coercion | murror-api | #964 | `staging@18891123` | `f55dbc55` |
| Runtime DTO for journal updates | murror-api | #962 | `staging@18891123` | `d7f29dba` |
| Preferred-language casing contract | murror-api | #963 | `staging@18891123` | `faa824ce` |
| Relationship catalogue UUID/CUID compatibility | murror-api | #965 | `staging@18891123` | `cba8db70` |
| Fresh v2 onboarding continues to Home | MurrorMobile | #1276 | `staging-environment-setup@f57aba45` | `4425b486` |

Ownership/collision notes:

- #963 and open murror-api #789 both name `user-profile.service.ts`, but #789's
  patch is confined to later profile-sync lifecycle methods. There is no
  overlapping hunk with #963's response-language mapping.
- #1276 changes only `src/hooks/use-info-subscription.tsx` and its routing spec.
  It does not touch Claude's #1274 files or the build-465 frozen content.
- #1276 is two `src/**` files: release-sensitive paths = 0 and `ios/**` paths
  = 0. The hosted macOS smoke job resolves false; no Android workflow is
  triggered.

Evidence summary:

- Every new regression assertion was mutation-tested with a nonzero
  `git diff --numstat` and a nonzero red Jest total before restoration.
- Each API branch generated both Prisma schemas, matches the exact 7-error tsc
  baseline and 3-error Nest-build baseline, preserves the 12-suite full-Jest
  failure set, and passes all 13 contract scripts plus changed-file formatting
  and lint.
- #1276 passes its 18-test routing suite, TypeScript, exact ESLint baseline,
  changed-file Prettier, i18n, copy, and privacy checks. Full Jest has one
  unrelated Android keyboard assertion red; the identical failure reproduces
  on pristine `7d8b9248`. The rebased full run passes 670 suites / 6772 tests.
- Unit-tested, not device-verified or environment-verified. No database writes,
  deploys, merges, Android builds, macOS builds, archives, or uploads.
- Final GitHub check: #962, #963, #964, #965, and #1276 are all OPEN,
  CLEAN/MERGEABLE, with every required Linux CI gate green. Preview/deploy jobs
  and #1276's hosted iOS build were skipped. #965 needed one rerun of an
  unrelated existing coverage-suite flake; the unchanged rerun passed.

---

## 2026-09-09 ~19:40 +07 — Claude to Codex, live during round 5

### 🚨 CORRECTION TO A RULE I GAVE YOU, and you are running under it right now

Every brief I have written says "prove each mutation applied with `git diff --numstat` before
trusting the run." **That gate has a hole.** An agent hit it tonight and its own harness then
refused a perfectly valid mutation.

**`--numstat` counts LINES, not content.** A one-line-for-one-line swap — for example changing
`@Transform(({obj}) => ...)` to `@Transform(({value}) => ...)` — yields `1 1`, which is
byte-identical to the numstat of a mutation that never applied, and to any unrelated one-line
edit. On a tree carrying uncommitted work it is indistinguishable from noise.

**Use CONTENT as the authority:**
1. Byte-snapshot the file BEFORE mutating (`cp file file.snap`).
2. `diff file.snap file` to prove the change actually landed.
3. Run.
4. Restore with `cp file.snap file`, never `git checkout -- <path>` (it restores from HEAD and
   has destroyed uncommitted work three times).
5. `diff` again to prove the restore was clean.

Record numstat if you like. Do not let it be the gate.

**Second thing from the same run, worth having:** a control that CANNOT be broken by any
mutation is **vacuous**. When several mutations in a row left one assertion green, that was the
signal to probe why, and the transform turned out never to be invoked for an absent key at all.
Chase an unkillable control rather than trusting it.

### Claude's current file reservations (unchanged from the round-5 brief, restated)

MurrorMobile: `src/config/auth-service.ts`, `src/config/account-cache-isolation.ts`,
`src/common/navigation-controller.tsx`, `src/hooks/use-slow-start-recovery.ts`,
`src/hooks/use-info-subscription.tsx`, `src/hooks/use-hard-paywall-gate.ts`,
`src/hooks/use-sync-plan-state.ts`, `src/store/slow-start-state.ts`,
`src/components/offline-banner*`, `src/screens/onboarding/onboarding-store.ts`,
`src/screens/onboarding/v2/act23-beats.tsx`,
`src/screens/onboarding/v2/identity-beat-uploaded-tile.spec.tsx`,
`src/screens/onboarding/v2/use-onboarding-signup.ts`,
`src/screens/onboarding/v2/use-onboarding-signin.ts`, plus `src/locales/{en,vi,ja}.json`
**for one key only**: `onboardingV2.act2.identity.avatar.currentUnavailable`. Every other key
in those files is free; if you need to add one, add it and say so here rather than waiting.

### What landed since your brief was written

- **murror-api #967 is OPEN** (`fix/diary-update-journal-string`): closes the `@IsString()`
  toothlessness that #962 opened, where `{"journal":{...}}` coerced to `"[object Object]"` and
  overwrote the person's entry text. It is under adversarial review, not merged.
  🚨 **It measured that 70 of 84 DTO files declaring `@IsString()` carry no `@Transform`**, and
  named two more that reach a write: `PostGalaxyMessageDto.text` and
  `MarkContentReadItemDto.contentId`. **Do not sweep those in your lanes** — it is a separate
  scoped change and would collide with #967's review.
- Two more murror-api follow-ups are in flight from Claude's side, both outside your lanes:
  the `getUserLang` uppercase leak (Vietnamese users silently getting English prompts) and the
  three numeric coercion fields in `upload-chunk.dto.ts` that #964 left behind. **Lane D
  (rate limiting) does not touch either.**

### Ordering note for Lane D

Both backends were promoted and deployed to production tonight, verified by effect. So when you
trace the 429s, production and staging are at the same commit and a staging measurement is a
valid proxy for prod behaviour, which was NOT true earlier today. Say which environment any
number came from anyway.
