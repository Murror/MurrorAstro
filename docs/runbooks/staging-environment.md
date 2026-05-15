# Runbook: Staging Environment

**When to use:** spinning up a TestFlight test session, debugging a staging-only issue, configuring a new test account.
**Audience:** mobile + backend engineers.

---

## What "staging" is

Staging is the pre-production environment used for TestFlight builds + internal QA. It mirrors production's paywall behavior (Apple Sandbox StoreKit) but uses a separate Supabase project + DB.

| Surface | Staging value |
|---|---|
| Mobile scheme | `MurrorMobileStaging` |
| Mobile bundle ID | `app.murror.mobile.stg` |
| Mobile env file | `MurrorMobile/.env.staging` |
| API base URL | `https://staging.api.murror.app` |
| Mobile simulator command | `npm run ios:staging` (iPhone 17) |
| RabbitMQ vhost | `murror-staging` (isolated from `murror-dev` and `murror-prod`) |
| Branch | `staging` (murror-api / viasr-api), `staging-environment-setup` (MurrorMobile) |

---

## DOKS resources

| Namespace | Resource | Notes |
|---|---|---|
| `nsp-staging-murror` | Deployment `murror-api` | 1 replica |
| `nsp-staging-murror` | Service `murror-api` | ClusterIP, port 3000 |
| `nsp-staging-murror` | Ingress `murror-api` | `staging.api.murror.app` |
| `nsp-staging-murror` | ConfigMap `murror-api-config-map` | `VIASR_API_URL` → `nsp-staging-murror-ai` internal DNS |
| `nsp-staging-murror` | Secret `murror-api-secret` | Supabase + service secrets (incl. `MURROR_DATABASE_URL` + `MURROR_DATABASE_URL_EXTERNAL`) |
| `nsp-staging-murror-ai` | Deployment `murror-ai` | FastAPI, 1 replica |
| `nsp-staging-murror-ai` | Deployment `murror-ai-worker` | Celery worker, 1 replica |
| `nsp-staging-murror-ai` | Deployment `murror-ai-beat` | Celery beat (scheduled tasks). **Required for callback pings, voice summary** — see Bug H in [`../INCIDENT_LOG.md`](../INCIDENT_LOG.md) |
| `nsp-staging-murror-ai` | Service `murror-ai` | ClusterIP, port 8000 |
| `nsp-staging-murror-ai` | ConfigMap `murror-ai-config-map` | `ENVIRONMENT=STAGING` |

---

## Supabase project

- **Project ref:** `sprkxmwrvgqgebajopwp`
- **Region:** us-west-2 (Oregon)
- **URL:** `https://sprkxmwrvgqgebajopwp.supabase.co`
- **Migrations:** all 246 applied
- **Schema:** 86 tables in `murror_api`, reference data seeded, wrapper functions created

⚠️ **Secrets** (DB password, anon key, service role key) live in:
1. GitHub repo `murror/murror-api` → Environment `staging` → secrets
2. K8s `nsp-staging-murror/murror-api-secret`
3. The engineer's local `.env.development` (for running mobile against staging API)

**Do NOT commit these to git.** They are NOT in this runbook.

---

## Auth providers (configured on Supabase)

| Provider | Notes |
|---|---|
| **Google** | iOS client `844186200639-dgcn2khav7ohav5c00ts86a1gpgagpsl` for bundle `app.murror.mobile.stg`. "Skip nonce checks" enabled. |
| **Apple** | Key `Q75B6BV3JA`, JWT secret generated. Team ID `YL72VTKBR7`. |

---

## Test accounts

| Email | Whitelisted | Purpose |
|---|---|---|
| `astrovinh@gmail.com` | Yes | Founder test (bypasses paywall) |
| `nguyen@murror.app` | Yes | Team |
| `giang@murror.app` | Yes | Team |
| `tqvdesign@gmail.com` | Yes | Team |
| `saolasao8@gmail.com` | Yes | Team |
| `vinhspiration@gmail.com` | **No** | Paywall E2E testing — does NOT bypass paywall |

---

## Simulator testing notes

### Sign In with Apple on iOS Simulator

Requires an Apple ID signed in under the Simulator's **Settings → "Sign in to your iPhone"**. Without it, `appleAuth.performRequest` throws `ASAuthorizationErrorUnknown (code 1000)`.

This is a limitation of Apple's AuthenticationServices framework on Simulator — **cannot be fixed in code**.

For Apple sign-in QA, either:
1. Sign into the Simulator's Apple ID once per simulator image, or
2. Test on a physical device (any Apple ID works, no simulator quirk).

### Artwork library (Research page)

Staging Supabase `artwork-library` bucket needs assets present. Mirrored from alpha via `viasr-api/scripts/mirror_artwork_library.py` on 2026-04-15 (118 files, 15 theme folders). **Re-run that script if spinning up a new staging-like environment.**

---

## Common debugging checks

### Vhost parity (most common cause of "reflection stuck at generating")

```bash
API_VHOST=$(kubectl -n nsp-staging-murror get secret murror-api-secret \
  -o jsonpath='{.data.RABBITMQ_URL}' | base64 -d | grep -oE '/[^/]+$' | tr -d '/')
AI_VHOST=$(kubectl -n nsp-staging-murror-ai exec deploy/murror-ai -- \
  sh -c 'echo $RABBITMQ_VIRTUAL_HOST' | tr -d '\r\n')
[ "$API_VHOST" = "$AI_VHOST" ] && echo "OK: both on $API_VHOST" \
  || echo "MISMATCH: api=$API_VHOST ai=$AI_VHOST"
```

Both should report `murror-staging`. If they don't match, see the recurring incident in [`../INCIDENT_LOG.md`](../INCIDENT_LOG.md#2026-04-0405--2026-04-15--reflection-stuck-at-generating-recurring).

### Image staleness

Staging deploys can drift if CI fails silently. Check what's actually running:

```bash
kubectl get deploy/murror-api -n nsp-staging-murror \
  -o jsonpath='{.spec.template.spec.containers[0].image}'

# Compare to the latest commit on staging:
cd /Users/astro/Projects/murror-transfer/Murror/murror-api
git log origin/staging --oneline -5
```

If the deployed image lags the latest staging commits, the deploy CI didn't roll out — see the staging stale deployment incident in [`../INCIDENT_LOG.md`](../INCIDENT_LOG.md#2026-04-26--staging-murror-api-deployment-stale-pre-347-image).

### Pod health

```bash
kubectl get pods -n nsp-staging-murror
kubectl get pods -n nsp-staging-murror-ai
kubectl describe pod -n nsp-staging-murror <pod-name>
kubectl logs -n nsp-staging-murror <pod-name> --tail=200
```

### Beat presence

```bash
kubectl get deploy -n nsp-staging-murror-ai murror-ai-beat
# If NotFound — Celery beat scheduler is missing; scheduled tasks won't fire
# (callback pings, daily voice summary). See Bug H in INCIDENT_LOG.
```

---

## Ingress configuration gotcha

Staging murror-api Ingress:

- `ingressClassName` MUST be `nginx` (NOT `traefik`)
- TLS secret name is `murror-api-tls-staging` (NOT `ambercare-app-tls`)

Both of these have caused staging downtime when misconfigured. See `reference_staging_ingress.md` (memory).

---

## Cross-references

- Architecture: [`../ARCHITECTURE.md`](../ARCHITECTURE.md)
- Past staging incidents: [`../INCIDENT_LOG.md`](../INCIDENT_LOG.md)
- Database migrations: [`db-migrations.md`](./db-migrations.md)
- CI deploy pipeline: [`ci-kubeconfig.md`](./ci-kubeconfig.md)
- Mobile staging configuration: [`../../MurrorMobile/HANDOFF.md`](../../MurrorMobile/HANDOFF.md)
