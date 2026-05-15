# Runbook: App Store Connect API key

**When to use:** uploading TestFlight builds via CLI (no Xcode GUI needed), or rotating the upload key.
**Prerequisites:** App Store Connect access at the App Manager level.

---

## Active key

| Property | Value |
|---|---|
| **Issuer ID** | `628f9cc5-6342-4c1d-8a74-3723334b1fc2` |
| **Team ID** | `YL72VTKBR7` |
| **Active Key ID** | `GGV7225WH5` |
| **Access level** | App Manager |
| **`.p8` file path** | `~/.appstoreconnect/private_keys/AuthKey_GGV7225WH5.p8` |

The `.p8` file is **per-Mac** and not committed to git. Each engineer who needs to upload TestFlight builds from CLI must have their own key.

---

## How to create a new key (rotation or new engineer onboarding)

1. Go to **`appstoreconnect.apple.com/access/integrations/api`**
2. Click the blue **+** button
3. Name: descriptive (e.g., `Mac Mini Sarah`, `MacBook Pro Astro`)
4. Access: **App Manager** (required for upload)
5. Click **Generate**
6. Download the `.p8` file — **save to `~/.appstoreconnect/private_keys/AuthKey_KEY_ID.p8`**
   - The directory may not exist; create it: `mkdir -p ~/.appstoreconnect/private_keys`
   - Filename **must** be `AuthKey_<KEY_ID>.p8` exactly — Apple's tools look for this naming convention
7. Update this runbook with the new Key ID and engineer ownership

⚠️ **The `.p8` can only be downloaded ONCE.** If lost, the key must be revoked and a new one created.

---

## Upload commands

### Option A: `xcodebuild -exportArchive` (recommended — does archive→export→upload in one)

```bash
xcodebuild -exportArchive \
  -archivePath /tmp/MurrorMobileStaging-212.xcarchive \
  -exportPath /tmp/MurrorMobileStaging-212-export \
  -exportOptionsPlist ios/ExportOptions.plist \
  -allowProvisioningUpdates \
  -authenticationKeyPath ~/.appstoreconnect/private_keys/AuthKey_GGV7225WH5.p8 \
  -authenticationKeyID GGV7225WH5 \
  -authenticationKeyIssuerID 628f9cc5-6342-4c1d-8a74-3723334b1fc2
```

Wait for `Uploaded MurrorMobileStaging` followed by `** EXPORT SUCCEEDED **`. Apple processing takes 5-15 min after upload before the build appears in TestFlight.

### Option B: `xcrun altool` (when you already have a built `.ipa`)

```bash
xcrun altool --upload-app \
  -f /tmp/MurrorMobileExport/MurrorMobile.ipa \
  --type ios \
  --apiKey GGV7225WH5 \
  --apiIssuer 628f9cc5-6342-4c1d-8a74-3723334b1fc2
```

---

## Historical keys (audit trail)

| Name | Key ID | Access | Status |
|---|---|---|---|
| Murror App Staging | `3D4Q642A45` | Developer | No `.p8` on current Mac |
| m1pro | `GBQ7B336GD` | Admin | No `.p8` on current Mac (old Mac) |
| MacBook Pro 2026 | `GGV7225WH5` | App Manager | **Active** |

---

## Cleanup

If `~/Downloads/AuthKey_*.p8` files exist (from past key rotations), they're either redundant copies or revoked keys — safe to delete.

---

## When the key rotates

After creating a new key:

1. Save new `.p8` to `~/.appstoreconnect/private_keys/AuthKey_<NEW_KEY_ID>.p8`
2. Update [`ios-build.md`](./ios-build.md) commands with the new Key ID
3. Update this runbook's "Active key" table
4. Revoke the old key in App Store Connect (only after confirming the new one works for an upload)
5. Notify any engineers who use the old key

---

## Cross-references

- TestFlight build process: [`ios-build.md`](./ios-build.md)
- Release checklist: `MurrorMobile/yarn release:checklist`
