---
name: MurrorMobile branch convention — staging-environment-setup is the integration branch
description: Mobile repo does NOT use `staging`; it uses `staging-environment-setup` as the active dev branch (main is stale)
type: reference
originSessionId: 177ad938-2f97-48d7-81b3-a6b45eb8618d
---
MurrorMobile (React Native repo) uses a different branch layout than the backend repos:

| Repo | Active integration branch | Prod/release branch |
|---|---|---|
| murror-api | `staging` | `production` |
| viasr-api | `staging` | `main` (no `production` branch) |
| **MurrorMobile** | **`staging-environment-setup`** | **`main`** (stale, 1 commit ahead of nothing) |

**Why this matters:** The `feedback_always_target_staging.md` rule is BACKEND-ONLY. It does not apply to MurrorMobile. There is no `staging` branch on the mobile repo — trying to retarget a mobile PR to `staging` will fail with "branch not found" from GitHub.

**How to apply:**
- Mobile feature PRs: target `staging-environment-setup` (where PR #460, #459, #458, #457, #456, etc. already landed).
- Never open a mobile PR against `main` unless explicitly for a hotfix / release cut.
- When I'm asked to "merge mobile PR to staging," translate that to `staging-environment-setup`.
- Mobile TestFlight builds are cut from `staging-environment-setup` for staging schemes, or from a release tag for App Store submission.

**Detected 2026-04-22** during PR #461 retarget attempt — tried to target nonexistent `staging` branch. Noted to prevent repeat.
