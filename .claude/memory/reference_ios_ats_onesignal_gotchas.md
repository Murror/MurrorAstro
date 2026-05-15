---
name: iOS ATS + OneSignal silent-failure gotchas
description: Two classes of bug that look like "success" in logs but silently fail on-device. Re-check these first whenever mobile doesn't see what backend claims to have sent.
type: reference
originSessionId: 1da68e58-e6c5-44d5-8bc8-8bb394874dfb
---
## iOS ATS blocks plain-HTTP image loads

- MurrorMobileStaging + Production schemes have `NSAllowsArbitraryLoads=false`
- Any `http://` image URL (FastImage, RN `<Image>`, WebView) is silently dropped by the OS. No JS-level error, no Sentry event — just a fallback image.
- Tavily (used by viasr-api for movie poster search) returns many `http://` URLs.
- **Three-layer defense applied 2026-04-17**:
  1. viasr-api `_get_url_image` rewrites scheme to `https://` at source
  2. Mobile hooks that hydrate `imageUrl` apply `.replace(/^http:\/\//, 'https://')` before FastImage
  3. One-shot SQL on staging rewrote existing rows in `murror_api.takeaway_reflections`
- **Diagnostic tip**: if a mobile image silently fails to load, check the URL scheme before assuming a CDN or auth issue.

## OneSignal "push succeeded" with 0 recipients

- POST to OneSignal `/notifications` returns HTTP 200 and `{id: null, external_id: null, errors: {}}` when the `external_id` has no matching subscription in the target app.
- The old `OneSignalService.pushNotificationsToUser` only checked `isNotEmptyObject(result.errors)` — empty errors = "success" log, even for a no-op send.
- Root cause of 2026-04-16 bug: staging backend `ONESIGNAL_APP_ID` was the dev app `fe193ae1-...` while mobile staging devices registered against the real staging app `85311fd0-...`. Different app_ids = different subscription lists = 0 recipients = silent no-op.
- **Fixed 2026-04-16** by aligning ConfigMap/Secret + adding a defensive `warn` branch in `murror-api/src/libs/one-signal/onesignal.service.ts` when `recipients === 0` or `id` is null/falsy.
- **Diagnostic tip**: if backend logs "Push notification success for external ID: X" but the device stays silent, grep for `recipients=0` — and cross-check that the backend's `ONESIGNAL_APP_ID` matches the app the mobile bundle registers against.

## App ID ↔ bundle ID mapping (verify before changing either)

| Env | `ONESIGNAL_APP_ID` | Mobile scheme |
|---|---|---|
| Production | `6640c83b-5396-41be-bd39-184f7a21be3a` | Production / `app.murror` |
| Staging | `85311fd0-bca9-4741-a7ce-758eb09f45fb` | MurrorMobileStaging / `app.murror.staging` |
| Dev / Alpha 2 | `fe193ae1-1149-4b48-9225-74e78135966c` | MurrorMobileDevelopment |

Each OneSignal app has its own APNs cert, REST API key, and subscription list. If you rotate the app_id on one side, the other side's devices go dark until they re-register. Always check both sides.
