# Duo invite + claim redesign — spec (2026-07-21)

Locked with Astro after a 5-lens panel (heart, shield, prism, cortex, voice). Supersedes the
"error screen after birthday" behavior. Everything targets **Alpha** first.

## Problem

The web claim page (`apps/web-client/.../family-plan-join-page.tsx`) only knows the invite
`token`, never the invited email, and only detects a wrong-account claim AFTER the birthday
(DOB) step, rendering it as an **error** with a "Try again" button that re-fires the same
doomed claim (an infinite dead end). Three invitee cases were unhandled gracefully:

1. **New user, no account** — nothing tells them to sign up with the *invited* email, so a
   user who signs up with their usual address silently fails at the very end.
2. **Existing account = invited email** — works, but login doesn't guide them to the right
   account.
3. **Signed in as a different account** — enforcement correctly refuses (SEAT_EMAIL_MISMATCH),
   but it reads as an error, offers no way out, and never says which email to use.

## Locked decisions

1. **Reframe: gift, not error.** "This spot has your name on it," never "you failed." Kill the
   red/error styling and the re-firing "Try again" loop.
2. **Show the invited email MASKED** (`a•••@gmail.com`) — never the full address (PII,
   health-adjacent, invitee may be a minor; links get forwarded). No prefill (can't prefill an
   editable field without writing the full email into the DOM). The user types their own email.
3. **Detect the mismatch UP FRONT**, before the birthday step, via a new token->email preview
   lookup fired in parallel with auth on mount.
4. **Every state has a real door out** — never a dead end.
5. **Email the invite + keep the shareable link.** Murror sends a one-time, gift-framed email
   to the invited address (reaches the right inbox, largely dissolving the mismatch), AND the
   organizer still gets the link to send themselves. Reverses the old "never notified by us"
   rail, intentionally, kept gift-shaped (one-time, no nagging, no "someone is waiting").

## Backend (murror-api)

- **New `POST /family-plan/seat/preview`** — `@Public()`, `@Throttle(PUBLIC_CONSENT_THROTTLE)`,
  `@HttpCode(200)`, token in the JSON **body** (mirror the consent endpoints; keeps the secret
  out of access logs). Returns:
  ```
  { claimable: boolean,               // true ONLY when seat.status === 'PENDING'
    invitedEmailMasked: string|null,  // "a•••@gmail.com", non-null only when claimable
    inviteeIsExistingUser: boolean }  // via LookupUserByEmailUseCase -> "Log in" vs "Sign up"
  ```
  Guards: reveal masked email only for PENDING seats; CLAIMED/REMOVED/EXPIRED/unknown all return
  the SAME neutral `{claimable:false, invitedEmailMasked:null, inviteeIsExistingUser:false}` at
  200 (no status-code oracle); rate-limited; email is token-derived (not caller-supplied) so it
  is not an enumeration oracle. Reuses `findSeatByToken` (already returns inviteEmail + status).
  ~15-line controller + ~40-line use-case + tiny DTO + one module line. Zero schema/migration.
- **Reorder**: move the SEAT_EMAIL_MISMATCH check in `claim-seat.use-case.ts` to run BEFORE the
  age gate (cheap backstop; the preview endpoint is the load-bearing up-front detector).
- **Invite email**: on `invite-seat`, send a one-time gift-framed email to the invited address
  with the claim link, via the same port/adapter pattern as `ParentalConsentEmailPort`
  (`request-parental-consent.use-case.ts`). New `SeatInviteEmailPort` + adapter.

## Web (web-client)

New phase machine in `family-plan-join-page.tsx`:
```
mount -> auth-loading + invite-lookup (parallel)
  -> missing-token                 [no token]
  -> invite-invalid                [token resolves to not-claimable] (NEW)
  NOT authed -> auth-needed (email-aware: "Sign up with <masked>" / "I have an account")
  authed, compare user.email vs invited email:
    -> wrong-account               [mismatch] (NEW: "Log out & continue as <masked>", no dead end)
    -> dob-gate                    [match] -> claiming -> success | under-13 | parent-step
```
SEAT_EMAIL_MISMATCH at claim time becomes a rare defensive fallback routed to the same
wrong-account copy, never "Try again". Copy: voice's masked "gift" variants.

## Mobile (MurrorMobile)

Invite screen (`together-duo-invite-screen.tsx`): reflect "we've emailed them, and here's the
link if you'd like to send it yourself."

## Verification

Backend: targeted jest on the preview use-case + the reordered claim guard + the invite-email
send; NestJS DI; deploy to alpha via Build & Push. Web: vitest on the new phase machine +
getApiErrorCode; deploy alpha web image + roll. Mobile: TestFlight device build. Leak checks:
preview never returns full email / dead-seat email; email is one-time.
