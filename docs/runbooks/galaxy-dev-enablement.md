# Galaxy — Dev / Alpha Enablement Runbook

How to light Galaxy on the **dev / Alpha backend** so the mobile app can swap off fixtures
(`GALAXY_USE_FIXTURES = false`). Dev only. Staging and production stay dark behind the
default-off `galaxy_enabled` Statsig gate; this runbook never touches them.

> **Gate reminder:** the server `GalaxyFeatureGuard` env-defaults ON only for `dev` / `alpha`
> tiers. Staging and prod require a deliberate Statsig flip. Applying migrations and deploying
> code to dev does not expose Galaxy anywhere else.

## Prerequisites

- All Galaxy API PRs merged to `staging` (#609, #610, #611, #612) — done.
- The dev DB is Supabase `ormdzpvhrzvietlsvmro`.
- Migrations use the **session-mode** URL on port 5432 (`MURROR_DATABASE_URL_EXTERNAL`),
  never the pgbouncer 6543 URL. See `runbooks/db-migrations.md`.

## Step 1 — Apply the Galaxy migrations to the dev database

Four Galaxy migration folders must apply (all additive, verified 0 drops / 0 alters of
existing tables):

1. `<ts>_add_galaxy_pilot` — 8 enums + 8 `galaxy_*` tables
2. `<ts>_add_galaxy_default_expiry` — `galaxy_profiles.default_expiry_days`
3. `<ts>_galaxy_one_active_signal_idx` — **hand-authored partial unique index**
   `galaxy_signals_one_active_per_profile (profile_id) WHERE status='ACTIVE'`
4. `<ts>_add_galaxy_exchange_messages` — `galaxy_exchange_messages` + unique
   `(exchange_id, round_index, sender_user_id)`

```bash
cd murror-api
# session-mode 5432 URL for the dev project (from the dev env / secret, NOT 6543)
MURROR_DATABASE_URL_EXTERNAL="postgresql://...@...:5432/postgres" \
  pnpm prisma:migrate:deploy   # prisma migrate deploy --schema prisma/schema.murror.prisma
```

**Verify** all four applied, and specifically that the hand-authored partial index landed
(Prisma cannot model it, so a future `migrate diff` may try to drop it — confirm it exists):

```sql
SELECT indexname FROM pg_indexes
WHERE tablename LIKE 'galaxy_%'
ORDER BY 1;
-- expect galaxy_signals_one_active_per_profile among them
```

> Preferred path: let migrations ride the normal `build-and-push` deploy (Step 2), which runs
> the migration Job before rolling the image (PR #589). Only run the manual `migrate:deploy`
> above if you need the schema in place before a code deploy.

## Step 2 — Deploy the Galaxy-carrying API image to the dev cluster

The running dev pod must carry the merged Galaxy code, or `/api/v1/galaxy/*` returns 404 even
after the tables exist. Dev/Alpha runs the `staging` branch image.

> **Confirm before deploying:** deploying `staging` to dev pulls **whatever is currently on
> staging**, including any concurrent session's in-flight work. Check `origin/staging` HEAD and
> the other active sessions first. Deploy only when staging's tip is what you intend to ship to
> dev. Always deploy **both** `nsp-dev-murror` and `nsp-staging-murror`? — NO: this is a
> dev-only enablement; deploy `nsp-dev-murror` only unless a staging roll is separately intended.

Use the established dev deploy path (`build-and-push.yml`, which now runs the migration Job
first). Watch the migration Job reach Complete, then the rollout.

## Step 3 — Seed the dev Galaxy field

```bash
cd murror-api
GALAXY_SEED=1 \
MURROR_DATABASE_URL="<dev 5432 session URL>" \
  pnpm seed:galaxy
```

The script (`prisma/seed.galaxy.ts`) is triple-guarded: it refuses to run without
`GALAXY_SEED=1`, refuses `production`/`staging` `ENVIRONMENT` tiers, and refuses a DB host that
looks like prod/staging. It is idempotent (deletes all `seedSource='astro_dummy'` Galaxy rows,
then reinserts), creates a `GalaxyProfile` for each of the 8 dummy users plus one for
`astrovinh@gmail.com`, and 8-12 `GalaxySignal`s across all four intentions with 3/7/14-day
expiries and a couple of lifecycle (WITHDRAWN / EXPIRED) rows.

To reset: rerun the same command (delete-then-insert).

## Step 4 — Verify end-to-end against dev

With a dev user JWT (`astrovinh@gmail.com`):

```bash
BASE=https://<dev-api-host>/api/v1/galaxy
AUTH="Authorization: Bearer <dev jwt>"

curl -s -H "$AUTH" $BASE/settings            # 200 (not 404 -> gate is on for dev)
curl -s -H "$AUTH" $BASE/field               # seeded cards + completionState
# publish -> field -> decision round-trip
curl -s -H "$AUTH" -X POST $BASE/signals -d '{...}'      # 201
curl -s -H "$AUTH" -X POST $BASE/signals/<id>/heart      # private ack
curl -s -H "$AUTH" -X POST $BASE/signals/<id>/pass       # suppresses; no refill
```

Expect: gate returns 200 for a dev token (404 would mean the gate resolved off or code not
deployed), the field returns seeded cards, and publish/heart/pass round-trip cleanly. Card
payloads must contain only the allowlisted fields (no userId, counts, or journal refs).

## Step 5 — Flip the mobile app to the real API

Set `GALAXY_USE_FIXTURES = false` in `galaxy-api-provider.ts`, rebuild the Alpha app, and
retest the same flow on device against dev.

## Rollback

Galaxy is gate-dark by construction. To disable without a redeploy, set the dev `galaxy_enabled`
Statsig gate off (or, if relying purely on the env default, the guard already returns 404 for
any tier that is not dev/alpha). The additive tables can remain; nothing else reads them.
