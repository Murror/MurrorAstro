---
name: Staging environment
description: Staging K8s namespaces nsp-staging-murror + nsp-staging-murror-ai, Supabase sprkxmwrvgqgebajopwp, domain staging.api.murror.app — fully operational 2026-04-11
type: reference
originSessionId: 1da68e58-e6c5-44d5-8bc8-8bb394874dfb
---
## Staging Environment

- **K8s namespace (API):** `nsp-staging-murror` — murror-api running (1 replica)
- **K8s namespace (AI):** `nsp-staging-murror-ai` — viasr-api + Celery worker running
- **Domain:** `staging.api.murror.app`
- **RabbitMQ vhost:** `murror-staging` (isolated from dev)

## Supabase Project

- **Project ref:** `sprkxmwrvgqgebajopwp`
- **Region:** us-west-2 (Oregon)
- **URL:** `https://sprkxmwrvgqgebajopwp.supabase.co`
- **DB password:** *(redacted — see GitHub env secret `SUPABASE_DB_PASSWORD` on `murror/murror-api` env `staging`, or K8s secret `nsp-staging-murror/murror-api-secret`)*
- **Anon key:** *(redacted — public-but-still-shouldn't-commit; see `MurrorMobile/.env.staging` or GitHub env secret)*
- **Service role:** *(redacted — high-sensitivity; ONLY in K8s secret `nsp-staging-murror/murror-api-secret` and GitHub env secret on `murror/murror-api` env `staging`)*
- **Migrations:** All 246 applied
- **Schema:** 86 tables in murror_api, reference data seeded, wrapper functions created

## Auth Providers (configured on Supabase)

- **Google:** iOS client `844186200639-dgcn2khav7ohav5c00ts86a1gpgagpsl` for bundle `app.murror.mobile.stg`. "Skip nonce checks" enabled.
- **Apple:** Key Q75B6BV3JA, JWT secret generated. Team ID YL72VTKBR7.

## K8s Resources

| Resource | Namespace | Name | Notes |
|----------|-----------|------|-------|
| Deployment | nsp-staging-murror | murror-api | 1 replica, Twilio-removed image |
| Service | nsp-staging-murror | murror-api | ClusterIP, port 3000 |
| Ingress | nsp-staging-murror | murror-api | staging.api.murror.app |
| ConfigMap | nsp-staging-murror | murror-api-config-map | VIASR_API_URL → nsp-staging-murror-ai |
| Secret | nsp-staging-murror | murror-api-secret | All Supabase + service secrets |
| Deployment | nsp-staging-murror-ai | murror-ai | FastAPI, 1 replica |
| Deployment | nsp-staging-murror-ai | murror-ai-worker | Celery worker, 1 replica |
| Service | nsp-staging-murror-ai | murror-ai | ClusterIP, port 8000 |
| ConfigMap | nsp-staging-murror-ai | murror-ai-config-map | ENVIRONMENT=STAGING |

## Test Accounts

| Email | Whitelisted | Purpose |
|-------|-------------|---------|
| astrovinh@gmail.com | Yes | Founder test (bypasses paywall) |
| nguyen@murror.app | Yes | Team |
| giang@murror.app | Yes | Team |
| tqvdesign@gmail.com | Yes | Team |
| saolasao8@gmail.com | Yes | Team |
| vinhspiration@gmail.com | No | Paywall E2E testing |

## Mobile Configuration

- **Scheme:** MurrorMobileStaging
- **Bundle ID:** app.murror.mobile.stg
- **Simulator command:** `npm run ios:staging` (iPhone 17)
- **Version:** 2.0.1 (build 165)
- **.env.staging:** Fully configured with correct Supabase, API, RevenueCat, Google OAuth

### Simulator testing requirements

- **Sign In with Apple on iOS Simulator:** requires an Apple ID to be signed in under the Simulator's Settings → "Sign in to your iPhone". Without it, `appleAuth.performRequest` throws `ASAuthorizationErrorUnknown (code 1000)`. Cannot be fixed in code — this is a limitation of Apple's AuthenticationServices framework on Simulator. For Apple sign-in QA, either:
  1. Sign into the Simulator's Apple ID once per simulator image, or
  2. Test on a physical device (any Apple-ID works, no simulator quirk).
- **Artwork library (Research page):** staging Supabase `artwork-library` bucket was empty through 2026-04-14; mirrored from alpha via `viasr-api/scripts/mirror_artwork_library.py` on 2026-04-15 (118 files, 15 theme folders). Re-run that script if spinning up a new staging-like env.
