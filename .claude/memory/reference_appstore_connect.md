---
name: App Store Connect API key for automated uploads
description: API key for CLI-based TestFlight uploads — Issuer ID, Key ID, .p8 file path
type: reference
---

## App Store Connect API

**Issuer ID:** `628f9cc5-6342-4c1d-8a74-3723334b1fc2`
**Team ID:** `YL72VTKBR7`

### Active Keys (as of 2026-03-28)

| Name | Key ID | Access | Status |
|------|--------|--------|--------|
| Murror App Staging | `3D4Q642A45` | Developer | No .p8 on this Mac |
| m1pro | `GBQ7B336GD` | Admin | No .p8 on this Mac (old Mac) |
| MacBook Pro 2026 | `GGV7225WH5` | App Manager | `.p8` at `~/.appstoreconnect/private_keys/AuthKey_GGV7225WH5.p8` |

### How to create a new key

1. Go to: `appstoreconnect.apple.com/access/integrations/api`
2. Click the blue **+** button
3. Name: "Mac Mini" (or whatever)
4. Access: **App Manager**
5. Download the `.p8` file — **save to `~/.appstoreconnect/private_keys/`**
6. Update this memory file with the new Key ID and file path

### CLI upload command (once key is available)

```bash
xcrun altool --upload-app \
  -f /tmp/MurrorMobileExport/MurrorMobileDevelopment.ipa \
  --type ios \
  --apiKey KEY_ID \
  --apiIssuer 628f9cc5-6342-4c1d-8a74-3723334b1fc2

# Or with xcodebuild:
xcodebuild -exportArchive \
  -archivePath /tmp/MurrorMobileDev.xcarchive \
  -exportPath /tmp/MurrorMobileExport \
  -exportOptionsPlist ios/ExportOptions.plist \
  -allowProvisioningUpdates \
  -authenticationKeyPath ~/.appstoreconnect/private_keys/AuthKey_KEY_ID.p8 \
  -authenticationKeyID KEY_ID \
  -authenticationKeyIssuerID 628f9cc5-6342-4c1d-8a74-3723334b1fc2
```

### .p8 file location

The `.p8` file should be stored at: `~/.appstoreconnect/private_keys/AuthKey_KEY_ID.p8`

**Stale file found:** `~/Downloads/AuthKey_GGV7225WH5.p8` — from a revoked key, can be deleted.
