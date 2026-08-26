# Production promotion dossier

**Date:** 2026-07-31 · **Prepared for:** Astro · **Scope:** iOS mobile + murror-api + viasr-api. Galaxy excluded per the handoff rails. No Android, no Apple Watch.

**Nothing in production has been mutated to produce this document.** Every production figure below came from read-only `SELECT`s against `Murror PRODUCTION` (`dcftszkbpamgeivhtuzl`, ap-southeast-1).

---

## 1. The ask

I am **not** asking for a go/no-go yet. One hole in the evidence has to be filled first, and only you can fill it.

| # | Needed from you | Why it blocks |
|---|---|---|
| 1 | **Sandbox purchase test on a physical iPhone** (build 399, already `VALID` in TestFlight) | Nothing has ever put a real Apple ID through a real Solo or Duo purchase. Every purchase claim below is code-level or API-level. |
| 2 | **Duo SKUs created in App Store Connect** | Production RevenueCat has Duo *packages* but no Duo *products* for `app.murror.mobile`. Duo cannot be sold in production regardless of our code. External clock (Apple review). |
| 3 | Approval + a window for **credential rotation** | Standing item from the handoff. |

Once (1) comes back clean, this document becomes a go/no-go.

---

## 2. Readiness at a glance

| Area | State | Confidence |
|---|---|---|
| murror-api schema migration | 15 pending, measured statement by statement | 🟢 High — verified against production |
| murror-api rollback | Free (old code runs against new schema) | 🟢 High |
| Prod-only work preservation | 3 substantive commits identified, must survive | 🟡 Needs a reconcile merge, not a fast-forward |
| Mobile build | 399 `VALID`, 4 device-found UI bugs fixed | 🟢 High |
| Mobile purchases | **Unverified on a real device** | 🔴 **The hole** |
| Automated regression coverage | **None for 12 months** | 🔴 See §6 |
| `main` branch | 1,581 commits behind; **not on the launch path** | 🟢 Understood |

---

## 3. Backend: what actually ships

`origin/staging` is **303 commits ahead** of `origin/production`; production is **7 ahead** of staging.

### 3.1 The 15 pending migrations

Staging has 148 migrations, the production branch 133. Statement-level review of all 15:

- **12 are purely additive** — `CREATE TABLE`, `CREATE INDEX`, `ADD COLUMN` (nullable, or `NOT NULL DEFAULT <const>` which is metadata-only on PG 11+; production runs **PG 15.6**, so no table rewrite).
- **5 of the 15 are Galaxy** (`add_galaxy_pilot`, `galaxy_default_expiry`, `galaxy_one_active_signal_idx`, `add_galaxy_exchange_messages`, `galaxy_resonance_opening_message`). Galaxy is excluded from scope, but these are additive table creates for a **flag-dark** feature. They cost an empty table each and change no behaviour. Carrying them is cheaper and safer than surgically excluding them.

### 3.2 The two that are *not* purely additive — both measured

**`20260719090000_private_shared_photo_storage`** does `ALTER COLUMN "public_url" DROP NOT NULL`.
Relaxing a constraint is backward compatible: old code keeps reading fine, and no `NULL` can appear until the *new* code writes one. Safe under the phase order in §5.

> ⚠️ Note: this migration references `shared_photos` **unqualified**, while its siblings qualify `murror_api.`. This database genuinely has same-named tables in two schemas (`public.connections` *and* `murror_api.connections`), so unqualified names are a live hazard here. Confirm `search_path` resolves it to `murror_api` before running. See `feedback_raw_sql_schema_qualification`.

**`20260728210000_add_connection_soft_delete` writes rows.** It backfills `deleted_at` into `murror_api.connections` from `public.connections`. This invalidates the earlier "zero UPDATE statements" characterisation, so I measured it directly against production:

| measurement | value |
|---|---|
| `murror_api.connections` total | **64** |
| `public.connections` total | 64 |
| legacy rows with `deleted_at` set | 12 |
| **rows this backfill would write** | **12** |
| `murror_api.connections.deleted_at` exists today? | **No** |

**This is a bug fix, not a risk.** `murror_api.connections` has *no* `deleted_at` and *no* `status` column, so it has no way to represent a deleted connection. Production is therefore treating **all 64 as active, including 12 that users deleted** between 2025-06 and 2026-06. Each of those 12 rows has been dormant since its deletion date (`updated_at` matches the legacy `deleted_at`), confirming they are genuine user deletions and not live data.

After promotion, 12 stale connections stop being served. That is the intended correction.

### 3.3 Prod-only work a naive promotion would delete

| commit(s) | what | verdict |
|---|---|---|
| `e9388f8`, `876ece3` | **Stripe billing portal** | 🚨 **Must survive.** Absent from staging entirely. Your ruling 2026-07-28: "payment on production is working right now, keep using what is already existing." |
| `ba51768` | Onboarding v2 their-side reflection pass-through (#564) | Must survive. Lives only on `origin/hotfix/their-side-route-prod-sgp1`. |
| `c7e1aff` + `33bc12d` | DNS workflow, added then removed | Net zero, ignore. |

**Implication: promotion must be a reconcile merge, never a fast-forward.**

---

## 4. Mobile

Build **399** is `VALID` in TestFlight. Eleven PRs merged this session; four builds cut (396→399).

Fixed this session, several of which were live in production:

- 🚨 **Cold-start paywall dead end** — users with no entitlement could be trapped with no way out. *Was live in production.*
- **PostHog env-scoped flags never applied** — `preloadFeatureFlags` fetched before `env` was attached, and the RN client persisted the result. The only mechanism making a shared staging/production PostHog project safe had been shipped and inert.
- StoreKit offerings timeout + Restore mutex (SUB-3/SUB-5); Restore dead-click window.
- Four device-found UI bugs: MTC card overlap, calendar wrong-month flash, diary lock treatment, testimonial margins.

### `main` is not on the launch path

`main` is 1,581 commits behind `staging-environment-setup`, and promotion PR #450 has been open and conflicting since 2026-04-17 (1,115 files).

**2.0.0 does not ship from `main`.** The build lane archives from `staging-environment-setup`, and the production scheme with `MARKETING_VERSION = 2.0.0` already lives there. #450 is debt to be decided on its own merits. **Do not let a 1,115-file conflicted merge become a launch blocker.**

---

## 5. Promotion sequence

Ordered so that each step is independently reversible.

1. **Back-port the Stripe billing portal into `staging`** so staging becomes a true superset. Verified safe: `STRIPE_SECRET_KEY` is `@IsOptional()`, and the endpoint fails closed with `503` when unconfigured. Dormant until a key is set.
2. **Back-merge `ba51768`** into `production` so the live-only commit is not lost.
3. **Confirm `search_path`** resolves the unqualified `shared_photos` reference to `murror_api` (§3.2).
4. **Take a `pg_dump`.** PITR add-on status is still unverified; a dump costs minutes and removes the question.
5. **Phase A — migrate while old code serves.** All DDL is additive or constraint-relaxing, so the running image keeps working. Users notice nothing.
6. **Phase B — roll the pods.** 2 replicas, RollingUpdate (maxSurge 25% → +1, maxUnavailable 25% → 0). Never fewer than 2 serving.
7. **Deploy *from* the production branch** so artifact and branch finally agree. Until this happens, the direct-to-prod hotfix habit that caused this divergence will recur.

**Rollback:** `kubectl rollout undo` reverts the app in seconds with **no database work**, because additive schema means old code still runs against the new schema. The only irreversible step is the 12-row backfill, which is a correction we want.

---

## 6. What this dossier cannot tell you

Stated plainly rather than papered over.

1. 🔴 **No real-money purchase has ever been tested.** Solo and Duo are verified at the API and code level only.
2. 🔴 **There is no automated regression evidence.** The mobile E2E suite last passed **2025-07-21**; 705 consecutive runs since have failed or been cancelled. It has been decorative for a year. It is now `workflow_dispatch`-only so it stops billing macOS and stops presenting a permanently-red check as if it meant something.
3. 🟡 **The freemium leak is still open.** "Free Plan ACTIVE" grants premium to ~92% of production users. Until it is fixed, **no monetization metric from production means anything**, and any paywall or gating work produces zero usable signal.
4. 🟡 **PITR add-on unverified** — mitigated by step 4 above.
5. 🟡 **Duo is not sellable in production** — missing App Store Connect products, item (2) in §1.

---

## 7. Open decisions for you

| Decision | My recommendation |
|---|---|
| Merge PR #450 (`staging` → `main`)? | **Not now.** Not a launch blocker. Decide after launch, on its own merits. |
| Fix the freemium leak before or after promotion? | **Before.** It is the single thing standing between us and trustworthy revenue data. |
| Build the Connection Reflection depth-gate now? | **No.** Gating while ~92% hold premium-by-bug produces no signal. Sequence it after the leak fix. |
| Carry the 5 Galaxy migrations? | **Yes.** Additive, flag-dark, cheaper than excluding them. |
| Port staging's build-relevance gate to `main`? | **Yes, if `main` is kept.** It has no gate at all, so every PR there will cost a 36-min macOS build the moment lint goes green. |

---

## 8. Evidence index

| Claim | Source |
|---|---|
| Migration counts, commit deltas, prod-only commits | `git ls-tree` / `rev-list` against `origin/staging` and `origin/production` |
| Connection backfill blast radius (12 of 64) | Read-only SQL, `Murror PRODUCTION` |
| No `deleted_at` / `status` column | `information_schema.columns`, production |
| PG version 15.6 | Supabase project metadata |
| Build 399 `VALID` | App Store Connect API |
| E2E last green 2025-07-21, 705 runs since | `gh run list --workflow=e2e.yaml`, 824 runs enumerated |
| `main` 1,581 commits behind | `git rev-list --count` |

Related memory: `project_production_migration_plan`, `project_prod_staging_reconciliation`, `incident_mobile_main_branch_ci_drift`, `incident_prod_freemium_leak_free_plan_active`, `reference_revenuecat_connectors`.
