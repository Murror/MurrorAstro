---
name: iOS TestFlight build process
description: Step-by-step iOS build process for MurrorMobile — fmt workaround, signing, archive, distribute
type: reference
originSessionId: 1da68e58-e6c5-44d5-8bc8-8bb394874dfb
---
## Quick Reference

```bash
# From ~/Projects/murror-transfer/Murror/MurrorMobile
# 1. Bump version
sed -i '' 's/CURRENT_PROJECT_VERSION = OLD;/CURRENT_PROJECT_VERSION = NEW;/g' ios/MurrorMobile.xcodeproj/project.pbxproj

# 2. Clean + archive
rm -rf ~/Library/Developer/Xcode/DerivedData/MurrorMobile-*
xcodebuild archive \
  -workspace ios/MurrorMobile.xcworkspace \
  -scheme MurrorMobileDevelopment \
  -configuration Release \
  -archivePath /tmp/MurrorMobileDev.xcarchive \
  -allowProvisioningUpdates \
  ENVFILE=.env.development

# 3. Copy to Xcode Organizer
mkdir -p ~/Library/Developer/Xcode/Archives/$(date +%Y-%m-%d)
cp -R /tmp/MurrorMobileDev.xcarchive ~/Library/Developer/Xcode/Archives/$(date +%Y-%m-%d)/MurrorMobileDevelopment_BUILD.xcarchive
open ~/Library/Developer/Xcode/Archives/$(date +%Y-%m-%d)/MurrorMobileDevelopment_BUILD.xcarchive

# 4. Astro does: Xcode → Window → Organizer → Select archive → Distribute App → TestFlight Internal Only
```

## Schemes

| Scheme | Environment | Bundle ID | Env File |
|--------|------------|-----------|----------|
| `MurrorMobileDevelopment` | Alpha 2 / Dev | `app.murror.mobile.dev` | `.env.development` |
| `MurrorMobile` | Production | `app.murror.mobile` | `.env.production` |
| `MurrorMobileStaging` | Staging | `app.murror.mobile.stg` | `.env.staging` |
| `MurrorMobileODE` | ODE | — | `.env.ode` |

## Version Numbers

- `MARKETING_VERSION` — the user-facing version (e.g., `2.0.0`). Set in `project.pbxproj`.
- `CURRENT_PROJECT_VERSION` — the build number (e.g., `155`). Must increment for each TestFlight upload. Apple rejects duplicate build numbers.

**As of 2026-04-11:** Latest uploaded dev build is **158** (version 2.0.1). Staging build **165** (version 2.0.1) uploaded to TestFlight. Build **166** pending (includes all staging QA fixes).

## Known Issues & Workarounds

### fmt consteval bug (Xcode 26+)

`fmt 11.0.2` pod triggers a `consteval` compiler error with Apple Clang in Xcode 26+.

**Fix:** Patched directly in `ios/Pods/fmt/include/fmt/base.h` line 127:
```c
#elif defined(__cpp_consteval)
#  define FMT_USE_CONSTEVAL 0  // consteval is broken in Apple Clang (Xcode 26+)
```

**Warning:** This patch is inside `Pods/` which gets overwritten by `pod install`. If you run `pod install`, you must re-apply this patch. Consider adding a `post_install` hook in the Podfile that patches the file automatically, or pinning fmt to a version that fixes this upstream.

The Podfile already has a `post_install` attempt with `GCC_PREPROCESSOR_DEFINITIONS` but it doesn't work because the `#ifdef` check in the header runs before preprocessor defines take effect.

### Upload Symbols Failed (hermes.framework)

Warning only — not an error. The upload succeeds. This is a known React Native issue with Hermes dSYM files. Does not affect app functionality, only crash report symbolication in Sentry/Apple.

### Fully Automated Upload (API Key)

TestFlight upload is fully automated using the App Store Connect API key. No Xcode GUI needed.

See `reference_appstore_connect.md` for key details. The export+upload command:
```bash
xcodebuild -exportArchive \
  -archivePath /tmp/MurrorMobileDev.xcarchive \
  -exportPath /tmp/MurrorMobileExport \
  -exportOptionsPlist ios/ExportOptions.plist \
  -allowProvisioningUpdates \
  -authenticationKeyPath ~/.appstoreconnect/private_keys/AuthKey_GGV7225WH5.p8 \
  -authenticationKeyID GGV7225WH5 \
  -authenticationKeyIssuerID 628f9cc5-6342-4c1d-8a74-3723334b1fc2
```

## Prerequisites (New Mac Setup)

1. **Xcode** installed with command line tools
2. **Apple Developer account** signed in: Xcode → Settings → Accounts
3. **CocoaPods** installed: `gem install cocoapods`
4. **PostgreSQL 17** client (for DB work): `brew install postgresql@17`
5. **Node/Yarn** for React Native JS bundling
6. Run `cd ios && pod install` after fresh clone
7. Apply the fmt consteval patch (see above)

## Build Time

Archive build takes ~5-10 minutes on Mac. The `ENVFILE=.env.development` flag tells `react-native-config` which env file to bake into the app.
