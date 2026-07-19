# Staging Readiness Evidence

Date: 2026-07-19

This record captures evidence collected during the staging-to-production readiness
review. It does not authorize a production deployment.

## Verified staging reachability

- `https://staging.api.murror.app/api/health/live` returned HTTP 200.
- `https://staging.api.murror.app/api/health/ready` returned HTTP 200.
- `https://staging.app.murror.app/` returned HTTP 200.
- The web and API responses carry HSTS, `X-Content-Type-Options`,
  `X-Frame-Options`, and a referrer policy.

## Completed, review-only fixes

| Area | Pull request | Evidence |
| --- | --- | --- |
| API WebSocket and JWT authorization | murror-api #617 | Admin subscriptions fail closed, journal-generation subscriptions require ownership, connection diagnostics cannot expose another socket, and locally verified JWTs require the `authenticated` audience and do not outlive their expiry in cache. Focused Jest, ESLint, and TypeScript checks passed locally. |
| API pod hardening | murror-api #618 | The staging and alpha manifest disables service-account token mounting, requires non-root execution, drops capabilities, blocks privilege escalation, and applies the runtime-default seccomp profile. YAML parsing and diff checks passed locally. |
| Mobile local privacy | MurrorMobile #784 | Journal, diary, deep-chat, and conversation query data are excluded from the persisted React Query cache. Focused Jest, ESLint, and TypeScript checks passed locally. |
| Web local privacy | murror-platform #192 | Logout and cross-account cleanup now remove the legacy `murror-journal-draft` key that can contain unsent reflection text. Focused Vitest, lint, and type checks passed locally. |

## Open production gates

### P0: make shared-memory photos private

The shared-photo API currently stores images in a bucket named `public` and
returns `getPublicUrl()` values. A private-by-default product must use a private
bucket and scoped signed URLs. This requires a data and client migration plan,
not merely changing the bucket name in source.

Acceptance criteria:

1. New images are stored in a private bucket.
2. Every read checks connection membership before returning a short-lived URL.
3. Existing public objects are migrated or revoked with a rollback plan.
4. No API response persists a permanent public image URL.

### P0: establish a reproducible web staging deployment

The web-client build workflow can build a staging image, but the deployment
matrix only maps `dev` to alpha and `main` to production. Its manual selector
also offers alpha and production only. The Helm staging values exist, but there
is no canonical source branch, immutable image tag, and deployment workflow
linking them together.

The current web build guard identifies `feat/web-app-from-mobile` as the
canonical production web-app source. It is materially ahead of `main`, so `main`
must not be treated as the web-app release branch by inference.

Acceptance criteria:

1. Name the staging source branch and target namespace/cluster explicitly.
2. Build an immutable image tag from the exact source SHA.
3. Deploy that exact tag to staging through a reviewable workflow.
4. Record source SHA, image digest, Helm release revision, and health results.
5. Verify rollback to the previous immutable image tag.

### P0: reconcile production's out-of-band API pod specification

The API production workflow intentionally performs an image-only rollout,
because its live deployment specification is managed out of band. The new pod
security settings therefore protect staging and alpha only until production's
specification is reconciled through the infrastructure owner.

### P1: review retained browser drafts

The web journal composer deliberately keeps an unfinished draft in localStorage
to survive a browser restart. PR #192 closes the cross-account leak, but this
remains a device-local retention decision. Before production, define a user
facing retention policy and whether the app should show an explicit "saved on
this device" notice.

### P1: keep Galaxy disabled outside development

The mobile Galaxy API provider is currently backed by an in-memory fixture
client. The existing feature gate is dark in staging and production by default,
but a future flag change must not enable the surface until the real API path is
implemented and verified. Treat the flag as a release gate, not a preview switch.

### P1: complete independent review and staging validation

At the time of this record, API PR checks beyond lint/type formatting were still
running. All changes must receive independent review, merge only into their
approved staging branches, and then pass an authenticated staging smoke test
covering login, journal creation, deep chat, shared-photo authorization, WebSocket
subscription ownership, and logout/account switching.

## Current conclusion

Staging is reachable and several concrete security gaps now have reviewable
fixes. The system is not yet approved for production promotion because the
shared-photo privacy migration, reproducible web staging deployment path, and
production infrastructure reconciliation remain open P0 gates.
