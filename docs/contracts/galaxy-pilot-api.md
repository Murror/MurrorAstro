# Galaxy Pilot API Contract (frozen)

**Status:** frozen contract for the Galaxy pilot. Clients (mobile, web) implement to THIS document, not to placeholder paths. Mobile currently targets `/api/v1/galaxy/*` placeholders; the paths below are final.

**Route prefix:** global prefix `api` + URI version `1` => every route is under **`/api/v1/galaxy/...`**.

**Auth:** every endpoint requires a Supabase JWT (`Authorization: Bearer <token>`) via `AuthGuard`. Unauthenticated => `401`.

**Feature gate:** the whole controller is behind `GalaxyFeatureGuard` (Statsig `galaxy_enabled`, default-off). Non-production tiers default ON for QA; production is DARK until the gate is enabled for the verified 18+ cohort. Gate off => `403` (`ForbiddenException`).

**Rate limits:** global `short`/`medium`/`long` apply to all routes. Publish/withdraw add the `galaxyPublish` tier (10/min); settings PUT adds `galaxySettings` (20/min).

---

## Implementation status

| Slice | Endpoints | PR |
|---|---|---|
| Data model + repository | (none) | #609 (merged) |
| **Settings + Signal publication** | `GET/PUT /settings`, `GET/POST /signals`, `PATCH /signals/:id`, `POST /signals/:id/withdraw` | **this PR** |
| Field + private decisions | `GET /field`, heart/listen/pass + `DELETE pass`, not-interested, hide, block, report | planned |
| Exchanges + orbits | resonances, exchanges, orbits | planned |

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
   - **Card relevance** `reasonCode` (why a card is shown): `SHARED_INTENTION`, `SHARED_LANGUAGE`, `SHARED_TIMEZONE`, `FRESH`, `UNDEREXPOSED`. Never a match score.
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

### Field & decisions _(planned)_

- `GET /field` — finite, non-paginated, server-issued list of `GalaxySignalCard`s + completion metadata. Excludes self, blocked pairs (either direction), passed Signals, non-ACTIVE, expired.
- `POST /signals/:id/heart` — private, count-free.
- `POST /signals/:id/listen` — creates a pending consent request (LISTEN_OFFERED).
- `POST /signals/:id/pass` / `DELETE /signals/:id/pass` — suppress this exact Signal (no author notification, no ranking penalty); DELETE undoes only the caller's PASS within the brief Undo window.
- `POST /signals/:id/not-interested`, `POST /people/:profileId/hide`, `POST /signals/:signalId/block`, `POST /signals/:signalId/report`.

### Resonances / exchanges / orbits _(planned)_

- `GET /resonances`, `POST /resonances/:id/accept`, `POST /resonances/:id/close`.
- `POST /exchanges/:id/continue` (both participants must independently continue before an Orbit exists).
- `GET /orbits`.

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
| Duplicate pass _(planned)_ | idempotent `200` (one decision per viewer+signal+type) |
| Blocked counterpart _(planned)_ | excluded from Field; heart/listen forbidden |
| Recipient declines a listen _(planned)_ | resonance `DECLINED`/`CLOSED`; no exchange created |
| Stale exchange transition _(planned)_ | `409`/`404`; no duplicate exchange; race between two listen taps resolves to one |
