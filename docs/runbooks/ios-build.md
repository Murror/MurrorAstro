# Runbook: iOS TestFlight Build

**When to use:** archiving a new build of the iOS app for TestFlight (staging or production).
**Prerequisites:** Apple Developer access, Xcode + command line tools, `.p8` API key — see [`app-store-connect.md`](./app-store-connect.md).
**Time:** ~25-35 minutes wall-clock (archive ~15 min + export+upload ~5 min + ASC processing 5-15 min).

---

## TL;DR

```bash
cd /Users/astro/Projects/murror-transfer/Murror/MurrorMobile

# SINGLE BUILD LANE: every TestFlight build archives from `staging-environment-setup`,
# and the build number is chosen by a script, NEVER by hand. Build numbers are a
# cross-session shared resource: hand-picking them caused two `251` collisions and a
# phantom off-repo `253` (Apple rejects the duplicate, so that build's fix silently
# never shipped). Land your code on staging-environment-setup FIRST, then build from it.

# 1. Bump the build number with the script. It sets the number to (canonical + 1) and
#    moves it in the TWO independent places that are NOT derived from each other:
#      (a) CURRENT_PROJECT_VERSION in project.pbxproj  -> the OneSignal/AppWidgets EXTENSION targets (24)
#      (b) the CFBundleVersion literal in each per-scheme Info.plist  -> the APP itself (hardcoded)
#    Bump only (a) and the extension ships at N+1 while the app stays at N, so App Store Connect
#    rejects the app/extension version mismatch. (That is what produced the bad build 241 on 2026-06-27.)
#    The script does both, warns if your tree is not canonical content, and verifies all 28 spots.
./scripts/ios-next-build.sh --dry-run   # preview the number
./scripts/ios-next-build.sh             # apply the bump

# 2. Commit + PR the bump into staging-environment-setup (per CONVENTIONS.md, no direct push), THEN archive from it.
NEW=$(grep -m1 -oE 'CURRENT_PROJECT_VERSION = [0-9]+;' ios/MurrorMobile.xcodeproj/project.pbxproj | grep -oE '[0-9]+')
git checkout -b chore/bump-build-${NEW}
git add ios/MurrorMobile.xcodeproj/project.pbxproj \
        ios/MurrorMobile/Info.plist ios/MurrorMobileStaging-Info.plist \
        ios/MurrorMobileDevelopment-Info.plist ios/MurrorMobileODE-Info.plist
git commit -m "chore(ios): bump build to ${NEW} (pbxproj + Info.plists)"
# gh pr create --base staging-environment-setup ... ; merge ; then archive from staging-environment-setup.

# 3. Archive
xcodebuild archive \
  -workspace ios/MurrorMobile.xcworkspace \
  -scheme MurrorMobileStaging \
  -configuration Release \
  -archivePath /tmp/MurrorMobileStaging-${NEW}.xcarchive \
  -allowProvisioningUpdates \
  -authenticationKeyPath ~/.appstoreconnect/private_keys/AuthKey_GGV7225WH5.p8 \
  -authenticationKeyID GGV7225WH5 \
  -authenticationKeyIssuerID 628f9cc5-6342-4c1d-8a74-3723334b1fc2

# 4. VERIFY the archive before spending the ~5-min upload (see "Verify before upload" below).
#    The app build number AND every embedded .appex build number must equal ${NEW}.
ARCHIVE=/tmp/MurrorMobileStaging-${NEW}.xcarchive
/usr/libexec/PlistBuddy -c "Print :ApplicationProperties:CFBundleVersion" "$ARCHIVE/Info.plist"   # the app
find "$ARCHIVE/Products/Applications" -name '*.appex' -print \
  -exec /usr/libexec/PlistBuddy -c "Print :CFBundleVersion" {}/Info.plist \;                       # the extensions
#  Every number printed above must read ${NEW}. If an .appex differs from the app, STOP:
#  you bumped only one of the two places. Fix the bump, re-archive, then continue.

# 5. Export + upload to TestFlight
xcodebuild -exportArchive \
  -archivePath /tmp/MurrorMobileStaging-${NEW}.xcarchive \
  -exportPath /tmp/MurrorMobileStaging-${NEW}-export \
  -exportOptionsPlist ios/ExportOptions.plist \
  -allowProvisioningUpdates \
  -authenticationKeyPath ~/.appstoreconnect/private_keys/AuthKey_GGV7225WH5.p8 \
  -authenticationKeyID GGV7225WH5 \
  -authenticationKeyIssuerID 628f9cc5-6342-4c1d-8a74-3723334b1fc2
```

Wait for `** EXPORT SUCCEEDED **` + `Uploaded MurrorMobileStaging`. Apple's processing takes 5-15 min more before the build appears in TestFlight.

---

## Schemes

| Scheme | Environment | Bundle ID | Env file | Use when |
|---|---|---|---|---|
| `MurrorMobileDevelopment` | Alpha 2 / Dev | `app.murror.mobile.dev` | `.env.development` | Local dev |
| `MurrorMobileStaging` | Staging | `app.murror.mobile.stg` | `.env.staging` | **TF builds — most common** |
| `MurrorMobile` | Production | `app.murror.mobile` | `.env.production` | Prod releases |
| `MurrorMobileODE` | ODE | — | `.env.ode` | CI builds only |

---

## Version numbers

- **`MARKETING_VERSION`** is the user-facing version (e.g., `2.0.0`). Bump only on major/minor releases.
- **Build number** (e.g., `242`) **must increment for every TestFlight upload.** Apple rejects duplicate build numbers per `MARKETING_VERSION`.

### The build number lives in TWO independent places

They are NOT derived from each other. **Bump BOTH every time**, or the upload is rejected:

| Place | Drives | How it's stored |
|---|---|---|
| `CURRENT_PROJECT_VERSION` in `ios/MurrorMobile.xcodeproj/project.pbxproj` | The **extension** targets (OneSignal x4 schemes, AppWidgets x2) | 24 occurrences (every target x Debug/Release). The extensions have `GENERATE_INFOPLIST_FILE = YES`, so Xcode derives their `CFBundleVersion` from this build setting. All schemes currently share one number, so a **global** `sed` is correct. |
| `CFBundleVersion` literal in each per-scheme **app** Info.plist | The **app** itself | A hardcoded `<string>NNN</string>`. Xcode does NOT substitute `CURRENT_PROJECT_VERSION` here, so it must be edited by hand. |

The four per-scheme app Info.plists (bump all four to keep schemes in lockstep, matching commit history):

| Scheme | App Info.plist |
|---|---|
| Production | `ios/MurrorMobile/Info.plist` |
| Staging | `ios/MurrorMobileStaging-Info.plist` |
| Development | `ios/MurrorMobileDevelopment-Info.plist` |
| ODE | `ios/MurrorMobileODE-Info.plist` |

> ⚠️ **The 2026-06-27 (build 241) failure:** bumping only `CURRENT_PROJECT_VERSION` moved the extensions to N+1 while the apps stayed at N. App Store Connect's upload validation rejects that app/extension version mismatch. The last two correct bumps (`a176cbf`, `3a962e7`) change pbxproj AND all four Info.plist `CFBundleVersion` lines together.

**How to bump:** use the surgical one-liners in the [TL;DR](#tldr). The `sed` global-replaces the 24 pbxproj occurrences; the `perl -0pi` edits ONLY the `<string>` after each `<key>CFBundleVersion</key>`. **Do NOT use `PlistBuddy -c "Set :CFBundleVersion ..."`** to bump the plists: it rewrites and reformats the entire file, turning a 1-line change into a noisy diff.

### Verify before upload

A ~30-min archive+upload cycle is wasted if ASC rejects on a version mismatch. After archiving and **before** export/upload, confirm the app and its extensions agree on the build number:

```bash
ARCHIVE=/tmp/MurrorMobileStaging-242.xcarchive   # match your build number

# App build number ASC will read (must equal the intended number):
/usr/libexec/PlistBuddy -c "Print :ApplicationProperties:CFBundleVersion" "$ARCHIVE/Info.plist"

# Every embedded extension's build number (each must equal the app's):
find "$ARCHIVE/Products/Applications" -name '*.appex' -print \
  -exec /usr/libexec/PlistBuddy -c "Print :CFBundleVersion" {}/Info.plist \;
```

If any `.appex` number differs from the app's, STOP and re-bump: you moved only one of the two places.

---

## Known issues + workarounds

### `fmt` consteval bug on Xcode 26+

The `fmt 11.0.2` pod (transitive dep of Folly/Hermes) triggers a `consteval` compiler error with Apple Clang in Xcode 26+.

**Patch:** `ios/Pods/fmt/include/fmt/base.h` line 127. The Podfile attempts a `post_install` hook with `GCC_PREPROCESSOR_DEFINITIONS=FMT_USE_CONSTEVAL=0`, but the `#ifdef` in the header runs before preprocessor defines take effect. So the patch is applied directly to the file:

```c
#elif defined(__cpp_consteval)
#  define FMT_USE_CONSTEVAL 0  // consteval is broken in Apple Clang (Xcode 26+)
```

⚠️ This patch lives in `ios/Pods/` and is overwritten by `pod install`. **If you run `pod install`, re-apply the patch.**

### `Upload Symbols Failed (hermes.framework)`

Warning only, not an error. The upload succeeds. Known React Native issue with Hermes dSYM. Doesn't affect app functionality, only crash report symbolication in Sentry/Apple Crashes.

---

## When you should pause before archiving

Per [`CONVENTIONS.md`](../CONVENTIONS.md) §8 (code review before high-cost deploys):

> Before any high-cost deploy cycle — TestFlight build, production promotion, prod deploy, or any irreversible change — dispatch parallel domain-specialist review agents to QA the diff. Apply their findings BEFORE the cycle starts.

Five minutes of agent review beats one wasted ~30-min TF cycle.

---

## Prerequisites checklist (new Mac setup)

1. ☐ Xcode installed with command line tools
2. ☐ Apple Developer account signed in: Xcode → Settings → Accounts
3. ☐ CocoaPods installed: `gem install cocoapods` (or `brew install cocoapods`)
4. ☐ Node + Yarn 3 (per `package.json` `packageManager` field)
5. ☐ PostgreSQL 17 client (for any DB work): `brew install postgresql@17`
6. ☐ `.p8` API key at `~/.appstoreconnect/private_keys/AuthKey_GGV7225WH5.p8` — see [`app-store-connect.md`](./app-store-connect.md)
7. ☐ Run `cd ios && pod install` after fresh clone
8. ☐ Re-apply the `fmt consteval` patch if `pod install` overwrote it

---

## Production release flow

For production builds (scheme `MurrorMobile`, env `.env.production`):

1. ☐ Pass the agent code review gate (see above)
2. ☐ Promotion PR (staging → production) merged via merge-commit (not squash — see [`CONVENTIONS.md`](../CONVENTIONS.md) §3)
3. ☐ Bump the build number in BOTH places (see [Version numbers](#version-numbers)): the 24 `CURRENT_PROJECT_VERSION` occurrences in `project.pbxproj` AND the `CFBundleVersion` literal in all four app Info.plists. The TL;DR bump block does both; just keep `-scheme MurrorMobile` for the archive/export.
4. ☐ Archive with `-scheme MurrorMobile`
5. ☐ Export + upload using the same command as staging but `MurrorMobile` scheme
6. ☐ Verify in App Store Connect TestFlight tab → External Testing → submit for App Review when ready

`yarn release:checklist` provides an interactive walkthrough.

---

## Cross-references

- API key + ASC config: [`app-store-connect.md`](./app-store-connect.md)
- Schemes deep dive + bundle IDs: [`../../MurrorMobile/HANDOFF.md`](../../MurrorMobile/HANDOFF.md)
- Don't auto-build TF (only when explicitly asked): [`../CONVENTIONS.md`](../CONVENTIONS.md) §9
