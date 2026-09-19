# Android Build 169 entry-detail release evidence

## Context

Build 169 is the next Android Internal Testing candidate after Build 168. It
targets a first-frame performance defect in the ordinary Entry Detail and
Conversation Detail routes. These routes already used Android's opaque native
bottom-up transition, but warm cached content mounted the complete destination
tree while that transition was running.

This document separates source, local artifact, hosted artifact, Play upload,
and physical-device evidence. It does not claim that an uploaded Play draft is
published.

## Source change

- Repository: `Murror/MurrorMobile`
- Branch: `codex/android-ui-stability-build150-20260916`
- Commit: `8f6780e05c4639a5d9fe7ae8a0db7caa4ae31425`
- Base lane: `staging-environment-setup`
- Android version: 2.0.0, version code 169

`JournalDetailScreen` and `ConversationDetailScreen` now render only an opaque
black presentation frame until Android emits `transitionEnd`. Their existing
queries, effects, media, observers, and content remain inside unchanged child
trees and mount once after the native slide finishes. iOS resolves ready on its
initial render and is unchanged.

The exact first wrong frame was the unconditional route-body mount. The fix
belongs at that route boundary because it is the last common frame before any
destination workload begins and because the navigator already owns the motion.

## Local verification

- Seven focused suites passed with 41 tests using an isolated Jest cache.
- Both readiness guards were independently mutation-tested. Bypassing either
  guard made its rendered contract fail, and exact source hashes proved each
  restoration.
- TypeScript passed.
- ESLint matched the accepted baseline of 127 warning occurrences and 106
  unique file, rule, and message tuples.
- Android release and workflow contracts passed with 102 tests total.
- Production environment validation passed with 18 required keys and the
  expected `murror` scheme without printing secrets.
- React Native code generation completed before the JDK 17 Android build.
- The local development-debug APK is 124,243,874 bytes with SHA-256
  `b560647ac4194abe465d42ccf554ba2ef8638ce5b62ab24895300c7ece3ae702`.

The local APK is debug-signed and is not the Play artifact.

## Hosted signed artifact

- Astro approved exactly one hosted Build 169.
- GitHub Actions run: `35440349701`
- Run URL: `https://github.com/Murror/MurrorMobile/actions/runs/35440349701`
- Run head: `8f6780e05c4639a5d9fe7ae8a0db7caa4ae31425`
- Conclusion: success
- Variant: `productionRelease`
- Production APK SHA-256:
  `397ce8437e5393285cc536952659741e36aa9af6d2c6d8949d14bae63e26148d`
- Production AAB SHA-256:
  `0ed6ff6dd73e099ed47f8a66a48ca4920838f1d9ec76eb95ed797748ecb9aad2`
- Native symbols SHA-256:
  `18102f747fdaa32541b3de8b86be4f7a0357e7ba6dbef5ca97e9cd00d023f7db`
- Upload certificate SHA-256:
  `f44e00d4d85a86c9d00c4fa02ba9761c828f491aedc4004eaa683fbaa157d000`

The workflow and an independent local inspection confirmed package
`com.murrormobile`, version code 169, version name 2.0.0, target SDK 36, minimum
API 24, all four expected ABIs, APK v2 signing, the expected upload certificate,
and no forbidden advertising permission. The downloaded files exactly matched
the workflow provenance hashes.

## Google Play state

The verified AAB was uploaded to Murror AI's Internal Testing release draft 75.
Google Play parsed it as `169 (2.0.0)`, API 24+, target SDK 36, four screen
layouts, and four ABIs. The release is not published yet. The active Internal
Testing release remains Build 168 until Astro confirms the tester-visible
release notes and final rollout action.

## Evidence still missing

- Play Internal Testing active-release confirmation for Build 169
- installation or update proof from the tester channel
- physical Z Fold 8 frame pacing and smoothness verification

Source behavior, local integration, hosted signing, and Play draft parsing are
proven. Device smoothness remains unverified.
