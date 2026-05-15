---
name: Staging murror-api deployment stale (pre-#347)
description: Staging murror-api is deployed at image 0.40.0-staging (built ~2026-04-23) and is missing PR #347+ commits. Bug B verified-in-code but won't reproduce-fixed in staging until redeployed.
type: project
originSessionId: 8f1c5851-d71b-4095-b91e-a4809d2f710c
---
Discovered 2026-04-26 during PR #461 simulator regression: tapping "Remind the other" on a one-sided connection returned HTTP 500 with `"User must complete current task before poking partner"` (the aggregate-level error, NOT the use-case-level early-return).

**Root cause:** staging murror-api deployment is running image `ghcr.io/murror/murror-api:0.40.0-staging` which was built before PR #347 (`fix(poke): tolerate null userId2 on one-sided connections`) landed. Despite #347 being on the staging branch, the deployment image hasn't been refreshed.

**Why no auto-redeploy:** unclear — last successful staging Deploy CI run was 2026-04-23 (#357 merge). Subsequent commits to staging branch may have hit Code Quality CI failure or admin-merge bypass that skipped the deploy job. Also possible: the deployment manifest pins image to `0.40.0-staging` (a semver-style tag) rather than the per-commit `staging-<sha>` tag CI pushes.

**Launch impact:** NOT a launch blocker.
- Promotion PR #352 carries #347 (verified `git log origin/production..origin/staging --grep poke`).
- When #352 merges + prod deploys, real users get the proper specific error message.
- Only staging-environment users (test accounts) see the stale behavior.

**Post-launch action:**
1. Investigate why staging Deploy CI hasn't pulled latest commits — check if image-tag pinning is stuck on `0.40.0-staging`.
2. Likely fix: change deployment manifest to use `staging-latest` or `staging-<sha>` and force `imagePullPolicy: Always` (matches `reference_migration_job_imagepullpolicy.md` lesson).
3. Re-verify Bug B on staging after redeployment.

**How to apply:** if Bug B (or any post-#347 bug) is reported on staging in the future, FIRST check whether staging is running latest before assuming a code regression. Use `kubectl get deploy/murror-api -n nsp-staging-murror -o jsonpath='{.spec.template.spec.containers[0].image}'` and compare to `git log origin/staging` to spot stale deploys.
