# Murror Galaxy Pilot Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a default-off, adults-only Galaxy pilot that lets users create expiring, pseudonymous Signals, encounter a bounded compatible Field, respond safely, and earn a private Orbit through mutual consent.

**Architecture:** Galaxy is a new, isolated domain across the API, mobile, and web. It must never reuse the private close-connection models, raw journal content, or the existing Globe stream. The API owns consent, eligibility, feed selection, expiry, suppression, moderation, and exchange state; clients render only the safe card contract and keep no sensitive Galaxy data in persisted caches.

**Tech Stack:** NestJS + Prisma (`schema.murror.prisma`) + Redis throttling + Statsig + OneSignal; React Native + React Query; React + RTK Query + Vite; Jest/Vitest; PostHog/Mixpanel with privacy-safe event payloads.

---

## Pilot boundary and invariants

- Launch only behind a default-off `galaxy_enabled` gate, to a verified 18+ cohort.
- Galaxy is a separate module, API client, entity set, and navigation area. Do not retrofit `Connection`, `SuggestedConnection`, `RelationshipPrivacy`, friend invitations, or relationship message tables.
- A Galaxy Signal is a standalone, user-reviewed record. It is never a raw journal, AI conversation, voice note, photo, or inferred emotional profile.
- The Field is server-issued, finite, and non-paginated for the pilot. Never add infinite scroll or automatic replacement after a pass.
- No direct messaging, photos, links, attachments, payments, location sharing, or contact exchange in the pilot.
- The first-contact state machine is server-authoritative: `HEART` → optional acknowledgement; `LISTEN_OFFERED` → recipient accepts or closes; accepted exchange → both independently decide to continue; only then create an Orbit.
- Pass means “not this Signal, not this moment”: hide the exact Signal for that viewer, no author notification, brief client Undo, no ranking penalty.
- Galaxy must be excluded from mobile persisted React Query cache and cleared from every client cache at logout.

## Task 0: Create isolated working lanes and freeze the API contract

**Files:**
- Create: `Murror/docs/contracts/galaxy-pilot-api.md`
- Create worktrees: one clean worktree each for `Murror/murror-api`, `Murror/MurrorMobile`, and `Murror/murror-platform`
- Reference: `Murror/docs/plans/2026-07-09-galaxy-design.md`

**Step 1: Create clean, separate worktrees**

Run from each repository’s clean base branch; do not use the currently dirty checkouts.

```bash
git worktree add ../murror-api-galaxy -b feat/galaxy-pilot-api <clean-base>
git worktree add ../MurrorMobile-galaxy -b feat/galaxy-pilot-mobile <clean-base>
git worktree add ../murror-platform-galaxy -b feat/galaxy-pilot-web <clean-base>
```

Expected: three isolated checkouts with no unrelated changes. Record their absolute paths in `Murror/docs/HANDOFF.md` before implementation.

**Step 2: Write the request/response contract before clients**

Document these authenticated endpoints and envelopes in `docs/contracts/galaxy-pilot-api.md`:

```text
GET  /galaxy/settings
PUT  /galaxy/settings
GET  /galaxy/field
POST /galaxy/signals
PATCH /galaxy/signals/:signalId
POST /galaxy/signals/:signalId/withdraw
POST /galaxy/signals/:signalId/heart
POST /galaxy/signals/:signalId/listen
POST /galaxy/signals/:signalId/pass
DELETE /galaxy/signals/:signalId/pass
POST /galaxy/signals/:signalId/not-interested
POST /galaxy/people/:profileId/hide
POST /galaxy/people/:profileId/block
POST /galaxy/signals/:signalId/report
GET  /galaxy/resonances
POST /galaxy/resonances/:resonanceId/accept
POST /galaxy/resonances/:resonanceId/close
POST /galaxy/exchanges/:exchangeId/continue
GET  /galaxy/orbits
```

**Step 3: Define safe card fields and forbidden fields**

The `GalaxySignalCard` contract may contain opaque IDs, alias, abstract-avatar key, user-authored Signal text, declared intent/boundary, language, broad timezone, expiry, and a safe reason code such as `SHARED_DECLARED_INTENT`.

It must not contain raw journal text, private reflection identifiers, real name, email, precise location, user ID, profile photo, inferred mental-health status, match score, exposure count, views, passes, or any author popularity statistic.

**Step 4: Add contract examples for every lifecycle outcome**

Include exact success/error behavior for: withdrawn/expired Signal, duplicate pass, blocked counterpart, report submission, race between two listen taps, denied age/consent eligibility, recipient decline, and a stale exchange transition.

**Step 5: Commit the contract**

```bash
git add docs/contracts/galaxy-pilot-api.md docs/HANDOFF.md
git commit -m "docs: define Galaxy pilot contract"
```

## Task 1: Add Galaxy’s dedicated Prisma data model

**Files:**
- Modify: `murror-api/prisma/schema.murror.prisma`
- Create: `murror-api/prisma/migrations/<timestamp>_add_galaxy_pilot/migration.sql`
- Create: `murror-api/src/galaxy/infrastructure/galaxy.repository.spec.ts`
- Reference: `murror-api/src/shared/infrastructure/database/prisma.service.ts`

**Step 1: Write the failing repository tests**

Cover the following invariants with an isolated Prisma test database or repository mocks:

```ts
it('does not return a passed, blocked, expired, or withdrawn Signal');
it('creates only one feed decision per viewer and Signal');
it('cannot create a direct exchange without recipient acceptance');
it('never joins private journal fields when selecting a Signal card');
```

**Step 2: Add explicit enums and models to `schema.murror.prisma`**

Add `GalaxyProfile`, `GalaxySignal`, `GalaxySignalTopic`, `GalaxyFeedDecision`, `GalaxyUserBlock`, `GalaxyResonance`, `GalaxyExchange`, `GalaxyExchangeParticipant`, and `GalaxyReport`, plus enums for Signal status, decision type, intent, exchange state, report state, and visibility.

Use composite unique constraints for idempotency, including viewer + Signal + decision type and sender + Signal + resonance type. Add indexes for active/expiry filtering, audience/intent matching, and participant state. Add explicit `User` relations and cascade behavior. Do not modify `prisma/schema.prisma`, which is the legacy client.

**Step 3: Generate and inspect the migration**

```bash
pnpm prisma:migrate --name add_galaxy_pilot
pnpm prisma:generate
```

Expected: a migration only under `prisma/migrations` for `schema.murror.prisma`, and generated types that compile.

**Step 4: Implement the minimal repository projections**

Create `src/galaxy/infrastructure/galaxy.repository.ts`. All field selection for feed cards must be explicit and allowlisted. Keep content, moderation evidence, and user-facing card projection in separate methods so logging or controller serialization cannot leak internal fields.

**Step 5: Verify and commit**

```bash
pnpm test -- galaxy.repository.spec.ts
pnpm type-check
git add prisma/schema.murror.prisma prisma/migrations src/galaxy/infrastructure
git commit -m "feat(api): add Galaxy pilot data model"
```

## Task 2: Build Galaxy settings, eligibility, and signal publication

**Files:**
- Create: `murror-api/src/galaxy/galaxy.module.ts`
- Create: `murror-api/src/galaxy/application/galaxy-settings.service.ts`
- Create: `murror-api/src/galaxy/application/galaxy-signal.service.ts`
- Create: `murror-api/src/galaxy/presentation/galaxy.controller.ts`
- Create: `murror-api/src/galaxy/presentation/dto/galaxy-settings.dto.ts`
- Create: `murror-api/src/galaxy/presentation/dto/create-galaxy-signal.dto.ts`
- Create: `murror-api/src/galaxy/application/galaxy-signal.service.spec.ts`
- Modify: `murror-api/src/app.module.ts`
- Modify: `murror-api/src/common/throttler/throttler-tiers.ts`
- Reference: `murror-api/src/auth/guards/auth.guard.ts`, `murror-api/src/libs/statsig/statsig.service.ts`, `murror-api/src/common/utils/crisis-keywords.util.ts`

**Step 1: Write failing service and controller tests**

Cover default-off gate behavior, unauthenticated access, adult/consent eligibility, invalid alias or intent, expiry limits, pause/withdraw behavior, and rejection of Signals containing disallowed contact data or crisis content.

**Step 2: Register a dedicated `GalaxyModule`**

Import `PrismaModule`, auth, Statsig, and the minimum notification dependency required. Register the module in `AppModule`. Keep it independent from `ConnectionsModule`; only share infrastructure, not relationship business rules.

**Step 3: Implement profile/settings and Signal APIs**

Implement `GET/PUT /galaxy/settings`, `POST/PATCH /galaxy/signals`, and `POST /galaxy/signals/:signalId/withdraw`. Store user-reviewed alias, settings, availability, selected audience preferences, and expiry. Enforce owner checks in every mutation.

**Step 4: Add pre-publication safety and logging rules**

Use the existing crisis utility only as a conservative exit signal. Add a Galaxy-specific publication validator that refuses contact details, links, payment solicitation, unsafe sexual solicitation, and unsupported high-risk content. Ensure controllers and services log only opaque IDs/statuses; extend `log-redaction.config.ts` if any Galaxy DTO field could otherwise be logged.

**Step 5: Verify and commit**

```bash
pnpm test -- galaxy-signal.service.spec.ts
pnpm test -- galaxy.controller.spec.ts
pnpm lint && pnpm type-check
git add src/galaxy src/app.module.ts src/common/throttler src/config/log-redaction.config.ts
git commit -m "feat(api): add gated Galaxy Signal publishing"
```

## Task 3: Implement the finite Field and private decision lifecycle

**Files:**
- Create: `murror-api/src/galaxy/application/galaxy-field.service.ts`
- Create: `murror-api/src/galaxy/application/galaxy-decision.service.ts`
- Create: `murror-api/src/galaxy/presentation/dto/galaxy-field.dto.ts`
- Create: `murror-api/src/galaxy/application/galaxy-field.service.spec.ts`
- Create: `murror-api/src/galaxy/application/galaxy-decision.service.spec.ts`
- Modify: `murror-api/src/galaxy/presentation/galaxy.controller.ts`

**Step 1: Write failing Field-selection tests**

Test that the Field excludes self, inactive/withdrawn/expired/moderated Signals, any blocked pair, passed Signals, hidden aliases, topic exclusions, incompatible intentions, and people with an active exchange. Test a finite result with deterministic cursor/window metadata, not an unbounded pagination API.

**Step 2: Implement fair, allowlisted selection**

Order eligible Signals by mutual declared intent, capacity, freshness, underexposure, diversity, and safety state. Do not query journals, AI analysis, popularity, attractiveness, paid boosts, or private emotion data. Return a small Field and an explicit completion state.

**Step 3: Implement Heart, Listen, Pass, Undo Pass, and suppression endpoints**

Make mutations idempotent. A heart is private and count-free. Listen creates a pending consent request only. Pass suppresses the exact Signal with no author notification or scoring effect; `DELETE /galaxy/signals/:signalId/pass` removes only the caller's pass decision during the short Undo window. Add topic suppression, hide-person, block, and report semantics as distinct decisions.

**Step 4: Add the full after-state rules**

Pass allows a short Undo window on the client but remains server-authoritative once committed. Never automatically replace a passed card. Do not recirculate a passed Signal; apply a cooldown before a new Signal from the same alias is eligible. Add a scheduled expiry service using the root scheduler and ensure withdrawal/expiry closes pending decisions safely.

**Step 5: Verify and commit**

```bash
pnpm test -- galaxy-field.service.spec.ts
pnpm test -- galaxy-decision.service.spec.ts
pnpm type-check
git add src/galaxy
git commit -m "feat(api): add Galaxy Field and decisions"
```

## Task 4: Add consented exchanges, reports, and safe notifications

**Files:**
- Create: `murror-api/src/galaxy/application/galaxy-exchange.service.ts`
- Create: `murror-api/src/galaxy/application/galaxy-moderation.service.ts`
- Create: `murror-api/src/galaxy/application/galaxy-exchange.service.spec.ts`
- Create: `murror-api/src/galaxy/application/galaxy-moderation.service.spec.ts`
- Create: `murror-api/src/galaxy/infrastructure/galaxy-notification.service.ts`
- Modify: `murror-api/src/galaxy/presentation/galaxy.controller.ts`
- Create: `murror-api/test/galaxy.e2e-spec.ts`

**Step 1: Write failing state-machine tests**

Test that a recipient alone can accept a Listen offer, both participants must independently continue before an Orbit exists, blocked/reported users cannot transition, stale/missing participants receive forbidden/not-found responses, and repeated requests cannot create duplicate exchanges.

**Step 2: Implement the exchange state machine**

Use explicit states such as `PENDING`, `ACCEPTED`, `CLOSED`, `WAITING_FOR_CONTINUATION`, and `ORBIT_CREATED`. The API must not expose an unrestricted direct-message endpoint in this pilot.

**Step 3: Implement block/report and moderator-ready records**

Create Galaxy-specific report records, case status, evidence retention fields, and immediate exposure suppression. Do not reuse the AI-conversation-only report table. Add rate limits for Signal publish, heart/listen, report, and settings mutations.

**Step 4: Send privacy-safe notifications**

Reuse the OneSignal/event-delivery pattern from `connection-request.service.ts`, but notification payloads must contain no Signal text, alias, match reason, or private category. Start with REST + push; do not use `globe.gateway.ts` or existing socket room-join patterns.

**Step 5: Verify and commit**

```bash
pnpm test -- galaxy-exchange.service.spec.ts galaxy-moderation.service.spec.ts
pnpm test:e2e -- galaxy.e2e-spec.ts
pnpm lint && pnpm type-check
git add src/galaxy test/galaxy.e2e-spec.ts
git commit -m "feat(api): add Galaxy exchanges and safety controls"
```

## Task 5: Protect mobile cache, feature gate, navigation, and deep links

**Files:**
- Modify: `MurrorMobile/src/constants/feature-flags.ts`
- Modify: `MurrorMobile/src/hooks/use-feature-flags.ts`
- Modify: `MurrorMobile/src/config/react-query/persistent-cache.ts`
- Modify: `MurrorMobile/src/common/navigation.tsx`
- Modify: `MurrorMobile/src/common/navigation-controller.tsx`
- Modify: `MurrorMobile/src/common/linking.ts`
- Create: `MurrorMobile/src/config/react-query/persistent-cache.galaxy.spec.ts`

**Step 1: Write failing privacy/cache tests**

Verify that any query key starting with `galaxy` is excluded from hydration, and that a disabled feature flag blocks Galaxy navigation and safe-falls-back from Galaxy deep links.

**Step 2: Add a default-off mobile feature gate**

Add `GALAXY_ENABLED = 'galaxy_enabled'` to the enum, defaults, typed hook return, and module-level flag snapshot. The default must remain false in production and on cold start.

**Step 3: Exclude Galaxy from persisted cache**

Extend `shouldDehydrateQuery` in `persistent-cache.ts` to reject Galaxy keys. Add a focused regression test; do not rely only on key naming in future client code—document the key prefix in Galaxy query constants.

**Step 4: Add typed, lazy navigation and safe deep links**

Add `GalaxyScreen`, Signal composer, Resonances, and Orbit destinations to `navigation.tsx` and register them lazily in `navigation-controller.tsx`. Add a feature-gated deep-link handler that never exposes Galaxy content while the gate is off.

**Step 5: Verify and commit**

```bash
yarn test persistent-cache.galaxy.spec.ts
yarn type-check
git add src/constants src/hooks src/config/react-query src/common
git commit -m "feat(mobile): gate and isolate Galaxy navigation"
```

## Task 6: Add the mobile Galaxy client, typed hooks, and server-authoritative state

**Files:**
- Create: `MurrorMobile/src/apis/types/galaxy.ts`
- Create: `MurrorMobile/src/apis/client/galaxy-api-client.ts`
- Modify: `MurrorMobile/src/apis/client/index.ts`
- Create: `MurrorMobile/src/queries/galaxy/galaxy-query-keys.ts`
- Create: `MurrorMobile/src/queries/galaxy/use-galaxy-field.ts`
- Create: `MurrorMobile/src/queries/galaxy/use-galaxy-settings.ts`
- Create: `MurrorMobile/src/queries/galaxy/use-galaxy-signal.ts`
- Create: `MurrorMobile/src/queries/galaxy/use-galaxy-decisions.ts`
- Create: `MurrorMobile/src/queries/galaxy/use-galaxy-resonances.ts`
- Create: `MurrorMobile/src/apis/client/galaxy-api-client.spec.ts`
- Create: `MurrorMobile/src/queries/galaxy/use-galaxy-decisions.spec.tsx`

**Step 1: Write the failing API client contract tests**

Assert authentication, method, URL, request body, envelope transform, and error propagation for settings, Field, publish/withdraw, Heart, Listen, Pass, hide/block/report, and Resonance accept/close endpoints.

**Step 2: Implement `GalaxyApiClient` separately from relationship client**

Extend `BaseApiClient`, register it in `apiClient`, and keep its request/response interfaces in `apis/types/galaxy.ts`. Do not add anonymous-discovery types to `relationship-api-client.ts`.

**Step 3: Implement typed React Query hooks**

Use the existing query test wrapper in `queries/__test-utils__/query-test-env.tsx`. Set a short Field stale time; mutation retries must remain zero. Invalidate only adjacent Galaxy keys after mutations.

**Step 4: Implement client-only Undo without weakening server truth**

On Pass, optimistically remove the card and offer a short Undo. If Undo is selected before the toast expires, call `DELETE /galaxy/signals/:signalId/pass` and restore from the server contract. Never queue public writes offline for later automatic delivery.

**Step 5: Verify and commit**

```bash
yarn test galaxy-api-client.spec.ts use-galaxy-decisions.spec.tsx
yarn type-check
git add src/apis src/queries/galaxy
git commit -m "feat(mobile): add Galaxy API and query hooks"
```

## Task 7: Build mobile My Space/Galaxy entry, Field, and Signal lifecycle UI

**Files:**
- Create: `MurrorMobile/src/screens/main/Galaxy/galaxy-screen.tsx`
- Create: `MurrorMobile/src/screens/main/Galaxy/galaxy-signal-card.tsx`
- Create: `MurrorMobile/src/screens/main/Galaxy/galaxy-signal-composer.tsx`
- Create: `MurrorMobile/src/screens/main/Galaxy/galaxy-settings-sheet.tsx`
- Create: `MurrorMobile/src/screens/main/Galaxy/galaxy-resonances-screen.tsx`
- Create: `MurrorMobile/src/screens/main/Galaxy/galaxy-screen.spec.tsx`
- Modify: `MurrorMobile/src/screens/main/Diary/relationship-screen.tsx`
- Modify: `MurrorMobile/src/common/tab-controller.tsx`

**Step 1: Write the failing screen tests**

Test a disabled gate, Browse-only state, Open/Paused state, active Signal withdrawal, empty/complete Field, Heart, Listen pending state, Pass → Undo, and a Field that does not refill automatically after Pass.

**Step 2: Add Galaxy as a deliberate entry, not a sixth permanent tab**

Use the current Relationship/Home shell to expose a gated Galaxy entry. Preserve the existing five-tab floating navigation and the close-one relationship list. `GalaxyScreen` owns its own loading, error, empty, and pull-to-refresh states.

**Step 3: Implement the finite Field card contract**

Render only server-provided alias/avatar key, Signal, intent/boundary, broad metadata, expiry, and safe relevance text. Show a heart, `I can listen`, and low-emphasis Pass; put Hide, Block, and Report in a guarded overflow path. Do not display counts, matching scores, or raw match reasons.

**Step 4: Implement before/during/after UI states**

Before: review a separate Signal preview and explicit expiry before publish. During: show the finite Field and first-contact actions. After: show neutral pending/accepted/closed states, brief Pass Undo, no automatic replacement, private Signal manager, and distinct Resonances vs. Orbits lists.

**Step 5: Verify and commit**

```bash
yarn test galaxy-screen.spec.tsx
yarn type-check
git add src/screens/main/Galaxy src/screens/main/Diary/relationship-screen.tsx src/common/tab-controller.tsx
git commit -m "feat(mobile): add Galaxy Field experience"
```

## Task 8: Add mobile safety, notification, analytics, localization, and release checks

**Files:**
- Modify: `MurrorMobile/src/utils/detect-crisis.ts`
- Modify: `MurrorMobile/src/components/crisis-inline-prompt.tsx`
- Modify: `MurrorMobile/src/common/analytics/analytics-service.ts`
- Modify: `MurrorMobile/src/common/analytics/analytics-constants.ts`
- Modify: `MurrorMobile/src/locales/en.json`
- Modify: `MurrorMobile/src/locales/vi.json`
- Modify: `MurrorMobile/src/locales/ja.json`
- Modify: `MurrorMobile/src/common/linking.ts`
- Create: `MurrorMobile/src/screens/main/Galaxy/galaxy-safety.spec.tsx`

**Step 1: Write failing safety and analytics tests**

Assert crisis interception never publishes or matches a Signal, block/report is always available, disabled deep links fail safely, and analytics contains opaque IDs/enums only—never Signal text, aliases, values, or match rationale.

**Step 2: Route safety events to the server**

Keep `detect-crisis.ts` as a conservative UI fallback, but let the API decide publication eligibility. Show resource guidance and preserve the user’s private draft locally; do not silently publish it later.

**Step 3: Add Galaxy analytics category and events**

Track safe events such as `field_viewed`, `signal_published`, `signal_withdrawn`, `heart_sent`, `listen_offered`, `pass_used`, `resonance_accepted`, `exchange_closed`, and `report_submitted`. All payloads use opaque IDs and declared enum values only.

**Step 4: Add all locales and notification/deep-link coverage**

Add three-locale strings for setup, Signal lifecycle, pass semantics, moderation, pending Resonance, and Orbit outcomes. Add safe notification routes that show generic copy until the authenticated API fetch succeeds.

**Step 5: Verify and commit**

```bash
yarn test galaxy-safety.spec.tsx
yarn i18n-check
yarn check
git add src/utils src/components src/common/analytics src/common/linking.ts src/locales src/screens/main/Galaxy
git commit -m "feat(mobile): harden Galaxy pilot experience"
```

## Task 9: Add an isolated web Galaxy data slice and gated route

**Files:**
- Create: `murror-platform/apps/web-client/src/domain/entities/galaxy.ts`
- Create: `murror-platform/apps/web-client/src/application/services/galaxy-api.ts`
- Modify: `murror-platform/apps/web-client/src/application/store/index.ts`
- Modify: `murror-platform/apps/web-client/src/routes/index.tsx`
- Modify: `murror-platform/apps/web-client/src/presentation/layouts/main-layout.tsx`
- Create: `murror-platform/apps/web-client/src/application/services/galaxy-api.test.ts`
- Create: `murror-platform/apps/web-client/src/routes/galaxy-route.test.tsx`

**Step 1: Write failing RTK Query contract and gate tests**

Assert every Galaxy endpoint uses the authenticated API base, transforms the standard response envelope, invalidates only Galaxy tags, and clears on logout. Assert the default-off gate prevents route access and that Galaxy does not automatically inherit `SubscribedRoute` until pilot monetization is explicitly decided.

**Step 2: Define safe web entities and API slice**

Add `GalaxyProfile`, `GalaxySignalCard`, `GalaxyField`, `GalaxySettings`, `GalaxyDecision`, `GalaxyResonance`, and `GalaxyOrbit` types. Create a dedicated `galaxyApi` RTK Query slice instead of adding anonymous discovery to `connections-api.ts`.

**Step 3: Register cache reset and route behavior**

Register the slice reducer/middleware in `application/store/index.ts` and add it to `ALL_APIS` so logout clears it. Add a gated lazy `/galaxy` route inside the authenticated application tree. Make the chosen entry deliberate; do not add a sixth bottom-nav item until mobile/web navigation is separately approved.

**Step 4: Implement server-authoritative cache policy**

Use a short Field cache lifetime and server-issued cursor/window metadata. Never use `localStorage` for Pass, block, report, active Signal, exchange, or expiry state. Existing cross-connection-feed dismissal behavior is only a UI reference, not persistence to reuse.

**Step 5: Verify and commit**

```bash
pnpm --filter web-client test -- galaxy-api.test.ts galaxy-route.test.tsx
pnpm --filter web-client check-types
git add apps/web-client/src/domain apps/web-client/src/application apps/web-client/src/routes apps/web-client/src/presentation/layouts
git commit -m "feat(web): add gated Galaxy data route"
```

## Task 10: Build web Galaxy setup, Field, Signal, and Resonance UI

**Files:**
- Create: `murror-platform/apps/web-client/src/presentation/pages/galaxy-page.tsx`
- Create: `murror-platform/apps/web-client/src/presentation/components/galaxy/galaxy-field.tsx`
- Create: `murror-platform/apps/web-client/src/presentation/components/galaxy/galaxy-signal-card.tsx`
- Create: `murror-platform/apps/web-client/src/presentation/components/galaxy/galaxy-signal-composer.tsx`
- Create: `murror-platform/apps/web-client/src/presentation/components/galaxy/galaxy-settings-sheet.tsx`
- Create: `murror-platform/apps/web-client/src/presentation/components/galaxy/galaxy-resonances-sheet.tsx`
- Create: `murror-platform/apps/web-client/src/presentation/pages/galaxy-page.test.tsx`
- Create: `murror-platform/apps/web-client/src/presentation/components/galaxy/galaxy-signal-card.test.tsx`

**Step 1: Write failing component tests**

Test: first-time setup; Browse-only versus Open/Paused; Signal review and expiry; finite Field complete state; heart/listen/pass semantics; Pass Undo; no automatic refill; active Signal withdrawal; pending Resonance; and a closed exchange.

**Step 2: Build the two-space model**

Use the existing page header, loading, error, empty, sheet, toast, and accessibility patterns. Galaxy must be visibly distinct from Friends: private known-person connections stay in their page, while Galaxy shows user-approved pseudonymous Signals only.

**Step 3: Implement card controls without social-feed mechanics**

Place Heart and `I can listen` as the first actions. Keep Pass low-emphasis and separate Hide/Block/Report into the safety menu. Explain the after-state in UI: no direct chat begins until the recipient accepts; a pass is private; no counts or popularity feedback exist.

**Step 4: Implement before/during/after lifecycle states**

Before: explicit Signal preview, separate from journal-write flow. During: finite Field with safe relevance language. After: neutral pending/closed state, private Signal manager, brief Undo, and distinct Resonances/Orbits. Do not wire a journal “share” button to Galaxy.

**Step 5: Verify and commit**

```bash
pnpm --filter web-client test -- galaxy-page.test.tsx galaxy-signal-card.test.tsx
pnpm --filter web-client lint
pnpm --filter web-client build
git add apps/web-client/src/presentation/pages apps/web-client/src/presentation/components/galaxy
git commit -m "feat(web): add Galaxy pilot experience"
```

## Task 11: Add web privacy-safe analytics, locales, and final contract coverage

**Files:**
- Modify: `murror-platform/apps/web-client/src/infrastructure/analytics/journey-events.ts`
- Modify: `murror-platform/apps/web-client/src/infrastructure/analytics/posthog-client.ts`
- Modify: `murror-platform/apps/web-client/src/locales/en.json`
- Modify: `murror-platform/apps/web-client/src/locales/vi.json`
- Modify: `murror-platform/apps/web-client/src/locales/ja.json`
- Create: `murror-platform/apps/web-client/src/infrastructure/analytics/galaxy-events.test.ts`
- Create: `murror-platform/apps/web-client/src/presentation/pages/galaxy-page.a11y.test.tsx`

**Step 1: Write failing telemetry and localization tests**

Assert events never serialize Signal text, aliases, match reason text, inferred emotions, or author identifiers. Assert all Galaxy i18n keys exist in English, Vietnamese, and Japanese. Add keyboard/screen-reader checks for card actions and Undo.

**Step 2: Implement safe event schema**

Track only opaque Signal/exchange IDs, declared intent, outcome enum, and generic feature-gate state. Use the existing privacy-safe PostHog configuration; do not turn on autocapture/replay to inspect Galaxy behavior.

**Step 3: Add all lifecycle copy**

Include clear copy for Signal review, expiry, pause, browse-only, Heart, Listen, Pass/Undo, report/block, pending resonance, closure, and Orbit continuation. Avoid therapy claims and rejection language.

**Step 4: Run cross-client contract validation**

Add API contract examples to the web/client test suite. Verify both mobile and web interpret the same active, withdrawn, expired, passed, blocked, pending, accepted, and closed values.

**Step 5: Verify and commit**

```bash
pnpm --filter web-client test -- galaxy-events.test.ts galaxy-page.a11y.test.tsx
pnpm --filter web-client check-types
pnpm --filter web-client build
git add apps/web-client/src/infrastructure/analytics apps/web-client/src/locales apps/web-client/src/presentation
git commit -m "feat(web): instrument Galaxy pilot safely"
```

## Task 12: Run end-to-end safety verification and staged pilot launch

**Files:**
- Create: `Murror/docs/runbooks/galaxy-pilot-launch.md`
- Modify: `Murror/docs/HANDOFF.md`
- Modify: `murror-api/src/galaxy/**` only if verification reveals a defect
- Modify: mobile/web release documentation only after the checks below pass

**Step 1: Prepare a moderator and incident-response launch gate**

Document minimum verified-adult cohort, staffing coverage, report response targets, appeals, evidence retention/deletion policy, feature-gate owner, rollback owner, and crisis escalation path. The pilot cannot launch without an operationally real moderation path.

**Step 2: Run adversarial authorization and privacy cases**

Verify owner checks, blocked-pair exclusion, stale exchange transition rejection, no private-journal selection, no Galaxy mobile cache persistence, logout cache reset, notification redaction, report anonymity, and feature-off deep-link behavior.

**Step 3: Run targeted automated checks**

```bash
cd /path/to/murror-api-galaxy && pnpm test && pnpm type-check && pnpm lint
cd /path/to/MurrorMobile-galaxy && yarn check
cd /path/to/murror-platform-galaxy && pnpm --filter web-client test && pnpm --filter web-client check-types && pnpm --filter web-client build
```

Expected: all targeted suites pass; any unrelated pre-existing failure is isolated and recorded rather than waived.

**Step 4: Stage with the gate off, then cohort-only**

Deploy API schema/module first with `galaxy_enabled=false`. Validate migrations, inactive endpoints, redacted logs, and notification templates. Enable only for the verified pilot cohort after moderation readiness and synthetic end-to-end checks pass.

**Step 5: Record evidence and commit the runbook**

```bash
git add docs/runbooks/galaxy-pilot-launch.md docs/HANDOFF.md
git commit -m "docs: add Galaxy pilot launch runbook"
```

## Final verification checklist

- [ ] Every raw private-reflection path remains private by default.
- [ ] Galaxy data exists only in `schema.murror.prisma`; no legacy-schema migration was created.
- [ ] API field selection and logs cannot return or record forbidden sensitive data.
- [ ] Feature flag defaults off in API, mobile, web, routes, and deep links.
- [ ] Mobile persistent query cache excludes every Galaxy key; web logout resets Galaxy API state.
- [ ] Pass, hide, block, report, expiry, withdrawal, and exchange transitions have server-side tests.
- [ ] No UI creates automatic refills, infinite browsing, public counts, or direct chat.
- [ ] All Galaxy lifecycle strings are localized in `en`, `vi`, and `ja`.
- [ ] Pilot launch has verified age assurance, moderation staffing, response SLAs, rollback controls, and written evidence.
