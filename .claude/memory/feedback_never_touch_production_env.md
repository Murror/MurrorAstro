---
name: NEVER touch production env or scheme
description: CRITICAL BLOCKING RULE — ALWAYS use MurrorMobileDevelopment scheme, NEVER MurrorMobile for simulator builds
type: feedback
---

## ABSOLUTE RULE — NO EXCEPTIONS

**ALWAYS build with `MurrorMobileDevelopment` scheme for simulator testing.**
**NEVER build with `MurrorMobile` (production) scheme — not even "temporarily".**

**Why:** Astro has repeated this multiple times. Using the production scheme:
1. Overwrites `.env` with production values
2. Uses production app icon (confusing)
3. Risk of accidentally touching production data
4. Wastes hours debugging env issues

**How to build for simulator:**
```bash
xcodebuild -workspace MurrorMobile.xcworkspace \
  -scheme MurrorMobileDevelopment \
  -sdk iphonesimulator \
  -configuration Debug \
  -destination 'platform=iOS Simulator,name=iPhone 17' \
  build
```

**If MurrorMobileDevelopment fails** (e.g., WatchKit error):
- Fix the build error — do NOT fall back to MurrorMobile scheme
- The Watch dependency can be removed from the Dev target in project.pbxproj
- NEVER use the "temporarily swap .env.production" workaround

**Env file mapping:**
- `MurrorMobileDevelopment` scheme → copies `.env.development` → `.env`
- `.env.development` should contain Alpha 2 values (already set up from `.env.alpha2`)
- The build system reads env via: scheme PreAction → `ReadDotEnv.rb` → `tmp.xcconfig`
