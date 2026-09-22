# Android Builds 173 to 175 and Durable MTC Memory Feed

## Context

The Android Internal Testing lane continued from the September 21 detail-motion
work. Builds 173 and 174 repaired interaction regressions reported on a Galaxy Z
Fold 8. Build 175 addresses a separate data-loss symptom in MTC: shared memories
stopped appearing because the client composed the feed from transient unseen and
device-local sources instead of a durable server feed.

The release evidence remains deliberately layered. Merged source, deployed API,
local checks, hosted signed artifacts, Play publication, and physical-device
behavior are different gates.

## Build 173

- Exact candidate: `e92002a627561000c076be7b366b76245c54d73e`.
- Restored the Android Add Connection path, including presenter readiness,
  repeat-tap coalescing, stale-callback fencing, and the existing fallback.
- Protected workflow run `35700070067` completed successfully.
- Published to Google Play Internal Testing as `173 (2.0.0) - Smoother
  connections`. Production was not changed.

## Build 174

- Exact candidate: `b0d27c19136508c81c796dd2f4bd869bc0fe9937`.
- Improved small-screen Between Us card layout, multi-question quiz selection,
  Android-native invitation handoffs with friendly copy, and Connection
  Settings dismissal pacing.
- The full local suite passed 853 suites and 8,687 tests, with one suite and
  four tests skipped, plus TypeScript, formatting, lint, release contracts, and
  production metadata gates.
- Protected workflow run `35719889438` completed successfully.
- Published to Google Play Internal Testing as `174 (2.0.0) - Small-screen
  interactions`. Production was not changed.

## Build 175 durable memory feed

### API source and deployment

- API PR #1033 added cursor-paginated
  `GET /api/v1/connections/memories/activity` and merged to `staging` at
  `936741e771f0d29c30a8d822d74c1581076ff584`.
- Staging deployment run `35747226284` completed successfully.
- Production promotion PR #1035 merged at
  `77ce5d772feeea6a145638671f7a397f8cce3a8a`; production deployment run
  `35749465561` completed successfully.
- Production returned HTTP 200 for `/api/health/live`, HTTP 401 for the new
  authenticated activity route, and HTTP 404 for a fabricated sibling route.
  This proves the route is live and protected, not that a signed-in user's
  memory data is correct.

### Mobile source and behavior

- Mobile PR #1423 merged to `staging-environment-setup` at
  `e0fbe81b81429ee385cbd367cff2d5122d30e9b2`.
- MTC now composes stable sent and received memory cards from the durable API.
  Viewing a memory clears unread state without deleting its card.
- The old four-fresh/five-total feed cap no longer removes cards. Users can
  keep scrolling through every loaded memory, and the next server page loads
  near the carousel tail.
- Explicit memory deletion and connection removal still revoke cards for
  privacy. The device-local sent log remains a rollout fallback rather than the
  canonical feed.

### Build and artifact evidence

- Exact candidate: `d52d0d644f3ff2de1ea7777e69cad8781707cba8`, version code
  `175`, version name `2.0.0`.
- Local verification passed 13 suites and 239 tests, TypeScript, formatting,
  lint, release contracts, and production-environment validation.
- One protected build was dispatched. Workflow run `35751013226` completed
  successfully after production signing, React Native code generation, Billing
  Library 8 validation, runtime/privacy/signature checks, and provenance upload.
- Downloaded artifact hashes matched the hosted provenance receipt:
  - AAB: `ed3087dffbc79ddd1bf9b158d25d59103dc6cda51c29f74d6cd6f0aa8aa86a00`
  - APK: `a2be7a57e6b3a342269a979a3f435b5fd03b5be091de4f9df001a4f408f78228`
  - Native symbols: `48c9ec16ab2bb6d116b1e807646207d3d293071a5c0d80cb56fc043c6c437d90`
- Independent checks confirmed package `com.murrormobile`, minimum API 24,
  target SDK 36, four ABIs, AAB ZIP integrity, and upload-certificate SHA-256
  `f44e00d4d85a86c9d00c4fa02ba9761c828f491aedc4004eaa683fbaa157d000`.

## Current release state

- Google Play accepted Build 175 and its native debug symbols on the Internal
  track. The final preview reports zero blocking errors and zero newly
  unsupported devices.
- Publication is pending Astro's final action-time confirmation for `Save and
  publish`. Production remains out of scope and unchanged.
- Play repeats two nonblocking warnings: its advertising-ID declaration says
  the app uses advertising ID while the manifest intentionally omits `AD_ID`,
  and no optional R8 mapping file is attached.
- After publication, MTC memory population, pagination, and perceived Fold
  pacing still require a physical Galaxy Z Fold 8 test.

## Documentation scope

This is an Internal Testing repair, not a production launch. No public progress
page update was made. The team work log should describe only the new Build 175
test target so testers do not repeat checks already completed on Builds 173 and
174.
