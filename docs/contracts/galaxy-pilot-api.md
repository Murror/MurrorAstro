# Galaxy Pilot API Contract (frozen)

**Status:** frozen contract for the Galaxy pilot. Clients (mobile, web) implement to THIS document, not to placeholder paths. Mobile currently targets `/api/v1/galaxy/*` placeholders; the paths below are final.

**Route prefix:** global prefix `api` + URI version `1` => every route is under **`/api/v1/galaxy/...`**.

**Auth:** every endpoint requires a Supabase JWT (`Authorization: Bearer <token>`) via `AuthGuard`. Unauthenticated => `401`.

**Feature gate:** the whole controller is behind `GalaxyFeatureGuard` (Statsig `galaxy_enabled`, default-off). Gate off => `403` (`ForbiddenException`). The tier default is deliberately NOT the SharedPhotos pattern: only the dev/alpha test bed defaults ON; staging stays DARK per the standing "Alpha-2 is the test bed" rule, so a staging graduation is a deliberate Statsig flip, not a code deploy.

| Tier (`ENVIRONMENT`) | Galaxy access |
|---|---|
| `dev` / `development` / `local` / `alpha` | **ON** by default (env default) |
| `staging` | follows `galaxy_enabled` (default **OFF** → 403) |
| `production` | follows `galaxy_enabled` (default **OFF** → 403) |
| unset / unknown | fail-safe **OFF** → 403 |

**Rate limits:** global `short`/`medium`/`long` apply to all routes. Publish/withdraw add the `galaxyPublish` tier (10/min); settings PUT adds `galaxySettings` (20/min).

---

## Implementation status

| Slice | Endpoints | PR |
|---|---|---|
| Data model + repository | (none) | #609 (merged) |
| **Settings + Signal publication** | `GET/PUT /settings`, `GET/POST /signals`, `PATCH /signals/:id`, `POST /signals/:id/withdraw` | **this PR** |
| **Field + private decisions** | `GET /field`, heart/listen/pass + `DELETE pass`, not-interested, hide-person, block, report | **this PR** |
| **Exchanges + orbits** | resonances, accept/close, thread, messages, continue, orbits | **this PR** |

Endpoints marked _(planned)_ below are frozen in the contract but implemented in a later PR.

---

## Standard envelopes

Every JSON response is wrapped by the global `HttpResponseTransformerInterceptor` (success) / `HttpExceptionFilter` (error).

**Success**

```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Request successful",
  "data": { /* endpoint payload */ },
  "meta": { "timestamp": "2026-07-17T00:00:00.000Z", "path": "/api/v1/galaxy/settings" }
}
```

**Error**

```json
{
  "status": "error",
  "statusCode": 409,
  "message": "You already have an active Signal. Withdraw it before publishing a new one",
  "data": { "errorCode": "GALAXY_ONE_ACTIVE_SIGNAL" },
  "meta": { "timestamp": "…", "path": "…", "errorType": "Conflict" }
}
```

`data.errorCode` is the machine-readable branch key. Validation failures (DTO) return `400` with `message` as a string array and `errorType: "BadRequest"`.

### Error codes

| errorCode | HTTP | Meaning |
|---|---|---|
| `GALAXY_PROFILE_REQUIRED` | 409 | Publish attempted before settings were created |
| `GALAXY_PROFILE_NOT_FOUND` | 404 | Profile lookup missed |
| `GALAXY_SIGNAL_NOT_FOUND` | 404 | Signal missing or not owned by caller |
| `GALAXY_SIGNAL_NOT_EDITABLE` | 409 | Signal is not ACTIVE (cannot edit) |
| `GALAXY_ONE_ACTIVE_SIGNAL` | 409 | Pilot allows one live Signal per profile |
| `GALAXY_INVALID_EXPIRY` | 400 | Expiry not in {3,7,14} days |
| `CRISIS_SUPPORT` | 400 | Crisis language; client shows resources, preserves draft |
| `DISALLOWED_CONTENT` | 400 | Contact details / links / payment solicitation |

---

## Locked contract decisions

1. **Block is SIGNAL-scoped.** `POST /galaxy/signals/:signalId/block`. The server resolves the Signal's author and records a user-to-user block; the client never sees an author/profile identifier. (The mobile `block(profileId)` call is reconciled to this in the client-swap PR.)
2. **Two distinct reason enums.**
   - **Card relevance** `reasonCode` (why a card is shown): `SHARED_INTENTION` (intent overlaps the viewer's) or `NEW_SIGNAL` (fallback). Never a match score.
   - **Report** `reasonCode` (safety): `SPAM`, `HARASSMENT`, `SEXUAL_CONTENT`, `SELF_HARM`, `SCAM_OR_PAYMENT`, `IMPERSONATION`, `OTHER`.

---

## GalaxySignalCard — allowlist

The Field card (`GET /field`) may contain ONLY:

`id`, `alias`, `avatarKey`, `text`, `intentions[]`, `boundary?`, `language`, `broadTimezone`, `expiresAt`, `reasonCode` (relevance enum).

**Forbidden on a card (never returned):** `userId`, `profileId`, real name, email, precise location, profile photo, `adultVerifiedAt`, `seedSource`, match score, exposure/view/pass counts, any popularity statistic, and any journal / reflection / conversation field. Enforced server-side by the frozen `GALAXY_CARD_SELECT` allowlist.

---

## Endpoints

### Settings

#### `GET /api/v1/galaxy/settings`
Returns the caller's own settings, or `data: null` if not set up.

```json
{
  "alias": "QuietOrbit",
  "avatarKey": "nebula-04",
  "intentions": ["FRIENDSHIP"],
  "boundaries": ["No late-night messages"],
  "availability": "PAUSED",
  "language": "en",
  "broadTimezone": "Americas",
  "defaultExpiryDays": 7,
  "adultVerified": false,
  "createdAt": "…",
  "updatedAt": "…"
}
```

#### `PUT /api/v1/galaxy/settings`
Creates the caller's `GalaxyProfile` on first write, else updates. Owner = the authenticated user only. Body:

| field | type | rules |
|---|---|---|
| `alias` | string | 2–40 chars |
| `avatarKey` | string | 1–64 chars (abstract key, never a photo) |
| `intentions` | `GalaxyIntent[]` | ≥1 of `FRIENDSHIP`,`ROMANCE`,`COLLABORATION`,`OPEN` |
| `boundaries` | string[]? | ≤5 items, each ≤120 chars |
| `availability` | `OPEN`\|`PAUSED` | required |
| `language` | string | 2–10 chars |
| `broadTimezone` | string | region-level, never precise |
| `defaultExpiryDays` | 3\|7\|14? | preferred default |

Returns the settings view (as `GET`). Adult-verification and personalization-consent are owned by separate flows and are NOT set here.

### Signals

#### `GET /api/v1/galaxy/signals`
The caller's own Signals (management list). Each item:

```json
{
  "id": "…", "text": "…", "intentions": ["FRIENDSHIP"], "boundary": null,
  "status": "ACTIVE", "expiresAt": "…", "withdrawnAt": null,
  "createdAt": "…", "updatedAt": "…"
}
```

#### `POST /api/v1/galaxy/signals`  → `201`
Publishes a Signal. Body: `text` (1–280), `intentions[]` (≥1), `boundary?` (≤120), `expiryDays?` (3\|7\|14, defaults to the profile preference).

Server validates, in order: profile exists (`GALAXY_PROFILE_REQUIRED`), **safety validator** on `text` (`CRISIS_SUPPORT` / `DISALLOWED_CONTENT`), expiry window (`GALAXY_INVALID_EXPIRY`), one-live-Signal rule (`GALAXY_ONE_ACTIVE_SIGNAL`). Returns the Signal view. The API never logs or echoes rejected text.

#### `PATCH /api/v1/galaxy/signals/:signalId`
Edits an ACTIVE Signal owned by the caller. Any subset of `text`,`intentions`,`boundary`,`expiryDays`. `404` if not owned/found; `409` (`GALAXY_SIGNAL_NOT_EDITABLE`) if not ACTIVE; new `text` is re-validated.

#### `POST /api/v1/galaxy/signals/:signalId/withdraw`
Idempotent. Withdrawing an already-withdrawn Signal still returns the (withdrawn) Signal. `404` only when the Signal does not exist or is not owned.

### Field

#### `GET /api/v1/galaxy/field`
Finite, non-paginated, server-issued. Excludes self, blocked pairs (either direction), passed Signals, hidden-person authors, not-interested topics, non-ACTIVE, expired, active-exchange counterparts, and already-resonated/reported Signals. Ordered by declared-intent match DESC then freshness DESC, and **capped at 12** for the pilot. No infinite scroll, no automatic refill.

```json
{
  "cards": [
    {
      "id": "…", "alias": "QuietOrbit", "avatarKey": "nebula-04",
      "text": "…", "intentions": ["FRIENDSHIP"], "boundary": null,
      "language": "en", "broadTimezone": "Americas", "expiresAt": "…",
      "reasonCode": "SHARED_INTENTION"
    }
  ],
  "completionState": "COMPLETE"
}
```

`completionState` is `COMPLETE` when the eligible pool is exhausted (≤ cap) and `MORE_COMING` otherwise. `reasonCode` is `SHARED_INTENTION` when the card's intentions overlap the viewer's declared intentions, else `NEW_SIGNAL`.

### Decisions

All decisions are private and server-authoritative; none notifies or penalizes the author, none mutates the Signal row, and no response returns author identity.

- `POST /signals/:signalId/heart` — private, count-free resonance. Idempotent (composite unique + P2002 fallback).
- `POST /signals/:signalId/listen` — creates a `PENDING` resonance (a consent request). Idempotent.
- `POST /signals/:signalId/pass` — suppress this exact Signal. `DELETE /signals/:signalId/pass` removes ONLY the caller's Pass (the short client-side Undo window; a re-issued Field then restores eligibility).
- `POST /signals/:signalId/not-interested` — a reversible, time-bounded topic preference: for **14 days** it reduces the category by excluding Field Signals sharing those intentions, after which the topic returns. It never notifies or affects the author. (Contrast: Pass is a permanent per-Signal suppression.)
- `POST /signals/:signalId/hide-person` — resolves the author server-side and hides all their Signals. The author id is never returned.
- `POST /signals/:signalId/block` — signal-scoped; resolves the author server-side, records a bidirectional-effect block. Idempotent.
- `POST /signals/:signalId/report` — body `{reasonCode}` (report enum). Snapshots the Signal text server-side at report time; the snapshot is never returned or logged. Also suppresses the Signal from the reporter's Field.

**Eligibility.** heart / listen / pass / not-interested / hide-person require the Signal to be ACTIVE, not expired, not the viewer's own, and not blocked either direction (`404` for missing/own/blocked to avoid revealing a block; `409 GALAXY_SIGNAL_NOT_AVAILABLE` for expired/withdrawn). block / report only require the Signal to exist (safety must work after a Signal lapses); `404` on missing/own.

### Resonances, exchanges, Orbits

**`GET /api/v1/galaxy/resonances`** returns `{hearts, received, sent}` (the three calm inbox sections). All gate-dark behind `GalaxyFeatureGuard`.

- `hearts` ("Reached you"): **anonymous** HEART resonances received on the caller's **own** live Signals. Each entry `{id, signalExcerpt, createdAt}` where `id` is the opaque resonance id and `signalExcerpt` is a short (~80 char) slice of the caller's **own** Signal text (the text the caller authored). It **never** carries the sender's alias, avatar, id, or any aggregate/count: one entry per heart, anonymous forever. A block in **either** direction drops the heart, so a blocked person can never reach the caller even anonymously. The repository projection is an explicit allowlist that never selects `senderUserId`.
- `received` ("Waiting on you", incoming pending Listens to the caller's Signals): `{resonanceId, signalId, createdAt, alias, avatarKey, intentions}`. This **deliberately** carries the sender's **pseudonymous** presentation (`alias`, `avatarKey`, `intentions`) so the recipient can decide who to let in, per the approved design. That identity is sourced **only** from the sender's `GalaxyProfile` via an explicit-allowlist projection (never a `User` / journal / PII join); an offer whose sender has no `GalaxyProfile` is omitted. This is an additive widening of the original `{resonanceId, signalId, createdAt}` shape. Block handling is unchanged (a pending Listen only exists while the pair is unblocked, and the accept path re-checks the block at action time).
- `sent` ("Waiting on them", outgoing): `{resonanceId, type, state, signalId, exchangeId?, createdAt}` where `state` is only ever **`PENDING` or `ACCEPTED`** (with `exchangeId`). A recipient's decline is **never** surfaced: it renders as `PENDING` (quiet) and simply drops out of the list when the Signal expires. This is the decline representation. The same normalization applies to **every** sender-facing resonance response, including the heart/listen POST result: a re-tapped Listen that was quietly declined returns `state: "PENDING"`, never `DECLINED`.

**`POST /resonances/:resonanceId/accept`** (recipient/author only). Opens an `ACTIVE` exchange (transaction; idempotent on the unique `resonanceId`, so an Orbit's parent exchange is created exactly once). Every failure mode (not the recipient, not a pending Listen, blocked, expired Signal) collapses to one `409 GALAXY_RESONANCE_NOT_ACTIONABLE` so a non-recipient can't probe. Returns `{exchangeId}`.

**`POST /resonances/:resonanceId/close`** (recipient only) quietly declines; returns `{acknowledged: true}`. Idempotent.

#### Round + continuation model

The exchange is a guided, turn-taking thread. A **round** is one message from each side. Up to **3 rounds each** in the guided phase; the same thread is unbounded once it becomes an Orbit.

- **`GET /exchanges/:exchangeId`** (participants only; non-participant => `404 GALAXY_EXCHANGE_NOT_FOUND`, indistinguishable). Returns `{exchangeId, state, prompt, roundIndex, canPostMessage, continuationAvailable, continuationMandatory, myContinuation, messages}`. `messages` are `{id, mine, text, roundIndex, createdAt}` (mine/theirs; the raw sender id is never leaked). `myContinuation` is `NONE | CONTINUED | DECLINED` — the caller's OWN choice only; the counterpart's pending choice is NEVER exposed. `prompt` is a static per-intention string (keys: `galaxy.exchange.prompt.{friendship|romance|collaboration|open}`).
- **`POST /exchanges/:exchangeId/messages`** `{text}` (participants only). Enforces one message per side per round (`409 GALAXY_OUT_OF_TURN`), the 3-round guided cap (`409 GALAXY_ROUND_LIMIT`), and message-accepting state. The insert is transactionally state-guarded (a race with a close/continue yields `409 GALAXY_EXCHANGE_NOT_ACTIONABLE`, nothing stored), and a unique `(exchange, round, sender)` backstops the turn check (a same-sender same-round race => `409 GALAXY_OUT_OF_TURN`). Every message passes the contact/link + crisis validator BEFORE it is stored: crisis => `400 CRISIS_SUPPORT` (draft preserved client-side, never distributed, exchange NOT closed); contact/link/handle => `400 DISALLOWED_CONTENT`. Completing round 3 moves the exchange to `WAITING_FOR_CONTINUATION` (the ONLY thing that sets that state).
- **`POST /exchanges/:exchangeId/continue`** `{continue: boolean}` (participants only). Available from the end of round one, mandatory once `WAITING_FOR_CONTINUATION`. Each participant independently posts a choice (set-once). A single early `true` does **NOT** change the exchange state (it stays `ACTIVE` and guided messaging continues, so the counterpart cannot observe the vote and no one can unilaterally pause the thread). Both `true` => `ORBIT_CREATED` (from `ACTIVE` on an early both-yes, or from `WAITING_FOR_CONTINUATION` at the round-3 gate; exactly once under concurrency). Either `false` => `CLOSED`. Returns `{state}` only — the **identical neutral shape** for both parties; no field ever distinguishes who closed vs who was closed.
- **`GET /orbits`** returns `{orbits: [{exchangeId, prompt, createdAt}]}` (the caller's `ORBIT_CREATED` exchanges).

A blocked pair freezes a shared exchange: messages/continue return `404` (indistinguishable). No typing indicators, read receipts, or presence anywhere.

---

## Lifecycle error behaviors (frozen)

| Scenario | Behavior |
|---|---|
| Publish before settings | `409 GALAXY_PROFILE_REQUIRED` |
| Second live Signal | `409 GALAXY_ONE_ACTIVE_SIGNAL` |
| Edit a withdrawn/expired Signal | `409 GALAXY_SIGNAL_NOT_EDITABLE` |
| Withdraw twice (duplicate) | `200`, idempotent (same withdrawn Signal) |
| Crisis text on publish/edit | `400 CRISIS_SUPPORT`; client preserves draft + shows resources; text never echoed/logged |
| Contact/payment content | `400 DISALLOWED_CONTENT` |
| Invalid alias / intent / expiry (DTO) | `400` with a `message[]` |
| Gate off (prod) | `403` |
| Unauthenticated | `401` |
| Duplicate pass | idempotent `200` (one decision per viewer+signal+type) |
| Duplicate heart/listen (double-tap) | idempotent `200` (composite unique + P2002 fallback returns the existing row) |
| Blocked counterpart | excluded from Field; heart/listen/pass/etc `404` (privacy) |
| Expired/withdrawn signal decision | `409 GALAXY_SIGNAL_NOT_AVAILABLE` (heart/listen/pass/not-interested/hide); block/report still allowed |
| Field cap | never exceeds 12; `completionState` = `MORE_COMING` when the pool is larger, else `COMPLETE` |
| Report | `200 {reportId, status}`; snapshot captured server-side, never echoed; Signal suppressed from reporter's Field |
| Recipient declines a Listen | quiet `200 {acknowledged}`; never surfaced to the sender (shows `PENDING` until the Signal expires) |
| Accept (non-recipient / not pending / blocked / expired) | one `409 GALAXY_RESONANCE_NOT_ACTIONABLE` (indistinguishable) |
| Double-accept | idempotent `200 {exchangeId}` (unique `resonanceId`; exchange created exactly once) |
| Message out of turn | `409 GALAXY_OUT_OF_TURN` |
| 4th guided round pre-Orbit | `409 GALAXY_ROUND_LIMIT`; post-Orbit unbounded |
| Message once `WAITING_FOR_CONTINUATION` / `CLOSED` | `409 GALAXY_EXCHANGE_NOT_ACTIONABLE` |
| Crisis in a message | `400 CRISIS_SUPPORT`; not stored, not distributed, exchange stays open |
| Contact/link in a message | `400 DISALLOWED_CONTENT` |
| Continue before round one complete | `409 GALAXY_CONTINUATION_NOT_AVAILABLE` |
| Both continue | `ORBIT_CREATED` exactly once (state-guarded, concurrency-safe) |
| Either false | `CLOSED`; identical neutral `{state}` for both; who-chose-what never revealed |
| Non-participant / blocked-pair on an exchange | `404 GALAXY_EXCHANGE_NOT_FOUND` (indistinguishable) |
