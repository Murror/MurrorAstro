# 2026-08-29 First production account deletion, end to end

Context, what shipped, and what remains after driving the first real
account-deletion request through the production pipeline.

## Context

The deletion pipeline had been armed in production on 2026-08-28 (rollout 18)
but had never executed anywhere. Astro requested deletion of the test account
`vinhspiration@gmail.com` (user `1f6cd927-1f08-43a2-a7d2-015f16d6533b`,
request `4eec11a5-1191-4478-a6be-f17c147905f0`) and authorized fast-forwarding
`purge_after` to trigger the full 15-step chain.

Every step that failed was root-caused against production (read-only SQL, or
in-pod reproduction), fixed, adversarially reviewed, and promoted per
`CLAUDE.md`. The chain advanced one incident at a time.

## Incident classes found and fixed

| # | Step | Cause | Fix |
|---|---|---|---|
| 1 | redact-joint-content | 42883 type drift, `text` vs `uuid` across schemas | #835/#836/#837 |
| 2 | revoke-auth | 23503: `deleteUser` ran in the immediate phase while 4 public tables still FK'd `auth.users` NO ACTION | #838, ban-then-purge sequencing |
| 3 | (verifier) | zodiac residue not checked | #839 |
| 4 | purge-storage | `download()` of a missing object returns HTTP 400 (opaque `StorageUnknownError`), not 404, so the absence proof threw on its own success | #843, verify via `list()` |
| 5 | verify-revenuecat | not a bug: async vendor delete, verify ran 1s after propagate | self-healed on retry |
| 6 | propagate-mixpanel | GDPR v3.0 `results` is an OBJECT with `task_id`, not an array of `tracking_id`; the spec mocked the wrong shape and stayed green while every deletion threw | #845 |
| 7 | purge-vectors | `conversation_wrapup` has no `user_id` (42703). First fix (#847) joined `murror_api.deep_chat_conversations`: valid SQL matching **0 of 744** prod rows, and `verifyVectorData` reuses the same predicate, so it would have certified a false clean. Rejected by review. | superseded by #848 |
| 8 | purge-legacy-data | 23503: three FK hazards, see below | #848 |
| 9 | verify-and-receipt | not a bug: live vendor completion polls, Mixpanel + PostHog GDPR queues still processing | #850 made it legible |

### The #848 FK hazards (proven from `pg_constraint`)

The public-row purge loop deletes in registry order. Three dependents were
ordered wrong or missing entirely:

- `message_reactions` (order 24) -> `conversation_messages2` (20), NO ACTION.
  The user had 40 messages and 4 reactions, so this is the one that fired.
- `cbt_message_reactions` (25) -> `cbt_conversation_messages` (22), NO ACTION.
  Latent for this user (0 CBT rows).
- `milestones` -> `cbt_conversations` (23), NO ACTION, and `milestones` was
  **never in the registry** despite carrying its own `user_id`: both an FK
  blocker and a GDPR gap. It is a leaf, so deleting it is FK-safe.

Fix: pre-delete the reaction children by **parent-message linkage** (so a
reaction anyone left on the departing user's message is cleared too),
`milestones` by `user_id`, and `conversation_wrapup` via a `public.deep_chat`
join, all before the loop reaches those parents. `conversation_wrapup` left
`VECTOR_PURGE_STATEMENTS` because `public.deep_chat` is itself deleted in
`purge-legacy-data`, so the join must run there while it can still resolve.

## The run

Deploy rev 24 (`v0.45.3`, sha `a32258fe`) landed and the 11:10Z cron tick ran
the destructive chain:

```
purge-legacy-data           COMPLETE  affected 64
purge-vectors               COMPLETE
revoke-auth                 COMPLETE
purge-user-data             COMPLETE  affected 9   <- deleteUser fired
refresh-activity-aggregates COMPLETE  (timescale _ca absent, skipped cleanly)
verify-and-receipt          FAILED    (vendor wait, see below)
```

The account is deleted. `verify-and-receipt` retries every 10 minutes and
completes on its own once Mixpanel task `146b9b16` and PostHog person
`90b4c425` finish their async GDPR queues. `processDueRequests` re-selects
`FAILED` requests, so nothing is stuck and there is no attempt cap.

## #850, diagnosability

Every self-authored `throw new Error(...)` on the deletion path was scrubbed
to the bare word `Error` by `getSafeDeletionErrorMessage` (which discards
unknown messages because a driver message can echo row data). That forced
in-pod forensics for all 8 real incidents, and made the benign vendor wait
look like a hard failure.

All 23 remaining plain throws became `DeletionOperationalError` (21) or
`DeletionSchemaError` (2, the missing-table asserts), and the vendor polls in
`verifyPurge` are wrapped. Review-panel hardening: the operational class now
sets `this.name`, the wrap redacts `?token=` (undici URL-parse errors quote
the full URL and the Mixpanel URL carries the project token as a query param
- unreachable while `MIXPANEL_GDPR_HOST` is unset, but the guard now fails
closed), and a structural spec pins zero plain throws service-wide.

Verified live at 16:50:05Z on rev 25:

```
last_error = "DeletionOperationalError Mixpanel GDPR deletion is not complete: PENDING"
```

## Gotchas worth keeping

- **A plan-clean EXPLAIN proves validity, not reachability.** #847 passed
  EXPLAIN, tsc, lint, and 49 specs while matching 0 of 744 rows. Data-touching
  predicates need a measured matched-count probe with a stated denominator.
- **Symmetric purge/verify predicates hide no-ops.** Both match zero, so
  verification can never catch the miss. Verify by an independent key.
- **Mocks must match a measured live response.** The Mixpanel array mock and
  the wrapup shape assertion both stayed green while production was 100%
  broken.
- **Mutation testing needs a positive control that the mutation applied.**
  A prettier-wrapped throw silently no-opped a single-line perl pattern, and
  the "pass" was against unmutated code. Grep for the mutation before trusting
  the result.

## PRs and promotions

| PR | What | Promotion |
|---|---|---|
| #843 | storage verify via `list()` | #844 -> v0.45.1 rev 22 |
| #845 | Mixpanel GDPR response shape | #846 -> v0.45.2 rev 23 |
| #847 | wrapup by conversation owner | **closed, rejected by review** |
| #848 | legacy purge FK ordering + wrapup | #849 -> v0.45.3 rev 24 |
| #850 | lastError legibility | #851 -> v0.45.4 rev 25 |

Every promotion verified by effect: rollout revision incremented, image sha
changed, `change-cause` named the source sha and run id.

## Open

- `4eec11a5` flips to `COMPLETED` when both vendors finish. Vendor-side only.
- Design call: a distinct "waiting on vendor" request status, so an async wait
  does not read as `FAILED`.
- Dormant FK gap: `app_storage.user_personas` is deleted in `purge-vectors`
  but its children `deep_chat_v1` and `journalsv1` FK it NO ACTION and are
  purged nowhere. All three tables are empty in production today.
- Non-blocking: wrap `fetch()` inside `mixpanel.service.ts` and
  `posthog.service.ts` so a runtime `TypeError` cannot carry a URL outward.
