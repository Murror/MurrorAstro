# 2026-06-19 — Prod + Alpha promotion: backend catch-up, council, web redeem

## Context
The prod backend had been ~3 months / 28 migrations behind staging, so council and other recent
features were dark in prod. This session brought murror-api, viasr-api, and the web client up to
date on BOTH production and alpha, on the do-sfo2 (DOKS, sfo2) cluster. Prod Supabase
`dcftszkbpamgeivhtuzl` (Singapore); alpha Supabase us-west-2.

## What shipped

### murror-api (prod 0.35.2, alpha 0.125.0-alpha)
- **Prod-slim CI deploy** (PR #486, `8660aca`): production deploys via the least-privilege
  `murror-api-deployer` SA on do-sfo2 and runs ONLY the migration Job + `kubectl set image`
  (skips namespace-create, ghcr-secret create, ConfigMap/Secret sync, full-manifest apply) so CI
  can never clobber hand-tuned live prod config (Landmine-A). RBAC extended: batch/jobs
  (create/get/watch/delete), pods/log, events, services (read). Still NO secrets/configmaps.
  Agent-reviewed (atlas + sentinel): added events read, a loud `KUBE_CONFIG_DOKS`-present assert
  (never silent-fall-back to the dead VN cluster), relabeled `deploy-doks.yml` as rollback-only.
- **Prod migration**: all 28 pending migrations applied (council column on journals +
  deep_chat_conversations; care_tips; emotion_events view; etc.) plus a new reconcile migration
  `20260619230000_reconcile_user_and_ja_columns` (PR #487, `2d0178b`) for columns staging/alpha got
  via `prisma db push` but were never migrated: `User.{avatar,enable_notification,first_name,
  is_panic_mode,last_name,middle_name}` + `name_ja`/`title_ja` on 9 onboarding reference tables.
  Idempotent (ADD COLUMN IF NOT EXISTS); dry-run-verified against live prod.
- **Prod pgvector fix**: `add_memory_index` failed because prod's `vector` extension lived in the
  `extensions` schema (Supabase default), off the Prisma `murror_api` search_path. Fixed with
  `ALTER EXTENSION vector SET SCHEMA murror_api` (matches staging) + cleared the failed-migration
  record (Prisma's documented recovery).
- **Seed test-user guard** (PR #488, `805b451`): the migration-image seed hung in prod on the
  Supabase test-user step (no creds) and polluted prod with test accounts. Now skipped when
  NODE_ENV/APP_ENV=production. Reference-data seeds still run everywhere.
- **VN eradication** (PR #485, `d071ee4`): routed all production kubeconfig paths to
  `KUBE_CONFIG_DOKS`; flipped `vietnam` cluster/region defaults to `doks`; deleted dead prod-env
  secrets `KUBE_CONFIG` (VN) + `KUBE_CONFIG_PROD`. Deleted 16 stuck VN migration jobs earlier.
- **CI cost savings** (PR #489, `be63852`, staging): consolidated the two `name: Deploy` workflows
  into the dynamic `deploy-matrix.yml` (deleted static `deploy.yml`, removes ~6 idle matrix jobs per
  run); build-app/build-migration skip when the version tag already exists in GHCR (`force_rebuild`
  override); `paths-ignore` for docs. Rides to main/prod on next promotion.

### viasr-api (prod + alpha on prod-4e26a6a / staging-4e26a6a)
- Created a `production` branch at the staging tip; dispatched `ci.yaml -f environment=production`
  (all 3 deployments: murror-ai, beat, celery-worker) and `-f environment=alpha`. Brings council
  backend + the recent article-pipeline + chat-voice fixes (PRs up to #510) to prod and alpha.
  Prod env `KUBE_CONFIG` already do-sfo2; stateless (own Flyway, no shared-DB risk).

### web-client (murror-platform)
- Canonical "latest web" = `feat/council-redesign` (`ecacd7a6`): the council branches had been
  DELETED from the remote; recovered from local tracking refs (safeguarded as `_safe/*`). It is a
  strict superset (council via PR #95, flag wiring #96, fix #98, redesign) and is what prod already
  ran. Restored to the remote.
- **Prod web** `web.murror.app`: built web-client only with `VITE_COUNCIL_ENABLED=true` and rolled
  via `kubectl set image` (deliberately NOT `deploy-matrix`, which redeploys every service incl.
  prod auth-service from a web branch).
- **Alpha web** `alpha.test.murror.app` (new): created Deployment + Service + Ingress + SA in
  nsp-dev-murror (alpha was configured for the dead VN cluster, never existed on do-sfo2). DNS A
  `alpha.test.murror.app -> 159.89.222.109` (Cloudflare, DNS-only). Cluster CoreDNS couldn't resolve
  (DO upstream negative cache); unblocked with a `coredns-custom` hosts override
  (`alpha-web.override`) so cert-manager's HTTP-01 self-check passes. Cert `Ready=True`, 200.
- **Redeem on the paywall** (`b363e1ef`): cherry-picked the redeem-modal commit from
  `feat/web-paywall-redeem-modal` (34 commits behind council-redesign, so un-mergeable wholesale)
  onto council-redesign (clean; only locale JSON union). Adds `redeem-api.ts` + `redeem-code-modal.tsx`
  + paywall wiring; submits to `POST /api/v1/subscription/redeem` (live on prod; 75 codes seeded).
  Built prod-`b363e1ef` + alpha-`b363e1ef`, rolled both web envs.

## Verification
- murror-api prod: `/api/v1/me` 401 (User cols OK), `/api/v1/onboarding/interests` 200, health 200/200,
  council column present, emotion_events view readable. Alpha 0.125.0-alpha boots clean, `me` 401.
- viasr prod + alpha: all 3 deployments 1/1 on the council image.
- web prod `web.murror.app` 200, bundle has council + redeem strings. Alpha `alpha.test.murror.app`
  200, cert Ready, bundle has council + redeem.

## Gotchas / lessons
- GitHub Actions was billing-blocked org-wide mid-session (jobs fail in ~6s, empty steps; reason only
  in check-run annotations). Owner fixed in Billing. Workaround for prod: DB already migrated by a
  prior run + image already built, so the final image roll was done manually via `kubectl set image`.
- `kubectl apply` of the full web/app manifest fails when an env var flips value<->valueFrom vs the
  live deployment (strategic-merge keeps both). Alpha hit this; fixed by deleting the stale (divergent
  feature-branch) deployment so apply recreated fresh. Follow-up: consider `--server-side`.
- Web monorepo `deploy-matrix.yml` deploys ALL services (no scoping) — never use it for prod web-only
  rolls; use `build-web-client.yml` + `kubectl set image`.

## Remaining (user switches)
- Enable the prod `council_enabled` Statsig gate so council surfaces for prod users (web + backend
  ready; alpha already shows it).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
