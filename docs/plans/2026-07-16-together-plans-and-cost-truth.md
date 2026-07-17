# 2026-07-16 — Together plans (Duo/Circle) + making AI cost a real number

## Context

Two threads, one root cause. Astro asked for couples/family subscription plans and,
separately, "what should the product cost?" Every pricing answer to date rested on an
ESTIMATE of AI cost per user ($5/mo for a capped free user, extrapolated to $6-12 for a
heavy premium user). When asked "did you calculate that from our servers?", the honest
answer was no. Chasing the real number found three dead ends and one dead pipeline, so we
fixed the pipeline and then answered the pricing question from measurements.

## What shipped

### 1. Together line backend — murror-api PR #605 (MERGED, `7002678`)

Key finding (cortex, verified in code): **multi-seat plans were NOT greenfield.** murror-api
already ships a complete `family-plan` bounded context: `FamilyPlan` + `FamilySeat` +
`FamilyMinorConsent` (`prisma/schema.murror.prisma:282-345`), a seat-claim flow with
auto-connect, RevenueCat webhook reconcile, and an entitlement union in
`RevenueCatService.checkUserSubscription` that already grants premium via a claimed seat.
Duo = that module with `seatCount=2`.

- `REVENUECAT_FAMILY_PRODUCT_SEAT_MAP` (CSV `productId:seats`) -> `resolveFamilySeatCount()`
  in webhook.service (map first, then legacy `familyProductId` pair). Unset = `{}` =
  byte-identical legacy path.
- Race-proof invite cap: `createInviteSeatIfCapacity()` row-locks the plan
  (`SELECT ... FOR UPDATE`), counts PENDING|CLAIMED under the lock, inserts — one
  transaction. The old count-then-insert let two concurrent invites both pass the cap.
- Removed the unguarded `createInviteSeat` (zero callers, footgun).
- `scripts/seed-family-plans-alpha.ts`: simulated RC webhooks (RevenueCat is not in
  dev/alpha), dry-run default, prod-host + prod-DB guards.
- `k8s/manifests.yml` + `setup-murror-k8s-config` action + `setup-kubernetes-config.yml`:
  wire the seat-map env through ConfigMap generation.

Adversarial review verdict was SHIP-WITH-FIXES; all three fixed:
- HIGH: raw lock hardcoded `murror_api.family_plan`, but the `family_plan` migration DDL is
  UNQUALIFIED so the table lives wherever search_path pointed at migrate time. Fixed by
  naming it unqualified, so the lock resolves exactly like the `tx.familySeat` delegates in
  the same transaction.
- HIGH: Circle(5)->Duo(2) `PRODUCT_CHANGE` stranded over-cap members on premium forever
  (seat STATUS drives entitlement; `seatCount` is only checked at invite; `claim-seat` has no
  cap check). Now detected + logged loudly, deliberately NO auto-revoke (yanking access
  mid-period violates the locked rails). **Astro's policy call: grace to period end**, then
  the organizer chooses who stays. That flow is a Milestone C build.
- MED: `duo:0` passed validation then got dropped by the parser (charged, no plan). Validator
  now requires seats >= 1, with a seam spec so the layers cannot drift.

Verified: tsc + eslint + `nest build` clean, 214 targeted tests, no migrations.

### 2. Alpha is live and seeded

Image `staging-7002678` rolled to nsp-dev-murror. **Deploy-seam fired exactly as the freemium
lesson predicted**: the pod had no seat-map env after deploy, because `build-and-push.yml`
deploys alpha with `kubectl set image` ONLY and never applies manifests. Unblocked with
`kubectl set env` (survives image-only rolls; the durable manifest+GitHub-var path is in #605).

End-to-end proof via simulated RC webhooks (python urllib reading a chmod-600 secret file):
INITIAL_PURCHASE duo.monthly -> family_plan **seat_count=2** (map beat the default 5), ACTIVE;
CANCELLATION -> CANCELLED with period PRESERVED and the member still entitled (graceful,
never-yank verified); UNCANCELLATION -> ACTIVE. Seeded for Astro's device test: plan
`cmro74et30006tb07c3mdw19k` (organizer 867fb7cb..., Duo ACTIVE) + a CLAIMED seat for dummy
Khanh (2e6239d2...).

### 3. The cost pipeline was a shell — murror-platform PR #179 (OPEN)

viasr has always emitted a token record per LLM call onto `murror.llm-cost.direct` ->
`murror.llm-cost.queue`. cost-service (nsp-prod-dashboard) had **ClickHouse AND RabbitMQ
unconfigured**, so it booted degraded and the events expired unread after 24h. The daily
summary view summed a literal `0 AS total_cost`. It had never recorded a cost.

- `LlmCostCalculator`: per-model USD rates for the models viasr actually calls, longest-prefix
  match (`claude-haiku-4-5-20251001` -> `claude-haiku`), provider fallback, warn-once on
  unknown models, `MODEL_PRICING_JSON` env override (add/repice models with no deploy).
- Migration `002_add_total_cost.sql`: `total_cost Decimal(18,8)` + rebuild the MV to sum it.
- `getTopUsers` also hardcoded `0 AS total_cost` -> sums the real column.
- `deploy/clickhouse.yaml`: single-node in-cluster ClickHouse, ClusterIP-only, 10Gi
  (~$1/mo vs ~$50+/mo for ClickHouse Cloud at this volume).
- CI: `build-dashboard-images.yml` had `ref: feat/prod-deploy-hardening` HARDCODED (every
  dispatch silently built the WRONG branch) and pushed the shared mutable `dashboard-mvp` tag
  that live deploys pull with pullPolicy:Always. Now builds the dispatched ref, immutable
  `<branch>-<sha>` tag only (slashes flattened).
- `apps/cost-service/DEPLOY.md`: the recipe + every trap.

Pre-deploy review verdict was **BLOCK**, and it was right: viasr had already declared
`murror.llm-cost.dlq` as a **quorum** queue, so cost-service's bare `assertQueue` would have
thrown PRECONDITION_FAILED (406) on boot -> CrashLoopBackOff. Also fixed: gemini-2.0-flash-lite
swallowed by the `gemini-2.0-flash` prefix (33% overpriced), poison messages redelivering
forever (unguarded JSON.parse in the catch), non-finite tokens reaching a Decimal column.

**LIVE + VERIFIED:** 62 real events consumed and priced, queue drained 62->0, one consumer
attached, **zero rows with zero cost**. claude-haiku-4-5 = **$0.0034/call**, gpt-4.1-mini
$0.0016, gpt-4o-mini $0.0003. Daily MV sums real dollars. Consuming STAGING viasr's vhost
(`/murror-staging`); prod is additive (rows carry `environment`) but sits under the freeze.

## The answer to the pricing question

- **AI cost per user is CENTS/month, not dollars.** Median prod chat user: 4 replies/mo ~= $0.01.
  Heaviest (127 replies): ~$0.43. All production AI chat: ~$0.53/mo. The old $5-12 estimate was
  ~100x too conservative.
- Mercury (90d, 186 txns): infra **$219/mo** exactly (DigitalOcean $128, Serveropt $39,
  Supabase $35, Cloudflare $17); AI vendors $643/mo of which **Anthropic $484/mo is mostly
  Claude Code dev tooling, not user serving**; tools $174/mo; marketing $174/mo.
- Real burn (June, the only clean complete month, card double-count removed): **$13,156 out,
  $156 in**. 76% is people. Product+AI is 2-4% of burn.
- **Runway ~35 months** ($450k reserves held OUTSIDE Mercury, per Astro; Mercury shows $4,549.69).
- Conclusion: **cost cannot inform pricing.** Hold $12.99 / $19.99 Duo / $29.99 Circle, no launch
  discount. The real constraint is engagement (8 chat-active users / 3,086 registered in 30d),
  which is also WHY the AI bill is so small.

## Gotchas worth keeping

- ClickHouse password must have NO trailing newline (`printf '%s'`, not `echo`) or it rejects
  the connection with BAD_ARGUMENTS (ASCII control characters).
- cost-service's RMQ chart defaults are `murror.cost.*`; viasr publishes to `murror.llm-cost.*`.
  Wrong names = a second empty queue nobody publishes to. A wrong `dlqName` changes
  `x-dead-letter-routing-key` and fails the main assert outright.
- `build-and-push.yml` (murror-api) deploys alpha image-only; ConfigMap keys never reach the pod
  without an explicit env wiring step. Verify the POD's resolved env with `printenv`, not the
  ConfigMap.
- Mercury's `listTransactions` blows the token budget; it dumps to a file. Analyze with `jq`.
- Never state a runway conclusion from Mercury alone: it does not see reserves held elsewhere.

## Verification

- murror-api: 214 targeted tests, tsc, eslint, nest build; live webhook purchase/cancel/uncancel
  against alpha with DB assertions.
- cost-service: 13 calculator specs incl. review locks, tsc, workspace check-types; live consume
  + `countIf(total_cost=0) = 0` in ClickHouse.
