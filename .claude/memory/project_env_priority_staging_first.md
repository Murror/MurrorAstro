---
name: Environment priority — staging first, alpha inherits
description: Staging is the primary active dev environment (not alpha). Alpha catches up from staging after staging is verified.
type: project
originSessionId: 7a79f288-534c-450c-a002-dd263fa3bbff
---
Staging is the primary active development environment. Alpha is NOT the primary focus — it will inherit features/fixes after staging is verified.

**Why:** Staging (domain `staging.api.murror.app`, Supabase `sprkxmwrvgqgebajopwp`, namespace `nsp-staging-murror`) holds the latest features and the latest work. Alpha has lagged (e.g. stuck migrations for 5-6 days as of 2026-04-16). When changes are being rolled out, the path is: main → staging → verify → alpha → verify → prod. Don't invest in fixing alpha-specific breakage when the same change set is being validated on staging first.

**How to apply:**
- When Astro asks to QA or fix "the latest" — default to staging, not alpha.
- Only touch alpha after staging passes. Alpha fixes should be re-applied from staging findings, not re-derived.
- If I find alpha broken during exploration, note it but don't dig in unless asked — staging gets my time.
- Prod is still its own track (prod branch, older image, promote only when staging + alpha are both green).

**2026-04-18:** Staging CI/CD pipeline validated end-to-end for the first time — GitHub Actions run `24599395136` on murror-api `staging` completed build → migrate → deploy → rollout without manual intervention. Alpha + production envs pre-wired with same secrets. See `project_ci_cd_pipeline_hardening.md`.
