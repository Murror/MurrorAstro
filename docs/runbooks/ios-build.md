# Runbook: iOS TestFlight Build

**When to use:** archiving a new build of the iOS app for TestFlight (staging or production).
**Prerequisites:** Apple Developer access, Xcode + command line tools, `.p8` API key — see [`app-store-connect.md`](./app-store-connect.md).
**Time:** ~25-35 minutes wall-clock (archive ~15 min + export+upload ~5 min + ASC processing 5-15 min).

---

## TL;DR

```bash
cd /Users/astro/Projects/murror-transfer/Murror/MurrorMobile

# 1. Bump CURRENT_PROJECT_VERSION in project.pbxproj (4 occurrences for the target scheme)
sed -i.bak 's/CURRENT_PROJECT_VERSION = 211;/CURRENT_PROJECT_VERSION = 212;/g' \
  ios/MurrorMobile.xcodeproj/project.pbxproj
rm ios/MurrorMobile.xcodeproj/project.pbxproj.bak

# 2. Commit + push the bump on a chore branch (per CONVENTIONS.md — no direct push to main)
git checkout -b chore/bump-build-212
git add ios/MurrorMobile.xcodeproj/project.pbxproj
git commit -m "chore(ios): bump staging build 211 to 212"

# 3. Archive
xcodebuild archive \
  -workspace ios/MurrorMobile.xcworkspace \
  -scheme MurrorMobileStaging \
  -configuration Release \
  -archivePath /tmp/MurrorMobileStaging-212.xcarchive \
  -allowProvisioningUpdates \
  -authenticationKeyPath ~/.appstoreconnect/private_keys/AuthKey_GGV7225WH5.p8 \
  -authenticationKeyID GGV7225WH5 \
  -authenticationKeyIssuerID 628f9cc5-6342-4c1d-8a74-3723334b1fc2

# 4. Export + upload to TestFlight
xcodebuild -exportArchive \
  -archivePath /tmp/MurrorMobileStaging-212.xcarchive \
  -exportPath /tmp/MurrorMobileStaging-212-export \
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

- **`MARKETING_VERSION`** — user-facing version (e.g., `2.0.0`). Bump only on major/minor releases.
- **`CURRENT_PROJECT_VERSION`** — build number (e.g., `212`). **Must increment for every TestFlight upload.** Apple rejects duplicate build numbers per `MARKETING_VERSION`.

To bump: edit `ios/MurrorMobile.xcodeproj/project.pbxproj`. There are 4 occurrences of `CURRENT_PROJECT_VERSION = N;` for the staging build (one each for MurrorMobileStaging target + OneSignal extension target, in both Debug and Release configurations). Use `sed -i.bak` to bump all four at once.

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
3. ☐ Bump `CURRENT_PROJECT_VERSION` for the **production** target's 4 occurrences in `project.pbxproj`
4. ☐ Archive with `-scheme MurrorMobile`
5. ☐ Export + upload using the same command as staging but `MurrorMobile` scheme
6. ☐ Verify in App Store Connect TestFlight tab → External Testing → submit for App Review when ready

`yarn release:checklist` provides an interactive walkthrough.

---

## Cross-references

- API key + ASC config: [`app-store-connect.md`](./app-store-connect.md)
- Schemes deep dive + bundle IDs: [`../../MurrorMobile/HANDOFF.md`](../../MurrorMobile/HANDOFF.md)
- Don't auto-build TF (only when explicitly asked): [`../CONVENTIONS.md`](../CONVENTIONS.md) §9
