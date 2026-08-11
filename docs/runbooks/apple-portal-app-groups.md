# Runbook: per-environment App Groups in the Apple Developer portal

**For SEC-427-001.** Every scheme currently shares one app group,
`group.com.murror.widget`, so production, staging and development tokens sit in
one container. Splitting them needs Developer Portal work that **cannot be done
from code**.

> **Why there is no script for this.** The App Store Connect API does not model
> app groups. Probed read-only on 2026-08-10 with key `GGV7225WH5`:
>
> | Request | Result |
> |---|---|
> | `GET /v1/apps?limit=1` | `200` (auth works) |
> | `GET /v1/appGroups` | `404` the specified resource does not exist |
> | `GET /v1/bundleIds/{id}/appGroups` | `404` the URL path is not valid |
> | `GET /v1/bundleIds/{id}/relationships/appGroups` | `404` the URL path is not valid |
>
> Only Apple's internal portal API (what fastlane Spaceship drives) can do it,
> and this repo has no fastlane. So this is a manual runbook by necessity, not
> by preference.

Team ID: `YL72VTKBR7`. Signing is `CODE_SIGN_STYLE = Automatic`.

---

## 0. The Watch is out of scope

**Nothing ships with the Watch app, so it is excluded from all of this.**

Verified rather than assumed: the Staging, Production and Development schemes
contain **zero** references to the Watch target. `MurrorWatch Watch App` has its
own standalone scheme that no build lane archives.

```
grep -c -i watch ios/MurrorMobile.xcodeproj/xcshareddata/xcschemes/MurrorMobileStaging.xcscheme     -> 0
grep -c -i watch ios/MurrorMobile.xcodeproj/xcshareddata/xcschemes/MurrorMobile.xcscheme            -> 0
grep -c -i watch ios/MurrorMobile.xcodeproj/xcshareddata/xcschemes/MurrorMobileDevelopment.xcscheme -> 0
```

So: do not create a Watch App ID mapping, do not attach a group to a Watch
identifier, and do not migrate a watchOS container. If the Watch is ever
revived, note that the project declares `app.murror.mobile.dev.MurrorWatch`
which is absent from the portal, while
`app.murror.mobile.dev.MurrorWatch.watchkitapp` exists in the portal and is
absent from the project. Resolve that before attaching anything, because the
wrong choice signs cleanly and never shares the container.

---

## 1. Create three app groups

Certificates, Identifiers & Profiles, then Identifiers, then App Groups.

| New group | For |
|---|---|
| `group.com.murror.widget.dev` | development |
| `group.com.murror.widget.stg` | staging |
| `group.com.murror.widget.ode` | on-device evaluation |

**Leave `group.com.murror.widget` alone.** Production keeps the existing
identifier, so production needs no migration and no new group. Renaming it would
strand every existing production install's container for nothing.

The naming mirrors the OneSignal groups, which are already per environment
(`group.app.murror.mobile.dev.onesignal` and friends). Follow that precedent
rather than inventing a scheme.

---

## 2. Attach each group to its App IDs

Identifiers, then the App ID, then the App Groups capability, then Edit.

| App ID | Group to attach |
|---|---|
| `app.murror.mobile` | `group.com.murror.widget` (already attached, verify only) |
| `app.murror.mobile.AppWidgets` | `group.com.murror.widget` (verify only) |
| `app.murror.mobile.dev` | `group.com.murror.widget.dev` |
| `app.murror.mobile.dev.AppWidgets` | `group.com.murror.widget.dev` |
| `app.murror.mobile.stg` | `group.com.murror.widget.stg` |
| `app.murror.mobile.stg.AppWidgets` | `group.com.murror.widget.stg` |
| `app.murror.mobile.ode` | `group.com.murror.widget.ode` |

Notes worth knowing before you start:

- **There is no `app.murror.mobile.ode.AppWidgets`.** No ODE widget target
  exists. ODE needs the group only because the main app writes tokens through
  the bridge.
- **`MurrorMobileODE.entitlements` omits the widget group entirely today.** That
  is why the ODE build has been silently absorbing token writes. The guard that
  should have caught it failed open until `6a6e58a6`.
- **No Watch row.** See step 0. The Watch ships in nothing.

---

## 3. Regenerate provisioning profiles

Every App ID touched above needs its profiles regenerated. An existing profile
does **not** pick up a newly attached capability.

- Development profiles: automatic signing will usually refresh these on the next
  build once Xcode is signed in.
- **App Store distribution profiles need manual care.** These are the ones that
  break an archive, and the failure appears at export time.

---

## 4. Verify before trusting it

🚨 **CI cannot verify any of this.** CI only builds the ODE Debug scheme for the
simulator, so Release signing and its extensions are never exercised. A broken
signing setup stays invisible until someone archives.

Worse, prod signing is **already unproven** independently of this change: the
last captured production archive was dev-signed and the distribution IPA was not
retained.

So verify deliberately:

1. Archive the Staging scheme first. It catches a missing group at archive time,
   before a production archive is spent.
2. Confirm each built `.app` and `.appex` carries the expected group. From an
   archive:
   `codesign -d --entitlements - <path>.app` and check
   `com.apple.security.application-groups`.
3. Only then archive Production.

---

## 5. What lands on the code side afterwards

Do not start these until step 1 and step 2 are done, or nothing will sign.

- Split or parameterize `ios/AppWidgetsExtension.entitlements`. **One file
  currently serves three widget targets**, so it must become `$(APP_GROUP_ID)`
  or three files, changed atomically with `CODE_SIGN_ENTITLEMENTS` in the
  pbxproj.
- Define `APP_GROUP_ID` as a per-configuration build setting beside the existing
  `PRODUCT_BUNDLE_IDENTIFIER`, surface it through one Info.plist key, and read
  that key at runtime. **One derivation, four consumers.** Do not derive the
  environment a second way; a key built twice will drift.
  Note `ios/tmp.xcconfig` is generated *during* the build and is the base config
  for the widget targets only, so it is the wrong source for this.
- Replace the hardcoded id at **20 sites across 9 files**. The iOS bridge is
  already done: `RNWidgetBridge.m` reads a single
  `kMurrorAppGroupIdentifier` constant as of `6a6e58a6`.
- Migrate the container: read old, write new, **delete old**. The delete is the
  security-relevant half, because there is no way to revoke an already-issued
  session. iOS only, since the Watch ships in nothing.
- Keys in the shared container, decide each deliberately:
  `supabase_access_token` and `supabase_refresh_token` migrate;
  `pending_voice_uploads` currently has **no drainer anywhere**;
  `watch_connections_active_today` has **no writer** and is always 0;
  the `widget_render_count_*` counters and `live_activity_moment.jpg` can drop.
- Fix the remaining fail-open guards in the Swift widget, Watch and Live Activity
  targets, the same way the bridge was fixed.
- `scripts/verify-build-lane.sh` already checks build-number parity across the
  four Info.plists. Adding an app-group-per-scheme assertion there is the
  natural regression gate for this work.

---

## Parked: the Watch config fallbacks

Recorded so the analysis is not redone, **not** queued as work.

`ios/MurrorWatch Watch App/Services/WatchConfig.swift` hardcodes development
fallbacks: `https://dev.api.murror.app`, a development Supabase project, and a
committed anon key. The Watch target has `GENERATE_INFOPLIST_FILE = YES`, no
`INFOPLIST_FILE`, no `INFOPLIST_KEY_*` for those three values and no script phase
injecting them, so all three lookups return nil and the fallbacks are the only
path that ever runs.

**Exposure is nil while the Watch ships in nothing** (step 0). Two corrections
to earlier, more alarmed framing of this:

- A Supabase **anon** key is publishable by design. It is the key client apps are
  meant to carry, and it is gated by row level security, so it is not a
  service role key and its presence in a private repository is not an incident.
  The question it raises is whether RLS on that development project is sound,
  which is a separate piece of work.
- The leak path described earlier required a device with **both** the production
  and development apps installed. With the Watch unshipped, there is no path at
  all.

Revisit only if the Watch is revived, at which point the config injection has to
be fixed before it talks to anything.
