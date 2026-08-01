# HANDOFF 2026-08-01 — Google sign-in broken on build 404, and #689 promotion

Live state at handoff. Read this first; it is the open work, not history.
Completed work is in `2026-08-01-production-readiness-duo-sentry-infra.md`.

## 🚨 BLOCKER 1: cannot sign up or sign in with Google on build 404

Astro tested TestFlight build 404 (Murror Beta, `app.murror.mobile.stg`) and Google
auth fails on both sign-up and sign-in. This blocks the sandbox purchase, which is
the last gate on the Duo matrix.

### Already ruled out (do not re-check)

- **The shipped bundle is intact.** Verified inside
  `Murror404.xcarchive/.../MurrorMobileStaging.app/Info.plist`:
  - URL scheme `com.googleusercontent.apps.844186200639-dgcn2khav7ohav5c00ts86a1gpgagpsl` present
  - `murror-stg` scheme present
  - `plutil -lint` OK
  - `GoogleService-Info.plist` + `GoogleSignIn.bundle` in the bundle
  So the build script's plist rewrite did NOT corrupt anything.
- **Supabase staging Google provider is enabled and healthy.**
  `GET /auth/v1/authorize?provider=google` returns **302** to
  `accounts.google.com` with client_id `844186200639-ugl70qibessatkqf7c5q2u3s0lq7tl1e`.
- **No code in builds 402→404 touches auth.** The diffs were locale strings, the
  subscription-management screen, the account-management avatar, an added optional
  type field, `avatar-presets.ts`, and build-number/plist bumps.

### Primary hypothesis (unverified)

Two Google client IDs are in play, which is normal:

| Where | Client ID |
|---|---|
| Supabase provider (web) | `844186200639-ugl70qibessatkqf7c5q2u3s0lq7tl1e` |
| iOS app (native) | `844186200639-dgcn2khav7ohav5c00ts86a1gpgagpsl` |

Native Google Sign-In mints an `idToken` for the **iOS** client. Supabase accepts it
only if that iOS client ID is in the Google provider's **Authorized Client IDs**.
If that field was cleared, native sign-in breaks while web OAuth keeps working, which
matches the 302 above exactly.

**Check:** Supabase → Murror-STAGING → Authentication → Providers → Google →
Authorized Client IDs should contain
`844186200639-dgcn2khav7ohav5c00ts86a1gpgagpsl.apps.googleusercontent.com`.

Weak circumstantial signal: Astro had `sprkxmwrvgqgebajopwp/auth/providers` open in
Chrome at session start.

### Fastest disambiguation, do this FIRST

**Try signing in on build 402.** It uses the same staging Supabase. If 402 also
fails, this is a server-side config change and 404 is innocent, which redirects the
whole investigation. If 402 works, the cause is in the build after all.

### Then

Capture the real device error rather than inferring: Xcode console attached to the
device, or **Sentry, which went live in production today** (mobile has had a DSN all
along). The GoogleSignIn/Supabase error code will name the cause outright.

### Other things worth knowing

- Earlier today I re-seeded `auth.users.encrypted_password` for the four
  `harness-*@dummy.murror.dev` accounts via direct SQL (bcrypt `$2y`→`$2a`). That
  affects PASSWORD auth only and cannot break Google, but it is a change to
  `auth.users` made today, so do not be surprised to see it.
- Astro's Manage Account screen showed "Signed in with Google" on the harness
  accounts, so native Google auth demonstrably worked earlier in the session.

## 🚨 BLOCKER 2: #689 promotion is approved but CI is RED

Astro said "yes promote 689 work". I deliberately did **not** merge. Reasons:

```
Validation        = FAILURE
PR CI Summary     = FAILURE
everything else   = SKIPPED   (skipped because Validation failed first)
base = production   head = reconcile/staging-to-production-2026-07-31   100 commits
```

This PR has **never had a green run**. Merging is a 100-commit production deploy on a
red signal. Task #33 records that PRs targeting `production` cannot run CI properly,
so the failure may be structural rather than a real defect, but **that difference must
be established before promoting, not after.**

**First step:** open the failing `Validation` job log and determine whether it fails
because of the `production`-branch CI gap or for a real reason.

Promotion gates the production seat map. Do NOT set the seat map before #689
promotes: it would read as configured while governing nothing, then start governing
money on a value nobody re-verified. See task #31.

## Still open, lower priority

- **Sandbox purchase on build 404** — the last Duo blocker, gated on BLOCKER 1.
  Staging products `app.murror.premium.stg.duo.{monthly,yearly}` are `READY_TO_SUBMIT`
  = sandbox-purchasable. Needs a real iPhone; the simulator cannot do StoreKit.
- **Production 2.0.0 archive** must be cut AFTER MurrorMobile #992 (merged), so the
  build points at `api.murror.app`.
- **murror-api #704** (duplicate TLS Certificate) is open and unmerged; after merging,
  delete the stale object:
  `kubectl --context do-sfo2-murror-cluster -n nsp-staging-murror delete certificate murror-api-tls`
- Infra consolidation is a **separate session** (tasks #35-38). Do not do it here.

## Do not repeat these

- Production Duo ASC products and RevenueCat wiring **exist and are complete**. Do not
  re-create them. See the correction block in `reference_duo_launch_state.md`.
- `insights.murror.app` and `murror.api.ambercare.app` are **load-bearing**. Never
  delete either. See `reference_production_hostnames.md`.
- `NODE_ENV` is `production` on every tier. Use `ENVIRONMENT`. Read the running pod,
  not the ConfigMap. See `feedback_node_env_is_production_everywhere.md`.
