# 2026-09-08: Android builds 79 to 90, Fold hardening, and Internal testing

Repos: `MurrorMobile`, with notification behavior also constrained by matching channel
identifiers in `murror-api`, `murror-backend`, and `viasr`.

Primary Android device: Samsung Galaxy Z Fold 8.

Current Internal testing release: version `2.0.0`, version code `90`.

## Outcome

Android build 90 is available to the Play Internal testing group. It carries the latest
detail-navigation, connection-performance, recovery, voice, short-screen, and Fold fixes
from PR #1251. The signed artifacts, exact source SHA, CI, and Play release were verified.
The release has not yet been verified on the Fold 8 after publication.

This document records the complete Android run from builds 79 through 90, including work
completed on two coordinated but distinct branches. It does not claim that every commit
from the older launch-readiness branch is an ancestor of build 90.

## Source and release provenance

| Track | Branch and PR | Current head | State on 2026-09-08 |
|---|---|---:|---|
| Launch readiness, builds 79 to 87 | `codex/android-launch-readiness-20260901`, PR #1238 | `7a6035e3` | Open, merge state CLEAN |
| Performance and recovery, builds 88 to 90 | `codex/android-performance-20260908`, PR #1251 | `618f7228` | Open, merge state UNSTABLE because a duplicate PR check was intentionally cancelled |
| Shared mobile trunk | `staging-environment-setup` | `386f331c` at the build 90 branch point | Build 90 branch is 17 commits ahead and 0 behind this point |

The exact build 90 source is
`618f72289b06bef5da7cb9a81af5d3304cd1e0e2`. The remote branch and local worktree
resolved to that same SHA when this record was written.

`origin/codex/android-launch-readiness-20260901` is not an ancestor of the build 90 head.
PR #1238 therefore remains a separate merge obligation. A later trunk build can lose
launch-readiness work if the two tracks are merged without checking the resulting tree.

## Release timeline

| Build | Main work recorded | Evidence boundary |
|---:|---|---|
| 79 | Android production-parity foundation, account isolation and offline recovery, 16 KB Skia compatibility, initial Fold orbital work | Signed and published to Internal testing |
| 80 | Work-in-progress fences, authentication/session hardening, and production build corrections | Signed and published to Internal testing |
| 81 | Font subsetting, secure-storage caching/coalescing, and account-transition race fixes. AAB reduced from about 120.4 MB to 110.7 MB; estimated download reduced from about 56.5 MB to 46.4 MB | Signed and published to Internal testing |
| 82 | Live Fold window metrics, orbit-height correction, fail-open transparent modal handling, share-sheet mount fix, and initial Connection detail scroll work | Signed and published to Internal testing |
| 83 | Bounded analytics and secure-storage work, Home animation/poll expiry corrections, and more live-width reflow | Signed and published to Internal testing |
| 84 | Broad QA sweep covering window reflow, picker failures, bad-row containment, analytics acceptance, and configuration guards | Signed and published to Internal testing |
| 85 | Removed production entrance animations, repaired missing SVG `viewBox` values, removed emoji-as-icon rendering, and introduced the dark butterfly app icon | Signed and published to Internal testing |
| 86 | Notification channel/sound work, butterfly notification icon, all-tab FAB action menu, multi-photo send, Connection detail scrolling, and Diary width work | Signed and published to Internal testing; Fold 8 feedback still reported lag and layout failures |
| 87 | Further Connection detail UI-thread and Fold experiments | Branch candidate. Do not treat every experimental scroll mechanism as current; a prior UI-thread handler later crashed the Fold and must not be restored |
| 88 | First performance/recovery integration on shared staging source | User device-tested; source lineage was merged through PR #1243, but this record does not substitute that source fact for independent artifact provenance |
| 89 | Detail-route recovery, reduced repeated overlay/row renders, initial Connection detail performance work, centered feedback/voice fixes | Published to Internal testing and device-tested; several issues remained |
| 90 | Durable reflection resume, voice finalization, Memory Room refresh, short-screen assessment/panic layouts, Fold reflow, and release-contract updates | CI, signed artifact, Play Internal publication, and tester availability verified; post-release Fold 8 pass still owed |

## Root causes and fixes

### 1. Invisible but pressable controls on Fabric

**PROVEN.** A Reanimated `entering` registration can clone a Fabric view at opacity 0
before the animation begins. If the progress frame is dropped, no unconditional final
value restores visibility, while opacity 0 still accepts touches. This explains controls
that disappeared visually but remained pressable.

The fix belongs at registration: production entrance animations were removed instead of
being shortened or wrapped in an inert delayed-mount guard. The contract test scans both
`src/` and the repository root so a root-level screen cannot silently reintroduce one.

### 2. Fold width frozen at bundle load

**PROVEN.** `ScreenWidth` exported by `@rneui/base` is evaluated from
`Dimensions.get('window').width` once at module load. After folding, unfolding, rotating,
or entering split-screen, a consumer can continue laying out with the old width.

The shared correction lives in
`src/screens/main/Diary/diary-fold-metrics.ts`. It uses live window dimensions,
`foldSafeWidth`, and `fitAspectCard` rather than introducing a second sizing mechanism.
Tests change the mocked width and re-render the same mounted tree. A fresh mount alone
cannot prove the fix because both a frozen and a live read initially have the correct
launch width.

Build 90 extended live metrics into journal input, assessments, and panic/support flows.
The remaining frozen-width imports must still be remeasured before another count is
reported.

### 3. Fold inner landscape unlocked by target SDK 36

**PROVEN.** On displays at or above 600 dp smallest width, target SDK 36 no longer honors
the previous portrait-only assumption. Existing phone layouts can therefore open in a
short, wide Fold configuration for which they were not designed.

Build 90 makes critical assessment and panic actions vertically scrollable and reachable
on short screens. It also adds same-mounted-tree reflow tests. This is incremental
hardening, not completion of a true two-pane Fold experience.

### 4. Detail navigation blocked by loading state

**PROVEN in source tests, then reproduced as fixed in build 89 integration.** History and
Research taps reached navigation, but detail screens could remain behind a loading gate
when cached data or a retryable query state did not match the screen's assumptions. The
shared recovery policy now distinguishes recoverable loading from terminal absence,
provides retry behavior, and avoids hiding the destination behind an indefinite state.

The main source points are:

- `src/common/detail-screen-options.ts`
- `src/config/react-query/query-load-state.ts`
- `src/queries/journal/use-journal-detail.ts`
- `src/queries/knowledge/use-get-article-detail.ts`
- `src/screens/main/Diary/journal-detail-screen.tsx`
- `src/screens/main/knowledge/knowledge-screen-detail.tsx`

### 5. Connection detail scroll work on the React render path

**PROVEN for several hot paths; full device smoothness remains unproven.** Long Connection
detail screens repeatedly rebuilt expensive rows, image wrappers, orbital content, and
overlay state during scroll and parent updates. Builds 86 through 90 progressively moved
or bounded that work, stabilized image fallbacks and detail sheets, and reduced repeated
rendering in `relationship-detail-screen.tsx` and `insight-card.tsx`.

This improved the tester's Fold 8 result from severe lag/crash behavior to "better but
still laggy." The remaining work requires profiling a content-heavy real account on the
Fold 8. Unit render counts are useful guards, but they are not a frame-time measurement.

### 6. Bottom sheets and feedback overlays used page-relative geometry

**PROVEN.** The image detail sheet allowed background content to remain visible through
translucent regions, and the reaction feedback chooser could be positioned below the
visible Fold viewport. Android now uses an opaque sheet surface with static gloss and
bounded chrome. Reaction feedback uses live viewport height and centers the choice panel
inside the currently visible screen.

### 7. Reflection recovery stopped at local completion

**PROVEN for the client cache and draft paths.** A completed reflection could disappear
after app exit because the draft lifecycle and Memory Room queries were not invalidated
and polled as one durable flow. Build 90 persists the recovery marker, invalidates the
Memory Room query family, and uses bounded polling for a late server projection.

A missing backend projection is still outside the client's control. If the Fold test
shows a completed reflection never arriving after the bounded window, the next work
belongs in the API/Viasr pipeline rather than another indefinite client spinner.

### 8. Android voice sessions were not finalized safely

**PROVEN in lifecycle tests; device microphone behavior is not yet reverified.** The voice
hook could lose late final results or leave listeners alive when Android delivered end,
error, and result events in a different order. Build 90 centralizes finalization, retains
the last useful transcript, tears down listeners safely, and carries the native patch as
a CI-relevant Android change.

### 9. Settings icon color was hardcoded

**PROVEN.** Several settings SVG children hardcoded black strokes instead of accepting
the screen's icon color. Build 89 makes account, document, and logout icons use the
provided color so the Android dark surface matches iOS styling.

### 10. Notification sound is a cross-repository immutable contract

Android notification-channel sound cannot be changed after a channel is created on a
device. A new sound requires a new suffixed channel identifier, such as a future `_v2`,
and the identifier must change together in `MurrorMobile`, `murror-api`,
`murror-backend`, and `viasr`. Changing only one repository silently falls back to the
default tone for some sends. The current contract remains `murror_default_v1`.

## Build 90 change set

Relative to `staging-environment-setup` at `386f331c`, PR #1251 contains 89 changed files,
5,703 insertions, and 1,024 deletions. Its 17 commits include:

- detail navigation recovery for History and Research;
- fewer repeated Connection detail, image fallback, Memory Room, and overlay renders;
- opaque Android image-detail presentation;
- live-height centered reaction feedback;
- consistent settings icon colors;
- Android voice event ordering and finalization;
- durable conversation and journal draft recovery;
- bounded Memory Room refresh after completion;
- short-screen and Fold-safe mental-health assessment layouts;
- short-screen panic/support action reachability;
- version code 90 in all five release-contract sites;
- an exact CI helper that recognizes native patch relevance without running unrelated
  hosted iOS work.

The version remains `2.0.0`. Version code `90` is present in:

1. `android/app/build.gradle`
2. two APK badging assertions in `.github/workflows/android.yaml`
3. `scripts/ci/android-play-release-contract.test.mjs`
4. `scripts/ci/verify-workflow-contracts.mjs`

## Verification ledger

| Layer | Build 90 result |
|---|---|
| Focused Android/Fold/recovery suites | 75 tests passed |
| Full Jest suite | 665 suites passed, 1 skipped; 6,554 tests passed, 3 skipped |
| TypeScript | Passed |
| ESLint | No new warnings; exact baseline remained 127 warnings across 106 unique tuples |
| Scoped Prettier and diff check | Passed |
| Repo-wide formatting | Still fails on 77 pre-existing unrelated files |
| Android Play release contract | 6 of 6 passed |
| Workflow contract verification | Passed |
| Exact-SHA CI | Run `34220482890` passed for `618f7228`; hosted iOS work skipped |
| Protected Android build | Run `34221349095` passed for `618f7228` |
| Signed AAB | Artifact `10056064930`; SHA-256 `445a57a447ec82eafebb90fef813ac73ad64c47ddbf00fa9672c93e1ed791d56` |
| Signed APK | SHA-256 `16680a8c8c14998f32ff6cbc941e0e4e1e75e5755c18cd63ba4caad3528b8de9` |
| Play Internal testing | `90 (2.0.0)` available to internal testers on 2026-09-08 |
| Tester list | `Murror Team`, 10 users, includes `nkhanhpham99@gmail.com` |
| Fold 8 after publication | Not yet verified |

Internal testing link:
<https://play.google.com/apps/internaltest/4701017521848127510>

The Play Console still reports two non-blocking warnings:

- the Console declaration says the app uses the advertising ID while the privacy manifest
  intentionally omits `AD_ID`;
- no R8 mapping file is attached because this build is not obfuscated.

## Remaining performance priorities

The ordered source audit is in
`MurrorMobile/docs/ANDROID-PERFORMANCE-AUDIT-20260908.md`. The largest remaining
opportunities are:

1. remove the serial Mixpanel/analytics gate from startup;
2. stop Home orbital Skia picture rebuilding at roughly 20 frames per second and reduce
   oversized gradient work;
3. consolidate per-friend queries and channels;
4. virtualize conversation history instead of rendering up to 100 messages in a
   non-virtual `ScrollView`, and avoid re-running Markdown parsing per render;
5. virtualize the Connections list;
6. virtualize large Memory Room image trees;
7. measure suspected navigator-wide re-renders from route tracking;
8. pause Galaxy offscreen loops and reduce 20 fps `runOnJS` crossings.

The next performance claim should be based on Android frame timing and JS/UI thread data
from a long real Connection detail page. Source inspection alone cannot prove iOS-level
smoothness.

## Remaining Fold and short-screen work

Build 90 protects the highest-risk actions, but the audit is not complete. Known remaining
surfaces include:

- relationship-next-step chooser clipping;
- article and reflection preview call-to-action reachability;
- any journal input accessory still using frozen-width shared primitives;
- shared components that import bundle-frozen width values;
- onboarding screens designed around portrait-only height;
- a true two-pane layout for the unfolded inner display;
- the remaining frozen-width imports, whose exact count must be remeasured after both
  branches are reconciled.

## Next Fold 8 test pass

1. Open a Connection with the largest available history and continuously scroll from top
   to bottom, watching for frame drops and crashes.
2. Open History entries and Research articles from cold cache, warm cache, offline, and
   after a failed request, then retry.
3. Open image detail and verify no page content leaks behind its lower edge while
   scrolling, commenting, and closing.
4. Complete a reflection, confirm it appears in Memory Room, force-stop the app, relaunch,
   and confirm the result and draft state persist.
5. Test voice input through permission grant, normal stop, silence, interruption, and app
   background/foreground.
6. Open the mental-health check-in and panic/support flows on the cover display, unfolded
   portrait, unfolded landscape, and split-screen. Every option and primary action must be
   reachable.
7. Tap reaction feedback near the bottom of a long reflection and confirm the chooser is
   centered in the visible viewport.
8. Verify the dark Play icon, settings icon color, notification icon, and notification
   sound on a device that already had the older channel installed.

## Documentation scope

No public progress-site entry was added. These changes are an Internal testing release,
performance hardening, and regression repair rather than a publicly available Production
capability. Publishing them as shipped product progress would overstate the release tier.

## Work accounting

The combined Claude and Codex processing volume for this Android run was
`3,210,384,991` tokens. This is tool-reported processing volume, including cache reads and
delegated work, not a billing estimate.

- Claude, builds 79 to 81: `218,042,208`
- Claude, builds 82 to 87: `2,521,871,996`
- Codex, build 88: `254,708,997`
- Codex, build 89: `73,426,092`
- Codex, build 90 fixes: `96,768,278`
- Codex, build 90 publication and release record: `45,567,420`
