# 2026-07-19: Staging to production readiness design

## Decision

Astro approved the controlled production-readiness path on July 19, 2026.
Production remains read-only until every blocking gate below has evidence, the
release candidate is tested on staging, and Astro explicitly approves promotion.

This is an incremental hardening program. It extends the existing mobile, API,
AI, and web delivery paths instead of replacing them.

## Goal

Establish a reproducible, secure staging release candidate that can be promoted
to production without changing the intended behavior, losing privacy controls,
or leaving the team unable to identify and roll back the running artifact.

## Release lifecycle

### Before a release candidate

1. Create fresh, isolated worktrees from the current integration branches.
2. Record the exact source commit, immutable image digest, deployment namespace,
   hostname, and mobile build number for each surface.
3. Resolve all blockers, add focused regression tests, and open reviewable PRs.
4. Keep production code, data, secrets, flags, and deployment workflows untouched.

### During staging validation

1. Merge reviewed fixes through the normal staging PR paths only.
2. Let CI run migrations and deploys. No direct database changes or manual
   production changes are allowed.
3. Validate authenticated and unauthenticated flows, WebSocket authorization,
   sensitive-data persistence, upload limits, AI chat/reflection completion,
   payment entitlement boundaries, and crisis safety.
4. Archive one staging TestFlight build from the canonical mobile integration
   branch after the code and API release candidate are stable.

### After validation

1. Reconcile staging source, image digests, Helm values, hosts, and health checks
   into a signed go or no-go report.
2. Run and record a rollback rehearsal for API, web, and mobile release paths.
3. Ask Astro for explicit promotion approval. A passed staging gate is not a
   production deployment authorization.
4. After any eventual promotion, monitor the defined health, auth, WebSocket,
   and error-rate signals and retain the release record.

## Non-negotiable blockers

| ID | Surface | Finding | Required resolution and proof |
| --- | --- | --- | --- |
| B1 | API WebSockets | A missing `ADMIN_WEBSOCKET_KEY` can make a missing client key compare equal, allowing anonymous `subscribe_admin` access to connection metadata. | Fail closed when the server key is absent, validate the presented key with timing-safe comparison, cover absent and malformed keys in tests, and verify denied live staging access without exposing data. |
| B2 | Mobile privacy | The persistent TanStack Query cache stores journal and AI chat queries in AsyncStorage for seven days. | Exclude every journal and deep-chat query family from dehydration, cover the cache policy with tests, and verify a device no longer contains the serialized sensitive payload. |
| B3 | Release provenance | Current mobile, API, and web local checkouts are stale or dirty, and some live deployments use mutable tags or conflicting staging identities. | Use fresh worktrees from integration heads and record commit plus immutable image digest, host, namespace, and mobile build number for all candidate artifacts. |
| B4 | Web staging identity | Documented staging routes and live web deployment do not identify the same canonical artifact. | Choose one staging host, namespace, values file, image source, and deploy path. Retire or explicitly label every alternate route. |
| B5 | Production AI ownership | The expected production AI namespace has no identified workload while the public endpoint responds. | Document the real compute target, owner, logs, monitoring, deploy source, and rollback procedure before relying on AI chat in a production promotion. |

## High-priority gates

| ID | Surface | Gate |
| --- | --- | --- |
| H1 | API auth | Validate WebSocket JWTs and resource ownership before journal-generation subscriptions. Enforce the expected JWT audience and ensure cache TTL cannot extend beyond token expiry. |
| H2 | Runtime isolation | Add a default-deny NetworkPolicy with explicit required egress and ingress. Run workloads as non-root, with privilege escalation disabled, dropped capabilities, seccomp, and a read-only root filesystem where compatible. |
| H3 | API load | Reduce global request-size exposure and use endpoint-specific upload limits, while preserving supported media uploads. |
| H4 | Web CI | Make staging a first-class deployment target gated on lint, type checks, tests, build, and post-deploy authenticated smoke checks. |
| H5 | Web parity | Unify build-time environment flags, pin build tooling, reconcile Helm with live image and ingress, and apply consistent authenticated 4xx retry behavior. |
| H6 | Release observability | Verify API, Redis, RabbitMQ vhost parity, AI worker and beat health, Sentry symbol upload, and WebSocket authorization failures before and after release. |

## Delivery order

1. API blocker B1 and focused tests.
2. Mobile blocker B2 and focused tests.
3. API authorization and workload hardening, H1 through H3.
4. Web deployment provenance and CI gates, B3 through B5 and H4 through H5.
5. Cross-vertical staging candidate, TestFlight validation, rollback rehearsal,
   and the go or no-go report.

Each code change uses its repository's normal branch and PR target:

| Repository | Branch base | PR target |
| --- | --- | --- |
| MurrorMobile | `origin/staging-environment-setup` | `staging-environment-setup` |
| murror-api | `origin/staging` | `staging` |
| murror-platform | confirmed canonical web integration branch | confirmed canonical web integration branch |

## Acceptance criteria

- No anonymous or invalid client can access privileged or another user's
  WebSocket data.
- Sensitive journal and AI chat payloads never enter persistent mobile cache.
- Each staging deployment can be traced from source commit to immutable image
  digest, namespace, host, and observed health endpoint.
- CI gates run before deployment, and authenticated smoke checks run after it.
- AI chat, reflection, journaling, uploads, notifications, billing, crisis
  response, and account deletion have targeted staging evidence.
- A rollback procedure has been rehearsed without touching production.
- Astro reviews a concise evidence-based go or no-go report before promotion.

## Explicit non-goals

- No production deployment, migration, secret change, feature flag change, or
  data cleanup occurs under this plan without a separate explicit approval.
- No out-of-band migrations or manual database patches are permitted.
- No TestFlight archive starts until mobile source is canonical, the security
  blockers are fixed, and the pre-archive code review is complete.

## Current restart point

Start with the two blockers using fresh worktrees. Do not use the existing
dirty or stale primary checkout as a release source.

