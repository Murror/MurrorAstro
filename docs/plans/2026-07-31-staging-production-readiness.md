# Staging production readiness: security, performance, reliability

Date: 2026-07-31 (into 2026-08-01 PDT)
Scope: murror-api, viasr-api, murror-backend, MurrorMobile, Supabase staging + production

## Context

Goal was to review staging and make it production grade for launch. A 12-agent audit
(6 lenses, each adversarially verified by an independent skeptic) ran against read-only
worktrees pinned to the exact staging SHAs, with live probing using freshly minted
harness-account tokens. It produced 46 verified findings: 1 critical, 3 high, 16 medium,
23 low, 2 refuted.

## The headline root cause

`viasr-api app/core/vector_table_security.py enable_rls_on_vector_table()` had been
failing on EVERY call since it shipped 2026-07-02:

    (psycopg2.ProgrammingError) invalid dsn: invalid connection option "pgbouncer"

It built a sync psycopg2 engine straight from the shared Supabase URL, which carries
Prisma's `?pgbouncer=true`. psycopg2 rejects that as an unknown DSN option, and the
fail-open handler swallowed it at WARNING. So a security control looked present and did
nothing for a month, leaving every per-user vector table readable through the public
anon key that ships in the mobile binary.

Diagnostic that found it: order the tables by `oid`. All 17 older tables were hardened
and all 11 newest were not, which proves a live regression rather than a stale backfill
gap. The intuition "old stuff was missed" was exactly backwards.

Fix (PR viasr#597): sanitize with the existing `_sanitize_pg_url` from `session_factory`
rather than re-deriving the rule, read `pg_class.relrowsecurity` back to assert the
EFFECT, and raise the swallowed-failure log from WARNING to ERROR.

## What shipped (8 PRs merged)

| PR | What |
|---|---|
| murror-api #691 | KOL email removed from a `@Public()` endpoint, swagger gate inverted to fail closed |
| murror-api #692 | connections N+1 batched, friends list paginated in the DB, FK index migration |
| murror-api #694 | 5 `@Throttle` tiers registered so their limits actually apply |
| murror-api #695 | replicas floor of 2, PodDisruptionBudget, NetworkPolicy files |
| murror-api #697 | ES256 JWKS verification as a GoTrue outage fallback |
| viasr-api #597 | the vector-table RLS root cause above |
| viasr-api #598 | crisis guard on every chat entrypoint, worker-log privacy, retry scoping |
| MurrorMobile #985 | secure-storage seam, trusted-host deeplinks, journal wording removed from iOS prompts |

Still open: murror-backend #898 (anon-surface migration), blocked on a pre-existing
`format` failure that hits every PR in that repo including the parallel session's #897.

## Database hardening (applied and verified, staging AND production)

|  | before | after |
|---|---|---|
| prod anon-executable SECURITY DEFINER fns | 8 | 0 |
| prod anon user-id enumeration via storage | 275 users | 0 |
| staging ERROR-level Supabase security lints | 11 | 0 |
| staging vector tables leaking article content | 11 of 28 | 0 |

Production was remediated with Astro's explicit authorization, with a positive
read-after test on a real production avatar (200, 77,519 bytes, byte-identical before
and after) rather than inferring safety from staging.

## The mistake worth recording

The first revoke was a blanket "revoke EXECUTE from every SECURITY DEFINER function in
public". That stripped `authenticated` of `public.user_has_role(text[])`, which 15 RLS
policies call. RLS policy expressions evaluate with the QUERYING role's privileges, so
every one of those policies failed with SQLSTATE 42501 and reads of `articles`,
`user_roles` and `business_plans` broke for every logged-in user for about 4 minutes.

It was invisible on staging only because those tables are empty there. Rule now recorded
in memory: grep `pg_policies` for a function name before revoking EXECUTE on it, and
test the ROLE (`SET LOCAL ROLE authenticated` inside a rolled-back block), not just the
absence of an error. That test is what proved production safe before the same change ran
there.

## Verification

- End-to-end journey on staging: sign up 200 with session issued, log in OK, authed
  `/api/v1/family-plan` 200 through the new AuthGuard, unauth 401, `/api/docs` 404.
- Post-deploy: replicas 2/2, 0 restarts, PDB allowed-disruptions 1 (was 0, which was
  blocking node drains), 30/30 health checks, avg 0.35s.
- Perf, same tokens and method, 8 requests each:
  `/api/v1/connections` 0.453s -> 0.367s (-19%). `/api/v1/diaries` and
  `/api/v1/subscription/status` flat.
- Migration contract: `included=11 excluded=5`, exit 0.
- Post-conditions proven load-bearing by positive control: granting anon EXECUTE and
  revoking `user_has_role` each made the corresponding assertion fire, then rolled back.

## Gotchas for the next session

1. **The FK indexes are NOT live.** #692 merged and deployed its code half, but the
   deploy job `build-migration-image` was SKIPPED, so the migration never ran and none
   of the five indexes exist. That is why two of the three perf numbers are flat. Work
   out why the job is path-gated off for a PR that adds `prisma/migrations/**`.
2. **Staging deploys always show red.** The `Deployment Summary` job fails because
   `smoke-test` and `release` conclude `skipped`. The deploy itself succeeds. Either
   path-gate those jobs or make them required.
3. **Staging GoTrue's Resend key is invalid (535).** Signup is fine (confirmations are
   off, matching prod), but password-reset and magic-link will fail. Duo invite and
   parental-consent emails use the application's own key and are unaffected.
4. `murror-backend` `format` fails on every PR in that repo. Blocks #898.
5. NetworkPolicies are merged as FILES ONLY, deliberately not applied. DNS egress to
   kube-dns is the classic omission; roll them out in the documented order while
   watching readiness.

## Cross-session coordination

A parallel session ("Murror production") was working the same repos. Ownership was split
by repo and object, not topic: they took murror-api application code, the prod K8s
ingress/ConfigMap, SEC-3 (`/api/metrics`), and `public.get_user_by_email`; this session
took the remaining Supabase schema objects, viasr, and the audit. Overlap was measured,
not assumed: 24 files vs 13, exactly one shared file (`k8s/manifests.yml`), and
`git merge-tree` proved both branches merge with exit 0 and zero conflict markers. After
all merges their four PRs remained MERGEABLE.

They fixed staging signup: GoTrue was sending confirmation mail through Resend from an
unverified `system.murror.app`, Resend 550'd, and GoTrue rolled the whole signup back.
The fix was to disable email confirmation on staging, which matches production (prod's
last 30 days: 39 signups, 39 confirmed, `confirmation_email_attempted` = 0).
