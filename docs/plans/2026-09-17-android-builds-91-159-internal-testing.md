# 2026-09-17: Android builds 91 to 159, performance hardening, and regression recovery

Repo: `MurrorMobile`.

Primary Android device: Samsung Galaxy Z Fold 8.

Current Play Internal testing release: version `2.0.0`, version code `159`.

Progress hub:
<https://app.notion.com/p/3de3af4aaa9281e88b9af24cb0fd9528?pvs=204>

## Outcome

Build 159 is available to the Play Internal testing group. It is the latest signed release
in a long Android hardening run that began after Build 90 and concentrated on Memories,
Connection Detail, repeated modal presentation, navigation recovery, Fold reflow, and
foreground render cost.

This run produced 69 build-number records:

- 20 releases reached Play Internal testing;
- 42 performance candidates from Builds 101 through 142 were consolidated into Build 143;
- 5 intermediate candidates from Builds 152 through 156 were consolidated into Build 157;
- Build 149 was discarded before publication;
- Build 97 is the only unused/provenance gap because the current source lineage has no matching
  version metadata, handoff entry, workflow, artifact, or Play record.

Publication did not close the Android launch gate. Astro's Build 158 Fold 8 test reopened three
issues: the Memory Detail comment composer sits behind the keyboard, several Connection Detail
sheets do not share the smooth bottom-up presentation, and the Mental Check-in still crops its
lowest answer on a short window. Their source causes are proven and repaired in Build 159. The
repair is unit-tested, locally built, signed by the hosted release workflow, and published to
Internal testing. It is not yet verified on the Galaxy Z Fold 8.

## Source and release provenance

| Item | Evidence on 2026-09-17 |
|---|---|
| Build 159 branch | `codex/android-ui-stability-build150-20260916` |
| Exact signed source | `baf7d1678b5c5d8effec19400720dc08d2625d8a` |
| Source repair before release metadata | `0147e5672325247efd3486fd02753f32a18b7e42` |
| Shared mobile trunk reconciled before release | `origin/staging-environment-setup@92e5897e9b0a69f2d2f851870da9d6af79f87238` |
| Staging merge on release branch | `ed51c6fd4` |
| Reconciled staging changes | Android SDK setup naming plus the iOS release, pod, privacy, and shared-source safeguards already landed on trunk |
| Hosted workflow | `35213510525` |
| Signed AAB SHA-256 | `ee46eaee24430fbe24bf2f4662af1965b19820a3ecd085849c5f0d7d1e55677a` |
| Signed APK SHA-256 | `b4f62afffcd33321b698a97501cc3fb8d906ce0692c85d99f3f7089cb019c472` |
| Play state | Build 159, Available to internal testers |
| Production track | Unchanged |

Build 159 must not be called trunk-equivalent because its Android work is carried on a feature
branch. The release branch merged the official staging head immediately before the version bump,
then produced one exact-SHA hosted run and one signed artifact set. That release proof is still
separate from physical-device proof: Build 159 is available to Internal testers, but the three
repairs have not yet been retested on the Fold 8.

## Published release timeline

| Build | Date | Exact release SHA | Main work | Evidence boundary |
|---:|---|---|---|---|
| 91 | Sep 9 | `71034304` | Performance, voice continuation, Fold reflow, Memory Room virtualization, FAB mounting, Settings alignment, Research snapping | Signed workflow `34304110264`; Play Internal |
| 92 | Sep 13 | `4a0cc4b5` | iOS 470 shared-source parity, Fold/short-screen geometry, detail performance, voice ownership, icon alignment | Signed workflow `34740137439`; Play Internal. PR merge SHA `8fe3f316` failed at the environment gate and is not the signed source |
| 93 | Sep 13 | `44371e93` | Memory rail rendering, shared Connection Detail request scheduling, notification deep-link normalization | Signed workflow `34749102468`; Play Internal |
| 94 | Sep 13 | `c297d91e` | Live Fold MTC width/rotation and hidden Memories grid work | Signed workflow `34763035209`; Play Internal |
| 95 | Sep 14 | `6fae65dc` | Virtualized Memories grid, memoized comments, removed decorative Android gyroscope work | Signed workflow `34773271584`; Play Internal |
| 96 | Sep 14 | `bc957e11` | Bounded Connection carousel window, memoized Our Memories and comment rows | Signed workflow `34779870594`; Play Internal |
| 98 | Sep 14 | `b0fc8a85` | FAB camera lifecycle, detail-page slide-up transitions, bounded cold-start navigation recovery | Signed workflow `34799096066`; Play Internal |
| 99 | Sep 14 | `931a0e07` | Detail-photo downsampling, assessment height reservation, FAB chooser mount ordering | Signed workflow `34803864319`; Play Internal |
| 100 | Sep 14 | `91e86ba9` | Camera host-first, fresh-host, frame handoff, and repeat-open recovery | Signed workflow `34833208601`; Play Internal |
| 143 | Sep 15 | `be32dc50` | Consolidated Builds 101 to 142; moved Connection scroll gates off the JS path | Signed workflow `34918827804`; Play Internal |
| 144 | Sep 15 | `bfc02e94` | Fold-safe widths, full-width voice glow, note icon parity, guarded Connection taps | Signed workflow `34928341991`; Play Internal |
| 145 | Sep 15 | `38c11b0f` | Invalid Connection mount guards; removed Android detail transitions | Signed workflow `34950202858`; transition removal later reverted |
| 146 | Sep 15 | `f51b0b88` | Restored detail transitions, rolled back suspected native scroll crash boundary, opaque camera-sheet window | Signed workflow `34960575484`; Play Internal |
| 147 | Sep 15 | `81896019` | API error deduplication, fresh native sheet hosts, note notification targeting, Settings/subscription fixes | Signed workflow `34989896385`; Play Internal |
| 148 | Sep 16 | `e4d29be4` | Paused hidden Home query observers and realtime invalidation behind detail routes | Signed workflow `35050114910`; Play Internal |
| 150 | Sep 16 | `def07fff` | Sheet containment, scoped top navigation, Settings scrolling/alignment, initial MTC overlap correction | Signed workflow `35065183039`; Play Internal |
| 151 | Sep 16 | `0aea25d2` | Chat and Memory-sheet interaction stabilization plus Home motion-state integration | Signed workflow `35104614090`; Play Internal. Dedicated handoff entry and AAB hash were not recovered |
| 157 | Sep 17 | `b8a3f9cb` | Fail-open visible FAB sheet, scoped header glass, reused Memory image geometry, paused hidden Home work | Signed workflow `35171538491`; Play Internal |
| 158 | Sep 17 | `88c95628` | Routed Moment composer outside the native modal presentation boundary | Signed workflow `35190344899`; Play Internal; current Fold test has three reopened defects |
| 159 | Sep 17 | `baf7d167` | Keyboard-safe Memory comments, native Connection sheet slides with serialized Dialog handoffs, and short-screen Mental Check-in answer reservation | Signed workflow `35213510525`; Play Internal; Fold 8 retest pending |

The tester link is:
<https://play.google.com/apps/internaltest/4701017521848127510>

## Candidate consolidation

Builds 101 through 142 were deliberate source-and-test checkpoints, not 42 Play uploads. They
formed one continuous performance program and were signed together as Build 143.

| Builds | Workstream |
|---:|---|
| 101 to 108 | Deferred offscreen image sources, stabilized rail activation/action identity, bounded modal composition, Research snapping, and thumbnail warm windows |
| 109 to 116 | Virtualized Memory Detail and Home/Connection carousels, reduced hidden Moment detail work, hardened camera recovery, and bounded thumbnail decoding |
| 117 to 124 | Reduced Memory Detail decode and nested clipping, fixed Research/Journal/Connection clipping and budgets, and bounded the Memory Room rail |
| 125 to 132 | Reduced Diary/Knowledge/Connection scroll work, Connections list bridging, Memory Room reconstruction, and orbital/conversation scroll bookkeeping |
| 133 to 142 | Removed repeated scroll bookkeeping from Research, Journal, Memories, History, Connection, Reflection, Zodiac, Knowledge, and Memory Room heatmap surfaces |

Builds 152 through 156 were intermediate Memory-sheet, navigation-scope, image-geometry, and
hidden-Home-work candidates. They were not independently published and were consolidated into
Build 157. Build 151 was independently signed and published, although its dedicated handoff entry
and AAB hash were not recovered. Build 149 was successfully built but explicitly discarded without
Play publication in favor of Build 150.

The full build-by-build SHA ledger is maintained in the Notion Android Build Ledger rather than
duplicated here as an unreviewable wall of metadata.

## Root causes and repairs

### 1. First taps and detail navigation

**PROVEN for the repaired source paths.** Cold data, native presentation, and navigation readiness
were previously treated as one event. An entry, article, or connection tap could therefore arrive
before its destination was ready, provide no visible loading state, and appear to be lost until a
later tab change or tap released work.

Builds 92 through 100 separated navigation intent from data readiness, retained pending intent,
made retry/loading visible, and restored the shared bottom-up route transition. Build 145 later
removed Android detail transitions while chasing a Connection crash. The crash survived, proving
that removal had no demonstrated stability benefit; Build 146 restored the transition.

### 2. FAB camera and Memory-sheet lifecycle

**PROVEN as a native Android Dialog lifecycle problem.** A React Native `Modal` owns a separate
native Dialog. Reusing a detached Dialog or trying to dismiss one modal while presenting another
in the same frame could leave a stale window intercepting taps, keep the next body unavailable, or
strand content offscreen.

The sequence of fixes added fresh keyed Android hosts, separated chooser dismissal from sheet
presentation, retained pending action intent, made the window opaque through system bars, and
removed hidden body work. Build 157 proved another independent failure mode: the FAB sheet body
started at `translateY: 10000` and required a later animation frame to become visible. Android now
renders the body at its final visible position first. Build 158 routes the Moment composer outside
the native modal boundary so presentation ownership is singular.

The recurrence lesson is that visibility, repeat-open state, and Dialog ownership are separate
contracts. A test that proves only the first open cannot close this issue.

### 3. Memories image and scrolling cost

**PROVEN for source/render work; physical frame-time improvement remains device-dependent.** The
Memory rail and sheets repeatedly mounted or decoded images that were hidden, offscreen, or not yet
viewable. Some closed sheets still mapped every memory, and typing a comment could re-sort and
remeasure unchanged rows.

Builds 93 through 143 progressively virtualized grids, bounded carousel windows, delayed remote
image sources until viewability, downsampled detail images, memoized stable rows, reused decoded
image geometry, paused hidden refresh, and removed scroll bookkeeping from the React render path.

This reduced known JS/native work, but it does not prove native-feeling frame pacing on a content-
heavy Fold account. The remaining acceptance gate is an Android frame trace, not another render-
count assertion.

### 4. Connection Detail crash and smoothness

**Mixed proof.** Invalid IDs reaching channel setup and duplicated error reporting were proven and
fixed. A Build 146 session also showed 79 duplicate API-error events in about 1.7 seconds before a
real sign-out. Canonical one-report-per-object handling now prevents that amplification without
weakening auth guards.

The exact native Connection crash tombstone was never recovered. Build 143's UI-thread scroll
graph was a suspected boundary and was rolled back in Build 146. Hidden Home query observers and
realtime invalidations were later paused while Connection Detail owns the foreground. Those source
reductions are proven; crash elimination and Fold frame pacing remain physical-device claims.

### 5. Fold width, rotation, and short screens

**PROVEN.** `ScreenWidth` from `@rneui/base` is a module-scope launch-time read. Fold, rotation,
and split-screen changes can therefore leave a mounted surface with stale geometry. The shared
correction remains live `useWindowDimensions` plus the existing helpers in
`diary-fold-metrics.ts`; same-mounted-tree reflow is the required test shape.

Builds 94, 99, 144, and 150 extended this behavior across MTC cards, Memory surfaces, assessments,
voice glow, modal widths, and top navigation. Target SDK 36 still exposes the Fold inner display to
short landscape layouts. The work is hardening, not a completed two-pane landscape design.

### 6. Sheet containment, keyboard, and motion

**PROVEN and repaired in local candidate `0147e5672`.** Android sheets must own an opaque full-window
boundary so the launching tab cannot leak through the top, bottom, or system-bar regions. The
shared native modal now supplies that containment to the repaired camera and Memory paths.

Build 158 feedback found two remaining gaps and one presentation race:

1. `memory-detail-sheet.tsx` receives live keyboard height, but its Android inset branch returns
   only `bottom + 16`. The repair reuses the existing keyboard overlay resolver and measures the
   modal viewport so it distinguishes a keyboard overlay from a Dialog already resized by Android.
   Only the pinned composer moves, avoiding a full image-sheet re-layout while typing.
2. Connection Settings and Memory Detail explicitly disable Android entrance motion while Add
   Memory and View All use GPU-backed native slide. Settings now uses a scoped Android native
   bottom-sheet host and Memory Detail uses native modal slide. The global `CustomModalBounce`
   Android fail-open rule remains unchanged because route-level detail screens already receive
   navigator motion and off-stage Fabric writes can strand content.
3. View All dismissal and Memory Detail presentation were issued in the same React commit, racing
   two Android Dialog windows. The repair stores the pending target, closes the first Dialog, and
   presents the next only after native interactions complete. Add Memory to View All uses the same
   serialized handoff.

### 7. Mental Check-in answer cropping

**PROVEN and repaired in local candidate `0147e5672`.** `diary-fold-metrics.ts` reserved a fixed 50dp gap above the question card and only
160dp for answers. A normal four-row stack needs about 201dp before larger font scaling. Both the
Mental Check-in and weekly assessment consumed those values directly. Their existing test proved
only that the final answer existed in a ScrollView and explicitly expected the defective 160dp
viewport.

The shared metric now accepts answer count and font scale, reserves the natural answer stack first,
spends the 50dp top gap down to 8dp on short screens, then shrinks the question card. Scrolling is a
fallback only when the complete stack cannot fit after those reductions. Both assessment consumers
pass their real answer count.

### 8. Notification, Settings, and subscription behavior

Build 147 retained note identifiers through notification routing so a note notification focuses
the intended feed card instead of opening an empty Connection target. It also stopped showing
background subscription synchronization as an unexplained Settings spinner, centered glyphs in a
stable icon slot, and made Android subscription management prefer RevenueCat's management URL with
Google Play's official management page as the fallback.

The Android notification-channel sound contract is still cross-repository and immutable after a
channel is created. Any future channel suffix change must land together in `MurrorMobile`,
`murror-api`, `murror-backend`, and `viasr`.

## Regression and reopen lessons

Several issues returned after an earlier green build. The common pattern was a test that covered
one state transition while the device exercised a lifecycle:

- first open passed, but dismiss, tab switch, and second open were absent;
- a fresh mount passed, but Fold resize of the same tree was absent;
- an option existed in a ScrollView, but its visible geometry was not asserted;
- a sheet was opaque in its body, but not across the complete native window;
- a route transition was removed as a suspected crash fix without evidence that it caused the
  crash;
- keyboard height was mocked, then the test asserted that Android ignored it.

Every new assertion in this lane must therefore be mutation-tested and must prove the mutation
reached disk. Source is restored from a scratch copy with a matching checksum, never with
`git checkout`.

## Build 159 verification ledger

| Layer | Result |
|---|---|
| Focused suites | 8 suites, 237 tests passed with a fresh Jest cache and explicit spec paths |
| Mutation proof | Settings slide, Memory Detail slide, serialized Dialog handoff, keyboard inset, and short-screen geometry assertions each failed when their source repair was deliberately reverted |
| Mutation restoration | Every edited source was restored from a scratch copy and its SHA-256 was verified; `git checkout` was not used |
| TypeScript | Passed |
| Scoped ESLint | 0 errors; 2 existing inline-style warnings in `memory-detail-sheet.tsx` |
| Prettier and diff hygiene | Passed |
| Android release contracts | 7 of 7 passed for version code 159 |
| Workflow and single-React-Native contracts | Passed |
| Production environment contract | Passed for scheme `murror`, 18 required keys |
| Codegen | Passed before native compilation |
| Local native build | `assembleProductionDebug` passed; debug-signed, 124,323,414-byte APK |
| Local APK SHA-256 | `058d98425233c4bd2aa58288435d2b35592c94abb7b185e36af40d26c74725ff` |
| Hosted signed build | Workflow `35213510525` passed from exact SHA `baf7d1678b5c5d8effec19400720dc08d2625d8a` |
| Signed AAB | SHA-256 `ee46eaee24430fbe24bf2f4662af1965b19820a3ecd085849c5f0d7d1e55677a` |
| Signed APK | SHA-256 `b4f62afffcd33321b698a97501cc3fb8d906ce0692c85d99f3f7089cb019c472`; APK v2 signature and expected upload certificate verified |
| Play Internal | Build 159 Available to internal testers |
| Fold 8 | Unit-tested and locally built, not device-verified |

Play still reports two non-blocking warnings:

- the Console advertising-ID declaration says the app uses advertising ID while the active
  manifest intentionally omits `AD_ID`;
- no R8/ProGuard mapping is attached because the current release is not obfuscated.

These warnings are tracked as release-hygiene work and are not evidence that the Internal release
failed.

## Current open work

| Canonical item | State | Proven next step |
|---|---|---|
| `AND-COMMENT-001` | Published in Build 159; awaiting device verdict | Retest overlay and resized-keyboard modes on the Fold 8 |
| `AND-CDP-SHEET-001` | Published in Build 159; awaiting device verdict | Retest Settings, Add Memory, View All, and Memory Detail twice each |
| `AND-MHC-001` | Published in Build 159; awaiting device verdict | Retest all Fold postures and larger font scale |
| `AND-CDP-001` | Reopened across releases | Capture a physical crash tombstone and Android frame trace on a content-heavy Connection |
| `AND-MEM-001` | Improved, still reported laggy | Measure decode, GPU, UI, and JS frame time on the Fold 8 rather than infer from render counts |
| `AND-CAM-001` | Repeatedly reopened | Retest first open, dismiss/reopen, tab-switch/reopen, rotation, and keyboard paths on one installed build |
| `AND-LANDSCAPE-001` | Funded, incomplete | Scope and implement true unfolded landscape/two-pane layouts after P0 regressions close |
| `AND-REL-ADID` | Open warning | Reconcile the Play declaration with the manifest intentionally omitting `AD_ID` |
| `AND-REL-R8` | Open warning | Make an explicit obfuscation/mapping decision before Production submission |

## Next Fold 8 device matrix

1. Memory Detail: open a photo, focus comments, type, rotate, dismiss, open a second photo, and
   repeat with the Samsung split keyboard if available. Composer and action must remain visible.
2. Connection Detail sheets: open and close Settings, Add Memory, View All, and Memory Detail twice
   each. Every sheet must have one smooth bottom-up transition, no double Dialog, and no background
   leak.
3. Mental Check-in: test cover portrait, inner portrait, inner landscape, split-screen, and larger
   font scale. Every answer must be fully visible or intentionally reachable.
4. Connection performance: use the largest real Connection, scroll top to bottom and back up, open
   each carousel/detail sheet, and collect JS/UI frame timing plus any native crash record.
5. FAB camera: test first open, permission grant/deny, dismiss/reopen, tab-switch/reopen, picker
   cancel, selected image, keyboard, fold/unfold, and app background/foreground.
6. Notifications: open note and comment-reply notifications from cold and warm state and verify the
   exact content target without logout.

## Tracking model

The Notion Android Progress Hub is now the live operational ledger:

- **Android Work Items and QA** keeps one canonical row per problem and reopens it when it returns;
- **Android Build Ledger** contains all 69 build numbers from 91 through 159 and separates candidate,
  signed, Play, discarded, superseded, and provenance-gap states;
- **Android Device Runs** records the exact build, Fold posture, orientation, start state, scenario,
  evidence, and tester verdict.

Git remains the durable engineering record. Notion is the live queue and device-verdict surface;
neither one substitutes for signed-artifact or physical-device evidence.

## Documentation scope

No public progress-page entry was added. Builds 91 through 159 are Internal testing releases and
regression hardening for an Android product that is not yet ready for Production submission.
Publishing this work as a publicly shipped capability would overstate its release tier.

## Work accounting

The prior Build 91 to 158 run document recorded `1,811,678,296` Codex tokens. No new exact native
counter snapshot was taken for the Build 159 release work, so this update does not invent a
replacement total. The earlier number includes cache reads and delegated work and is not a billing
estimate.
